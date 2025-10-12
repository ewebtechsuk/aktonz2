export const OFFER_STATUS_FLOW = [
  {
    value: 'received',
    label: 'Offer received',
    description: 'Offer captured via the applicant portal and awaiting review.',
    category: 'inbox',
    defaultNote: 'Offer submitted through the applicant workspace.',
  },
  {
    value: 'qualifying',
    label: 'Qualifying offer',
    description: 'Negotiator verifying affordability, documentation and contact details.',
    category: 'progress',
  },
  {
    value: 'landlord_review',
    label: 'Sent to landlord',
    description: 'Offer package shared with the landlord for consideration.',
    category: 'progress',
  },
  {
    value: 'referencing',
    label: 'Referencing & compliance',
    description: 'Referencing checks and compliance pack in progress.',
    category: 'progress',
  },
  {
    value: 'awaiting_documents',
    label: 'Awaiting documents',
    description: 'Outstanding proofs requested from the applicant.',
    category: 'progress',
  },
  {
    value: 'accepted',
    label: 'Offer accepted',
    description: 'Offer accepted subject to contract and move-in arrangements.',
    category: 'success',
    terminal: true,
  },
  {
    value: 'declined',
    label: 'Offer declined',
    description: 'Offer declined by the landlord or vendor.',
    category: 'closed',
    terminal: true,
  },
  {
    value: 'withdrawn',
    label: 'Offer withdrawn',
    description: 'Applicant withdrew their offer.',
    category: 'closed',
    terminal: true,
  },
];

export const DEFAULT_OFFER_STATUS = OFFER_STATUS_FLOW[0].value;

const STATUS_LOOKUP = new Map(OFFER_STATUS_FLOW.map((entry) => [entry.value, entry]));

export function normaliseOfferStatus(value) {
  if (!value) {
    return DEFAULT_OFFER_STATUS;
  }
  const token = String(value).trim().toLowerCase();
  if (STATUS_LOOKUP.has(token)) {
    return token;
  }
  return DEFAULT_OFFER_STATUS;
}

export function getOfferStatusDefinition(value) {
  if (!value) {
    return STATUS_LOOKUP.get(DEFAULT_OFFER_STATUS) || null;
  }
  const token = String(value).trim().toLowerCase();
  return STATUS_LOOKUP.get(token) || STATUS_LOOKUP.get(DEFAULT_OFFER_STATUS) || null;
}

export function formatOfferStatusLabel(value) {
  const definition = getOfferStatusDefinition(value);
  return definition?.label || 'Update';
}

export function isTerminalOfferStatus(value) {
  const definition = getOfferStatusDefinition(value);
  return Boolean(definition?.terminal);
}

export function getOfferStatusOptions() {
  return OFFER_STATUS_FLOW.map((entry) => ({
    value: entry.value,
    label: entry.label,
    description: entry.description,
  }));
}
