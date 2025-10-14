import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'chatbot-leads.json');
const VIEWINGS_FILE = path.join(DATA_DIR, 'chatbot-viewings.json');

export type JsonValue =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | JsonValue[];

type ChatbotLeadRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  preferences?: JsonValue;
  properties?: JsonValue;
  createdAt: string;
};

type ChatbotViewingRecord = {
  id: string;
  propertyId?: string | null;
  propertyTitle?: string | null;
  propertyAddress?: string | null;
  propertyLink?: string | null;
  transactionType?: string | null;
  scheduledAt: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
};

async function readJsonArray(filePath: string): Promise<JsonValue[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonArray(filePath: string, data: JsonValue[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function appendChatbotLead(entry: {
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  preferences?: JsonValue;
  properties?: JsonValue;
}): Promise<ChatbotLeadRecord> {
  const record: ChatbotLeadRecord = {
    id: randomUUID(),
    name: entry.name,
    email: entry.email,
    phone: entry.phone ?? null,
    source: entry.source ?? 'chat-widget',
    preferences: entry.preferences ?? null,
    properties: entry.properties ?? null,
    createdAt: new Date().toISOString(),
  };

  const existing = await readJsonArray(LEADS_FILE);
  existing.push(record);
  await writeJsonArray(LEADS_FILE, existing);
  return record;
}

export async function appendChatbotViewing(entry: {
  propertyId?: string | null;
  propertyTitle?: string | null;
  propertyAddress?: string | null;
  propertyLink?: string | null;
  transactionType?: string | null;
  scheduledAt: string;
  name: string;
  email: string;
  phone?: string | null;
}): Promise<ChatbotViewingRecord> {
  const record: ChatbotViewingRecord = {
    id: randomUUID(),
    propertyId: entry.propertyId ?? null,
    propertyTitle: entry.propertyTitle ?? null,
    propertyAddress: entry.propertyAddress ?? null,
    propertyLink: entry.propertyLink ?? null,
    transactionType: entry.transactionType ?? null,
    scheduledAt: entry.scheduledAt,
    name: entry.name,
    email: entry.email,
    phone: entry.phone ?? null,
    createdAt: new Date().toISOString(),
  };

  const existing = await readJsonArray(VIEWINGS_FILE);
  existing.push(record);
  await writeJsonArray(VIEWINGS_FILE, existing);
  return record;
}
