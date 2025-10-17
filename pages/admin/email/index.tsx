import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import adminStyles from '../../../styles/Admin.module.css';
import styles from '../../../styles/AdminEmailSettings.module.css';
import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';

type MicrosoftStatus = {
  connected: boolean;
  expiresAt?: number;
  expiresInSeconds?: number;
};

type StatusState = {
  loading: boolean;
  loaded: boolean;
  data: MicrosoftStatus | null;
  error: string | null;
};

const INITIAL_STATUS_STATE: StatusState = {
  loading: true,
  loaded: false,
  data: null,
  error: null,
};

function formatRelativeSeconds(seconds: number | undefined): string | null {
  if (seconds == null || Number.isNaN(seconds)) {
    return null;
  }

  if (!Number.isFinite(seconds)) {
    return null;
  }

  if (seconds <= 0) {
    return 'expired';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function formatDateTime(timestamp: number | undefined): string | null {
  if (!timestamp || Number.isNaN(timestamp)) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch (error) {
    console.warn('Unable to format Microsoft status timestamp', error);
    return null;
  }
}

const AdminEmailSettingsPage = () => {
  const { user, loading: sessionLoading, clearSession, refresh } = useSession() as {
    user: { role?: string | null } | null;
    loading: boolean;
    clearSession: () => void;
    refresh: () => Promise<void> | void;
  };
  const router = useRouter();
  const isAdmin = Boolean(user?.role === 'admin');

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [statusState, setStatusState] = useState<StatusState>(INITIAL_STATUS_STATE);
  const [connectRedirecting, setConnectRedirecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isAdmin) {
      setStatusState({ loading: false, loaded: false, data: null, error: null });
      return;
    }

    setStatusState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/microsoft/status', { method: 'GET', headers: { accept: 'application/json' } });

      if (!response.ok) {
        throw new Error('Unable to load Microsoft Graph status');
      }

      const payload = (await response.json()) as MicrosoftStatus;
      setStatusState({ loading: false, loaded: true, data: payload, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Microsoft Graph status';
      setStatusState({ loading: false, loaded: true, data: null, error: message });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!sessionLoading && isAdmin) {
      void loadStatus();
    }
  }, [isAdmin, loadStatus, sessionLoading]);

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    setLogoutLoading(true);

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to sign out. Please try again.');
      }

      clearSession();

      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after logout', refreshError);
      }

      await router.push('/login');
    } catch (error) {
      console.error('Admin logout failed', error);
      const message = error instanceof Error ? error.message : 'Unable to sign out. Please try again.';
      setLogoutError(message);
    } finally {
      setLogoutLoading(false);
    }
  }, [clearSession, refresh, router]);

  const handleConnect = useCallback(() => {
    setConnectRedirecting(true);
    window.location.href = '/api/microsoft/connect';
  }, []);

  const handleDisconnect = useCallback(async () => {
    setStatusState((prev) => ({ ...prev, error: null }));
    setDisconnecting(true);

    try {
      const response = await fetch('/api/microsoft/disconnect', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Unable to disable Microsoft Graph connector');
      }

      await loadStatus();
    } catch (error) {
      console.error('Microsoft Graph disconnect failed', error);
      const message = error instanceof Error ? error.message : 'Unable to disable Microsoft Graph connector';
      setStatusState((prev) => ({ ...prev, error: message }));
    } finally {
      setDisconnecting(false);
    }
  }, [loadStatus]);

  const microsoftConnected = Boolean(statusState.data?.connected);

  const microsoftMeta = useMemo(() => {
    if (!microsoftConnected) {
      return [];
    }

    const entries: string[] = ['Signed in as info@aktonz.com'];
    const relative = formatRelativeSeconds(statusState.data?.expiresInSeconds);
    const expiry = formatDateTime(statusState.data?.expiresAt);

    if (relative) {
      entries.push(`Token refresh due in ${relative}`);
    }

    if (expiry) {
      entries.push(`Expires ${expiry}`);
    }

    return entries;
  }, [microsoftConnected, statusState.data?.expiresAt, statusState.data?.expiresInSeconds]);

  const emailSecondaryLinks = useMemo(
    () => [
      { label: 'Email integration', href: '#integration' },
      { label: 'Notes', href: '#notes' },
      { label: 'Overrides', href: '#overrides' },
    ],
    [],
  );

  const renderLayout = (title: string, content: ReactNode, showNavigation = false) => (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AdminNavigation
        items={showNavigation ? ADMIN_NAV_ITEMS : []}
        secondaryItems={showNavigation ? emailSecondaryLinks : []}
        onLogout={showNavigation ? handleLogout : undefined}
        logoutLoading={logoutLoading}
        logoutLabel="Sign out"
        logoutLoadingLabel="Signing out…"
        errorMessage={logoutError ?? undefined}
      />
      <main className={styles.pageMain}>{content}</main>
    </>
  );

  if (sessionLoading) {
    return renderLayout('Email settings · Aktonz Admin', (
      <div className={styles.loadingMessage}>Loading your admin session…</div>
    ));
  }

  if (!isAdmin) {
    return renderLayout(
      'Email settings · Aktonz Admin',
      <div className={styles.statePanel}>
        <h1>Admin access required</h1>
        <p>
          You need to{' '}
          <Link href="/login">sign in with an admin account</Link> to manage the email integration.
        </p>
      </div>,
      false,
    );
  }

  return renderLayout(
    'Email settings · Aktonz Admin',
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <p className={styles.sidebarTitle}>Email</p>
          <ul className={styles.sidebarList}>
            <li>
              <a className={styles.sidebarLink} href="#integration">
                Send via Aktonz?
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#integration">
                Send via Email Integration
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#overrides">
                Send via Custom SMTP
              </a>
            </li>
          </ul>
        </div>
        <p className={styles.sidebarHint}>
          Use the Microsoft Graph connector to send website enquiries through info@aktonz.com.
        </p>
      </aside>
      <div className={styles.content}>
        <section id="integration" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Email Integration</h2>
            <p>
              Authorise the Microsoft Graph connector so Aktonz can deliver enquiries directly from the
              info@aktonz.com mailbox.
            </p>
          </div>
          {statusState.error ? (
            <p className={styles.errorBanner} role="alert">
              {statusState.error}
            </p>
          ) : null}
          <div className={styles.providerEmail}>
            <label htmlFor="provider-email">Provider Email Address</label>
            <div className={styles.providerEmailValue}>
              <span id="provider-email">info@aktonz.com</span>
              <div className={styles.providerEmailActions}>
                <button type="button" className={styles.editButton} disabled>
                  Change
                </button>
              </div>
            </div>
          </div>
          <div className={styles.integrationsGrid}>
            <article className={styles.integrationRow}>
              <div>
                <h3>Microsoft Graph API</h3>
                <p>Use Microsoft 365 delegated access to send all customer messages from info@aktonz.com.</p>
                {microsoftMeta.length ? (
                  <div className={styles.metaData}>
                    {microsoftMeta.map((entry) => (
                      <span key={entry}>{entry}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <span
                className={`${styles.statusBadge} ${
                  microsoftConnected ? styles.statusConnected : styles.statusDisabled
                }`}
              >
                {microsoftConnected ? 'Enabled' : 'Disabled'}
              </span>
              <div className={styles.providerEmailActions}>
                {microsoftConnected ? (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                    onClick={handleDisconnect}
                    disabled={disconnecting || statusState.loading}
                  >
                    {disconnecting ? 'Disabling…' : 'Disable'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleConnect}
                    disabled={connectRedirecting || statusState.loading}
                  >
                    {connectRedirecting ? 'Redirecting…' : 'Connect'}
                  </button>
                )}
              </div>
            </article>
            <article className={styles.integrationRow}>
              <div>
                <h3>Google</h3>
                <p>Use Gmail or Google Workspace SMTP. This connector isn’t configured for Aktonz.</p>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusDisabled}`}>Disabled</span>
              <div className={styles.providerEmailActions}>
                <button type="button" className={`${styles.actionButton} ${styles.actionButtonSecondary}`} disabled>
                  Unavailable
                </button>
              </div>
            </article>
          </div>
          {statusState.loading ? (
            <p className={styles.loadingMessage}>Checking Microsoft Graph connection…</p>
          ) : null}
        </section>

        <section id="notes" className={styles.section}>
          <div className={styles.noteCard}>
            <div className={styles.noteCardIcon}>i</div>
            <div>
              <h3>Please note</h3>
              <ul>
                <li>Only info@aktonz.com can enable the connector.</li>
                <li>Grant Microsoft’s consent prompt to allow Aktonz to send mail via Microsoft Graph.</li>
                <li>Tokens are encrypted and stored securely in Aktonz infrastructure.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="overrides" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Overrides</h2>
            <p>Need to route email elsewhere? Override delivery on a per-form basis.</p>
          </div>
          <div className={styles.overrides}>
            <div className={styles.overrideItem}>
              <h3>Important Information</h3>
              <p>Contact info@aktonz.com if you require a different sending address for a short campaign.</p>
            </div>
            <div className={styles.overrideItem}>
              <h3>Reply-To Address</h3>
              <p>Website forms include the visitor details in the body. Custom reply-to routing isn’t required.</p>
            </div>
          </div>
        </section>
      </div>
    </div>,
    true,
  );
};

export default AdminEmailSettingsPage;
