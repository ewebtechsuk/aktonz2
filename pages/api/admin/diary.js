import { importDiaryEvents, deriveWorkingWeek } from '../../../lib/apex27-diary.mjs';
import { getAdminFromSession } from '../../../lib/admin-users.mjs';
import { readSession } from '../../../lib/session.js';

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const RANGE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME_RANGE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  } catch {
    return null;
  }
}

function formatDateLabel(date) {
  return DATE_LABEL_FORMATTER.format(date);
}

function formatRangeLabel(start, end) {
  if (!start || !end) {
    return null;
  }

  const startLabel = RANGE_LABEL_FORMATTER.format(start);
  const endLabel = RANGE_LABEL_FORMATTER.format(end);
  return `Week of ${startLabel} – ${endLabel}`;
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function getStatusLabel(status) {
  if (!status) {
    return 'Scheduled';
  }

  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'Confirmed';
    case 'awaiting_confirmation':
    case 'awaiting confirmation':
      return 'Awaiting confirmation';
    case 'tentative':
      return 'Tentative';
    case 'internal':
      return 'Internal';
    case 'compliance':
      return 'Compliance';
    default:
      return status
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function buildStatusKey(label) {
  return label.replace(/\s+/g, '');
}

function formatTimeRange(start, end) {
  if (!start) {
    return null;
  }

  const startLabel = TIME_RANGE_FORMATTER.format(start);
  if (!end) {
    return startLabel;
  }

  return `${startLabel} – ${TIME_RANGE_FORMATTER.format(end)}`;
}

function formatEvent(event) {
  const start = event.start ? new Date(event.start) : null;
  const end = event.end ? new Date(event.end) : null;
  const statusLabel = getStatusLabel(event.status);

  return {
    ...event,
    timeLabel: formatTimeRange(start, end),
    statusLabel,
    statusKey: buildStatusKey(statusLabel),
  };
}

function summariseDay(events) {
  if (!events.length) {
    return 'No events scheduled';
  }

  if (events.length === 1) {
    return '1 event';
  }

  return `${events.length} events`;
}

function deriveWeekRange(startDateParam) {
  if (startDateParam) {
    const parsed = parseDateOnly(startDateParam);
    if (parsed) {
      const weekday = parsed.getUTCDay();
      const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
      const monday = addDays(parsed, diffToMonday);
      return { start: monday, end: addDays(monday, 4) };
    }
  }

  const { start } = deriveWorkingWeek(new Date());
  const startDate = parseDateOnly(start) ?? parseDateOnly(new Date());
  return { start: startDate, end: addDays(startDate, 4) };
}

function computeTotals(events) {
  const totals = {
    count: events.length,
    statuses: {},
  };

  for (const event of events) {
    const label = getStatusLabel(event.status);
    totals.statuses[label] = (totals.statuses[label] || 0) + 1;
  }

  return totals;
}

function buildAgenda(events, start, end) {
  const agenda = [];
  for (const event of events) {
    const startDate = event.start ? new Date(event.start) : null;
    if (!startDate) {
      continue;
    }
    if (startDate < start || startDate > end) {
      continue;
    }
    agenda.push(formatEvent(event));
  }

  return agenda;
}

function findFocusEvent(events, now) {
  const upcoming = events.find((event) => {
    const start = event.start ? new Date(event.start) : null;
    return start && start >= now;
  });

  return (upcoming ?? events[0] ?? null)?.id ?? null;
}

function buildDays(events, start, end, today) {
  const days = [];
  let cursor = new Date(start.getTime());

  while (cursor <= end) {
    const dayKey = cursor.toISOString().slice(0, 10);
    const dayEvents = events
      .filter((event) => event.dayKey === dayKey)
      .map(formatEvent);

    days.push({
      date: dayKey,
      label: formatDateLabel(cursor),
      summary: summariseDay(dayEvents),
      isToday: dayKey === today,
      events: dayEvents,
    });

    cursor = addDays(cursor, 1);
  }

  return days;
}

function buildResponsePayload({ events, generatedAt }, start, end) {
  const now = new Date();
  const agenda = buildAgenda(events, start, end);
  const focusEventId = findFocusEvent(agenda, now);
  const todayKey = new Date().toISOString().slice(0, 10);
  const days = buildDays(events, start, end, todayKey);

  return {
    generatedAt,
    range: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: formatRangeLabel(start, end),
      previousStart: addDays(start, -7).toISOString().slice(0, 10),
      nextStart: addDays(start, 7).toISOString().slice(0, 10),
    },
    totals: computeTotals(agenda),
    days,
    agenda,
    focusEventId,
  };
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { start: startQuery } = req.query ?? {};
      const { start, end } = deriveWeekRange(startQuery);
      const store = await importDiaryEvents();
      const payload = buildResponsePayload(store, start, end);

      return res.status(200).json(payload);
    } catch (error) {
      console.error('Failed to load diary events', error);
      return res.status(500).json({ error: 'Failed to load diary events' });
    }
  }

  if (req.method === 'POST') {
    try {
      const store = await importDiaryEvents();
      const { start, end } = deriveWeekRange(req.query?.start);
      const payload = buildResponsePayload(store, start, end);
      return res.status(200).json({ ...payload, imported: true });
    } catch (error) {
      console.error('Failed to import diary events', error);
      return res.status(500).json({ error: 'Unable to import diary events from Apex27' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
