import contactsSource from '../data/apex27-contacts.json' with { type: 'json' };
import agentsSource from '../data/agents.json' with { type: 'json' };

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normaliseKey(value) {
  return sanitizeString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function normaliseDate(value) {
  if (!value) {
    return { iso: null, timestamp: null };
  }

  const date = new Date(value);
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

function formatBudget(budget = {}) {
  if (!budget || typeof budget !== 'object') {
    return { rentMax: null, saleMax: null };
  }

  const rentMax = Number.isFinite(Number(budget.rentMax)) ? Number(budget.rentMax) : null;
  const saleMax = Number.isFinite(Number(budget.saleMax)) ? Number(budget.saleMax) : null;
  return { rentMax, saleMax };
}

function normaliseNextStep(nextStep) {
  if (!nextStep || typeof nextStep !== 'object') {
    return null;
  }

  const description = sanitizeString(nextStep.description);
  const { iso, timestamp } = normaliseDate(nextStep.dueAt);

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
    contact.generatedNotes,
  ];

  contact.tags.forEach((tag) => parts.push(tag));
  contact.requirements.forEach((req) => parts.push(req));

  return parts
    .map((value) => (value == null ? '' : String(value).toLowerCase()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normaliseContact(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = sanitizeString(entry.id);
  if (!id) {
    return null;
  }

  const firstName = sanitizeString(entry.firstName);
  const lastName = sanitizeString(entry.lastName);
  const name = sanitizeString(entry.name) || [firstName, lastName].filter(Boolean).join(' ').trim();

  const typeKey = normaliseKey(entry.type);
  const stageKey = normaliseKey(entry.stage);
  const pipelineKey = normaliseKey(entry.pipeline || TYPE_METADATA[typeKey]?.pipeline || '');

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

  const { iso: createdAt, timestamp: createdAtTimestamp } = normaliseDate(entry.createdAt);
  const { iso: lastActivityAt, timestamp: lastActivityTimestamp } = normaliseDate(entry.lastActivityAt);
  const nextStep = normaliseNextStep(entry.nextStep);
  const source = sanitizeString(entry.source);
  const email = sanitizeString(entry.email).toLowerCase() || null;
  const phone = sanitizeString(entry.phone) || null;
  const locationFocus = sanitizeString(entry.locationFocus) || null;

  const requirements = Array.isArray(entry.requirements)
    ? entry.requirements
        .map((item) => sanitizeString(item))
        .filter(Boolean)
    : [];

  const budget = formatBudget(entry.budget);

  const tags = Array.isArray(entry.tags)
    ? entry.tags.map((tag) => sanitizeString(tag)).filter(Boolean)
    : [];

  const assignedAgentId = sanitizeString(entry.assignedAgentId);
  const assignedAgent = assignedAgentId ? AGENT_MAP.get(assignedAgentId) || null : null;

  const daysInPipeline = createdAtTimestamp
    ? Math.floor((Date.now() - createdAtTimestamp) / (1000 * 60 * 60 * 24))
    : null;

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
    engagementScore: stageMeta.score,
    generatedNotes: sanitizeString(entry.notes) || null,
    daysInPipeline,
  };

  contact.searchIndex = buildSearchIndex(contact);
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

export function listContactsForAdmin() {
  const rawContacts = Array.isArray(contactsSource?.contacts) ? contactsSource.contacts : [];
  const contacts = rawContacts
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
    generatedAt: contactsSource?.generatedAt || null,
    contacts,
    summary,
    filters,
  };
}

export function getContactById(id) {
  const payload = listContactsForAdmin();
  return payload.contacts.find((contact) => contact.id === id) || null;
}
