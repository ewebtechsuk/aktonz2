import Head from 'next/head';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import AdminWorkspace from '../../../components/admin/AdminWorkspace';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminWorkspace.module.css';

const LETTINGS_SECTIONS = [
  {
    title: 'Lettings pipeline',
    description: 'Track landlord enquiries, instructions, and tenancy offers.',
    links: [
      {
        label: 'Operations dashboard',
        description: 'See current lettings valuations and offer activity.',
        href: '/admin',
      },
      {
        label: 'Valuations workspace',
        description: 'Convert lettings valuations into signed instructions.',
        href: '/admin/valuations',
      },
      {
        label: 'Offers workspace',
        description: 'Progress tenancy offers, referencing, and move-ins.',
        href: '/admin/offers',
      },
    ],
  },
  {
    title: 'Landlord & tenant care',
    description: 'Jump to the cohorts that need nurturing or updates.',
    links: [
      {
        label: 'Contacts CRM',
        description: 'Filter landlords, tenants, and investors for outreach.',
        href: '/admin/contacts',
      },
      {
        label: 'Email automations',
        description: 'Update onboarding journeys and renewal reminders.',
        href: '/admin/email',
      },
      {
        label: '3CX contact card',
        description: 'Open the telephony overlay for in-progress tenancies.',
        href: '/admin/integrations/3cx/contact-card',
      },
    ],
  },
  {
    title: 'Coming soon',
    description: 'Replicate Apex27 property management quick actions.',
    emptyMessage:
      'Renewal trackers, compliance checklists, and rent review prompts will appear here once the Apex27 sync is complete.',
  },
];

export default function AdminLettingsWorkspacePage() {
  const { user, loading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Lettings workspace';

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>Loading lettings workspace…</div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceEmpty}>
            You need admin access to view the lettings workspace.
          </div>
        </div>
      );
    }

    return (
      <AdminWorkspace
        badge="Lettings workspace"
        heading="Lettings pipeline & renewals"
        tagline="Match the Apex27 navigation by centralising lettings instructions, marketing, and tenancy care."
        sections={LETTINGS_SECTIONS}
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
