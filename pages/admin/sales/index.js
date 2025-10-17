import Head from 'next/head';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import AdminWorkspace from '../../../components/admin/AdminWorkspace';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminWorkspace.module.css';

const SALES_SECTIONS = [
  {
    title: 'Pipeline focus',
    description: 'Keep instructions moving from valuation through to completion.',
    links: [
      {
        label: 'Operations dashboard',
        description: 'Monitor open valuations and offers at a glance.',
        href: '/admin',
      },
      {
        label: 'Valuations workspace',
        description: 'Review instructions, update statuses, and assign next actions.',
        href: '/admin/valuations',
      },
      {
        label: 'Offers workspace',
        description: 'Track negotiations, referencing, and move-in tasks.',
        href: '/admin/offers',
      },
    ],
  },
  {
    title: 'People & communication',
    description: 'Jump straight to the right applicants, vendors, and campaigns.',
    links: [
      {
        label: 'Contacts CRM',
        description: 'Segment vendor and applicant pipelines for follow-up.',
        href: '/admin/contacts',
      },
      {
        label: 'Email automations',
        description: 'Adjust nurture journeys and announcement templates.',
        href: '/admin/email',
      },
      {
        label: '3CX contact card',
        description: 'Launch the telephony overlay with live CRM context.',
        href: '/admin/integrations/3cx/contact-card',
      },
    ],
  },
  {
    title: 'Coming soon',
    description: 'Match the Apex27 sales quick actions with deeper metrics.',
    emptyMessage:
      'Exchange targets, fall-through alerts, and progression checklists will surface here as the Apex27 sync completes.',
  },
];

export default function AdminSalesWorkspacePage() {
  const { user, loading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Sales workspace';

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>Loading sales workspace…</div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>
            You need admin access to view the sales workspace.
          </div>
        </div>
      );
    }

    return (
      <AdminWorkspace
        badge="Sales workspace"
        heading="Sales pipeline control centre"
        tagline="Mirror the Apex27 menu by jumping straight into valuations, offers, and key sales communications."
        sections={SALES_SECTIONS}
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
