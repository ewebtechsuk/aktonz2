import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminDiary.module.css';

const BADGE_LABEL = 'Diary workspace';
const PAGE_HEADING = 'Shared diary & scheduling';
const PAGE_TAGLINE =
  'Mirror the Apex27 diary by combining viewings, valuations, and internal meetings in one shared workspace.';

const VIEW_MODES = ['week', 'day', 'agenda'];

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DAY_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const DEFAULT_COMPOSER_VALUES = {
  title: '',
  date: '',
  start: '',
  end: '',
  negotiator: '',
  attendees: '',
  propertyId: '',
  location: '',
  notes: '',
};

const QUICK_ACTIONS = [
  {
    label: 'New viewing',
    description: 'Create a viewing event linked to a property and applicants.',
    type: 'Viewing',
  },
  {
    label: 'Add follow-up',
    description: 'Schedule callbacks and follow-up reminders for negotiators.',
    type: 'Follow-up',
  },
  {
    label: 'Import from Apex27',
    description: 'Refresh the shared diary with the latest Apex27 events.',
    action: 'import',
  },
];

function formatAttendeeSummary(attendees) {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return null;
  }

  return attendees
    .map((attendee) => {
      if (!attendee?.name) {
        return null;
      }
      if (attendee.role) {
        return `${attendee.name} (${attendee.role})`;
      }
      return attendee.name;
    })
    .filter(Boolean)
    .join(', ');
}

function formatTimeRangeLabel(startIso, endIso) {
  if (!startIso) {
    return null;
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const startLabel = TIME_FORMATTER.format(start);
  if (!endIso) {
    return startLabel;
  }

  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) {
    return startLabel;
  }

  return `${startLabel} – ${TIME_FORMATTER.format(end)}`;
}

function getStatusLabel(status) {
  if (!status) {
    return 'Scheduled';
  }

  const normalised = status.toLowerCase();
  switch (normalised) {
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

function summariseDayLabel(events) {
  if (!events?.length) {
    return 'No events scheduled';
  }

  if (events.length === 1) {
    return '1 event';
  }

  return `${events.length} events`;
}

function computeTotalsFromAgenda(agenda) {
  const totals = { count: 0, statuses: {} };

  for (const event of agenda) {
    totals.count += 1;
    const label = event?.statusLabel ?? getStatusLabel(event?.status);
    totals.statuses[label] = (totals.statuses[label] || 0) + 1;
  }

  return totals;
}

function findFocusEventId(agenda, now = new Date()) {
  if (!Array.isArray(agenda) || agenda.length === 0) {
    return null;
  }

  const upcoming = agenda.find((event) => {
    if (!event?.start) {
      return false;
    }
    const start = new Date(event.start);
    return !Number.isNaN(start.getTime()) && start >= now;
  });

  return (upcoming ?? agenda[0])?.id ?? null;
}

function parseAttendees(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [namePart, ...rest] = entry.split('-');
      const name = namePart.trim();
      if (!name) {
        return null;
      }
      const role = rest.join('-').trim();
      return {
        name,
        role: role || null,
      };
    })
    .filter(Boolean);
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => {
      if (!link || typeof link !== 'object') {
        return null;
      }
      const label = typeof link.label === 'string' ? link.label.trim() : '';
      const href = typeof link.href === 'string' ? link.href.trim() : '';
      if (!label || !href) {
        return null;
      }
      return { label, href };
    })
    .filter(Boolean);
}

function normalizeAttendeesList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((attendee) => {
      if (!attendee || typeof attendee !== 'object') {
        return null;
      }
      const name = typeof attendee.name === 'string' ? attendee.name.trim() : '';
      if (!name) {
        return null;
      }
      const role = typeof attendee.role === 'string' && attendee.role.trim() ? attendee.role.trim() : null;
      const email = typeof attendee.email === 'string' && attendee.email.trim() ? attendee.email.trim() : null;
      return { name, role, email };
    })
    .filter(Boolean);
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

  return { id, address, href };
}

function normalizeEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const start = typeof event.start === 'string' ? event.start : null;
  const end = typeof event.end === 'string' ? event.end : null;
  const dayKey = event.dayKey || (start ? start.slice(0, 10) : null);
  const statusLabel = event.statusLabel ?? getStatusLabel(event.status);

  return {
    ...event,
    start,
    end,
    dayKey,
    timeLabel: event.timeLabel ?? formatTimeRangeLabel(start, end),
    statusLabel,
    statusKey: event.statusKey ?? buildStatusKey(statusLabel),
    attendees: normalizeAttendeesList(event.attendees),
    links: normalizeLinks(event.links),
    property: normalizeProperty(event.property),
  };
}

function createClientEvent({
  id,
  title,
  type,
  status,
  negotiator,
  location,
  notes,
  property,
  attendees,
  links,
  startIso,
  endIso,
}) {
  const normalizedProperty = normalizeProperty(property);
  const normalizedAttendees = normalizeAttendeesList(attendees);
  const normalizedLinks = normalizeLinks(links);
  const statusLabel = getStatusLabel(status);

  return {
    id,
    title,
    type: type || null,
    status,
    negotiator: negotiator || null,
    location: location || null,
    notes: notes || null,
    property: normalizedProperty,
    attendees: normalizedAttendees,
    links: normalizedLinks,
    start: startIso,
    end: endIso,
    dayKey: startIso ? startIso.slice(0, 10) : null,
    timeLabel: formatTimeRangeLabel(startIso, endIso),
    statusLabel,
    statusKey: buildStatusKey(statusLabel),
  };
}

function normaliseCalendarData(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const normalizedDays = Array.isArray(data.days)
    ? data.days.map((day) => {
        const events = Array.isArray(day.events)
          ? day.events.map(normalizeEvent).filter(Boolean)
          : [];
        events.sort((a, b) => {
          const aTime = a.start ? new Date(a.start).getTime() : 0;
          const bTime = b.start ? new Date(b.start).getTime() : 0;
          return aTime - bTime;
        });
        return {
          ...day,
          events,
          summary: summariseDayLabel(events),
        };
      })
    : [];

  const agendaFromData = Array.isArray(data.agenda)
    ? data.agenda.map(normalizeEvent).filter(Boolean)
    : [];

  const normalizedAgenda = agendaFromData.length
    ? agendaFromData
    : normalizedDays.flatMap((day) => day.events);

  normalizedAgenda.sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0;
    const bTime = b.start ? new Date(b.start).getTime() : 0;
    return aTime - bTime;
  });

  const focusEventId =
    data.focusEventId && normalizedAgenda.some((event) => event.id === data.focusEventId)
      ? data.focusEventId
      : findFocusEventId(normalizedAgenda);

  const totals = computeTotalsFromAgenda(normalizedAgenda);

  return {
    ...data,
    days: normalizedDays,
    agenda: normalizedAgenda,
    focusEventId,
    totals,
  };
}

const FALLBACK_SOURCE_CALENDAR = {
  range: {
    label: 'Mon 12 Feb – Sun 18 Feb',
    start: '2024-02-12',
  },
  days: [
    {
      date: '2024-02-12',
      label: 'Mon 12 Feb',
      isToday: false,
      events: [
        {
          id: 'fallback-viewing-meadow',
          title: 'Viewing — 14 Meadow Lane',
          type: 'Viewing',
          status: 'Confirmed',
          negotiator: 'Lauren Atkinson',
          location: '14 Meadow Lane, Leeds',
          notes: 'Confirm keys with the owner before arrival.',
          property: {
            id: 'AKN-100045',
            address: '14 Meadow Lane, Leeds',
            href: '/admin/listings/AKN-100045',
          },
          attendees: [
            { name: 'Lauren Atkinson', role: 'Negotiator' },
            { name: 'Jonathan Spencer', role: 'Applicant' },
          ],
          links: [
            { href: '/admin/listings/AKN-100045', label: 'View property record' },
            { href: 'mailto:lauren@aktonz.co.uk', label: 'Email negotiator' },
          ],
          startIso: '2024-02-12T09:30:00+00:00',
          endIso: '2024-02-12T10:00:00+00:00',
        },
        {
          id: 'fallback-follow-up-greenbank',
          title: 'Follow-up — 22 Greenbank Avenue',
          type: 'Follow-up',
          status: 'Awaiting confirmation',
          negotiator: 'Paige Fitzgerald',
          location: 'Phone call',
          notes: 'Call applicants with feedback and confirm next steps.',
          property: {
            id: 'AKN-100112',
            address: '22 Greenbank Avenue, Leeds',
            href: '/admin/listings/AKN-100112',
          },
          attendees: [
            { name: 'Paige Fitzgerald', role: 'Negotiator' },
            { name: 'Ravi Singh', role: 'Applicant' },
          ],
          links: [
            { href: '/admin/listings/AKN-100112', label: 'View property record' },
          ],
          startIso: '2024-02-12T12:00:00+00:00',
          endIso: '2024-02-12T12:15:00+00:00',
        },
      ],
    },
    {
      date: '2024-02-13',
      label: 'Tue 13 Feb',
      isToday: false,
      events: [
        {
          id: 'fallback-valuation-oakwood',
          title: 'Valuation — 8 Oakwood Crescent',
          type: 'Valuation',
          status: 'Confirmed',
          negotiator: 'Jonathan Spencer',
          location: '8 Oakwood Crescent, Leeds',
          notes: 'Bring lettings appraisal pack.',
          property: {
            id: 'AKN-100215',
            address: '8 Oakwood Crescent, Leeds',
            href: '/admin/listings/AKN-100215',
          },
          attendees: [
            { name: 'Jonathan Spencer', role: 'Negotiator' },
            { name: 'Helen Marsh', role: 'Landlord' },
          ],
          links: [
            { href: '/admin/listings/AKN-100215', label: 'View property record' },
          ],
          startIso: '2024-02-13T14:00:00+00:00',
          endIso: '2024-02-13T15:00:00+00:00',
        },
      ],
    },
    {
      date: '2024-02-14',
      label: 'Wed 14 Feb',
      isToday: false,
      events: [
        {
          id: 'fallback-meeting-morning-sync',
          title: 'Morning diary sync',
          type: 'Internal meeting',
          status: 'Internal',
          negotiator: 'Team Diary',
          location: 'Teams call',
          notes: 'Review Apex27 imports and confirm outstanding confirmations.',
          attendees: [
            { name: 'Lauren Atkinson', role: 'Negotiator' },
            { name: 'Paige Fitzgerald', role: 'Negotiator' },
            { name: 'Jonathan Spencer', role: 'Negotiator' },
          ],
          links: [
            { href: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_MTG', label: 'Join Teams call' },
          ],
          startIso: '2024-02-14T09:00:00+00:00',
          endIso: '2024-02-14T09:30:00+00:00',
        },
      ],
    },
  ],
};

const FALLBACK_CALENDAR = normaliseCalendarData(FALLBACK_SOURCE_CALENDAR) ?? {
  range: { label: '', start: '' },
  days: [],
  agenda: [],
  focusEventId: null,
  totals: { count: 0, statuses: {} },
};

const CALENDAR_DAYS = FALLBACK_CALENDAR.days;
const FOCUS_EVENT = FALLBACK_CALENDAR.agenda[0] ?? null;
const TEAM_AVAILABILITY = FALLBACK_CALENDAR.agenda.slice(0, 3);
const DIARY_SETTINGS = [
  {
    label: 'Auto-import from Apex27',
    description: 'Sync the shared diary with Apex27 every hour to keep negotiators aligned.',
    enabled: true,
  },
  {
    label: 'Viewing confirmations',
    description: 'Send confirmation emails and SMS messages automatically to attendees.',
    enabled: true,
  },
  {
    label: 'Show cancelled events',
    description: 'Display cancelled or declined events directly within the diary grid.',
    enabled: false,
  },
];

function buildDiaryUrl(startDate) {
  const params = new URLSearchParams();
  if (startDate) {
    params.set('start', startDate);
  }
  const query = params.toString();
  return `/api/admin/diary${query ? `?${query}` : ''}`;
}

export default function AdminDiaryWorkspacePage() {
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [calendar, setCalendar] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(() => CALENDAR_DAYS[0]?.date ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState('Viewing');
  const [composerValues, setComposerValues] = useState(DEFAULT_COMPOSER_VALUES);
  const [composerError, setComposerError] = useState(null);

  const calendarForDisplay = calendar ?? FALLBACK_CALENDAR;
  const calendarTotals = calendar?.totals ?? FALLBACK_CALENDAR.totals;
  const calendarRangeLabel = calendar?.range?.label ?? FALLBACK_CALENDAR.range?.label ?? '';

  const applyCalendarData = useCallback((data) => {
    const normalized = normaliseCalendarData(data);
    if (!normalized) {
      setCalendar(null);
      return;
    }

    setCalendar(normalized);

    const availableDates = normalized.days.map((day) => day.date);
    setSelectedDate((current) => {
      if (current && availableDates.includes(current)) {
        return current;
      }
      const today = normalized.days.find((day) => day.isToday);
      return today?.date ?? availableDates[0] ?? null;
    });
  }, []);

  const loadDiary = useCallback(
    async (startDate, options = {}) => {
      const signal =
        options && typeof options === 'object' && 'signal' in options ? options.signal : undefined;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildDiaryUrl(startDate), { signal });
        if (!response.ok) {
          throw new Error('Failed to load diary events');
        }

        const json = await response.json();

        if (signal?.aborted) {
          return;
        }

        applyCalendarData(json);
      } catch (err) {
        if (
          signal?.aborted ||
          (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError')
        ) {
          return;
        }

        console.error(err);
        setError('Unable to load the diary workspace. Please try again.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [applyCalendarData],
  );

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!isAdmin) {
      setCalendar(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    loadDiary(undefined, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [sessionLoading, isAdmin, loadDiary]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handlePreviousWeek = useCallback(() => {
    if (!calendar?.range?.previousStart) {
      return;
    }
    loadDiary(calendar.range.previousStart);
  }, [calendar, loadDiary]);

  const handleNextWeek = useCallback(() => {
    if (!calendar?.range?.nextStart) {
      return;
    }
    loadDiary(calendar.range.nextStart);
  }, [calendar, loadDiary]);

  const handleToday = useCallback(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (calendar?.days?.some((day) => day.date === todayKey)) {
      setSelectedDate(todayKey);
      return;
    }
    loadDiary(todayKey);
  }, [calendar, loadDiary]);

  const handleImport = useCallback(async () => {
    if (importing) {
      return;
    }

    setImporting(true);
    setToast(null);
    try {
      const response = await fetch(buildDiaryUrl(calendar?.range?.start), {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to import diary events');
      }
      const json = await response.json();
      applyCalendarData(json);
      setToast({ type: 'success', message: 'Imported the latest Apex27 diary events.' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Unable to import diary events. Please try again.' });
    } finally {
      setImporting(false);
    }
  }, [applyCalendarData, calendar?.range?.start, importing]);

  const openComposer = useCallback(
    (type = 'Viewing', preset = {}) => {
      setComposerType(type);
      setComposerOpen(true);
      setComposerError(null);
      setComposerValues({
        ...DEFAULT_COMPOSER_VALUES,
        ...preset,
        title: preset.title ?? '',
        date: preset.date ?? selectedDate ?? calendar?.range?.start ?? '',
        start: preset.start ?? '',
        end: preset.end ?? '',
        negotiator: preset.negotiator ?? user?.name ?? '',
        attendees: preset.attendees ?? '',
        propertyId: preset.propertyId ?? '',
        location: preset.location ?? '',
        notes: preset.notes ?? '',
      });
    },
    [calendar?.range?.start, selectedDate, user?.name],
  );

  const handleQuickAction = useCallback(
    (action) => {
      if (action.action === 'import') {
        handleImport();
        return;
      }

      openComposer(action.type, action.preset ?? {});
    },
    [handleImport, openComposer],
  );

  const handleComposerChange = useCallback((event) => {
    const { name, value } = event.target;
    setComposerValues((current) => ({ ...current, [name]: value }));
  }, []);

  const handleComposerCancel = useCallback(() => {
    setComposerOpen(false);
    setComposerError(null);
    setComposerValues(DEFAULT_COMPOSER_VALUES);
  }, []);

  const handleComposerSubmit = useCallback(
    (event) => {
      event.preventDefault();
      setComposerError(null);

      if (!calendar) {
        return;
      }

      const title = composerValues.title.trim();
      const date = composerValues.date;
      const start = composerValues.start;

      if (!title || !date || !start) {
        setComposerError('Title, date and start time are required.');
        return;
      }

      let startIso;
      try {
        startIso = new Date(`${date}T${start}:00Z`).toISOString();
      } catch (err) {
        console.error(err);
        setComposerError('Please provide a valid start time.');
        return;
      }

      let endIso = null;
      if (composerValues.end) {
        try {
          endIso = new Date(`${date}T${composerValues.end}:00Z`).toISOString();
        } catch (err) {
          console.warn('Invalid end time provided for diary event composer', err);
        }
      }

      const propertyId = composerValues.propertyId.trim();
      const property = propertyId
        ? {
            id: propertyId,
            href: `/property/${propertyId}`,
          }
        : null;

      const attendees = parseAttendees(composerValues.attendees);

      const newEvent = createClientEvent({
        id: `local-${Date.now()}`,
        title,
        type: composerType,
        status: 'confirmed',
        negotiator: composerValues.negotiator?.trim() || null,
        location: composerValues.location?.trim() || null,
        notes: composerValues.notes?.trim() || null,
        property,
        attendees,
        links: propertyId ? [{ label: 'View property record', href: `/property/${propertyId}` }] : [],
        startIso,
        endIso,
      });

      if (!calendar.days.some((day) => day.date === newEvent.dayKey)) {
        setComposerError('Selected date is outside the current diary view. Navigate to that week first.');
        return;
      }

      setCalendar((current) => {
        if (!current) {
          return current;
        }

        const days = current.days.map((day) => {
          if (day.date !== newEvent.dayKey) {
            return day;
          }
          const events = [...day.events, newEvent].sort((a, b) => new Date(a.start) - new Date(b.start));
          return {
            ...day,
            events,
            summary: summariseDayLabel(events),
          };
        });

        const agenda = [...(current.agenda ?? [])];
        agenda.push(newEvent);
        agenda.sort((a, b) => new Date(a.start) - new Date(b.start));
        const totals = computeTotalsFromAgenda(agenda);
        const focusEventId = findFocusEventId(agenda);

        return {
          ...current,
          days,
          agenda,
          totals,
          focusEventId,
        };
      });

      setSelectedDate(newEvent.dayKey);
      setToast({ type: 'success', message: `${composerType} event scheduled for ${DAY_FORMATTER.format(new Date(startIso))}.` });
      setComposerOpen(false);
      setComposerValues(DEFAULT_COMPOSER_VALUES);
    },
    [calendar, composerType, composerValues],
  );

  const agendaDayLookup = useMemo(() => {
    const map = new Map();
    if (Array.isArray(calendarForDisplay?.days)) {
      calendarForDisplay.days.forEach((day) => {
        map.set(day.date, day.label);
      });
    }
    return map;
  }, [calendarForDisplay]);

  const selectedDay = useMemo(
    () => calendarForDisplay?.days?.find((day) => day.date === selectedDate) ?? null,
    [calendarForDisplay, selectedDate],
  );

  const focusEvent = useMemo(() => {
    const agenda = calendar?.agenda?.length ? calendar.agenda : calendarForDisplay.agenda;
    if (!agenda?.length) {
      return null;
    }
    const focusId = calendar?.focusEventId ?? calendarForDisplay.focusEventId;
    const fallback = agenda[0];
    if (!focusId) {
      return fallback;
    }
    return agenda.find((event) => event.id === focusId) ?? fallback;
  }, [calendar, calendarForDisplay]);

  const resolvedFocusEvent = focusEvent ?? FOCUS_EVENT;

  const focusDayLabel = useMemo(() => {
    if (!resolvedFocusEvent) {
      return null;
    }
    const start = resolvedFocusEvent.start ? new Date(resolvedFocusEvent.start) : null;
    if (start) {
      return DAY_FORMATTER.format(start);
    }
    return agendaDayLookup.get(resolvedFocusEvent.dayKey) ?? resolvedFocusEvent.dayKey;
  }, [agendaDayLookup, resolvedFocusEvent]);

  const handleDuplicateFocus = useCallback(() => {
    if (!resolvedFocusEvent) {
      return;
    }

    openComposer(resolvedFocusEvent.type || 'Event', {
      title: `${resolvedFocusEvent.title} (Copy)`,
      date: resolvedFocusEvent.dayKey,
      start: resolvedFocusEvent.start ? resolvedFocusEvent.start.slice(11, 16) : '',
      end: resolvedFocusEvent.end ? resolvedFocusEvent.end.slice(11, 16) : '',
      negotiator: resolvedFocusEvent.negotiator || '',
      attendees: formatAttendeeSummary(resolvedFocusEvent.attendees || [])?.replace(/, /g, ', ') || '',
      propertyId: resolvedFocusEvent.property?.id || '',
      location: resolvedFocusEvent.location || '',
      notes: resolvedFocusEvent.notes || '',
    });
  }, [resolvedFocusEvent, openComposer]);

  const handleSendConfirmation = useCallback(() => {
    if (!resolvedFocusEvent) {
      return;
    }

    const emails = (resolvedFocusEvent.attendees || []).map((attendee) => attendee.email).filter(Boolean);
    if (!emails.length) {
      setToast({ type: 'error', message: 'No attendee email addresses available for this event.' });
      return;
    }

    const subject = encodeURIComponent(`${resolvedFocusEvent.title} confirmation`);
    const body = encodeURIComponent(
      `Hi ${resolvedFocusEvent.attendees[0]?.name ?? ''},\n\nConfirming your ${resolvedFocusEvent.title} at ${resolvedFocusEvent.timeLabel} on ${focusDayLabel}.`,
    );
    const mailto = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank', 'noopener,noreferrer');
    setToast({ type: 'success', message: 'Drafted confirmation email for attendees.' });
  }, [focusDayLabel, resolvedFocusEvent]);

  const renderEventCard = useCallback(
    (event, { showDayLabel = false } = {}) => {
      if (!event) {
        return null;
      }

      const dayLabel = agendaDayLookup.get(event.dayKey) ?? (event.start ? DAY_FORMATTER.format(new Date(event.start)) : null);
      const attendeesSummary = formatAttendeeSummary(event.attendees);
      const statusClass = event.statusKey ? styles[`status${event.statusKey}`] ?? '' : '';

      return (
        <li key={event.id} className={styles.eventCard}>
          <header className={styles.eventHeader}>
            <span className={styles.eventType}>{event.type || 'Event'}</span>
            <span className={styles.eventTime}>{event.timeLabel || 'Scheduled'}</span>
          </header>
          <h3 className={styles.eventTitle}>{event.title}</h3>
          {showDayLabel && dayLabel ? <p className={styles.eventDayLabel}>{dayLabel}</p> : null}
          {event.property ? (
            event.property.href ? (
              <Link href={event.property.href} className={styles.eventPropertyLink}>
                {event.property.address || event.property.id}
              </Link>
            ) : (
              <p className={styles.eventProperty}>{event.property.address || event.property.id}</p>
            )
          ) : null}
          {event.location ? <p className={styles.eventLocation}>{event.location}</p> : null}
          {attendeesSummary ? <p className={styles.eventAttendees}>{attendeesSummary}</p> : null}
          <span className={`${styles.eventStatus} ${statusClass}`.trim()}>{event.statusLabel}</span>
          {event.links?.length ? (
            <div className={styles.eventLinks}>
              {event.links.map((link) => {
                const key = `${event.id}-${link.href}`;
                const isExternal = /^https?:/i.test(link.href) || link.href.startsWith('mailto:');
                return isExternal ? (
                  <a key={key} href={link.href} target="_blank" rel="noreferrer" className={styles.eventLink}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={key} href={link.href} className={styles.eventLink}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </li>
      );
    },
    [agendaDayLookup],
  );

  const renderDayColumn = useCallback(
    (day) => (
      <div key={day.date} className={styles.dayColumn}>
        <div className={styles.dayHeader}>
          <span className={styles.dayLabel}>{day.label}</span>
          <span className={styles.daySummary}>{day.summary}</span>
        </div>
        <ul className={styles.eventList}>
          {day.events.length
            ? day.events.map((event) => renderEventCard(event))
            : (
                <li className={styles.eventEmpty}>No events scheduled</li>
              )}
        </ul>
      </div>
    ),
    [renderEventCard],
  );

  const renderWeekView = () => (
    <div className={styles.calendarGrid}>
      {(calendarForDisplay.days.length ? calendarForDisplay.days : CALENDAR_DAYS).map((day) =>
        renderDayColumn(day),
      )}
    </div>
  );

  const renderDayView = () => (
    <div className={styles.dayView}>
      <div className={styles.dayViewNav}>
        {calendarForDisplay?.days?.map((day) => (
          <button
            key={day.date}
            type="button"
            className={`${styles.dayViewButton} ${selectedDate === day.date ? styles.dayViewButtonActive : ''}`}
            onClick={() => setSelectedDate(day.date)}
          >
            {day.label}
          </button>
        ))}
      </div>
      <div className={styles.dayViewContent}>
        <header className={styles.dayViewHeader}>
          <h2>{selectedDay?.label ?? 'Select a day'}</h2>
          <p className={styles.dayViewSummary}>{selectedDay?.summary ?? 'Choose a day to review events.'}</p>
        </header>
        <ul className={styles.eventList}>
          {selectedDay?.events?.length
            ? selectedDay.events.map((event) => renderEventCard(event))
            : (
                <li className={styles.eventEmpty}>No events scheduled for this day</li>
              )}
        </ul>
      </div>
    </div>
  );

  const renderAgendaView = () => (
    <div className={styles.agendaList}>
      {calendarForDisplay?.agenda?.length ? (
        <ul className={styles.eventList}>
          {calendarForDisplay.agenda.map((event) => renderEventCard(event, { showDayLabel: true }))}
        </ul>
      ) : (
        <div className={styles.eventEmpty}>No events scheduled in this range</div>
      )}
    </div>
  );

  const renderCalendarPane = () => (
    <section className={styles.calendarPane}>
      <header className={styles.calendarToolbar}>
        <div className={styles.toolbarPrimary}>
          <span className={styles.badge}>{BADGE_LABEL}</span>
          <h1 className={styles.heading}>{PAGE_HEADING}</h1>
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
            onClick={() => openComposer('Viewing')}
          >
            Create viewing event
          </button>
          <button type="button" className={styles.toolbarButton} onClick={handleToday}>
            Today
          </button>
          <div className={styles.toolbarNavGroup}>
            <button type="button" className={styles.toolbarNav} aria-label="Previous week" onClick={handlePreviousWeek}>
              ‹
            </button>
            <span className={styles.toolbarLabel}>{calendarRangeLabel}</span>
            <button type="button" className={styles.toolbarNav} aria-label="Next week" onClick={handleNextWeek}>
              ›
            </button>
          </div>
          <div className={styles.toolbarToggleGroup}>
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.toggleButton} ${viewMode === mode ? styles.toggleButtonActive : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className={styles.calendarBody}>
        {viewMode === 'week' ? renderWeekView() : null}
        {viewMode === 'day' ? renderDayView() : null}
        {viewMode === 'agenda' ? renderAgendaView() : null}
      </div>
    </section>
  );

  const renderSidebarPane = () => {
    const availabilitySource = (calendar?.agenda?.length ? calendar.agenda : TEAM_AVAILABILITY).slice(0, 3);

    return (
      <aside className={styles.sidebarPane}>
      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>
            {composerOpen ? `${composerType} event composer` : 'Viewing event composer'}
          </h2>
          <p className={styles.sidebarDescription}>
            {composerOpen
              ? 'Add a new appointment to the shared diary and mirror it across Apex27.'
              : 'Review the selected event and trigger the same actions your Apex27 diary provides.'}
          </p>
        </header>

        {composerOpen ? (
          <form className={styles.composerForm} onSubmit={handleComposerSubmit}>
            <div className={styles.composerField}>
              <label htmlFor="composer-title" className={styles.composerLabel}>
                Title
              </label>
              <input
                id="composer-title"
                name="title"
                type="text"
                className={styles.composerInput}
                value={composerValues.title}
                onChange={handleComposerChange}
                required
              />
            </div>
            <div className={styles.composerRow}>
              <div className={styles.composerField}>
                <label htmlFor="composer-date" className={styles.composerLabel}>
                  Date
                </label>
                <input
                  id="composer-date"
                  name="date"
                  type="date"
                  className={styles.composerInput}
                  value={composerValues.date}
                  onChange={handleComposerChange}
                  required
                />
              </div>
              <div className={styles.composerField}>
                <label htmlFor="composer-start" className={styles.composerLabel}>
                  Start time
                </label>
                <input
                  id="composer-start"
                  name="start"
                  type="time"
                  className={styles.composerInput}
                  value={composerValues.start}
                  onChange={handleComposerChange}
                  required
                />
              </div>
              <div className={styles.composerField}>
                <label htmlFor="composer-end" className={styles.composerLabel}>
                  End time
                </label>
                <input
                  id="composer-end"
                  name="end"
                  type="time"
                  className={styles.composerInput}
                  value={composerValues.end}
                  onChange={handleComposerChange}
                />
              </div>
            </div>
            <div className={styles.composerField}>
              <label htmlFor="composer-negotiator" className={styles.composerLabel}>
                Negotiator
              </label>
              <input
                id="composer-negotiator"
                name="negotiator"
                type="text"
                className={styles.composerInput}
                value={composerValues.negotiator}
                onChange={handleComposerChange}
              />
            </div>
            <div className={styles.composerField}>
              <label htmlFor="composer-property" className={styles.composerLabel}>
                Property reference
              </label>
              <input
                id="composer-property"
                name="propertyId"
                type="text"
                className={styles.composerInput}
                value={composerValues.propertyId}
                onChange={handleComposerChange}
                placeholder="ALX-3756638"
              />
            </div>
            <div className={styles.composerField}>
              <label htmlFor="composer-attendees" className={styles.composerLabel}>
                Attendees
                <span className={styles.composerHint}>Use “Name - Role” separated by commas.</span>
              </label>
              <input
                id="composer-attendees"
                name="attendees"
                type="text"
                className={styles.composerInput}
                value={composerValues.attendees}
                onChange={handleComposerChange}
                placeholder="Lauren Atkinson - Applicant, Jonathan Spencer - Applicant"
              />
            </div>
            <div className={styles.composerField}>
              <label htmlFor="composer-location" className={styles.composerLabel}>
                Location
              </label>
              <input
                id="composer-location"
                name="location"
                type="text"
                className={styles.composerInput}
                value={composerValues.location}
                onChange={handleComposerChange}
              />
            </div>
            <div className={styles.composerField}>
              <label htmlFor="composer-notes" className={styles.composerLabel}>
                Notes
              </label>
              <textarea
                id="composer-notes"
                name="notes"
                className={styles.composerTextarea}
                value={composerValues.notes}
                onChange={handleComposerChange}
                rows={3}
              />
            </div>
            {composerError ? <div className={styles.composerError}>{composerError}</div> : null}
            <div className={styles.composerActions}>
              <button type="submit" className={styles.primaryAction}>
                Save event
              </button>
              <button type="button" className={styles.secondaryAction} onClick={handleComposerCancel}>
                Cancel
              </button>
            </div>
          </form>
        ) : resolvedFocusEvent ? (
          <>
            <dl className={styles.focusList}>
              <div className={styles.focusRow}>
                <dt>Title</dt>
                <dd>{resolvedFocusEvent.title}</dd>
              </div>
              {resolvedFocusEvent.property ? (
                <div className={styles.focusRow}>
                  <dt>Property</dt>
                  <dd>
                    {resolvedFocusEvent.property.href ? (
                      <Link href={resolvedFocusEvent.property.href} className={styles.focusLink}>
                        {resolvedFocusEvent.property.address || resolvedFocusEvent.property.id}
                      </Link>
                    ) : (
                      resolvedFocusEvent.property.address || resolvedFocusEvent.property.id
                    )}
                  </dd>
                </div>
              ) : null}
              <div className={styles.focusRow}>
                <dt>Negotiator</dt>
                <dd>{resolvedFocusEvent.negotiator || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Attendees</dt>
                <dd>{formatAttendeeSummary(resolvedFocusEvent.attendees) || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Date</dt>
                <dd>{focusDayLabel || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Time</dt>
                <dd>{resolvedFocusEvent.timeLabel || 'Scheduled'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Status</dt>
                <dd>{resolvedFocusEvent.statusLabel}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Location</dt>
                <dd>{resolvedFocusEvent.location || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Notes</dt>
                <dd>{resolvedFocusEvent.notes || '—'}</dd>
              </div>
            </dl>

            <div className={styles.focusActions}>
              <button type="button" className={styles.primaryAction} onClick={handleDuplicateFocus}>
                Duplicate for next week
              </button>
              <button type="button" className={styles.secondaryAction} onClick={handleSendConfirmation}>
                Send confirmation
              </button>
            </div>
          </>
        ) : (
          <div className={styles.workspaceEmpty}>Select an event to see the composer tools.</div>
        )}
      </section>

      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>Team availability</h2>
          <p className={styles.sidebarDescription}>
            Keep the Apex27 diary aligned so negotiators stay updated on viewings and callbacks.
          </p>
        </header>

        <ul className={styles.availabilityList}>
          {availabilitySource.map((event) => (
            <li key={`availability-${event.id}`} className={styles.availabilityItem}>
              <div className={styles.avatar} aria-hidden="true">
                {(event.negotiator || 'Team')
                  .split(' ')
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div className={styles.availabilityMeta}>
                <p className={styles.memberName}>{event.negotiator || 'Team'}</p>
                <p className={styles.memberRole}>{event.type || 'Event'}</p>
                <p className={styles.memberAvailability}>{`${event.timeLabel || 'Scheduled'} · ${agendaDayLookup.get(event.dayKey) || ''}`}</p>
              </div>
              <span className={`${styles.statusPill} ${event.statusKey ? styles[`status${event.statusKey}`] ?? '' : ''}`.trim()}>
                {event.statusLabel}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>Diary settings</h2>
          <p className={styles.sidebarDescription}>
            Manage the same calendar preferences that live inside Apex27.
          </p>
        </header>

        <ul className={styles.settingsList}>
          {DIARY_SETTINGS.map((setting) => (
            <li key={setting.label} className={styles.settingRow}>
              <div className={styles.settingMeta}>
                <p className={styles.settingLabel}>{setting.label}</p>
                <p className={styles.settingDescription}>{setting.description}</p>
              </div>
              <span
                className={`${styles.settingToggle} ${setting.enabled ? styles.settingToggleEnabled : ''}`.trim()}
              >
                {setting.enabled ? 'On' : 'Off'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>Quick actions</h2>
          <p className={styles.sidebarDescription}>
            Save time by triggering the same shortcuts your team uses in Apex27.
          </p>
        </header>

        <ul className={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <li key={action.label} className={styles.quickActionItem}>
              <button
                type="button"
                className={styles.quickActionButton}
                onClick={() => handleQuickAction(action)}
                disabled={importing && action.action === 'import'}
              >
                <span className={styles.quickActionLabel}>{action.label}</span>
                <span className={styles.quickActionDescription}>{action.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
    );
  };

  const renderLoadingState = () => (
    <div className={styles.workspaceContainer}>
      <div className={styles.workspaceEmpty}>Loading diary workspace…</div>
    </div>
  );

  const renderAccessDeniedState = () => (
    <div className={styles.workspaceContainer}>
      <div className={styles.workspaceEmpty}>You need admin access to view the diary workspace.</div>
    </div>
  );

  const renderWorkspaceContent = () => (
    <div className={styles.workspaceOuter}>
      <section className={styles.heroSection}>
        <p className={styles.heroEyebrow}>Apex27 diary parity</p>
        <h1 className={styles.heroHeading}>{PAGE_HEADING}</h1>
        <p className={styles.heroDescription}>{PAGE_TAGLINE}</p>
        {calendarTotals ? (
          <div className={styles.heroMeta}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendarTotals.count}</span>
              <span className={styles.heroStatLabel}>Events in view</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendarTotals.statuses['Confirmed'] ?? 0}</span>
              <span className={styles.heroStatLabel}>Confirmed</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendarTotals.statuses['Awaiting confirmation'] ?? 0}</span>
              <span className={styles.heroStatLabel}>Awaiting confirmation</span>
            </div>
          </div>
        ) : null}
      </section>

      {toast ? (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      ) : null}

      {error ? <div className={styles.workspaceError}>{error}</div> : null}

      <div className={styles.workspaceGrid}>
        {renderCalendarPane()}
        {renderSidebarPane()}
      </div>
    </div>
  );

  const showLoading = sessionLoading || loading;

  return (
    <>
      <Head>
        <title>Aktonz Admin — Diary workspace</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.workspaceMain}>
        {showLoading
          ? renderLoadingState()
          : isAdmin
            ? renderWorkspaceContent()
            : renderAccessDeniedState()}
      </main>
    </>
  );
}

