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
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState('Viewing');
  const [composerValues, setComposerValues] = useState(DEFAULT_COMPOSER_VALUES);
  const [composerError, setComposerError] = useState(null);

  const applyCalendarData = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      setCalendar(null);
      return;
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

    const normalizedAgenda = Array.isArray(data.agenda)
      ? data.agenda.map(normalizeEvent).filter(Boolean)
      : [];

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

    setCalendar({
      ...data,
      days: normalizedDays,
      agenda: normalizedAgenda,
      focusEventId,
      totals,
    });

    const availableDates = normalizedDays.map((day) => day.date);
    setSelectedDate((current) => {
      if (current && availableDates.includes(current)) {
        return current;
      }
      const today = normalizedDays.find((day) => day.isToday);
      return today?.date ?? availableDates[0] ?? null;
    });
  }, []);

  const loadDiary = useCallback(
    async (startDate) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(buildDiaryUrl(startDate));
        if (!response.ok) {
          throw new Error('Failed to load diary events');
        }
        const json = await response.json();
        applyCalendarData(json);
      } catch (err) {
        console.error(err);
        setError('Unable to load the diary workspace. Please try again.');
      } finally {
        setLoading(false);
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

    loadDiary();
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
    if (Array.isArray(calendar?.days)) {
      calendar.days.forEach((day) => {
        map.set(day.date, day.label);
      });
    }
    return map;
  }, [calendar]);

  const selectedDay = useMemo(
    () => calendar?.days?.find((day) => day.date === selectedDate) ?? null,
    [calendar, selectedDate],
  );

  const focusEvent = useMemo(() => {
    if (!calendar?.agenda?.length) {
      return null;
    }
    const focusId = calendar.focusEventId;
    const fallback = calendar.agenda[0];
    if (!focusId) {
      return fallback;
    }
    return calendar.agenda.find((event) => event.id === focusId) ?? fallback;
  }, [calendar]);

  const focusDayLabel = useMemo(() => {
    if (!focusEvent) {
      return null;
    }
    const start = focusEvent.start ? new Date(focusEvent.start) : null;
    if (start) {
      return DAY_FORMATTER.format(start);
    }
    return agendaDayLookup.get(focusEvent.dayKey) ?? focusEvent.dayKey;
  }, [agendaDayLookup, focusEvent]);

  const handleDuplicateFocus = useCallback(() => {
    if (!focusEvent) {
      return;
    }

    openComposer(focusEvent.type || 'Event', {
      title: `${focusEvent.title} (Copy)`,
      date: focusEvent.dayKey,
      start: focusEvent.start ? focusEvent.start.slice(11, 16) : '',
      end: focusEvent.end ? focusEvent.end.slice(11, 16) : '',
      negotiator: focusEvent.negotiator || '',
      attendees: formatAttendeeSummary(focusEvent.attendees || [])?.replace(/, /g, ', ') || '',
      propertyId: focusEvent.property?.id || '',
      location: focusEvent.location || '',
      notes: focusEvent.notes || '',
    });
  }, [focusEvent, openComposer]);

  const handleSendConfirmation = useCallback(() => {
    if (!focusEvent) {
      return;
    }

    const emails = (focusEvent.attendees || []).map((attendee) => attendee.email).filter(Boolean);
    if (!emails.length) {
      setToast({ type: 'error', message: 'No attendee email addresses available for this event.' });
      return;
    }

    const subject = encodeURIComponent(`${focusEvent.title} confirmation`);
    const body = encodeURIComponent(
      `Hi ${focusEvent.attendees[0]?.name ?? ''},\n\nConfirming your ${focusEvent.title} at ${focusEvent.timeLabel} on ${focusDayLabel}.`,
    );
    const mailto = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank', 'noopener,noreferrer');
    setToast({ type: 'success', message: 'Drafted confirmation email for attendees.' });
  }, [focusDayLabel, focusEvent]);

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

  const renderWeekView = () => (
    <div className={styles.calendarGrid}>
      {calendar?.days?.map((day) => (
        <div key={day.date} className={styles.dayColumn}>
          <div className={styles.dayHeader}>
            <span className={styles.dayLabel}>{day.label}</span>
            <span className={styles.daySummary}>{day.summary}</span>
          </div>
          <ul className={styles.eventList}>
            {day.events.length ? day.events.map((event) => renderEventCard(event)) : (
              <li className={styles.eventEmpty}>No events scheduled</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );

  const renderDayView = () => (
    <div className={styles.dayView}>
      <div className={styles.dayViewNav}>
        {calendar?.days?.map((day) => (
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
      {calendar?.agenda?.length ? (
        <ul className={styles.eventList}>{calendar.agenda.map((event) => renderEventCard(event, { showDayLabel: true }))}</ul>
      ) : (
        <div className={styles.eventEmpty}>No events scheduled in this range</div>
      )}
    </div>
  );

  const renderCalendar = () => (
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
            <span className={styles.toolbarLabel}>{calendar?.range?.label ?? ''}</span>
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

  const renderSidebar = () => (
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
        ) : focusEvent ? (
          <>
            <dl className={styles.focusList}>
              <div className={styles.focusRow}>
                <dt>Title</dt>
                <dd>{focusEvent.title}</dd>
              </div>
              {focusEvent.property ? (
                <div className={styles.focusRow}>
                  <dt>Property</dt>
                  <dd>
                    {focusEvent.property.href ? (
                      <Link href={focusEvent.property.href} className={styles.focusLink}>
                        {focusEvent.property.address || focusEvent.property.id}
                      </Link>
                    ) : (
                      focusEvent.property.address || focusEvent.property.id
                    )}
                  </dd>
                </div>
              ) : null}
              <div className={styles.focusRow}>
                <dt>Negotiator</dt>
                <dd>{focusEvent.negotiator || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Attendees</dt>
                <dd>{formatAttendeeSummary(focusEvent.attendees) || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Date</dt>
                <dd>{focusDayLabel || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Time</dt>
                <dd>{focusEvent.timeLabel || 'Scheduled'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Status</dt>
                <dd>{focusEvent.statusLabel}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Location</dt>
                <dd>{focusEvent.location || '—'}</dd>
              </div>
              <div className={styles.focusRow}>
                <dt>Notes</dt>
                <dd>{focusEvent.notes || '—'}</dd>
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
          {(calendar?.agenda || []).slice(0, 3).map((event) => (
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
          <li className={styles.settingRow}>
            <div className={styles.settingMeta}>
              <p className={styles.settingLabel}>Outlook calendar sync</p>
              <p className={styles.settingDescription}>
                Two-way sync with Apex27 shared diary so negotiators receive invites.
              </p>
            </div>
            <span className={`${styles.settingToggle} ${styles.settingToggleEnabled}`}>On</span>
          </li>
          <li className={styles.settingRow}>
            <div className={styles.settingMeta}>
              <p className={styles.settingLabel}>Viewing confirmations</p>
              <p className={styles.settingDescription}>
                Email and SMS confirmations sent automatically to attendees.
              </p>
            </div>
            <span className={`${styles.settingToggle} ${styles.settingToggleEnabled}`}>On</span>
          </li>
          <li className={styles.settingRow}>
            <div className={styles.settingMeta}>
              <p className={styles.settingLabel}>Show cancelled events</p>
              <p className={styles.settingDescription}>
                Display cancelled or declined events within the diary grid.
              </p>
            </div>
            <span className={styles.settingToggle}>Off</span>
          </li>
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

  const renderContent = () => (
    <div className={styles.workspaceOuter}>
      <section className={styles.heroSection}>
        <p className={styles.heroEyebrow}>Apex27 diary parity</p>
        <h1 className={styles.heroHeading}>{PAGE_HEADING}</h1>
        <p className={styles.heroDescription}>{PAGE_TAGLINE}</p>
        {calendar?.totals ? (
          <div className={styles.heroMeta}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendar.totals.count}</span>
              <span className={styles.heroStatLabel}>Events in view</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendar.totals.statuses['Confirmed'] ?? 0}</span>
              <span className={styles.heroStatLabel}>Confirmed</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{calendar.totals.statuses['Awaiting confirmation'] ?? 0}</span>
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
        {renderCalendar()}
        {renderSidebar()}
      </div>
    </div>
  );

  const showLoading = sessionLoading || loading;

  const renderCalendar = () => (
    <section className={styles.calendarPane}>
      <header className={styles.calendarToolbar}>
        <div className={styles.toolbarPrimary}>
          <span className={styles.badge}>{BADGE_LABEL}</span>
          <h1 className={styles.heading}>{PAGE_HEADING}</h1>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}>
            Create viewing event
          </button>
          <button type="button" className={styles.toolbarButton}>
            Today
          </button>
          <div className={styles.toolbarNavGroup}>
            <button type="button" className={styles.toolbarNav} aria-label="Previous day">
              ‹
            </button>
            <span className={styles.toolbarLabel}>Week of 11 Dec 2023</span>
            <button type="button" className={styles.toolbarNav} aria-label="Next day">
              ›
            </button>
          </div>
          <div className={styles.toolbarToggleGroup}>
            <button type="button" className={`${styles.toggleButton} ${styles.toggleButtonActive}`}>
              Week
            </button>
            <button type="button" className={styles.toggleButton}>
              Day
            </button>
            <button type="button" className={styles.toggleButton}>
              Agenda
            </button>
          </div>
        </div>
      </header>

      <div className={styles.calendarGrid}>{CALENDAR_DAYS.map(renderDayColumn)}</div>
    </section>
  );

  const renderSidebar = () => (
    <aside className={styles.sidebarPane}>
      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>Viewing event composer</h2>
          <p className={styles.sidebarDescription}>
            Draft a new viewing, link it to a property, and choose the negotiator responsible.
          </p>
        </header>

        <dl className={styles.focusList}>
          <div className={styles.focusRow}>
            <dt>Property</dt>
            <dd>{FOCUS_EVENT.property}</dd>
          </div>
          <div className={styles.focusRow}>
            <dt>Negotiator</dt>
            <dd>{FOCUS_EVENT.attendees[0]}</dd>
          </div>
          <div className={styles.focusRow}>
            <dt>Applicants</dt>
            <dd>{FOCUS_EVENT.attendees.slice(1).join(', ')}</dd>
          </div>
          <div className={styles.focusRow}>
            <dt>Time</dt>
            <dd>{FOCUS_EVENT.time}</dd>
          </div>
          <div className={styles.focusRow}>
            <dt>Status</dt>
            <dd>{FOCUS_EVENT.status}</dd>
          </div>
          <div className={styles.focusRow}>
            <dt>Notes</dt>
            <dd>{FOCUS_EVENT.notes}</dd>
          </div>
        </dl>

        <div className={styles.focusActions}>
          <button type="button" className={styles.primaryAction}>
            Duplicate for next week
          </button>
          <button type="button" className={styles.secondaryAction}>
            Send confirmation
          </button>
        </div>
      </section>

      <section className={styles.sidebarCard}>
        <header className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeading}>Team availability</h2>
          <p className={styles.sidebarDescription}>
            Keep the Apex27 diary aligned so negotiators stay updated on viewings and callbacks.
          </p>
        </header>

        <ul className={styles.availabilityList}>
          {TEAM_AVAILABILITY.map((member) => (
            <li key={member.name} className={styles.availabilityItem}>
              <div className={styles.avatar} aria-hidden="true">
                {member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div className={styles.availabilityMeta}>
                <p className={styles.memberName}>{member.name}</p>
                <p className={styles.memberRole}>{member.role}</p>
                <p className={styles.memberAvailability}>{member.availability}</p>
              </div>
              <span
                className={`${styles.statusPill} ${styles[`status${member.status}`] ?? ''}`.trim()}
              >
                {member.status}
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
                className={`${styles.settingToggle} ${
                  setting.enabled ? styles.settingToggleEnabled : ''
                }`.trim()}
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
              <button type="button" className={styles.quickActionButton}>
                <span className={styles.quickActionLabel}>{action.label}</span>
                <span className={styles.quickActionDescription}>{action.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );

  const renderContent = () => (
    <div className={styles.workspaceOuter}>
      <section className={styles.heroSection}>
        <p className={styles.heroEyebrow}>Apex27 diary parity</p>
        <h1 className={styles.heroHeading}>{PAGE_HEADING}</h1>
        <p className={styles.heroDescription}>{PAGE_TAGLINE}</p>
      </section>

      <div className={styles.workspaceGrid}>
        {renderCalendar()}
        {renderSidebar()}
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Aktonz Admin — Diary workspace</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.workspaceMain}>
        {showLoading ? renderLoadingState() : isAdmin ? renderContent() : renderAccessDeniedState()}
      </main>
    </>
  );
}
