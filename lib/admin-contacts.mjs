import { cloneApexFieldEntries, flattenApexFields } from './apex27-fields.mjs';
import { getProxyAgent } from './proxy-agent.js';
import { loadJson } from './load-json.mjs';

const agentsSource = loadJson('data/agents.json', []);

const { FALLBACK_CONTACTS, FALLBACK_GENERATED_AT } = (() => {
  const source = loadJson('data/apex27-contacts.json', {});

  if (!source || typeof source !== 'object') {
    return { FALLBACK_CONTACTS: [], FALLBACK_GENERATED_AT: null };
  }

  const contacts = Array.isArray(source.contacts) ? source.contacts : [];
  const generatedAt = source.generatedAt || null;

  return { FALLBACK_CONTACTS: contacts, FALLBACK_GENERATED_AT: generatedAt };
})();

const require = createRequire(import.meta.url);
const contactsSource = require('../data/apex27-contacts.json');
const agentsSource = require('../data/agents.json');

const API_BASE = process.env.APEX27_API_BASE || 'https://api.apex27.co.uk';
const API_KEY = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID || null;

const CACHE_TTL_MS = 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120_000;
const CONTACTS_PAGE_SIZE = 200;
const MAX_CONTACT_PAGES = 50;

let cachedPayload = null;
let cachedAt = 0;
let inflightRequest = null;
let rateLimitResetAt = 0;
let lastRateLimitLogAt = 0;

const APEX27_APP_BASE_URL = 'https://app.apex27.co.uk';

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normaliseKey(value) {
  return sanitizeString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

const DATE_CANDIDATE_KEYS = Object.freeze([
  'iso',
  'value',
  'date',
  'Date',
  'datetime',
  'dateTime',
  'timestamp',
  'time',
  'created',
  'createdAt',
  'updated',
  'updatedAt',
]);

function coerceDateInput(value, seen = new Set()) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return null;
    }
    seen.add(value);

    for (const key of DATE_CANDIDATE_KEYS) {
      if (value[key] != null && value[key] !== '') {
        const nested = coerceDateInput(value[key], seen);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return null;
}

function normaliseDate(value) {
  const input = coerceDateInput(value);
  if (!input) {
    return { iso: null, timestamp: null };
  }

  const date = new Date(input);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return { iso: null, timestamp: null };
  }

  return { iso: date.toISOString(), timestamp };
}

const STAGE_METADATA = {
  new: { label: 'New', order: 10, score: 55, tone: 'info' },
  nurture: { label: 'Nurture', order: 20, score: 60, tone: 'neutral' },
  warm: { label: 'Warm', order: 30, score: 75, tone: 'warning' },
  hot: { label: 'Hot', order: 0, score: 95, tone: 'positive' },
  client: { label: 'Client', order: 5, score: 90, tone: 'positive' },
  past_client: { label: 'Past client', order: 50, score: 45, tone: 'muted' },
  archived: { label: 'Archived', order: 100, score: 20, tone: 'muted' },
};

const TYPE_METADATA = {
  buyer: { label: 'Buyer', pipeline: 'sales' },
  vendor: { label: 'Vendor', pipeline: 'sales' },
  tenant: { label: 'Tenant', pipeline: 'lettings' },
  landlord: { label: 'Landlord', pipeline: 'lettings' },
};

const PIPELINE_METADATA = {
  sales: { label: 'Sales pipeline', order: 0 },
  lettings: { label: 'Lettings pipeline', order: 10 },
};

const AGENT_MAP = new Map(
  (Array.isArray(agentsSource) ? agentsSource : [])
    .map((agent) => [String(agent.id), {
      id: String(agent.id),
      name: sanitizeString(agent.name) || 'Unassigned',
      phone: sanitizeString(agent.phone) || null,
    }]),
);

const contactOverrides = new Map();

export class ContactValidationError extends Error {
  constructor(messages = []) {
    const list = Array.isArray(messages) ? messages.filter(Boolean).map(String) : [String(messages)];
    super(list[0] || 'Contact update failed validation');
    this.name = 'ContactValidationError';
    this.messages = list;
  }
}

function sanitiseStringArrayInput(value) {
  if (value == null) {
    return [];
  }

  const entries = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  const seen = new Set();

  entries.forEach((entry) => {
    const cleaned = sanitizeString(entry);
    if (cleaned) {
      seen.add(cleaned);
    }
  });

  return Array.from(seen);
}

function parseOptionalNumber(value, label, errors) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }
    errors.push(`${label} must be a valid number.`);
    return null;
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const numeric = Number(cleaned);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  errors.push(`${label} must be a valid number.`);
  return null;
}

function cloneDeep(value) {
  if (value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function cloneContact(contact) {
  return {
    ...contact,
    tags: Array.isArray(contact.tags) ? [...contact.tags] : [],
    requirements: Array.isArray(contact.requirements) ? [...contact.requirements] : [],
    budget: contact.budget ? { ...contact.budget } : { saleMax: null, rentMax: null },
    nextStep: contact.nextStep ? { ...contact.nextStep } : null,
    assignedAgent: contact.assignedAgent ? { ...contact.assignedAgent } : null,
    links: contact.links ? { ...contact.links } : null,
    apexFields: cloneApexFieldEntries(contact.apexFields),
    apexRaw: contact.apexRaw ? cloneDeep(contact.apexRaw) : null,
  };
}

function mergeOverrides(current, incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return current;
  }

  const merged = { ...current };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) {
      continue;
    }

    if (key === 'budget' && value && typeof value === 'object') {
      merged[key] = {
        saleMax: value.saleMax ?? null,
        rentMax: value.rentMax ?? null,
      };
      continue;
    }

    if (key === 'nextStep') {
      merged[key] = value ? { ...value } : null;
      continue;
    }

    if (key === 'tags' || key === 'requirements') {
      merged[key] = Array.isArray(value) ? [...value] : [];
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function applyOverridesToContact(contact, override) {
  if (!override || typeof override !== 'object') {
    contact.searchIndex = buildSearchIndex(contact);
    if (contact.apexRaw) {
      contact.apexRaw = cloneDeep(contact.apexRaw);
    }
    contact.apexFields = cloneApexFieldEntries(contact.apexFields);
    return contact;
  }

  const updated = contact;
  const originalApexRaw = contact.apexRaw ? cloneDeep(contact.apexRaw) : null;
  const originalApexFields = cloneApexFieldEntries(contact.apexFields);

  if ('firstName' in override) {
    updated.firstName = override.firstName || '';
  }

  if ('lastName' in override) {
    updated.lastName = override.lastName || '';
  }

  let explicitName = false;
  if ('name' in override) {
    explicitName = true;
    if (override.name) {
      updated.name = override.name;
    } else {
      const derived = [updated.firstName, updated.lastName].filter(Boolean).join(' ').trim();
      updated.name = derived || updated.name || '';
    }
  }

  if (!explicitName && ('firstName' in override || 'lastName' in override)) {
    const derived = [updated.firstName, updated.lastName].filter(Boolean).join(' ').trim();
    if (derived) {
      updated.name = derived;
    }
  }

  if ('stage' in override && override.stage && STAGE_METADATA[override.stage]) {
    const stageMeta = STAGE_METADATA[override.stage];
    updated.stage = override.stage;
    updated.stageLabel = stageMeta.label;
    updated.stageOrder = stageMeta.order;
    updated.stageTone = stageMeta.tone;
  }

  if ('type' in override && override.type && TYPE_METADATA[override.type]) {
    const typeMeta = TYPE_METADATA[override.type];
    updated.type = override.type;
    updated.typeLabel = typeMeta.label;
  }

  if ('pipeline' in override && override.pipeline && PIPELINE_METADATA[override.pipeline]) {
    const pipelineMeta = PIPELINE_METADATA[override.pipeline];
    updated.pipeline = override.pipeline;
    updated.pipelineLabel = pipelineMeta.label;
    updated.pipelineOrder = pipelineMeta.order;
  }

  if ('source' in override) {
    updated.source = override.source || null;
  }

  if ('email' in override) {
    updated.email = override.email || null;
  }

  if ('phone' in override) {
    updated.phone = override.phone || null;
  }

  if ('locationFocus' in override) {
    updated.locationFocus = override.locationFocus || null;
  }

  if ('tags' in override) {
    updated.tags = Array.isArray(override.tags) ? [...override.tags] : [];
  }

  if ('requirements' in override) {
    updated.requirements = Array.isArray(override.requirements) ? [...override.requirements] : [];
  }

  if ('budget' in override && override.budget && typeof override.budget === 'object') {
    updated.budget = {
      saleMax: override.budget.saleMax ?? null,
      rentMax: override.budget.rentMax ?? null,
    };
  }

  if ('nextStep' in override) {
    updated.nextStep = override.nextStep ? { ...override.nextStep } : null;
  }

  if ('assignedAgentId' in override) {
    const agentId = override.assignedAgentId;
    if (agentId && AGENT_MAP.has(agentId)) {
      const agent = AGENT_MAP.get(agentId);
      updated.assignedAgentId = agent.id;
      updated.assignedAgentName = agent.name;
      updated.assignedAgent = agent.phone
        ? { id: agent.id, name: agent.name, phone: agent.phone }
        : { id: agent.id, name: agent.name };
    } else {
      updated.assignedAgentId = null;
      updated.assignedAgentName = null;
      updated.assignedAgent = null;
    }
  }

  updated.searchIndex = buildSearchIndex(updated);
  updated.apexRaw = originalApexRaw;
  updated.apexFields = originalApexFields;
  return updated;
}

function applyOverridesToPayload(payload) {
  if (!contactOverrides.size) {
    return payload;
  }

  let hasChanges = false;
  const contacts = payload.contacts.map((contact) => {
    const override = contactOverrides.get(contact.id);
    if (!override) {
      return contact;
    }

    hasChanges = true;
    return applyOverridesToContact(cloneContact(contact), override);
  });

  if (!hasChanges) {
    return payload;
  }

  return {
    ...payload,
    contacts,
    summary: buildSummary(contacts),
    filters: buildFilterOptions(contacts),
  };
}

function sanitiseContactUpdateInput(updates) {
  const errors = [];
  const override = {};
  const input = updates && typeof updates === 'object' ? updates : {};

  if ('firstName' in input) {
    override.firstName = sanitizeString(input.firstName);
  }

  if ('lastName' in input) {
    override.lastName = sanitizeString(input.lastName);
  }

  if ('name' in input) {
    const cleaned = sanitizeString(input.name);
    override.name = cleaned || null;
  }

  if ('stage' in input) {
    const stageKey = sanitizeString(input.stage);
    const normalised = stageKey ? normaliseKey(stageKey) : '';
    if (!normalised || !STAGE_METADATA[normalised]) {
      errors.push('Please select a valid stage.');
    } else {
      override.stage = normalised;
    }
  }

  if ('type' in input) {
    const typeKey = sanitizeString(input.type);
    const normalised = typeKey ? normaliseKey(typeKey) : '';
    if (!normalised || !TYPE_METADATA[normalised]) {
      errors.push('Please select a valid contact type.');
    } else {
      override.type = normalised;
    }
  }

  if ('pipeline' in input) {
    const pipelineKey = sanitizeString(input.pipeline);
    const normalised = pipelineKey ? normaliseKey(pipelineKey) : '';
    if (!normalised || !PIPELINE_METADATA[normalised]) {
      errors.push('Please select a valid pipeline.');
    } else {
      override.pipeline = normalised;
    }
  }

  if ('assignedAgentId' in input) {
    if (input.assignedAgentId == null || input.assignedAgentId === '') {
      override.assignedAgentId = null;
    } else {
      const agentId = sanitizeString(input.assignedAgentId);
      if (!AGENT_MAP.has(agentId)) {
        errors.push('Please select a valid team member.');
      } else {
        override.assignedAgentId = agentId;
      }
    }
  }

  if ('source' in input) {
    const value = sanitizeString(input.source);
    override.source = value || null;
  }

  if ('email' in input) {
    const value = sanitizeString(input.email);
    override.email = value || null;
  }

  if ('phone' in input) {
    const value = sanitizeString(input.phone);
    override.phone = value || null;
  }

  if ('locationFocus' in input) {
    const value = sanitizeString(input.locationFocus);
    override.locationFocus = value || null;
  }

  if ('tags' in input) {
    override.tags = sanitiseStringArrayInput(input.tags);
  }

  if ('requirements' in input) {
    override.requirements = sanitiseStringArrayInput(input.requirements);
  }

  if ('budget' in input) {
    if (input.budget == null) {
      override.budget = { saleMax: null, rentMax: null };
    } else if (typeof input.budget === 'object') {
      const saleMax = parseOptionalNumber(input.budget.saleMax, 'Sale budget', errors);
      const rentMax = parseOptionalNumber(input.budget.rentMax, 'Rent budget', errors);
      override.budget = { saleMax, rentMax };
    } else {
      errors.push('Budget must be an object.');
    }
  }

  if ('nextStep' in input) {
    if (!input.nextStep) {
      override.nextStep = null;
    } else if (typeof input.nextStep === 'object') {
      const nextStepInput = {
        description: input.nextStep.description,
        dueAt: input.nextStep.dueAt || input.nextStep.due_at || input.nextStep.date,
      };
      const normalisedNextStep = normaliseNextStep(nextStepInput);
      override.nextStep = normalisedNextStep;
    } else {
      errors.push('Next step must be an object.');
    }
  }

  return { override, errors };
}

function readFirstString(source, keys = []) {
  if (!source) {
    return '';
  }

  for (const key of keys) {
    const value = source[key];
    if (value == null) {
      continue;
    }
    if (typeof value === 'string') {
      if (value.trim()) {
        return value;
      }
      continue;
    }
    if (typeof value === 'number' || value instanceof Date) {
      return String(value);
    }
  }

  return '';
}

function readValue(source, keys = []) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (key in source) {
      const value = source[key];
      if (value != null && value !== '') {
        return value;
      }
    }
  }

  return null;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}

function entryLooksLikeContact(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidateKeys = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'stage',
    'status',
    'type',
    'contactType',
    'pipeline',
    'nextStep',
    'assignedAgentId',
    'assignedTo',
  ];

  return candidateKeys.some((key) => {
    const candidate = value[key];
    return candidate != null && candidate !== '';
  });
}

function findContactCollection(payload, seen = new WeakSet()) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (seen.has(payload)) {
    return null;
  }
  seen.add(payload);

  if (Array.isArray(payload)) {
    const hasContact = payload.some((entry) => entryLooksLikeContact(entry));
    return hasContact ? payload : null;
  }

  const arrayLikeKeys = ['contacts', 'results', 'items', 'data', 'entries'];
  for (const key of arrayLikeKeys) {
    if (Array.isArray(payload[key])) {
      const candidate = payload[key];
      const hasContact = candidate.some((entry) => entryLooksLikeContact(entry));
      if (hasContact) {
        return candidate;
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (typeof value === 'object' && value) {
      const candidate = findContactCollection(value, seen);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

const GENERATED_AT_KEYS = Object.freeze([
  'generatedAt',
  'generated_at',
  'syncedAt',
  'synced_at',
  'refreshedAt',
  'refreshed_at',
  'updatedAt',
  'updated_at',
  'timestamp',
]);

const CONTACT_ID_KEYS = Object.freeze([
  'id',
  'Id',
  'ID',
  'contactId',
  'contactID',
  'contact_id',
  'contactid',
  'contactRef',
  'contactRefNo',
  'contactRefNumber',
  'contactReference',
  'contactReferenceNumber',
  'contactNumber',
  'contact_number',
  'reference',
  'referenceNumber',
  'ref',
  'refNo',
]);

const FIRST_NAME_KEYS = Object.freeze([
  'firstName',
  'firstname',
  'first_name',
  'givenName',
  'given_name',
  'forename',
]);

const LAST_NAME_KEYS = Object.freeze([
  'lastName',
  'lastname',
  'last_name',
  'surname',
  'familyName',
  'family_name',
]);

const FULL_NAME_KEYS = Object.freeze([
  'name',
  'fullName',
  'full_name',
  'displayName',
  'display_name',
  'contactName',
  'contact_name',
]);

const TYPE_KEYS = Object.freeze([
  'type',
  'contactType',
  'contact_type',
  'category',
  'categoryName',
  'role',
  'audience',
]);

const STAGE_KEYS = Object.freeze([
  'stage',
  'status',
  'statusName',
  'lifecycleStage',
  'lifecycle_stage',
  'pipelineStage',
  'pipeline_stage',
  'progress',
]);

const PIPELINE_KEYS = Object.freeze([
  'pipeline',
  'pipelineName',
  'pipeline_name',
  'pipelineId',
  'pipeline_id',
  'department',
  'team',
]);

const CREATED_AT_KEYS = Object.freeze([
  'createdAt',
  'created_at',
  'created',
  'createdOn',
  'created_on',
  'dateCreated',
  'DateCreated',
  'createdDate',
  'created_date',
]);

const LAST_ACTIVITY_KEYS = Object.freeze([
  'lastActivityAt',
  'lastActivity_at',
  'lastActivity',
  'last_activity',
  'lastContactedAt',
  'last_contacted_at',
  'updatedAt',
  'updated_at',
  'lastUpdated',
  'last_updated',
]);

const SOURCE_KEYS = Object.freeze([
  'source',
  'Source',
  'leadSource',
  'lead_source',
  'origin',
  'Origin',
]);

const EMAIL_KEYS = Object.freeze([
  'email',
  'Email',
  'emailAddress',
  'email_address',
  'contactEmail',
  'contact_email',
  'primaryEmail',
  'primary_email',
]);

const PHONE_KEYS = Object.freeze([
  'phone',
  'Phone',
  'phoneNumber',
  'phone_number',
  'telephone',
  'Telephone',
  'mobile',
  'mobilePhone',
  'mobile_phone',
  'mobileNumber',
  'mobile_number',
  'homePhone',
  'home_phone',
  'workPhone',
  'work_phone',
]);

const LOCATION_KEYS = Object.freeze([
  'locationFocus',
  'location_focus',
  'searchFocus',
  'search_focus',
  'area',
  'preferredArea',
  'preferred_area',
  'regionsOfInterest',
]);

const REQUIREMENT_KEYS = Object.freeze([
  'requirements',
  'requirementSummary',
  'requirement_summary',
  'lookingFor',
  'looking_for',
  'searchCriteria',
  'search_criteria',
  'searchCriteriaSummary',
]);

const TAG_KEYS = Object.freeze([
  'tags',
  'Tags',
  'labels',
  'Labels',
  'categories',
  'Categories',
  'segments',
]);

const ASSIGNED_AGENT_KEYS = Object.freeze([
  'assignedAgentId',
  'assigned_agent_id',
  'assignedAgent',
  'assigned_agent',
  'assignedTo',
  'assigned_to',
  'agentId',
  'agent_id',
  'negotiatorId',
  'negotiator_id',
]);

const TEXT_VALUE_KEYS = Object.freeze([
  'label',
  'Label',
  'name',
  'Name',
  'value',
  'Value',
  'description',
  'Description',
  'text',
  'Text',
  'title',
  'Title',
  'summary',
  'Summary',
]);

function extractTextValue(value, keys = TEXT_VALUE_KEYS) {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (typeof value === 'number') {
    return sanitizeString(String(value));
  }
  if (value instanceof Date) {
    return sanitizeString(value.toISOString());
  }
  if (typeof value === 'object') {
    return sanitizeString(readFirstString(value, keys));
  }
  return '';
}

function extractGeneratedAt(source, headers) {
  if (headers && typeof headers.get === 'function') {
    const headerValue = headers.get('x-generated-at') || headers.get('x-synced-at');
    if (headerValue) {
      const { iso } = normaliseDate(headerValue);
      if (iso) {
        return iso;
      }
    }
  }

  const stack = [source];
  const seen = new WeakSet();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') {
      continue;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    for (const key of GENERATED_AT_KEYS) {
      if (current[key] != null && current[key] !== '') {
        const { iso } = normaliseDate(current[key]);
        if (iso) {
          return iso;
        }
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function parseRetryAfterMs(value) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.round(numeric * 1000);
  }

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) {
    const delta = parsedDate - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

function extractRetryAfterMs(res) {
  if (!res || typeof res !== 'object') {
    return null;
  }

  const headers = res.headers;
  if (!headers || typeof headers.get !== 'function') {
    return null;
  }

  try {
    const headerValue = headers.get('retry-after');
    if (!headerValue) {
      return null;
    }
    return parseRetryAfterMs(headerValue);
  } catch {
    return null;
  }
}

function markRateLimited(resOrDurationMs) {
  let durationMs = null;
  if (typeof resOrDurationMs === 'number') {
    durationMs = resOrDurationMs;
  } else if (resOrDurationMs) {
    durationMs = extractRetryAfterMs(resOrDurationMs);
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    durationMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  }

  const candidateReset = Date.now() + durationMs;
  if (candidateReset > rateLimitResetAt) {
    rateLimitResetAt = candidateReset;
  }
}

function logRateLimitNotice(message) {
  const now = Date.now();
  if (now - lastRateLimitLogAt > 5000) {
    console.warn(message);
    lastRateLimitLogAt = now;
  }
}

function canAttemptNetwork() {
  if (!API_KEY) {
    return false;
  }
  return rateLimitResetAt <= Date.now();
}

function formatBudget(budget = {}) {
  if (!budget || typeof budget !== 'object') {
    return { rentMax: null, saleMax: null };
  }

  const coerceNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const readBudgetValue = (keys) => {
    for (const key of keys) {
      if (budget[key] != null && budget[key] !== '') {
        const numeric = coerceNumber(budget[key]);
        if (numeric != null) {
          return numeric;
        }
      }
    }
    return null;
  };

  const rentMax = readBudgetValue(['rentMax', 'rent_max', 'rentUpper', 'rent_upper', 'rentBudgetMax', 'rentBudget', 'rent']);
  const saleMax = readBudgetValue(['saleMax', 'sale_max', 'saleUpper', 'sale_upper', 'purchaseMax', 'purchase_max', 'budget']);
  return { rentMax, saleMax };
}

function normaliseNextStep(nextStep) {
  if (!nextStep || typeof nextStep !== 'object') {
    return null;
  }

  const descriptionCandidates = [
    'description',
    'summary',
    'note',
    'notes',
    'title',
    'task',
    'action',
  ];
  const dueDateCandidates = [
    'dueAt',
    'due_at',
    'dueDate',
    'due_date',
    'date',
    'Date',
    'scheduledAt',
    'scheduled_at',
    'deadline',
  ];

  let description = sanitizeString(nextStep.description);
  if (!description) {
    description = sanitizeString(readFirstString(nextStep, descriptionCandidates));
  }

  let dueValue = nextStep.dueAt;
  if (!dueValue) {
    for (const key of dueDateCandidates) {
      if (nextStep[key] != null && nextStep[key] !== '') {
        dueValue = nextStep[key];
        break;
      }
    }
  }

  const { iso, timestamp } = normaliseDate(dueValue);

  if (!description && !iso) {
    return null;
  }

  return {
    description: description || null,
    dueAt: iso,
    dueTimestamp: timestamp,
  };
}

function buildSearchIndex(contact) {
  const parts = [
    contact.name,
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.phone,
    contact.source,
    contact.stageLabel,
    contact.typeLabel,
    contact.locationFocus,
  ];

  contact.tags.forEach((tag) => parts.push(tag));
  contact.requirements.forEach((req) => parts.push(req));

  return parts
    .map((value) => (value == null ? '' : String(value).toLowerCase()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildContactLinks(contact) {
  const encodedId = encodeURIComponent(contact.id);
  const basePath = `${APEX27_APP_BASE_URL}/contacts/${encodedId}`;

  return {
    update: `${basePath}/edit`,
    view: basePath,
    timeline: `${basePath}/timeline`,
    tasks: `${basePath}/tasks`,
    newTask: `${basePath}/tasks/new`,
  };
}

function normaliseContact(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const apexRaw = cloneDeep(entry);

  const id = sanitizeString(readFirstString(entry, CONTACT_ID_KEYS) || entry.id);
  if (!id) {
    return null;
  }

  const firstName =
    sanitizeString(readFirstString(entry, FIRST_NAME_KEYS)) || sanitizeString(entry.firstName);
  const lastName = sanitizeString(readFirstString(entry, LAST_NAME_KEYS)) || sanitizeString(entry.lastName);

  let name = sanitizeString(readFirstString(entry, FULL_NAME_KEYS));
  if (!name) {
    name = sanitizeString(entry.name) || [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  const typeKey = normaliseKey(readFirstString(entry, TYPE_KEYS) || entry.type);
  const stageKey = normaliseKey(readFirstString(entry, STAGE_KEYS) || entry.stage);
  const pipelineKey = normaliseKey(
    readFirstString(entry, PIPELINE_KEYS) || entry.pipeline || TYPE_METADATA[typeKey]?.pipeline || ''
  );

  const typeMeta = TYPE_METADATA[typeKey] || { label: 'Contact', pipeline: pipelineKey || null };
  const stageMeta = STAGE_METADATA[stageKey] || {
    label: stageKey ? stageKey.replace(/_/g, ' ') : 'Unknown',
    order: 999,
    score: 40,
    tone: 'neutral',
  };
  const pipelineMeta = PIPELINE_METADATA[pipelineKey] || {
    label: pipelineKey ? pipelineKey.replace(/_/g, ' ') : 'General',
    order: 999,
  };

  const createdAtValue = readValue(entry, CREATED_AT_KEYS) ?? entry.createdAt;
  const lastActivityValue = readValue(entry, LAST_ACTIVITY_KEYS) ?? entry.lastActivityAt;
  const { iso: createdAt, timestamp: createdAtTimestamp } = normaliseDate(createdAtValue);
  const { iso: lastActivityAt, timestamp: lastActivityTimestamp } = normaliseDate(lastActivityValue);

  const nextStepSource =
    entry.nextStep ||
    entry.next_step ||
    entry.nextAction ||
    entry.next_action ||
    entry.nextTask ||
    entry.next_task ||
    readValue(entry, ['nextStep', 'next_step', 'nextAction', 'next_action', 'nextTask', 'next_task']);
  const nextStep = normaliseNextStep(nextStepSource);

  const source = sanitizeString(readFirstString(entry, SOURCE_KEYS)) || sanitizeString(entry.source) || null;
  const email = sanitizeString(readFirstString(entry, EMAIL_KEYS) || entry.email || '').toLowerCase() || null;
  const phone = sanitizeString(readFirstString(entry, PHONE_KEYS) || entry.phone || '') || null;
  const locationFocus = sanitizeString(readFirstString(entry, LOCATION_KEYS) || entry.locationFocus || '') || null;

  const rawRequirements = readValue(entry, REQUIREMENT_KEYS) ?? entry.requirements;
  const requirements = ensureArray(rawRequirements)
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeString(item);
      }
      return extractTextValue(item);
    })
    .filter(Boolean);

  const budgetSource = entry.budget || readValue(entry, ['budget', 'Budget', 'requirementsBudget']);
  const budget = formatBudget(budgetSource);

  const rawTags = readValue(entry, TAG_KEYS) ?? entry.tags;
  const tags = ensureArray(rawTags)
    .map((tag) => {
      if (typeof tag === 'string') {
        return sanitizeString(tag);
      }
      return extractTextValue(tag);
    })
    .filter(Boolean);

  let assignedAgentId = sanitizeString(readFirstString(entry, ASSIGNED_AGENT_KEYS)) || sanitizeString(entry.assignedAgentId);
  if (!assignedAgentId && typeof entry.assignedAgent === 'object' && entry.assignedAgent) {
    assignedAgentId = sanitizeString(readFirstString(entry.assignedAgent, ['id', 'Id', 'ID', 'agentId', 'agent_id']));
  }
  if (!assignedAgentId && typeof entry.assignedTo === 'object' && entry.assignedTo) {
    assignedAgentId = sanitizeString(readFirstString(entry.assignedTo, ['id', 'Id', 'ID']));
  }
  const assignedAgent = assignedAgentId ? AGENT_MAP.get(assignedAgentId) || null : null;

  const contact = {
    id,
    firstName: firstName || (name ? name.split(' ')[0] : ''),
    lastName,
    name: name || id,
    type: typeKey,
    typeLabel: typeMeta.label,
    stage: stageKey,
    stageLabel: stageMeta.label,
    stageOrder: stageMeta.order,
    stageTone: stageMeta.tone,
    pipeline: pipelineKey || typeMeta.pipeline || 'general',
    pipelineLabel: pipelineMeta.label,
    pipelineOrder: pipelineMeta.order,
    source,
    email,
    phone,
    createdAt,
    createdAtTimestamp,
    lastActivityAt,
    lastActivityTimestamp,
    nextStep,
    tags,
    requirements,
    budget,
    locationFocus,
    assignedAgentId: assignedAgent?.id || null,
    assignedAgentName: assignedAgent?.name || null,
    assignedAgent,
  };

  contact.searchIndex = buildSearchIndex(contact);
  contact.links = buildContactLinks(contact);
  contact.apexRaw = apexRaw;
  contact.apexFields = apexRaw ? flattenApexFields(apexRaw) : [];
  return contact;
}

function buildSummary(contacts) {
  const summary = {
    total: contacts.length,
    hot: 0,
    warm: 0,
    nurture: 0,
    new: 0,
    activeSales: 0,
    activeLettings: 0,
    newThisWeek: 0,
    stageBreakdown: new Map(),
    typeBreakdown: new Map(),
    agentBreakdown: new Map(),
  };

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  contacts.forEach((contact) => {
    const { stage, pipeline, createdAtTimestamp, assignedAgentName } = contact;

    if (stage === 'hot') summary.hot += 1;
    if (stage === 'warm') summary.warm += 1;
    if (stage === 'nurture') summary.nurture += 1;
    if (stage === 'new') summary.new += 1;

    if (pipeline === 'sales' && stage !== 'past_client' && stage !== 'archived') {
      summary.activeSales += 1;
    }
    if (pipeline === 'lettings' && stage !== 'past_client' && stage !== 'archived') {
      summary.activeLettings += 1;
    }

    if (createdAtTimestamp && createdAtTimestamp >= weekAgo) {
      summary.newThisWeek += 1;
    }

    const stageKey = contact.stageLabel || 'Unknown';
    summary.stageBreakdown.set(stageKey, (summary.stageBreakdown.get(stageKey) || 0) + 1);

    const typeKey = contact.typeLabel || 'Contact';
    summary.typeBreakdown.set(typeKey, (summary.typeBreakdown.get(typeKey) || 0) + 1);

    const agentKey = assignedAgentName || 'Unassigned';
    summary.agentBreakdown.set(agentKey, (summary.agentBreakdown.get(agentKey) || 0) + 1);
  });

  return {
    total: summary.total,
    hot: summary.hot,
    warm: summary.warm,
    nurture: summary.nurture,
    new: summary.new,
    activeSales: summary.activeSales,
    activeLettings: summary.activeLettings,
    newThisWeek: summary.newThisWeek,
    stageBreakdown: Array.from(summary.stageBreakdown, ([label, count]) => ({ label, count })),
    typeBreakdown: Array.from(summary.typeBreakdown, ([label, count]) => ({ label, count })),
    agentBreakdown: Array.from(summary.agentBreakdown, ([label, count]) => ({ label, count })),
  };
}

function buildFilterOptions(contacts) {
  const types = new Map();
  const stages = new Map();
  const pipelines = new Map();
  const agents = new Map();

  contacts.forEach((contact) => {
    if (contact.type) {
      types.set(contact.type, contact.typeLabel || contact.type);
    }
    if (contact.stage) {
      stages.set(contact.stage, contact.stageLabel || contact.stage);
    }
    if (contact.pipeline) {
      pipelines.set(contact.pipeline, contact.pipelineLabel || contact.pipeline);
    }
    const agentKey = contact.assignedAgentId || 'unassigned';
    const agentLabel = contact.assignedAgentName || 'Unassigned';
    agents.set(agentKey, agentLabel);
  });

  const toOptions = (map) =>
    Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return {
    type: toOptions(types),
    stage: toOptions(stages).sort((a, b) => {
      const stageA = STAGE_METADATA[a.value]?.order ?? 999;
      const stageB = STAGE_METADATA[b.value]?.order ?? 999;
      if (stageA === stageB) {
        return a.label.localeCompare(b.label);
      }
      return stageA - stageB;
    }),
    pipeline: toOptions(pipelines).sort((a, b) => {
      const orderA = PIPELINE_METADATA[a.value]?.order ?? 999;
      const orderB = PIPELINE_METADATA[b.value]?.order ?? 999;
      if (orderA === orderB) {
        return a.label.localeCompare(b.label);
      }
      return orderA - orderB;
    }),
    agent: toOptions(agents),
  };
}

function buildPayload(rawContacts, generatedAt = null) {
  const contacts = (Array.isArray(rawContacts) ? rawContacts : [])
    .map((entry) => normaliseContact(entry))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.lastActivityTimestamp ?? 0;
      const bTime = b.lastActivityTimestamp ?? 0;
      if (aTime === bTime) {
        const stageCompare = (a.stageOrder ?? 999) - (b.stageOrder ?? 999);
        if (stageCompare !== 0) {
          return stageCompare;
        }
        return a.name.localeCompare(b.name);
      }
      return bTime - aTime;
    });

  const summary = buildSummary(contacts);
  const filters = buildFilterOptions(contacts);

  return {
    generatedAt: generatedAt || null,
    contacts,
    summary,
    filters,
  };
}

function getFallbackPayload() {
  return buildPayload(FALLBACK_CONTACTS, FALLBACK_GENERATED_AT);
}

function buildContactsSignature(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const identifier = readFirstString(entry, CONTACT_ID_KEYS);
  if (identifier) {
    return `id:${identifier}`;
  }

  try {
    return `hash:${JSON.stringify(entry)}`;
  } catch (error) {
    return null;
  }
}

async function fetchContactsPage({ page, pageSize }) {
  const searchParams = new URLSearchParams({
    pageSize: String(pageSize),
    order: 'desc',
    sort: 'lastActivity',
    page: String(page),
    pageNumber: String(page),
  });

  if (BRANCH_ID) {
    searchParams.set('branchId', BRANCH_ID);
  }

  const url = `${API_BASE.replace(/\/$/, '')}/contacts?${searchParams.toString()}`;
  const headers = { accept: 'application/json' };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const options = { method: 'GET', headers };
  const dispatcher = getProxyAgent();
  if (dispatcher) {
    options.dispatcher = dispatcher;
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error('Failed to fetch Apex27 contacts', error);
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    console.error('Apex27 API key unauthorized when fetching contacts.');
    return null;
  }

  if (response.status === 429) {
    markRateLimited(response);
    logRateLimitNotice('Rate limited when fetching Apex27 contacts; serving cached data instead.');
    return null;
  }

  if (!response.ok) {
    console.error('Failed to fetch Apex27 contacts', response.status);
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    console.error('Failed to parse Apex27 contacts response', error);
    data = null;
  }

  const rawContacts = findContactCollection(data) || [];
  const generatedAt = extractGeneratedAt(data, response.headers) || new Date().toISOString();

  return { rawContacts, generatedAt };
}

async function fetchContactsFromApi() {
  const aggregated = [];
  const seen = new Set();
  let aggregatedGeneratedAt = null;
  let hadSuccess = false;

  for (let page = 1; page <= MAX_CONTACT_PAGES; page += 1) {
    const result = await fetchContactsPage({ page, pageSize: CONTACTS_PAGE_SIZE });

    if (!result) {
      if (!hadSuccess) {
        return null;
      }
      break;
    }

    hadSuccess = true;
    const { rawContacts, generatedAt } = result;

    if (!aggregatedGeneratedAt && generatedAt) {
      aggregatedGeneratedAt = generatedAt;
    }

    if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
      break;
    }

    let newEntries = 0;
    for (const entry of rawContacts) {
      const signature = buildContactsSignature(entry);
      if (signature && seen.has(signature)) {
        continue;
      }
      if (signature) {
        seen.add(signature);
      }
      aggregated.push(entry);
      newEntries += 1;
    }

    if (newEntries === 0) {
      break;
    }

    if (rawContacts.length < CONTACTS_PAGE_SIZE) {
      break;
    }
  }

  return {
    rawContacts: aggregated,
    generatedAt: aggregatedGeneratedAt || new Date().toISOString(),
  };
}

async function loadContactsFromApi() {
  if (!canAttemptNetwork()) {
    if (rateLimitResetAt > Date.now()) {
      logRateLimitNotice(
        'Skipping Apex27 contacts fetch because a rate limit is active; serving cached data.'
      );
    }
    return null;
  }

  const result = await fetchContactsFromApi();
  if (!result) {
    return null;
  }

  return buildPayload(result.rawContacts, result.generatedAt);
}

export async function listContactsForAdmin({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedPayload;
  }

  if (!forceRefresh && inflightRequest) {
    return inflightRequest;
  }

  const requestPromise = (async () => {
    let payload = null;

    if (API_KEY) {
      try {
        payload = await loadContactsFromApi();
      } catch (error) {
        console.error('Failed to load Apex27 contacts for admin', error);
      }
    }

    if (!payload) {
      payload = getFallbackPayload();
    }

    const finalPayload = applyOverridesToPayload(payload);
    cachedPayload = finalPayload;
    cachedAt = Date.now();
    return finalPayload;
  })();

  inflightRequest = requestPromise;
  try {
    return await requestPromise;
  } finally {
    inflightRequest = null;
  }
}

export async function getContactById(id) {
  const payload = await listContactsForAdmin();
  return payload.contacts.find((contact) => contact.id === id) || null;
}

export async function updateContactById(id, updates = {}) {
  if (!id) {
    throw new ContactValidationError(['Contact ID is required.']);
  }

  const payload = await listContactsForAdmin();
  const contactIndex = payload.contacts.findIndex((contact) => contact.id === id);

  if (contactIndex === -1) {
    return null;
  }

  const currentContact = cloneContact(payload.contacts[contactIndex]);
  const { override, errors } = sanitiseContactUpdateInput(updates);

  if (errors.length) {
    throw new ContactValidationError(errors);
  }

  const existingOverride = contactOverrides.get(id) || {};
  const mergedOverride = mergeOverrides(existingOverride, override);

  const currentAppliedContact = applyOverridesToContact(cloneContact(currentContact), existingOverride);
  const updatedContact = applyOverridesToContact(cloneContact(currentContact), mergedOverride);

  const changed = JSON.stringify(updatedContact) !== JSON.stringify(currentAppliedContact);

  contactOverrides.set(id, mergedOverride);

  if (cachedPayload) {
    const rehydrated = {
      ...cachedPayload,
      contacts: cachedPayload.contacts.map((contact) => cloneContact(contact)),
    };
    cachedPayload = applyOverridesToPayload(rehydrated);
    cachedAt = Date.now();
  }

  if (!changed) {
    return updatedContact;
  }

  const baseContacts = payload.contacts.map((contact) => cloneContact(contact));
  const refreshedPayload = applyOverridesToPayload({ ...payload, contacts: baseContacts });
  cachedPayload = refreshedPayload;
  cachedAt = Date.now();

  return refreshedPayload.contacts.find((contact) => contact.id === id) || updatedContact;
}
