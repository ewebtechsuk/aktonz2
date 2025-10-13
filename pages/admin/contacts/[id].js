import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import supportData from '../../../data/ai-support.json';
import agentsData from '../../../data/agents.json';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminContactDetails.module.css';

const STAGE_TONE_CLASS = {
  positive: styles.stagePositive,
  warning: styles.stageWarning,
  info: styles.stageInfo,
  neutral: styles.stageNeutral,
  muted: styles.stageMuted,
};

const SUPPORT_CONTACTS = Array.isArray(supportData?.contacts) ? supportData.contacts : [];
const SUPPORT_LISTING_MAP = new Map();
(Array.isArray(supportData?.listings) ? supportData.listings : []).forEach((listing) => {
  const key = listing?.id ?? listing?.listingId ?? '';
  if (!key) {
    return;
  }
  SUPPORT_LISTING_MAP.set(String(key), listing);
});
const SUPPORT_APPOINTMENTS = Array.isArray(supportData?.appointments) ? supportData.appointments : [];
const SUPPORT_VIEWINGS = Array.isArray(supportData?.viewings) ? supportData.viewings : [];

const MANAGEMENT_STAGE_METADATA = {
  new: { label: 'New enquiry', tone: 'info' },
  nurture: { label: 'Nurture', tone: 'neutral' },
  warm: { label: 'Warm lead', tone: 'warning' },
  hot: { label: 'Hot lead', tone: 'positive' },
  client: { label: 'Active client', tone: 'positive' },
  past_client: { label: 'Past client', tone: 'muted' },
  archived: { label: 'Archived', tone: 'muted' },
};

const MANAGEMENT_PIPELINE_METADATA = {
  sales: { label: 'Sales pipeline', order: 0 },
  lettings: { label: 'Lettings pipeline', order: 10 },
  management: { label: 'Property management', order: 20 },
};

const MANAGEMENT_TYPE_METADATA = {
  buyer: { label: 'Buyer' },
  vendor: { label: 'Vendor' },
  tenant: { label: 'Tenant' },
  landlord: { label: 'Landlord' },
  applicant: { label: 'Applicant' },
};

const MANAGEMENT_SOURCE_OPTIONS = [
  { value: 'Website enquiry', label: 'Website enquiry' },
  { value: 'Portal lead', label: 'Portal lead' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Phone call', label: 'Phone call' },
  { value: 'Campaign', label: 'Campaign' },
];

const AGENT_OPTIONS = Array.isArray(agentsData)
  ? agentsData.map((agent) => ({
      value: String(agent.id),
      label: agent.name,
      phone: agent.phone || null,
    }))
  : [];

const INITIAL_FORM_STATE = Object.freeze({
  stage: '',
  pipeline: '',
  type: '',
  source: '',
  assignedAgentId: '',
  email: '',
  phone: '',
  locationFocus: '',
  tags: '',
  notes: '',
  nextStepDescription: '',
  nextStepDueAt: '',
});

const INITIAL_STATUS_STATE = Object.freeze({
  type: 'idle',
  message: '',
  timestamp: null,
});

function ensureOption(collection, value, label) {
  if (!value) {
    return collection;
  }

  if (!collection.some((option) => option.value === value)) {
    collection = collection.concat({ value, label: label || value });
  }
  return collection;
}

function toInputDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(timestamp - offsetMs);
  return local.toISOString().slice(0, 16);
}

function buildFutureInputDate(daysFromNow, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return toInputDateTime(date.toISOString());
}

function normaliseDateTimeInput(value) {
  if (!value) {
    return { iso: null, timestamp: null };
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return { iso: null, timestamp: null };
  }

  return { iso: new Date(timestamp).toISOString(), timestamp };
}

function normaliseManagementOptions(contact, supportContact) {
  const stageOptions = Object.entries(MANAGEMENT_STAGE_METADATA).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  const pipelineOptions = Object.entries(MANAGEMENT_PIPELINE_METADATA).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  const typeOptions = Object.entries(MANAGEMENT_TYPE_METADATA).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  const enrichedStages = contact
    ? ensureOption(stageOptions, contact.stage, contact.stageLabel)
    : stageOptions;
  const enrichedPipelines = contact
    ? ensureOption(pipelineOptions, contact.pipeline, contact.pipelineLabel)
    : pipelineOptions;
  const enrichedTypes = contact ? ensureOption(typeOptions, contact.type, contact.typeLabel) : typeOptions;
  const enrichedSources = contact ? ensureOption(MANAGEMENT_SOURCE_OPTIONS, contact.source, contact.source) : MANAGEMENT_SOURCE_OPTIONS;

  return {
    stages: enrichedStages,
    pipelines: enrichedPipelines,
    types: enrichedTypes,
    sources: enrichedSources,
    agents: AGENT_OPTIONS,
    preferredAgentId: supportContact?.preferredAgentId ? String(supportContact.preferredAgentId) : null,
  };
}

function buildManagementFormState(contact) {
  if (!contact) {
    return INITIAL_FORM_STATE;
  }

  const nextStepDueAt = contact.nextStep?.dueAt || contact.nextStep?.dueTimestamp;

  return {
    stage: contact.stage || '',
    pipeline: contact.pipeline || '',
    type: contact.type || '',
    source: contact.source || '',
    assignedAgentId: contact.assignedAgentId ? String(contact.assignedAgentId) : '',
    email: contact.email || '',
    phone: contact.phone || '',
    locationFocus: contact.locationFocus || '',
    tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
    notes: contact.generatedNotes || '',
    nextStepDescription: contact.nextStep?.description || '',
    nextStepDueAt: toInputDateTime(nextStepDueAt),
  };
}

function buildManagementPayloadFromState(state, options) {
  const stageMeta = state.stage ? MANAGEMENT_STAGE_METADATA[state.stage] || null : null;
  const pipelineMeta = state.pipeline ? MANAGEMENT_PIPELINE_METADATA[state.pipeline] || null : null;
  const typeMeta = state.type ? MANAGEMENT_TYPE_METADATA[state.type] || null : null;
  const agentOption = state.assignedAgentId ? options?.agents?.find((agent) => agent.value === state.assignedAgentId) || null : null;

  const tags = state.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);

  const due = normaliseDateTimeInput(state.nextStepDueAt);
  const nextStep = state.nextStepDescription || due.iso
    ? {
        description: state.nextStepDescription || 'Follow up scheduled',
        dueAt: due.iso,
        dueTimestamp: due.timestamp,
      }
    : null;

  const contactUpdates = {
    stage: state.stage || '',
    stageLabel: stageMeta?.label || (state.stage ? state.stage.replace(/_/g, ' ') : ''),
    stageTone: stageMeta?.tone || 'neutral',
    pipeline: state.pipeline || '',
    pipelineLabel: pipelineMeta?.label || (state.pipeline ? state.pipeline.replace(/_/g, ' ') : ''),
    pipelineOrder: pipelineMeta?.order ?? null,
    type: state.type || '',
    typeLabel: typeMeta?.label || (state.type ? state.type.replace(/_/g, ' ') : ''),
    source: state.source || '',
    assignedAgentId: state.assignedAgentId || null,
    assignedAgentName: agentOption?.label || null,
    assignedAgent: agentOption
      ? {
          id: agentOption.value,
          name: agentOption.label,
          phone: agentOption.phone || null,
        }
      : null,
    email: state.email || '',
    phone: state.phone || '',
    locationFocus: state.locationFocus || '',
    tags,
    generatedNotes: state.notes || '',
    nextStep,
  };

  if (!nextStep) {
    contactUpdates.nextStep = null;
  }

  return { contactUpdates };
}

function buildStageClass(tone) {
  return STAGE_TONE_CLASS[tone] || styles.stageNeutral;
}

function normalizeRouteParam(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return null;
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return `${minutes} min ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  if (absMs < day) {
    const hours = Math.round(absMs / hour);
    return `${hours} hr${hours !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  if (absMs < week) {
    const days = Math.round(absMs / day);
    return `${days} day${days !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  const weeks = Math.round(absMs / week);
  return `${weeks} wk${weeks !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
}

function formatDueLabel(dueTimestamp) {
  if (!dueTimestamp) {
    return null;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueTimestamp - now) / dayMs);

  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays === 1) {
    return 'Due tomorrow';
  }
  if (diffDays > 1) {
    return `Due in ${diffDays} days`;
  }

  const overdueDays = Math.abs(diffDays);
  if (overdueDays === 1) {
    return '1 day overdue';
  }
  return `${overdueDays} days overdue`;
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    return `£${Math.round(value).toLocaleString('en-GB')}`;
  }
}

function formatBudget(budget = {}) {
  const lines = [];
  if (Number.isFinite(budget.saleMax)) {
    lines.push(`Purchase up to ${formatCurrency(budget.saleMax)}`);
  }
  if (Number.isFinite(budget.rentMax)) {
    lines.push(`Rent up to ${formatCurrency(budget.rentMax)} pcm`);
  }
  return lines;
}

function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normaliseName(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalisePhone(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[^0-9+]/g, '');
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function findSupportContactFor(contact) {
  if (!contact) {
    return null;
  }

  const contactEmail = normaliseEmail(contact.email);
  const contactPhone = normalisePhone(contact.phone);
  const contactName = normaliseName(contact.name);

  return (
    SUPPORT_CONTACTS.find((candidate) => {
      const candidateEmail = normaliseEmail(candidate?.email);
      if (candidateEmail && contactEmail && candidateEmail === contactEmail) {
        return true;
      }

      const candidatePhone = normalisePhone(candidate?.phone);
      if (candidatePhone && contactPhone && candidatePhone === contactPhone) {
        return true;
      }

      const candidateName = normaliseName(candidate?.name);
      if (candidateName && contactName && candidateName === contactName) {
        return true;
      }

      return false;
    }) || null
  );
}

function getSupportListings(listingIds = []) {
  return listingIds
    .map((id) => {
      const key = String(id);
      return SUPPORT_LISTING_MAP.get(key) || null;
    })
    .filter(Boolean);
}

function combineRequirements(primary = [], secondary = []) {
  const seen = new Set();
  const result = [];

  [...primary, ...secondary].forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  });

  return result;
}

function doesOfferMatchContact(offer, contact, supportContact) {
  if (!offer || !contact) {
    return false;
  }

  const offerContactId = String(offer.contactId || offer?.contact?.id || '');
  if (offerContactId) {
    if (offerContactId === String(contact.id)) {
      return true;
    }
    if (supportContact?.id && offerContactId === String(supportContact.id)) {
      return true;
    }
  }

  const contactEmail = normaliseEmail(contact.email);
  const offerEmail = normaliseEmail(offer?.contact?.email || offer?.email);
  if (contactEmail && offerEmail && contactEmail === offerEmail) {
    return true;
  }

  const contactPhone = normalisePhone(contact.phone);
  const offerPhone = normalisePhone(offer?.contact?.phone || offer?.phone);
  if (contactPhone && offerPhone && contactPhone === offerPhone) {
    return true;
  }

  const contactName = normaliseName(contact.name);
  const offerName = normaliseName(offer?.contact?.name || offer?.name);
  if (contactName && offerName && contactName === offerName) {
    return true;
  }

  return false;
}

function buildScheduleEntries(items = []) {
  return items
    .map((item) => {
      const timestamp = parseTimestamp(item.date);
      if (!timestamp) {
        return null;
      }

      return {
        id: item.id || `${item.type || item.kind}-${timestamp}`,
        label: item.label,
        title: item.title,
        location: item.location,
        timestamp,
        dateLabel: formatDateTime(item.date),
        meta: item.meta || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export default function AdminContactDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState('');
  const [relatedOffers, setRelatedOffers] = useState([]);
  const [options, setOptions] = useState(() => normaliseManagementOptions(null, null));
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [formStatus, setFormStatus] = useState(INITIAL_STATUS_STATE);
  const [saving, setSaving] = useState(false);
  const skipSyncRef = useRef(false);

  const contactId = useMemo(() => normalizeRouteParam(router.query.id), [router.query.id]);

  useEffect(() => {
    if (!router.isReady || sessionLoading) {
      return;
    }

    if (!isAdmin) {
      setContact(null);
      setError('Admin access required to view contact details.');
      setLoading(false);
      return;
    }

    if (!contactId) {
      setContact(null);
      setError('Contact not found.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadContact() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/admin/contacts/${encodeURIComponent(contactId)}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setContact(null);
          setError('Contact not found.');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch contact');
        }

        const payload = await response.json();
        if (!payload?.contact) {
          setContact(null);
          setError('Contact not found.');
          return;
        }

        setContact(payload.contact);
        setOptions(normaliseManagementOptions(payload.options));
        setFormState(buildManagementFormState(payload.contact));
        setFormStatus(INITIAL_STATUS_STATE);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error(err);
        setContact(null);
        setError('Unable to load contact right now. Please try again.');
        setOptions(normaliseManagementOptions(null));
        setFormState(INITIAL_FORM_STATE);
        setFormStatus(INITIAL_STATUS_STATE);
      } finally {
        setLoading(false);
      }
    }

    loadContact();

    return () => controller.abort();
  }, [router.isReady, sessionLoading, isAdmin, contactId]);

  const supportContact = useMemo(() => findSupportContactFor(contact), [contact]);

  useEffect(() => {
    if (!contact) {
      setOptions(normaliseManagementOptions(null, supportContact || null));
      if (!skipSyncRef.current) {
        setFormState(INITIAL_FORM_STATE);
        setFormStatus(INITIAL_STATUS_STATE);
      }
      skipSyncRef.current = false;
      return;
    }

    setOptions(normaliseManagementOptions(contact, supportContact));
    if (!skipSyncRef.current) {
      setFormState(buildManagementFormState(contact));
      setFormStatus(INITIAL_STATUS_STATE);
    }
    skipSyncRef.current = false;
  }, [contact, supportContact]);

  const supportListings = useMemo(
    () => getSupportListings(Array.isArray(supportContact?.relatedListings) ? supportContact.relatedListings : []),
    [supportContact?.relatedListings],
  );

  const requirementItems = useMemo(
    () =>
      combineRequirements(
        Array.isArray(contact?.requirements) ? contact.requirements : [],
        Array.isArray(supportContact?.activeRequirements) ? supportContact.activeRequirements : [],
      ),
    [contact?.requirements, supportContact?.activeRequirements],
  );

  const supportSchedule = useMemo(() => {
    if (!supportContact?.id) {
      return [];
    }

    const appointmentEntries = SUPPORT_APPOINTMENTS.filter(
      (entry) => entry.contactId === supportContact.id,
    ).map((entry) => ({
      id: entry.id,
      date: entry.date,
      label: 'Appointment',
      title: entry.type,
      location: entry.location,
      meta: entry.notes || null,
    }));

    const viewingEntries = SUPPORT_VIEWINGS.filter((entry) => entry.contactId === supportContact.id).map((entry) => {
      const listing = entry.propertyId ? SUPPORT_LISTING_MAP.get(String(entry.propertyId)) : null;
      const listingTitle = listing?.title || 'Viewing';
      return {
        id: entry.id,
        date: entry.date,
        label: 'Viewing',
        title: listingTitle,
        location: listing?.address || entry.location,
        meta: listing?.price || null,
      };
    });

    const items = buildScheduleEntries([...appointmentEntries, ...viewingEntries]);
    const now = Date.now();

    return items.filter((item) => item.timestamp >= now - 24 * 60 * 60 * 1000);
  }, [supportContact?.id]);

  const recommendedAgent = useMemo(() => {
    if (!options?.preferredAgentId) {
      return null;
    }
    return options.agents.find((agent) => agent.value === options.preferredAgentId) || null;
  }, [options.agents, options.preferredAgentId]);

  const quickStageActions = useMemo(
    () => [
      {
        key: 'hot',
        label: 'Mark as hot lead',
        stage: 'hot',
        description: 'Priority follow-up and negotiation.',
      },
      {
        key: 'nurture',
        label: 'Move to nurture',
        stage: 'nurture',
        description: 'Keep warm with periodic check-ins.',
      },
      {
        key: 'client',
        label: 'Convert to client',
        stage: 'client',
        description: 'Terms agreed and instruction active.',
      },
    ],
    [],
  );

  const quickNextStepActions = useMemo(
    () => [
      {
        key: 'follow-up-call',
        label: 'Follow-up call tomorrow',
        description: 'Call to confirm feedback and next steps.',
        days: 1,
        hour: 10,
      },
      {
        key: 'send-shortlist',
        label: 'Send shortlist this afternoon',
        description: 'Email curated properties with brochures.',
        days: 0,
        hour: 14,
      },
      {
        key: 'book-viewing',
        label: 'Arrange viewing for Saturday',
        description: 'Coordinate viewing availability with landlord.',
        days: 3,
        hour: 11,
      },
    ],
    [],
  );

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFormStatus(INITIAL_STATUS_STATE);
  };

  const handleQuickStage = (stage) => {
    setFormState((prev) => ({
      ...prev,
      stage,
      pipeline: prev.pipeline || contact?.pipeline || '',
    }));
    setFormStatus(INITIAL_STATUS_STATE);
  };

  const handleNextStepTemplate = (template) => {
    const nextDue = buildFutureInputDate(template.days ?? 0, template.hour ?? 9, template.minute ?? 0);
    setFormState((prev) => ({
      ...prev,
      nextStepDescription: template.description,
      nextStepDueAt: nextDue,
    }));
    setFormStatus(INITIAL_STATUS_STATE);
  };

  const handleResetForm = () => {
    if (!contact) {
      setFormState(INITIAL_FORM_STATE);
      setFormStatus(INITIAL_STATUS_STATE);
      return;
    }

    setFormState(buildManagementFormState(contact));
    setFormStatus(INITIAL_STATUS_STATE);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!contact) {
      return;
    }

    setSaving(true);
    setFormStatus({ type: 'pending', message: 'Saving updates…', timestamp: Date.now() });

    try {
      const { contactUpdates } = buildManagementPayloadFromState(formState, options);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const nextContact = { ...contact, ...contactUpdates };
      skipSyncRef.current = true;
      setContact(nextContact);
      setOptions(normaliseManagementOptions(nextContact, supportContact));
      setFormState(buildManagementFormState(nextContact));
      setFormStatus({
        type: 'success',
        message: 'Contact workspace updated.',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update contact workspace', err);
      setFormStatus({
        type: 'error',
        message: 'Unable to save changes right now. Please try again.',
        timestamp: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  const formStatusHint = formStatus.timestamp ? formatRelativeTime(formStatus.timestamp) : null;
  const formDisabled = !contact || saving || loading;
  const formStatusClasses = [styles.formStatus];
  if (formStatus.type === 'success') {
    formStatusClasses.push(styles.formStatusSuccess);
  } else if (formStatus.type === 'error') {
    formStatusClasses.push(styles.formStatusError);
  } else if (formStatus.type === 'pending') {
    formStatusClasses.push(styles.formStatusPending);
  }
  const formStatusClassName = formStatusClasses.join(' ');

  const lastActivityRelative = contact?.lastActivityTimestamp
    ? formatRelativeTime(contact.lastActivityTimestamp)
    : null;
  const createdRelative = contact?.createdAtTimestamp
    ? formatRelativeTime(contact.createdAtTimestamp)
    : null;
  const daysInPipelineLabel = Number.isFinite(contact?.daysInPipeline)
    ? `${contact.daysInPipeline} day${contact.daysInPipeline === 1 ? '' : 's'}`
    : '—';
  const engagementLabel = Number.isFinite(contact?.engagementScore)
    ? `${contact.engagementScore}/100`
    : '—';
  const budgetLines = contact ? formatBudget(contact.budget) : [];
  const nextStepDueLabel = contact?.nextStep?.dueTimestamp
    ? formatDueLabel(contact.nextStep.dueTimestamp)
    : null;

  useEffect(() => {
    if (!contact) {
      setRelatedOffers([]);
      setOffersError('');
      setOffersLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    async function loadOffers() {
      setOffersLoading(true);
      setOffersError('');

      try {
        const response = await fetch('/api/admin/offers', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }

        const payload = await response.json();
        const offers = Array.isArray(payload?.offers) ? payload.offers : [];
        const filtered = offers.filter((offer) =>
          doesOfferMatchContact(offer, contact, supportContact),
        );

        if (isActive) {
          setRelatedOffers(filtered);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Unable to load offers for contact', err);
        if (isActive) {
          setOffersError('Unable to load related offers right now.');
          setRelatedOffers([]);
        }
      } finally {
        if (isActive) {
          setOffersLoading(false);
        }
      }
    }

    loadOffers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [contact, supportContact]);

  const timelineEvents = useMemo(() => {
    if (!contact) {
      return [];
    }

    const events = [];

    if (contact.lastActivityAt) {
      events.push({
        id: 'last-activity',
        label: 'Last activity',
        value: formatDateTime(contact.lastActivityAt),
        hint: lastActivityRelative,
        timestamp: contact.lastActivityTimestamp || parseTimestamp(contact.lastActivityAt) || 0,
      });
    }

    if (contact.createdAt) {
      events.push({
        id: 'created-at',
        label: 'Contact created',
        value: formatDateTime(contact.createdAt),
        hint: createdRelative,
        timestamp: contact.createdAtTimestamp || parseTimestamp(contact.createdAt) || 0,
      });
    }

    if (Array.isArray(supportContact?.conversations)) {
      supportContact.conversations.forEach((conversation, index) => {
        const timestamp = parseTimestamp(conversation.date) || 0;
        events.push({
          id: `conversation-${index}`,
          label: `${conversation.channel || 'Conversation'} update`,
          value: conversation.summary || 'Interaction recorded in Apex27',
          hint: formatDateTime(conversation.date),
          timestamp,
        });
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [contact, createdRelative, lastActivityRelative, supportContact?.conversations]);

  const pageTitle = contact
    ? `${contact.name} • Admin contacts`
    : 'Contact details • Admin contacts';

  const apexActions = useMemo(() => {
    if (!contact?.links) {
      return [];
    }

    const timeout = setTimeout(() => {
      setFormStatus(INITIAL_STATUS_STATE);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [formStatus]);

  const handleManagementChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleManagementReset = useCallback(() => {
    if (!contact) {
      return;
    }
    setFormState(buildManagementFormState(contact));
    setFormStatus(INITIAL_STATUS_STATE);
  }, [contact]);

  const handleManagementSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!contactId) {
        return;
      }

      setSaving(true);
      setFormStatus(INITIAL_STATUS_STATE);

      try {
        const payload = buildManagementPayloadFromState(formState);
        const response = await fetch(`/api/admin/contacts/${encodeURIComponent(contactId)}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        let result = null;
        try {
          result = await response.json();
        } catch (parseError) {
          result = null;
        }

        if (!response.ok) {
          const message = result?.error || 'Unable to update contact right now. Please try again.';
          const details = Array.isArray(result?.details)
            ? result.details.filter(Boolean).map((item) => String(item))
            : [];
          const error = new Error(message);
          error.details = details;
          throw error;
        }

        if (!result?.contact) {
          throw new Error('Contact not found in response.');
        }

        setContact(result.contact);
        setOptions(normaliseManagementOptions(result.options));
        setFormState(buildManagementFormState(result.contact));
        setFormStatus({ type: 'success', message: 'Contact updated successfully.', details: [] });
      } catch (submitError) {
        console.error('Failed to update contact', submitError);
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : 'Unable to update contact right now. Please try again.';
        const details = Array.isArray(submitError?.details)
          ? submitError.details.filter(Boolean).map((item) => String(item))
          : [];
        setFormStatus({ type: 'error', message, details });
      } finally {
        setSaving(false);
      }
    },
    [contactId, formState],
  );

  const headerPrimaryActions = useMemo(() => {
    if (!apexActions.length) {
      return [];
    }

    const preferredKeys = new Set(['update', 'newTask', 'tasks']);
    const primary = apexActions.filter((action) => preferredKeys.has(action.key)).slice(0, 2);
    if (primary.length < 2) {
      apexActions.some((action) => {
        if (primary.find((entry) => entry.key === action.key)) {
          return false;
        }
        primary.push(action);
        return primary.length >= 2;
      });
    }
    return primary;
  }, [apexActions]);

  const stageOptions = useMemo(() => {
    const entries = [...options.stage];
    if (formState.stage && !entries.some((option) => option.value === formState.stage)) {
      entries.unshift({ value: formState.stage, label: contact?.stageLabel || formState.stage });
    }
    return entries;
  }, [options.stage, formState.stage, contact?.stageLabel]);

  const pipelineOptions = useMemo(() => {
    const entries = [...options.pipeline];
    if (formState.pipeline && !entries.some((option) => option.value === formState.pipeline)) {
      entries.unshift({ value: formState.pipeline, label: contact?.pipelineLabel || formState.pipeline });
    }
    return entries;
  }, [options.pipeline, formState.pipeline, contact?.pipelineLabel]);

  const typeOptions = useMemo(() => {
    const entries = [...options.type];
    if (formState.type && !entries.some((option) => option.value === formState.type)) {
      entries.unshift({ value: formState.type, label: contact?.typeLabel || formState.type });
    }
    return entries;
  }, [options.type, formState.type, contact?.typeLabel]);

  const agentOptions = useMemo(() => {
    const entries = [...options.agent];
    if (formState.assignedAgentId && !entries.some((option) => option.value === formState.assignedAgentId)) {
      entries.unshift({
        value: formState.assignedAgentId,
        label: contact?.assignedAgentName || formState.assignedAgentId,
      });
    }
    return entries;
  }, [options.agent, formState.assignedAgentId, contact?.assignedAgentName]);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">Operations</Link>
              <span aria-hidden="true"> / </span>
              <Link href="/admin/contacts">Contacts</Link>
              {contact ? (
                <>
                  <span aria-hidden="true"> / </span>
                  <span>{contact.name}</span>
                </>
              ) : null}
            </p>
            <div className={styles.headerMain}>
              <div className={styles.headerContent}>
                <div className={styles.headerTitle}>
                  <h1>
                    {contact
                      ? contact.name
                      : loading
                      ? 'Loading contact…'
                      : error
                      ? 'Contact unavailable'
                      : 'Contact details'}
                  </h1>
                  {contact ? (
                    <span className={`${styles.stageBadge} ${buildStageClass(contact.stageTone)}`}>
                      {contact.stageLabel}
                    </span>
                  ) : null}
                </div>
                {contact ? (
                  <>
                    <div className={styles.headerMeta}>
                      {contact.typeLabel ? <span className={styles.metaPill}>{contact.typeLabel}</span> : null}
                      {contact.pipelineLabel ? (
                        <span className={styles.metaPill}>{contact.pipelineLabel}</span>
                      ) : null}
                      {contact.source ? <span className={styles.metaPill}>Source: {contact.source}</span> : null}
                    </div>
                    {supportContact?.searchFocus ? (
                      <p className={styles.locationFocus}>{supportContact.searchFocus}</p>
                    ) : contact.locationFocus ? (
                      <p className={styles.locationFocus}>Primary focus: {contact.locationFocus}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className={styles.headerActions}>
                {contact?.lastActivityAt ? (
                  <div className={styles.headerMetric}>
                    <span className={styles.metricLabel}>Last activity</span>
                    <span className={styles.metricValue}>{formatDateTime(contact.lastActivityAt)}</span>
                    {lastActivityRelative ? (
                      <span className={styles.metricHint}>{lastActivityRelative}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className={styles.headerButtons}>
                  {headerPrimaryActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className={
                        action.key === 'update' ? styles.primaryHeaderButton : styles.secondaryHeaderButton
                      }
                      onClick={() => openInNewTab(action.href)}
                    >
                      {action.label}
                    </button>
                  ))}
                  <Link href="/admin/contacts" className={styles.backLink}>
                    ← Back to contacts
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {loading ? (
            <section className={styles.stateCard} aria-live="polite">
              <p>Loading contact details…</p>
            </section>
          ) : error ? (
            <section className={`${styles.stateCard} ${styles.errorState}`} role="alert">
              <p>{error}</p>
              <p>
                <Link href="/admin/contacts">Return to contacts</Link>
              </p>
            </section>
          ) : contact ? (
            <div className={styles.contentGrid}>
              <div className={styles.columnStack}>
                <section className={`${styles.card} ${styles.summaryCard}`} aria-labelledby="contact-overview">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-overview">Contact overview</h2>
                  </div>
                  <div className={styles.metricGrid}>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Stage</span>
                      <span className={styles.metricValue}>{contact.stageLabel || '—'}</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Pipeline</span>
                      <span className={styles.metricValue}>{contact.pipelineLabel || '—'}</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Days active</span>
                      <span className={styles.metricValue}>{daysInPipelineLabel}</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Engagement</span>
                      <span className={styles.metricValue}>{engagementLabel}</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Created</span>
                      <span className={styles.metricValue}>{formatDateTime(contact.createdAt)}</span>
                      {createdRelative ? <span className={styles.metricHint}>{createdRelative}</span> : null}
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Last activity</span>
                      <span className={styles.metricValue}>{formatDateTime(contact.lastActivityAt)}</span>
                      {lastActivityRelative ? <span className={styles.metricHint}>{lastActivityRelative}</span> : null}
                    </div>
                  </div>
                </section>

                <section className={styles.card} aria-labelledby="contact-requirements">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-requirements">Focus &amp; requirements</h2>
                  </div>
                  {supportContact?.searchFocus || contact.locationFocus ? (
                    <p className={styles.focusHighlight}>
                      {supportContact?.searchFocus || contact.locationFocus}
                    </p>
                  ) : null}
                  {contact.locationFocus && supportContact?.searchFocus &&
                  contact.locationFocus !== supportContact.searchFocus ? (
                    <p className={styles.fieldHint}>Primary area: {contact.locationFocus}</p>
                  ) : null}
                  {requirementItems.length ? (
                    <ul className={styles.requirementList}>
                      {requirementItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyNote}>No specific requirements recorded yet.</p>
                  )}
                  {budgetLines.length ? (
                    <div className={styles.budgetPills}>
                      {budgetLines.map((line) => (
                        <span key={line} className={styles.budgetPill}>
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className={styles.card} aria-labelledby="contact-notes">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-notes">Insights &amp; notes</h2>
                  </div>
                  {supportContact?.summary ? (
                    <p className={styles.summaryNote}>{supportContact.summary}</p>
                  ) : null}
                  {contact.generatedNotes ? (
                    <div className={styles.notesBody}>
                      <p>{contact.generatedNotes}</p>
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No additional notes have been added for this contact.</p>
                  )}
                  {Array.isArray(contact?.tags) && contact.tags.length ? (
                    <div>
                      <span className={styles.fieldLabel}>Tags</span>
                      <div className={styles.tagsRow}>
                        {contact.tags.map((tag) => (
                          <span key={tag} className={styles.tagChip}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                {supportListings.length ? (
                  <section className={styles.card} aria-labelledby="contact-properties">
                    <div className={styles.cardHeader}>
                      <h2 id="contact-properties">Active properties</h2>
                    </div>
                    <ul className={styles.propertyList}>
                      {supportListings.map((listing) => {
                        const href = typeof listing.link === 'string' && listing.link ? listing.link : null;
                        return (
                          <li key={listing.id} className={styles.propertyItem}>
                            <div className={styles.propertyHeader}>
                              <span className={styles.propertyTitle}>{listing.title}</span>
                              {listing.price ? <span className={styles.propertyPrice}>{listing.price}</span> : null}
                            </div>
                            <div className={styles.propertyMeta}>
                              {listing.address ? <span>{listing.address}</span> : null}
                              {listing.status ? <span>Status: {listing.status}</span> : null}
                            </div>
                            {Array.isArray(listing.tags) && listing.tags.length ? (
                              <div className={styles.propertyTags}>
                                {listing.tags.map((tag) => (
                                  <span key={tag}>{tag}</span>
                                ))}
                              </div>
                            ) : null}
                            {href ? (
                              <a
                                href={href}
                                target={href.startsWith('/') ? '_self' : '_blank'}
                                rel={href.startsWith('/') ? undefined : 'noreferrer'}
                                className={styles.propertyLink}
                              >
                                View listing
                              </a>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}
              </div>

              <div className={styles.columnStack}>
                <section
                  className={`${styles.card} ${styles.managementCard}`}
                  aria-labelledby="contact-management"
                >
                  <div className={styles.cardHeader}>
                    <h2 id="contact-management">Manage contact workspace</h2>
                    <p className={styles.cardHint}>
                      Update the stage, ownership and follow-up plan to mirror the Apex27 manage contact view.
                    </p>
                  </div>
                  <form className={styles.managementForm} onSubmit={handleSubmit} noValidate>
                    {quickStageActions.length ? (
                      <div className={styles.quickActionRow}>
                        {quickStageActions.map((action) => (
                          <button
                            key={action.key}
                            type="button"
                            className={styles.managementQuickButton}
                            onClick={() => handleQuickStage(action.stage)}
                            disabled={formDisabled}
                          >
                            <span className={styles.quickActionLabel}>{action.label}</span>
                            {action.description ? (
                              <span className={styles.quickActionHint}>{action.description}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Stage &amp; pipeline</h3>
                        <p>Keep the contact aligned with the right workflow.</p>
                      </div>
                      <div className={styles.managementGrid}>
                        <label className={styles.formControl} htmlFor="management-stage">
                          <span className={styles.formLabel}>Stage</span>
                          <select
                            id="management-stage"
                            className={styles.selectInput}
                            value={formState.stage}
                            onChange={handleFieldChange('stage')}
                            disabled={formDisabled}
                          >
                            <option value="">Select stage</option>
                            {options.stages.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.formControl} htmlFor="management-pipeline">
                          <span className={styles.formLabel}>Pipeline</span>
                          <select
                            id="management-pipeline"
                            className={styles.selectInput}
                            value={formState.pipeline}
                            onChange={handleFieldChange('pipeline')}
                            disabled={formDisabled}
                          >
                            <option value="">Select pipeline</option>
                            {options.pipelines.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Ownership &amp; source</h3>
                        <p>Assign the right owner and capture where the lead originated.</p>
                      </div>
                      <div className={styles.managementGrid}>
                        <label className={styles.formControl} htmlFor="management-type">
                          <span className={styles.formLabel}>Contact type</span>
                          <select
                            id="management-type"
                            className={styles.selectInput}
                            value={formState.type}
                            onChange={handleFieldChange('type')}
                            disabled={formDisabled}
                          >
                            <option value="">Select type</option>
                            {options.types.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.formControl} htmlFor="management-source">
                          <span className={styles.formLabel}>Source</span>
                          <select
                            id="management-source"
                            className={styles.selectInput}
                            value={formState.source}
                            onChange={handleFieldChange('source')}
                            disabled={formDisabled}
                          >
                            <option value="">Select source</option>
                            {options.sources.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.formControl} htmlFor="management-agent">
                          <span className={styles.formLabel}>Assigned agent</span>
                          <select
                            id="management-agent"
                            className={styles.selectInput}
                            value={formState.assignedAgentId}
                            onChange={handleFieldChange('assignedAgentId')}
                            disabled={formDisabled}
                          >
                            <option value="">Unassigned</option>
                            {options.agents.map((agent) => (
                              <option key={agent.value} value={agent.value}>
                                {agent.label}
                              </option>
                            ))}
                          </select>
                          {recommendedAgent ? (
                            <span className={styles.fieldHint}>Suggested: {recommendedAgent.label}</span>
                          ) : null}
                        </label>
                      </div>
                    </div>

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Contact details</h3>
                        <p>Ensure call and email details are ready for the next touchpoint.</p>
                      </div>
                      <div className={styles.managementGrid}>
                        <label className={styles.formControl} htmlFor="management-email">
                          <span className={styles.formLabel}>Email</span>
                          <input
                            id="management-email"
                            type="email"
                            className={styles.textInput}
                            value={formState.email}
                            onChange={handleFieldChange('email')}
                            disabled={formDisabled}
                            placeholder="name@example.com"
                          />
                        </label>
                        <label className={styles.formControl} htmlFor="management-phone">
                          <span className={styles.formLabel}>Phone</span>
                          <input
                            id="management-phone"
                            type="tel"
                            className={styles.textInput}
                            value={formState.phone}
                            onChange={handleFieldChange('phone')}
                            disabled={formDisabled}
                            placeholder="+44 20 0000 0000"
                          />
                        </label>
                      </div>
                    </div>

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Focus &amp; tags</h3>
                        <p>Capture location focus and quick tags for matching.</p>
                      </div>
                      <div className={styles.managementGrid}>
                        <label className={styles.formControl} htmlFor="management-focus">
                          <span className={styles.formLabel}>Location focus</span>
                          <input
                            id="management-focus"
                            type="text"
                            className={styles.textInput}
                            value={formState.locationFocus}
                            onChange={handleFieldChange('locationFocus')}
                            disabled={formDisabled}
                            placeholder="Preferred areas"
                          />
                        </label>
                        <label className={styles.formControl} htmlFor="management-tags">
                          <span className={styles.formLabel}>Tags</span>
                          <input
                            id="management-tags"
                            type="text"
                            className={styles.textInput}
                            value={formState.tags}
                            onChange={handleFieldChange('tags')}
                            disabled={formDisabled}
                            placeholder="Comma separated tags"
                          />
                          <span className={styles.fieldHint}>Separate tags with commas.</span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Next step</h3>
                        <p>Set a committed action and due date to keep momentum.</p>
                      </div>
                      <div className={styles.managementGrid}>
                        <label className={styles.formControl} htmlFor="management-next-description">
                          <span className={styles.formLabel}>Action</span>
                          <textarea
                            id="management-next-description"
                            className={styles.textareaInput}
                            value={formState.nextStepDescription}
                            onChange={handleFieldChange('nextStepDescription')}
                            disabled={formDisabled}
                            rows={3}
                            placeholder="Outline the follow-up task"
                          />
                        </label>
                        <label className={styles.formControl} htmlFor="management-next-due">
                          <span className={styles.formLabel}>Due date</span>
                          <input
                            id="management-next-due"
                            type="datetime-local"
                            className={styles.textInput}
                            value={formState.nextStepDueAt}
                            onChange={handleFieldChange('nextStepDueAt')}
                            disabled={formDisabled}
                          />
                        </label>
                      </div>
                      {quickNextStepActions.length ? (
                        <div className={styles.quickTemplateRow}>
                          {quickNextStepActions.map((template) => (
                            <button
                              key={template.key}
                              type="button"
                              className={styles.managementQuickButton}
                              onClick={() => handleNextStepTemplate(template)}
                              disabled={formDisabled}
                            >
                              <span className={styles.quickActionLabel}>{template.label}</span>
                              <span className={styles.quickActionHint}>{template.description}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.managementFieldset}>
                      <div className={styles.managementFieldsetHeader}>
                        <h3>Internal notes</h3>
                        <p>Share key talking points that should surface in Apex27.</p>
                      </div>
                      <label className={styles.formControl} htmlFor="management-notes">
                        <span className={styles.formLabel}>Notes</span>
                        <textarea
                          id="management-notes"
                          className={styles.textareaInput}
                          value={formState.notes}
                          onChange={handleFieldChange('notes')}
                          disabled={formDisabled}
                          rows={4}
                          placeholder="Notes to sync with Apex27"
                        />
                      </label>
                    </div>

                    {formStatus.message ? (
                      <div className={formStatusClassName} role={formStatus.type === 'error' ? 'alert' : undefined}>
                        <span>{formStatus.message}</span>
                        {formStatusHint ? <span className={styles.formStatusHint}>{formStatusHint}</span> : null}
                      </div>
                    ) : null}

                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.secondaryFormButton}
                        onClick={handleResetForm}
                        disabled={formDisabled}
                      >
                        Reset
                      </button>
                      <button type="submit" className={styles.primaryFormButton} disabled={formDisabled}>
                        {saving ? 'Saving…' : 'Save updates'}
                      </button>
                    </div>
                  </form>
                </section>

                {apexActions.length ? (
                  <section
                    className={`${styles.card} ${styles.quickActionsCard}`}
                    aria-labelledby="contact-apex-actions"
                  >
                    <div className={styles.cardHeader}>
                      <h2 id="contact-apex-actions">Manage in Apex27</h2>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-stage" className={styles.formLabel}>
                          Stage
                        </label>
                        <select
                          id="contact-stage"
                          name="stage"
                          className={styles.select}
                          value={formState.stage}
                          onChange={handleManagementChange}
                          disabled={!contact || saving || !stageOptions.length}
                        >
                          {stageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-pipeline" className={styles.formLabel}>
                          Pipeline
                        </label>
                        <select
                          id="contact-pipeline"
                          name="pipeline"
                          className={styles.select}
                          value={formState.pipeline}
                          onChange={handleManagementChange}
                          disabled={!contact || saving || !pipelineOptions.length}
                        >
                          {pipelineOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-agent" className={styles.formLabel}>
                          Assigned to
                        </label>
                        <select
                          id="contact-agent"
                          name="assignedAgentId"
                          className={styles.select}
                          value={formState.assignedAgentId}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        >
                          <option value="">Unassigned</option>
                          {agentOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-source" className={styles.formLabel}>
                          Source
                        </label>
                        <input
                          id="contact-source"
                          name="source"
                          type="text"
                          className={styles.input}
                          value={formState.source}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-email" className={styles.formLabel}>
                          Email
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          className={styles.input}
                          value={formState.email}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="email"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-phone" className={styles.formLabel}>
                          Phone
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          className={styles.input}
                          value={formState.phone}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="tel"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-location" className={styles.formLabel}>
                          Location focus
                        </label>
                        <input
                          id="contact-location"
                          name="locationFocus"
                          type="text"
                          className={styles.input}
                          value={formState.locationFocus}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-budget-sale" className={styles.formLabel}>
                          Purchase budget (£)
                        </label>
                        <input
                          id="contact-budget-sale"
                          name="budgetSaleMax"
                          type="number"
                          min="0"
                          step="1"
                          className={styles.input}
                          value={formState.budgetSaleMax}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-budget-rent" className={styles.formLabel}>
                          Rent budget (£pcm)
                        </label>
                        <input
                          id="contact-budget-rent"
                          name="budgetRentMax"
                          type="number"
                          min="0"
                          step="1"
                          className={styles.input}
                          value={formState.budgetRentMax}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-tags" className={styles.formLabel}>
                          Tags
                        </label>
                        <textarea
                          id="contact-tags"
                          name="tags"
                          className={styles.textarea}
                          value={formState.tags}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                        <p className={styles.fieldHint}>Separate entries with commas or new lines.</p>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-requirements" className={styles.formLabel}>
                          Requirements
                        </label>
                        <textarea
                          id="contact-requirements"
                          name="requirements"
                          className={styles.textarea}
                          value={formState.requirements}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                        <p className={styles.fieldHint}>Separate entries with commas or new lines.</p>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-next-step" className={styles.formLabel}>
                          Next step description
                        </label>
                        <textarea
                          id="contact-next-step"
                          name="nextStepDescription"
                          className={styles.textarea}
                          value={formState.nextStepDescription}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                      <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                        <div className={styles.formRow}>
                          <label htmlFor="contact-next-step-date" className={styles.formLabel}>
                            Due date
                          </label>
                          <input
                            id="contact-next-step-date"
                            name="nextStepDueDate"
                            type="date"
                            className={styles.input}
                            value={formState.nextStepDueDate}
                            onChange={handleManagementChange}
                            disabled={!contact || saving}
                          />
                        </div>
                        <div className={styles.formRow}>
                          <label htmlFor="contact-next-step-time" className={styles.formLabel}>
                            Due time
                          </label>
                          <input
                            id="contact-next-step-time"
                            name="nextStepDueTime"
                            type="time"
                            className={styles.input}
                            value={formState.nextStepDueTime}
                            onChange={handleManagementChange}
                            disabled={!contact || saving}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-notes-field" className={styles.formLabel}>
                          Notes
                        </label>
                        <textarea
                          id="contact-notes-field"
                          name="generatedNotes"
                          className={styles.textarea}
                          value={formState.generatedNotes}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryButton} disabled={!contact || saving}>
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleManagementReset}
                        disabled={!contact || saving}
                      >
                        Reset
                      </button>
                      {formStatus.message ? (
                        <p
                          className={`${styles.statusMessage} ${
                            formStatus.type === 'success'
                              ? styles.statusSuccess
                              : formStatus.type === 'error'
                              ? styles.statusError
                              : ''
                          }`}
                        >
                          {formStatus.message}
                        </p>
                      ) : null}
                    </div>

                    {formStatus.details?.length ? (
                      <ul
                        className={`${styles.statusDetails} ${
                          formStatus.type === 'error' ? styles.statusError : styles.statusSuccess
                        }`}
                      >
                        {formStatus.details.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </form>
                </section>

                <section className={`${styles.card} ${styles.nextStepCard}`} aria-labelledby="contact-next-step">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-next-step">Next step</h2>
                  </div>
                  {contact.nextStep ? (
                    <div className={styles.nextStepBody}>
                      <p className={styles.nextStepDescription}>{contact.nextStep.description}</p>
                      <div className={styles.nextStepDue}>
                        {contact.nextStep.dueAt ? <span>{formatDateTime(contact.nextStep.dueAt)}</span> : null}
                        {nextStepDueLabel ? <span>{nextStepDueLabel}</span> : null}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No upcoming tasks scheduled.</p>
                  )}
                </section>

                <section className={styles.card} aria-labelledby="contact-communication">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-communication">Contact details</h2>
                  </div>
                  <dl className={styles.contactList}>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{contact.source || '—'}</dd>
                    </div>
                    <div>
                      <dt>Preferred pipeline</dt>
                      <dd>{contact.pipelineLabel || '—'}</dd>
                    </div>
                    <div>
                      <dt>Contact type</dt>
                      <dd>{contact.typeLabel || '—'}</dd>
                    </div>
                  </dl>
                </section>

                <section className={styles.card} aria-labelledby="contact-team">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-team">Team &amp; ownership</h2>
                  </div>
                  {contact.assignedAgentName || supportContact?.preferredAgentId ? (
                    <dl className={styles.contactList}>
                      {contact.assignedAgentName ? (
                        <div>
                          <dt>Owner</dt>
                          <dd>{contact.assignedAgentName}</dd>
                        </div>
                      ) : null}
                      {contact.assignedAgent?.phone ? (
                        <div>
                          <dt>Owner phone</dt>
                          <dd>
                            <a href={`tel:${contact.assignedAgent.phone}`}>{contact.assignedAgent.phone}</a>
                          </dd>
                        </div>
                      ) : null}
                      {supportContact?.preferredAgentId ? (
                        <div>
                          <dt>Preferred Apex27 agent</dt>
                          <dd>{supportContact.preferredAgentId}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className={styles.emptyNote}>This contact is not yet assigned to a team member.</p>
                  )}
                </section>

                {supportSchedule.length ? (
                  <section className={styles.card} aria-labelledby="contact-schedule">
                    <div className={styles.cardHeader}>
                      <h2 id="contact-schedule">Upcoming activity</h2>
                    </div>
                    <ul className={styles.scheduleList}>
                      {supportSchedule.map((item) => (
                        <li key={item.id} className={styles.scheduleItem}>
                          <div className={styles.scheduleHeader}>
                            <span className={styles.scheduleLabel}>{item.label}</span>
                            <span className={styles.scheduleDate}>{item.dateLabel}</span>
                          </div>
                          <p className={styles.scheduleTitle}>{item.title}</p>
                          {item.location ? <p className={styles.scheduleMeta}>{item.location}</p> : null}
                          {item.meta ? <p className={styles.scheduleMeta}>{item.meta}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className={styles.card} aria-labelledby="contact-offers">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-offers">Offers &amp; negotiations</h2>
                  </div>
                  {offersLoading ? (
                    <p className={styles.emptyNote}>Checking for related offers…</p>
                  ) : offersError ? (
                    <p className={styles.emptyNote}>{offersError}</p>
                  ) : relatedOffers.length ? (
                    <ul className={styles.offerList}>
                      {relatedOffers.map((offer) => (
                        <li key={offer.id || `${offer.contactId}-${offer.propertyId}`} className={styles.offerItem}>
                          <div className={styles.offerHeader}>
                            <span className={styles.offerAmount}>{offer.amount || 'Offer recorded'}</span>
                            <span className={styles.offerStatus}>{offer.statusLabel || offer.status || 'Status unknown'}</span>
                          </div>
                          {offer.property?.title ? (
                            <p className={styles.offerMeta}>Property: {offer.property.title}</p>
                          ) : null}
                          {offer.contact?.name && offer.contact?.name !== contact.name ? (
                            <p className={styles.offerMeta}>Submitted by {offer.contact.name}</p>
                          ) : null}
                          {offer.date ? (
                            <p className={styles.offerMeta}>Updated {formatDateTime(offer.date)}</p>
                          ) : null}
                          {offer.notes ? <p className={styles.offerNotes}>{offer.notes}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyNote}>No offers are linked to this contact yet.</p>
                  )}
                </section>

                <section className={styles.card} aria-labelledby="contact-timeline">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-timeline">Engagement timeline</h2>
                  </div>
                  {timelineEvents.length ? (
                    <div className={styles.timeline}>
                      {timelineEvents.map((event) => (
                        <div key={event.id} className={styles.timelineItem}>
                          <span className={styles.timelineLabel}>{event.label}</span>
                          <span className={styles.timelineValue}>{event.value}</span>
                          {event.hint ? <span className={styles.timelineHint}>{event.hint}</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No recent engagement has been recorded.</p>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
