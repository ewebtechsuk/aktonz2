import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.join(process.cwd(), 'data', 'apex27-diary.json');

function toIsoDate(value) {
  if (!(value instanceof Date)) {
    return null;
  }

  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeAttendee(attendee) {
  if (!attendee || typeof attendee !== 'object') {
    return null;
  }

  const name = typeof attendee.name === 'string' ? attendee.name.trim() : '';
  if (!name) {
    return null;
  }

  const role =
    typeof attendee.role === 'string' && attendee.role.trim() ? attendee.role.trim() : null;
  const email =
    typeof attendee.email === 'string' && attendee.email.trim() ? attendee.email.trim() : null;

  return { name, role, email };
}

function normalizeLink(link) {
  if (!link || typeof link !== 'object') {
    return null;
  }

  const label = typeof link.label === 'string' ? link.label.trim() : '';
  const href = typeof link.href === 'string' ? link.href.trim() : '';

  if (!label || !href) {
    return null;
  }

  return { label, href };
}

function normalizeProperty(property) {
  if (!property || typeof property !== 'object') {
    return null;
  }

  const id = typeof property.id === 'string' ? property.id.trim() : null;
  const address = typeof property.address === 'string' ? property.address.trim() : null;
  const href = typeof property.href === 'string' ? property.href.trim() : null;

  if (!id && !address && !href) {
    return null;
  }

  return {
    id,
    address,
    href,
  };
}

function normaliseEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }

  const id = typeof rawEvent.id === 'string' ? rawEvent.id.trim() : null;
  const title = typeof rawEvent.title === 'string' ? rawEvent.title.trim() : null;
  const type = typeof rawEvent.type === 'string' ? rawEvent.type.trim() : null;
  const status = typeof rawEvent.status === 'string' ? rawEvent.status.trim() : null;
  const startDate = parseDate(rawEvent.start);
  const endDate = parseDate(rawEvent.end) || (startDate ? new Date(startDate.getTime() + 30 * 60000) : null);

  if (!id || !title || !startDate) {
    return null;
  }

  const negotiator =
    typeof rawEvent.negotiator === 'string' && rawEvent.negotiator.trim()
      ? rawEvent.negotiator.trim()
      : null;
  const location =
    typeof rawEvent.location === 'string' && rawEvent.location.trim() ? rawEvent.location.trim() : null;
  const notes = typeof rawEvent.notes === 'string' && rawEvent.notes.trim() ? rawEvent.notes.trim() : null;

  const attendees = Array.isArray(rawEvent.attendees)
    ? rawEvent.attendees.map(normalizeAttendee).filter(Boolean)
    : [];
  const links = Array.isArray(rawEvent.links) ? rawEvent.links.map(normalizeLink).filter(Boolean) : [];

  const property = normalizeProperty(rawEvent.property);

  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);
  const dayKey = startIso ? startIso.slice(0, 10) : null;

  return {
    id,
    title,
    type: type || null,
    status: status || null,
    negotiator,
    location,
    notes,
    attendees,
    links,
    property,
    start: startIso,
    end: endIso,
    dayKey,
  };
}

async function readDiaryStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const generatedAt =
      parsed && typeof parsed.generatedAt === 'string' && parsed.generatedAt.trim()
        ? parsed.generatedAt.trim()
        : null;
    const events = Array.isArray(parsed?.events) ? parsed.events : [];

    return {
      generatedAt,
      events,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { generatedAt: null, events: [] };
    }

    throw error;
  }
}

function isWithinRange(event, fromDate, toDate) {
  if (!event.start) {
    return false;
  }

  const eventDate = parseDate(event.start);
  if (!eventDate) {
    return false;
  }

  if (fromDate && eventDate < fromDate) {
    return false;
  }

  if (toDate && eventDate > toDate) {
    return false;
  }

  return true;
}

export async function listDiaryEvents({ from = null, to = null } = {}) {
  const store = await readDiaryStore();
  const fromDate = from ? parseDate(from) : null;
  const toDate = to ? parseDate(to) : null;

  const events = store.events.map(normaliseEvent).filter(Boolean);
  const filtered = events.filter((event) => isWithinRange(event, fromDate, toDate));

  filtered.sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0;
    const bTime = b.start ? new Date(b.start).getTime() : 0;
    return aTime - bTime;
  });

  return {
    generatedAt: store.generatedAt,
    events: filtered,
  };
}

export async function importDiaryEvents() {
  const store = await readDiaryStore();
  const events = store.events.map(normaliseEvent).filter(Boolean);
  events.sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0;
    const bTime = b.start ? new Date(b.start).getTime() : 0;
    return aTime - bTime;
  });

  return {
    generatedAt: store.generatedAt,
    events,
  };
}

export function deriveWorkingWeek(referenceDate = new Date()) {
  const reference = parseDate(referenceDate) || new Date();
  const day = reference.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + diffToMonday);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 4);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
