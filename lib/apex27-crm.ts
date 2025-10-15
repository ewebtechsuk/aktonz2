import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type ApexContact = {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  stage: string;
  pipeline: string;
  source: string;
  createdAt: string;
  lastActivityAt: string;
  email: string;
  phone: string | null;
  tags?: string[];
  nextStep?: {
    description: string;
    dueAt: string;
  } | null;
  properties?: ApexProperty[];
};

type ApexProperty = {
  id: string;
  address: string | null;
  type: string | null;
  bedrooms: number | null;
  expectedRent: number | null;
  availableFrom: string | null;
  status: string;
  createdAt: string;
  notes: string | null;
};

type ApexContactsStore = {
  generatedAt: string | null;
  contacts: ApexContact[];
};

const DATA_DIR = path.join(process.cwd(), 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'apex27-contacts.json');

function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: 'Landlord', lastName: 'Aktonz' };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function readContactsStore(): Promise<ApexContactsStore> {
  try {
    const raw = await fs.readFile(CONTACTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const generatedAt = typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null;
      const contacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];
      return { generatedAt, contacts };
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return { generatedAt: null, contacts: [] };
    }
    throw error;
  }

  return { generatedAt: null, contacts: [] };
}

async function writeContactsStore(store: ApexContactsStore): Promise<void> {
  const payload = {
    generatedAt: store.generatedAt,
    contacts: store.contacts,
  };
  await fs.mkdir(path.dirname(CONTACTS_FILE), { recursive: true });
  await fs.writeFile(CONTACTS_FILE, JSON.stringify(payload, null, 2));
}

function normaliseEmail(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.toLowerCase() || null;
}

function buildPropertyNotes(input: {
  propertyType?: string | null;
  bedrooms?: number | null;
  expectedRent?: number | null;
  availableFrom?: string | null;
  notes?: string | null;
}): string | null {
  const parts: string[] = [];

  if (input.propertyType) {
    parts.push(`Type: ${input.propertyType}`);
  }
  if (typeof input.bedrooms === 'number') {
    parts.push(`Bedrooms: ${input.bedrooms}`);
  }
  if (typeof input.expectedRent === 'number') {
    parts.push(`Target rent: £${input.expectedRent.toLocaleString('en-GB')}`);
  }
  if (input.availableFrom) {
    parts.push(`Available from: ${input.availableFrom}`);
  }
  if (input.notes) {
    parts.push(input.notes);
  }

  return parts.length ? parts.join(' | ') : null;
}

function updateContactRecord(
  contact: ApexContact,
  property: ApexProperty,
  nowIso: string,
): ApexContact {
  const tags = new Set<string>(Array.isArray(contact.tags) ? contact.tags : []);
  tags.add('Chatbot');
  tags.add('Landlord');

  const properties = Array.isArray(contact.properties) ? [...contact.properties] : [];
  const existingIndex = properties.findIndex((entry) => {
    if (!entry.address || !property.address) {
      return false;
    }
    return entry.address.toLowerCase() === property.address.toLowerCase();
  });

  if (existingIndex === -1) {
    properties.unshift(property);
  } else {
    properties[existingIndex] = {
      ...properties[existingIndex],
      ...property,
    };
  }

  return {
    ...contact,
    type: 'landlord',
    pipeline: 'lettings',
    stage: contact.stage && contact.stage !== '' ? contact.stage : 'new',
    source: contact.source || 'Chatbot landlord workflow',
    lastActivityAt: nowIso,
    tags: Array.from(tags),
    nextStep: {
      description: 'Confirm valuation appointment from chatbot lead',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    properties,
  };
}

export async function recordLandlordInstruction(entry: {
  name: string;
  email: string;
  phone: string | null;
  propertyAddress: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  expectedRent?: number | null;
  availableFrom?: string | null;
  notes?: string | null;
}): Promise<{ contact: ApexContact; property: ApexProperty }> {
  const nowIso = new Date().toISOString();
  const store = await readContactsStore();
  const normalizedEmail = normaliseEmail(entry.email);

  let contact: ApexContact | null = null;

  if (normalizedEmail) {
    contact = store.contacts.find((candidate) => normaliseEmail(candidate.email) === normalizedEmail) || null;
  }

  const { firstName, lastName } = splitName(entry.name);

  if (!contact) {
    contact = {
      id: `apx-contact-${randomUUID()}`,
      firstName,
      lastName,
      type: 'landlord',
      stage: 'new',
      pipeline: 'lettings',
      source: 'Chatbot landlord workflow',
      createdAt: nowIso,
      lastActivityAt: nowIso,
      email: entry.email,
      phone: entry.phone,
      tags: ['Chatbot', 'Landlord'],
      nextStep: {
        description: 'Confirm valuation appointment from chatbot lead',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      properties: [],
    };
    store.contacts.unshift(contact);
  }

  const property: ApexProperty = {
    id: `apx-property-${randomUUID()}`,
    address: entry.propertyAddress,
    type: entry.propertyType ?? null,
    bedrooms: typeof entry.bedrooms === 'number' ? entry.bedrooms : null,
    expectedRent: typeof entry.expectedRent === 'number' ? entry.expectedRent : null,
    availableFrom: entry.availableFrom ?? null,
    status: 'valuation_requested',
    createdAt: nowIso,
    notes: buildPropertyNotes(entry),
  };

  const updatedContact = updateContactRecord(contact, property, nowIso);

  const index = store.contacts.findIndex((candidate) => candidate.id === updatedContact.id);
  if (index !== -1) {
    store.contacts[index] = updatedContact;
  }

  store.generatedAt = nowIso;
  await writeContactsStore(store);

  return { contact: updatedContact, property };
}

export type { ApexContact, ApexProperty };
