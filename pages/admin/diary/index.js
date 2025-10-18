import Head from 'next/head';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminDiary.module.css';

const CALENDAR_DAYS = [
  {
    key: 'mon',
    label: 'Mon 11 Dec',
    focus: true,
    summary: '4 events',
  },
  {
    key: 'tue',
    label: 'Tue 12 Dec',
    summary: '3 events',
  },
  {
    key: 'wed',
    label: 'Wed 13 Dec',
    summary: '2 events',
  },
  {
    key: 'thu',
    label: 'Thu 14 Dec',
    summary: 'Team meeting',
  },
  {
    key: 'fri',
    label: 'Fri 15 Dec',
    summary: '1 event',
  },
];

const DIARY_EVENTS = [
  {
    id: 'EV-1824',
    day: 'mon',
    time: '09:30 – 10:15',
    title: 'Viewing — 18B High Street',
    attendees: ['Amelia Carter', 'Lauren Atkinson', 'Jonathan Spencer'],
    status: 'Confirmed',
    type: 'Viewing',
    property: '18B High Street, St Albans',
    notes: 'Parking instructions sent. Confirmed via SMS.',
  },
  {
    id: 'EV-1825',
    day: 'mon',
    time: '11:00 – 11:45',
    title: 'Valuation — 42 Park Crescent',
    attendees: ['David Nwosu', 'Annabelle Hart'],
    status: 'Awaiting confirmation',
    type: 'Valuation',
    property: '42 Park Crescent, AL1 4SJ',
    notes: 'Send prep pack once vendor confirms.',
  },
  {
    id: 'EV-1826',
    day: 'tue',
    time: '10:00 – 10:30',
    title: 'Viewing — 6 Oakwood Court',
    attendees: ['Sofia Patel', 'Patrick Hughes'],
    status: 'Confirmed',
    type: 'Viewing',
    property: '6 Oakwood Court, AL2 3EW',
    notes: 'Buyer requested floorplan prior to visit.',
  },
  {
    id: 'EV-1827',
    day: 'tue',
    time: '14:30 – 15:00',
    title: 'Viewing — 21 Abbey Gate',
    attendees: ['Amelia Carter', 'Rebecca Cole'],
    status: 'Tentative',
    type: 'Viewing',
    property: '21 Abbey Gate, AL1 2NF',
    notes: 'Awaiting vendor access confirmation.',
  },
  {
    id: 'EV-1828',
    day: 'wed',
    time: '09:00 – 09:20',
    title: 'Viewing — 11 Marlborough Road',
    attendees: ['David Nwosu', 'James Porter'],
    status: 'Confirmed',
    type: 'Viewing',
    property: '11 Marlborough Road, AL1 3UP',
    notes: 'Collect keys from office beforehand.',
  },
  {
    id: 'EV-1829',
    day: 'thu',
    time: '16:00 – 16:45',
    title: 'Team diary catch-up',
    attendees: ['Amelia Carter', 'Sofia Patel', 'David Nwosu'],
    status: 'Internal',
    type: 'Meeting',
    property: 'Aktonz HQ boardroom',
    notes: 'Review feedback from past week viewings.',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'New viewing',
    description: 'Create a viewing event linked to property and applicants.',
  },
  {
    label: 'Add follow-up',
    description: 'Schedule calls or reminder tasks for negotiators.',
  },
  {
    label: 'Import from Apex27',
    description: 'Pull the latest team diary from Apex27.',
  },
];

const TEAM_AVAILABILITY = [
  {
    name: 'Amelia Carter',
    role: 'Senior Negotiator',
    availability: 'Free until 11:00 · 3 events today',
    status: 'Online',
  },
  {
    name: 'Sofia Patel',
    role: 'Lettings Negotiator',
    availability: 'On viewing until 10:45 · 2 follow-ups pending',
    status: 'Busy',
  },
  {
    name: 'David Nwosu',
    role: 'Sales Valuer',
    availability: 'Available from 13:00 · Driving between appointments',
    status: 'Travelling',
  },
];

const DIARY_SETTINGS = [
  {
    label: 'Outlook calendar sync',
    description: 'Two-way sync with Apex27 shared diary so negotiators receive invites.',
    enabled: true,
  },
  {
    label: 'Viewing confirmations',
    description: 'Email and SMS confirmations sent automatically to attendees.',
    enabled: true,
  },
  {
    label: 'Show cancelled events',
    description: 'Display cancelled or declined events within the diary grid.',
    enabled: false,
  },
];

const FOCUS_EVENT = DIARY_EVENTS[0];

const BADGE_LABEL = 'Diary workspace';
const PAGE_HEADING = 'Shared diary & scheduling';
const PAGE_TAGLINE =
  'Mirror the Apex27 diary by combining viewings, valuations, and internal meetings in one shared workspace.';

export default function AdminDiaryWorkspacePage() {
  const { user, loading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Diary workspace';

  const renderLoadingState = () => (
    <div className={styles.workspaceContainer}>
      <div className={styles.workspaceEmpty}>Loading diary workspace…</div>
    </div>
  );

  const renderAccessDeniedState = () => (
    <div className={styles.workspaceContainer}>
      <div className={styles.workspaceEmpty}>
        You need admin access to view the diary workspace.
      </div>
    </div>
  );

  const renderDayColumn = (day) => {
    const dayEvents = DIARY_EVENTS.filter((event) => event.day === day.key);

    return (
      <div key={day.key} className={styles.dayColumn}>
        <div className={styles.dayHeader}>
          <span className={styles.dayLabel}>{day.label}</span>
          <span className={styles.daySummary}>{day.summary}</span>
        </div>
        <ul className={styles.eventList}>
          {dayEvents.map((event) => (
            <li key={event.id} className={styles.eventCard}>
              <header className={styles.eventHeader}>
                <span className={styles.eventType}>{event.type}</span>
                <span className={styles.eventTime}>{event.time}</span>
              </header>
              <h3 className={styles.eventTitle}>{event.title}</h3>
              <p className={styles.eventProperty}>{event.property}</p>
              <p className={styles.eventAttendees}>{event.attendees.join(', ')}</p>
              <span
                className={`${styles.eventStatus} ${
                  styles[`status${event.status.replace(/\s/g, '')}`] ?? ''
                }`.trim()}
              >
                {event.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.workspaceMain}>
        {loading ? renderLoadingState() : isAdmin ? renderContent() : renderAccessDeniedState()}
      </main>
    </>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
