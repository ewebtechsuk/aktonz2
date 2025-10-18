import { createRequire } from 'node:module';
import { getProxyAgent } from './proxy-agent.js';

const requireJson = createRequire(import.meta.url);
const maintenanceSource = requireJson('../data/apex27-maintenance.json');

const API_BASE = process.env.APEX27_API_BASE || 'https://api.apex27.co.uk';
const API_KEY = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID || null;

const CACHE_TTL_MS = 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120_000;

const FALLBACK_TASKS = Array.isArray(maintenanceSource?.tasks) ? maintenanceSource.tasks : [];

let cachedTasks = null;
let cachedAt = 0;
let inflightRequest = null;
let rateLimitResetAt = 0;
let lastRateLimitLogAt = 0;

const STATUS_DEFINITIONS = {
  open: { label: 'Open', category: 'open', tone: 'warning' },
  new: { label: 'Open', category: 'open', tone: 'warning' },
  logged: { label: 'Logged', category: 'open', tone: 'warning' },
  scheduled: { label: 'Scheduled', category: 'progress', tone: 'info' },
  in_progress: { label: 'In progress', category: 'progress', tone: 'info' },
  awaiting_approval: { label: 'Awaiting approval', category: 'progress', tone: 'muted' },
  awaiting_invoice: { label: 'Awaiting invoice', category: 'progress', tone: 'muted' },
  on_hold: { label: 'On hold', category: 'progress', tone: 'muted' },
  completed: { label: 'Completed', category: 'closed', tone: 'success' },
  closed: { label: 'Closed', category: 'closed', tone: 'muted' },
  cancelled: { label: 'Cancelled', category: 'closed', tone: 'muted' },
  deferred: { label: 'Deferred', category: 'closed', tone: 'muted' },
};

const PRIORITY_DEFINITIONS = {
  emergency: { label: 'Emergency', tone: 'danger' },
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'info' },
  routine: { label: 'Routine', tone: 'info' },
};

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function parseDate(value) {
  if (!value) {
    return { iso: null, timestamp: null };
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    if (Number.isFinite(timestamp)) {
      return { iso: value.toISOString(), timestamp };
    }
    return { iso: null, timestamp: null };
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseDate(entry);
      if (parsed.iso) {
        return parsed;
      }
    }
    return { iso: null, timestamp: null };
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return { iso: null, timestamp: null };
  }

  return { iso: date.toISOString(), timestamp };
}

function parseNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.' || cleaned === '.-') {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractPerson(raw) {
  if (!raw || typeof raw !== 'object') {
    return { name: null, email: null, phone: null };
  }

  const nameCandidates = [
    raw.name,
    [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim(),
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim(),
    raw.contactName,
    raw.displayName,
  ];

  const name = nameCandidates.find((entry) => typeof entry === 'string' && entry.trim())?.trim() || null;
  const email = sanitizeString(raw.email || raw.Email || raw.contactEmail || raw.contact_email) || null;
  const phone = sanitizeString(
    raw.phone || raw.phoneNumber || raw.phone_number || raw.mobile || raw.mobilePhone || raw.telephone,
  ) || null;

  return { name, email, phone };
}

function extractProperty(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: null, title: null, address: null };
  }

  const idCandidates = [
    raw.id,
    raw.propertyId,
    raw.property_id,
    raw.listingId,
    raw.listing_id,
    raw.externalId,
    raw.external_id,
    raw.reference,
    raw.fullReference,
  ];

  const id = idCandidates
    .map((entry) => (entry == null ? '' : String(entry).trim()))
    .find((entry) => entry);

  const titleCandidates = [
    raw.title,
    raw.displayAddress,
    raw.addressLine1,
    raw.address1,
    raw.headline,
  ];

  const title = titleCandidates.find((entry) => typeof entry === 'string' && entry.trim())?.trim() || null;

  const addressParts = [
    raw.address,
    raw.displayAddress,
    raw.address1,
    raw.addressLine1,
    raw.addressLine2,
    raw.city,
    raw.postcode,
    raw.postalCode,
  ]
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  const address = addressParts.join(', ') || null;

  return {
    id: id || null,
    title,
    address,
  };
}

function normaliseStatus(value) {
  if (!value) {
    return 'open';
  }
  const token = sanitizeString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (STATUS_DEFINITIONS[token]) {
    return token;
  }
  return 'open';
}

function normalisePriority(value) {
  if (!value) {
    return 'medium';
  }
  const token = sanitizeString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (PRIORITY_DEFINITIONS[token]) {
    return token;
  }
  if (token === 'urgent') {
    return 'emergency';
  }
  return 'medium';
}

function mapTask(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const idCandidates = [entry.id, entry.taskId, entry.task_id, entry.reference];
  const id = idCandidates
    .map((value) => (value == null ? '' : String(value).trim()))
    .find((value) => value);

  if (!id) {
    return null;
  }

  const title = sanitizeString(entry.title || entry.summary || entry.description || '') || 'Maintenance task';
  const description =
    sanitizeString(entry.description || entry.details || entry.notes || entry.summary) ||
    'No additional description provided.';

  const status = normaliseStatus(entry.status || entry.stage || entry.state);
  const statusMeta = STATUS_DEFINITIONS[status] || STATUS_DEFINITIONS.open;

  const priority = normalisePriority(entry.priority || entry.priorityLevel || entry.level);
  const priorityMeta = PRIORITY_DEFINITIONS[priority] || PRIORITY_DEFINITIONS.medium;

  const propertySource = entry.property || entry.listing || entry.unit || entry.asset;
  const property = extractProperty(propertySource || entry);

  const reporter = extractPerson(entry.reporter || entry.contact || entry.tenant || entry.requester);
  const assignee = extractPerson(entry.assignee || entry.contractor || entry.supplier || entry.vendor);

  const { iso: createdAt, timestamp: createdAtTimestamp } = parseDate(
    entry.createdAt || entry.created_at || entry.created || entry.loggedAt,
  );
  const { iso: updatedAt, timestamp: updatedAtTimestamp } = parseDate(
    entry.updatedAt || entry.updated_at || entry.modifiedAt || entry.modified_at || entry.lastUpdated,
  );
  const { iso: dueAt, timestamp: dueTimestamp } = parseDate(
    entry.dueAt || entry.due_at || entry.dueDate || entry.deadline || entry.targetDate,
  );

  const costEstimate = parseNumber(entry.costEstimate || entry.estimate || entry.quote || entry.cost);

  return {
    id,
    title,
    description,
    status,
    statusLabel: statusMeta.label,
    statusCategory: statusMeta.category,
    statusTone: statusMeta.tone,
    priority,
    priorityLabel: priorityMeta.label,
    priorityTone: priorityMeta.tone,
    dueAt,
    dueTimestamp,
    updatedAt,
    updatedAtTimestamp,
    createdAt,
    createdAtTimestamp,
    property,
    reporter,
    assignee,
    category: sanitizeString(entry.category || entry.type || entry.topic) || null,
    costEstimate,
    source: 'apex27',
  };
}

function sortTasks(tasks) {
  return tasks
    .slice()
    .sort((a, b) => {
      const leftDue = a.dueTimestamp ?? Infinity;
      const rightDue = b.dueTimestamp ?? Infinity;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }
      const leftUpdated = a.updatedAtTimestamp ?? 0;
      const rightUpdated = b.updatedAtTimestamp ?? 0;
      return rightUpdated - leftUpdated;
    });
}

function markRateLimited(durationMs) {
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  const resetAt = Date.now() + ms;
  if (resetAt > rateLimitResetAt) {
    rateLimitResetAt = resetAt;
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

async function fetchMaintenanceFromEndpoint(path) {
  const searchParams = new URLSearchParams();
  if (BRANCH_ID) {
    searchParams.set('branchId', BRANCH_ID);
  }
  const url = `${API_BASE.replace(/\/$/, '')}${path}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const headers = { accept: 'application/json' };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const dispatcher = getProxyAgent();
  const options = {
    method: 'GET',
    headers,
    ...(dispatcher ? { dispatcher } : {}),
  };

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error('Failed to fetch Apex27 maintenance tasks', error);
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    console.error('Apex27 maintenance endpoint returned an authorization error.');
    return null;
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after')) * 1000 || DEFAULT_RATE_LIMIT_COOLDOWN_MS;
    markRateLimited(retryAfter);
    logRateLimitNotice('Rate limited when fetching Apex27 maintenance tasks; using cached data.');
    return null;
  }

  if (!response.ok) {
    return null;
  }

  try {
    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    if (Array.isArray(payload?.results)) {
      return payload.results;
    }
    if (Array.isArray(payload?.tasks)) {
      return payload.tasks;
    }
  } catch (error) {
    console.error('Unable to parse Apex27 maintenance response', error);
  }

  return null;
}

async function fetchApexMaintenance() {
  if (!canAttemptNetwork()) {
    return null;
  }

  const endpoints = ['/maintenance-tasks', '/maintenance/tasks', '/maintenance'];
  for (const path of endpoints) {
    const result = await fetchMaintenanceFromEndpoint(path);
    if (Array.isArray(result) && result.length) {
      return result;
    }
  }

  return null;
}

function getFallbackTasks() {
  return sortTasks(FALLBACK_TASKS.map((entry) => mapTask(entry)).filter(Boolean));
}

async function resolveMaintenanceTasks() {
  if (cachedTasks && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedTasks;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const remote = await fetchApexMaintenance();
      const mapped = sortTasks((remote || FALLBACK_TASKS).map((entry) => mapTask(entry)).filter(Boolean));
      cachedTasks = mapped;
      cachedAt = Date.now();
      return mapped;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export async function listApexMaintenanceTasks() {
  try {
    const tasks = await resolveMaintenanceTasks();
    return Array.isArray(tasks) && tasks.length ? tasks : getFallbackTasks();
  } catch (error) {
    console.error('Unable to load Apex27 maintenance tasks, using fallback dataset.', error);
    return getFallbackTasks();
  }
}
