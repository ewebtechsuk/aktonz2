import Head from 'next/head';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import AdminWorkspace from '../../../components/admin/AdminWorkspace';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminWorkspace.module.css';

const DIARY_SECTIONS = [
  {
    title: "Today's priorities",
    description: 'Coordinate valuations, viewings, and follow-up calls.',
    links: [
      {
        label: 'Operations dashboard',
        description: 'Review outstanding valuations and offers that require scheduling.',
        href: '/admin',
      },
      {
        label: 'Contacts CRM',
        description: 'Assign callbacks and follow-up reminders from activity timelines.',
        href: '/admin/contacts',
      },
    ],
  },
  {
    title: 'Integrations',
    description: 'Keep calls and calendars aligned with the team diary.',
    links: [
      {
        label: '3CX contact card',
        description: 'Open the telephony overlay alongside upcoming appointments.',
        href: '/admin/integrations/3cx/contact-card',
        meta: 'Telephony overlay',
      },
    ],
  },
  {
    title: 'Calendar sync',
    description: 'Mirror the Apex27 shared diary for every negotiator.',
    emptyMessage:
      'Outlook calendar sync, viewing confirmations, and task scheduling widgets are being prepared to mirror the Apex27 diary.',
  },
];

export default function AdminDiaryWorkspacePage() {
  const { user, loading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Diary workspace';

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>Loading diary workspace…</div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>
            You need admin access to view the diary workspace.
          </div>
        </div>
      );
    }

    return (
      <AdminWorkspace
        badge="Diary workspace"
        heading="Shared diary & scheduling"
        tagline="Surface the same diary navigation from Apex27 so the team can coordinate calls, viewings, and follow-ups."
        sections={DIARY_SECTIONS}
      />
    );
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.workspaceMain}>{renderContent()}</main>
    </>
  );
}
