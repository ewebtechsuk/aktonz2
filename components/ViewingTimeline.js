import { useMemo } from 'react';
import styles from '../styles/PropertyDetails.module.css';

const TIMEZONE = 'Europe/London';

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDayHeader(date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      timeZone: TIMEZONE,
    }).format(date);
  } catch {
    return '';
  }
}

function formatDayDate(date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: TIMEZONE,
    }).format(date);
  } catch {
    return '';
  }
}

function formatFullDay(date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: TIMEZONE,
    }).format(date);
  } catch {
    return '';
  }
}

function formatTime(date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TIMEZONE,
    }).format(date);
  } catch {
    return '';
  }
}

function formatDateInput(date) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: TIMEZONE,
    }).format(date);
  } catch {
    return '';
  }
}

function buildTimelineGroups(slots) {
  const groups = new Map();

  slots.forEach((slot) => {
    const startDate = parseDate(slot.start);
    if (!startDate) {
      return;
    }

    const endDate = parseDate(slot.end) || new Date(startDate.getTime() + 30 * 60000);
    const dayKey = slot.dayKey || startDate.toISOString().slice(0, 10);
    const dayLabel = formatFullDay(startDate);
    const headerLabel = formatDayHeader(startDate);
    const dateLabel = formatDayDate(startDate);
    const startTime = formatTime(startDate);
    const endTime = formatTime(endDate);
    const rangeLabel = endTime ? `${startTime} – ${endTime}` : startTime;
    const fullRangeLabel = dayLabel ? `${dayLabel}, ${rangeLabel}` : rangeLabel;
    const slotKey = slot.slotKey || slot.key || `${slot.id || slot.start}-${slot.start}`;

    const normalizedSlot = {
      id: slot.id,
      start: slot.start,
      end: endDate.toISOString(),
      dayKey,
      rangeLabel,
      fullRangeLabel,
      location: slot.location || null,
      negotiator: slot.negotiator || null,
      slotKey,
      dateValue: slot.dateValue || formatDateInput(startDate),
      timeValue: slot.timeValue || startTime,
    };

    if (!groups.has(dayKey)) {
      groups.set(dayKey, {
        dayKey,
        headerLabel,
        dateLabel,
        fullLabel: dayLabel,
        slots: [],
      });
    }

    groups.get(dayKey).slots.push(normalizedSlot);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    slots: group.slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
  }));
}

export default function ViewingTimeline({
  slots = [],
  onSelectSlot,
  onOpenForm,
  selectedSlotKey = null,
}) {
  const normalizedSlots = Array.isArray(slots) ? slots : [];
  const groups = useMemo(() => buildTimelineGroups(normalizedSlots), [normalizedSlots]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className={styles.viewingTimeline} aria-label="Upcoming viewing slots">
      <div className={styles.viewingTimelineHeader}>
        <h3>Upcoming viewing slots</h3>
        {onOpenForm && (
          <button type="button" className={styles.viewingTimelineAll} onClick={onOpenForm}>
            Request another time
          </button>
        )}
      </div>
      <div className={styles.viewingTimelineDays} role="list">
        {groups.map((group) => (
          <article
            key={group.dayKey}
            role="listitem"
            className={styles.viewingTimelineDay}
            aria-label={group.fullLabel || undefined}
          >
            <header className={styles.viewingTimelineDayHeader}>
              <span className={styles.viewingTimelineDayName}>{group.headerLabel}</span>
              <span className={styles.viewingTimelineDayDate}>{group.dateLabel}</span>
            </header>
            <ul className={styles.viewingTimelineSlots}>
              {group.slots.map((slot) => {
                const isSelected = Boolean(
                  selectedSlotKey && slot.slotKey === selectedSlotKey
                );
                return (
                  <li key={slot.slotKey} className={styles.viewingTimelineSlot}>
                    <button
                      type="button"
                      className={
                        isSelected
                          ? `${styles.viewingTimelineSlotButton} ${styles.viewingTimelineSlotSelected}`
                          : styles.viewingTimelineSlotButton
                      }
                      onClick={() => onSelectSlot?.(slot)}
                      aria-pressed={isSelected}
                      aria-label={`Request viewing on ${slot.fullRangeLabel}`}
                    >
                      <span className={styles.viewingTimelineSlotRange}>{slot.rangeLabel}</span>
                      {slot.location && (
                        <span className={styles.viewingTimelineSlotMeta}>{slot.location}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
