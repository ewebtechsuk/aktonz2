import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminSettings.module.css';

const DEFAULT_BRANCHES = ['City of London', 'East London', 'South London'];
const DEFAULT_TIMEZONES = ['Europe/London', 'Europe/Dublin', 'Europe/Paris'];

const INITIAL_GENERAL_STATE = {
  agencyName: 'Aktonz Estate Agents',
  contactEmail: 'info@aktonz.com',
  contactPhone: '+44 20 1234 5678',
  defaultBranch: DEFAULT_BRANCHES[0],
  timezone: DEFAULT_TIMEZONES[0],
};

const INITIAL_BRANDING_STATE = {
  primaryColor: '#304ffe',
  accentColor: '#00c853',
  tagline: 'City expertise. Boutique service.',
  showLogo: true,
  showMonochromeLogo: false,
  enablePortalBranding: true,
};

const INITIAL_PORTAL_STATE = {
  enablePortal: true,
  welcomeEmail: true,
  branchVisibility: 'all',
  portalUrl: 'https://app.aktonz.com/portal',
  fromName: 'Aktonz Client Services',
  replyToEmail: 'hello@aktonz.com',
};

type GeneralState = typeof INITIAL_GENERAL_STATE;
type BrandingState = typeof INITIAL_BRANDING_STATE;
type PortalState = typeof INITIAL_PORTAL_STATE;

type SessionContext = {
  user: { role?: string | null } | null;
  loading: boolean;
  clearSession: () => void;
  refresh: () => Promise<void> | void;
};

const AdminSettingsPage = () => {
  const { user, loading: sessionLoading, clearSession, refresh } = useSession() as SessionContext;
  const router = useRouter();
  const isAdmin = Boolean(user?.role === 'admin');

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [generalSettings, setGeneralSettings] = useState<GeneralState>(INITIAL_GENERAL_STATE);
  const [brandingSettings, setBrandingSettings] = useState<BrandingState>(INITIAL_BRANDING_STATE);
  const [portalSettings, setPortalSettings] = useState<PortalState>(INITIAL_PORTAL_STATE);

  const [generalStatus, setGeneralStatus] = useState<string | null>(null);
  const [brandingStatus, setBrandingStatus] = useState<string | null>(null);
  const [portalStatus, setPortalStatus] = useState<string | null>(null);

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

  const secondaryItems = useMemo(
    () => [
      { label: 'General', href: '#general' },
      { label: 'Branding', href: '#branding' },
      { label: 'Portal', href: '#portal' },
    ],
    [],
  );

  const handleGeneralChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = event.target;
      setGeneralSettings((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleBrandingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget;

      if (target instanceof HTMLInputElement) {
        const nextValue = target.type === 'checkbox' ? target.checked : target.value;
        setBrandingSettings((prev) => ({ ...prev, [target.name]: nextValue }));
        return;
      }

      setBrandingSettings((prev) => ({ ...prev, [target.name]: target.value }));
    },
    [],
  );

  const handlePortalChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = event.currentTarget;

      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        setPortalSettings((prev) => ({ ...prev, [target.name]: target.checked }));
        return;
      }

      setPortalSettings((prev) => ({ ...prev, [target.name]: target.value }));
    },
    [],
  );

  const handleGeneralSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralStatus('General settings saved. These changes are stored locally for now.');
  }, []);

  const handleBrandingSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrandingStatus('Branding preferences updated. Apply your changes to the live site when ready.');
  }, []);

  const handlePortalSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPortalStatus('Portal preferences saved. Sync with Apex27 when you enable the connector.');
  }, []);

  useEffect(() => {
    if (!generalStatus) {
      return;
    }

    const timer = window.setTimeout(() => setGeneralStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [generalStatus]);

  useEffect(() => {
    if (!brandingStatus) {
      return;
    }

    const timer = window.setTimeout(() => setBrandingStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [brandingStatus]);

  useEffect(() => {
    if (!portalStatus) {
      return;
    }

    const timer = window.setTimeout(() => setPortalStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [portalStatus]);

  const brandPreviewStyle = useMemo(
    () => ({
      ['--brand-primary' as const]: brandingSettings.primaryColor,
      ['--brand-accent' as const]: brandingSettings.accentColor,
    }),
    [brandingSettings.accentColor, brandingSettings.primaryColor],
  );

  const renderLayout = (title: string, content: ReactNode, showNavigation = false) => (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AdminNavigation
        items={showNavigation ? ADMIN_NAV_ITEMS : []}
        secondaryItems={showNavigation ? secondaryItems : []}
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
    return renderLayout('Settings · Aktonz Admin', <div className={styles.loadingMessage}>Loading your admin session…</div>);
  }

  if (!isAdmin) {
    return renderLayout(
      'Settings · Aktonz Admin',
      <div className={styles.statePanel}>
        <h1>Admin access required</h1>
        <p>
          You need to <Link href="/login">sign in with an admin account</Link> to manage branding and portal
          settings.
        </p>
      </div>,
      false,
    );
  }

  return renderLayout(
    'Settings · Aktonz Admin',
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <p className={styles.sidebarTitle}>Settings</p>
          <ul className={styles.sidebarList}>
            <li>
              <a className={styles.sidebarLink} href="#general">
                General details
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#branding">
                Branding &amp; identity
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#portal">
                Portal preferences
              </a>
            </li>
          </ul>
        </div>
        <p className={styles.sidebarHint}>
          Mirror your Apex27 configuration so the Aktonz admin panel reflects the same organisation profile and
          branding.
        </p>
      </aside>

      <div className={styles.content}>
        <section id="general" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>General details</h2>
            <p>Keep your agency profile aligned with the information stored in Apex27.</p>
          </div>

          {generalStatus ? (
            <p className={`${styles.statusMessage} ${styles.statusSuccess}`} role="status">
              {generalStatus}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleGeneralSubmit}>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="general-agencyName">
                  Agency name
                </label>
                <input
                  id="general-agencyName"
                  name="agencyName"
                  className={styles.fieldControl}
                  value={generalSettings.agencyName}
                  onChange={handleGeneralChange}
                  required
                />
                <p className={styles.fieldDescription}>Displayed on proposals, emails and the client portal.</p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="general-defaultBranch">
                  Default branch
                </label>
                <select
                  id="general-defaultBranch"
                  name="defaultBranch"
                  className={styles.fieldControl}
                  value={generalSettings.defaultBranch}
                  onChange={handleGeneralChange}
                >
                  {DEFAULT_BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                <p className={styles.fieldDescription}>
                  Determines the branch shown when new instructions are created in Apex27.
                </p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="general-contactEmail">
                  Primary email address
                </label>
                <input
                  id="general-contactEmail"
                  name="contactEmail"
                  type="email"
                  className={styles.fieldControl}
                  value={generalSettings.contactEmail}
                  onChange={handleGeneralChange}
                  required
                />
                <p className={styles.fieldDescription}>Used for alerts, daily digests and valuation follow ups.</p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="general-contactPhone">
                  Primary telephone
                </label>
                <input
                  id="general-contactPhone"
                  name="contactPhone"
                  className={styles.fieldControl}
                  value={generalSettings.contactPhone}
                  onChange={handleGeneralChange}
                />
                <p className={styles.fieldDescription}>Shared with Apex27 so the contact centre has the latest number.</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="general-timezone">
                  Office timezone
                </label>
                <select
                  id="general-timezone"
                  name="timezone"
                  className={styles.fieldControl}
                  value={generalSettings.timezone}
                  onChange={handleGeneralChange}
                >
                  {DEFAULT_TIMEZONES.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
                <p className={styles.fieldDescription}>Controls diary syncing and SLA calculations in Apex27.</p>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.buttonPrimary}>
                Save general settings
              </button>
            </div>
          </form>
        </section>

        <section id="branding" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Branding &amp; identity</h2>
            <p>Match Apex27&apos;s branding module so the Aktonz admin panel mirrors your client-facing assets.</p>
          </div>

          {brandingStatus ? (
            <p className={`${styles.statusMessage} ${styles.statusSuccess}`} role="status">
              {brandingStatus}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleBrandingSubmit}>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="branding-primaryColor">
                  Primary colour
                </label>
                <input
                  id="branding-primaryColor"
                  name="primaryColor"
                  type="color"
                  className={styles.fieldControl}
                  value={brandingSettings.primaryColor}
                  onChange={handleBrandingChange}
                  aria-label="Primary brand colour"
                />
                <p className={styles.fieldDescription}>Navigation bars, primary buttons and highlights.</p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="branding-accentColor">
                  Accent colour
                </label>
                <input
                  id="branding-accentColor"
                  name="accentColor"
                  type="color"
                  className={styles.fieldControl}
                  value={brandingSettings.accentColor}
                  onChange={handleBrandingChange}
                  aria-label="Accent brand colour"
                />
                <p className={styles.fieldDescription}>Used for status badges, toggles and key charts.</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="branding-tagline">
                  Portal tagline
                </label>
                <textarea
                  id="branding-tagline"
                  name="tagline"
                  className={`${styles.fieldControl} ${styles.textArea}`}
                  value={brandingSettings.tagline}
                  onChange={handleBrandingChange}
                  maxLength={120}
                />
                <p className={styles.fieldDescription}>Appears under your logo on the Apex27 client portal.</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Brand assets</label>
                <div className={styles.assetUpload}>
                  <button type="button" className={styles.buttonSecondary}>
                    Upload logo
                  </button>
                  <p>Upload an SVG or PNG (max 2 MB). Use the same artwork configured in Apex27.</p>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Brand toggles</label>
                <label className={styles.toggle} htmlFor="branding-showLogo">
                  <input
                    id="branding-showLogo"
                    name="showLogo"
                    type="checkbox"
                    checked={brandingSettings.showLogo}
                    onChange={handleBrandingChange}
                  />
                  <span className={styles.toggleControl} aria-hidden="true" />
                  <span className={styles.toggleLabel}>Show full colour logo</span>
                </label>
                <label className={styles.toggle} htmlFor="branding-showMonochromeLogo">
                  <input
                    id="branding-showMonochromeLogo"
                    name="showMonochromeLogo"
                    type="checkbox"
                    checked={brandingSettings.showMonochromeLogo}
                    onChange={handleBrandingChange}
                  />
                  <span className={styles.toggleControl} aria-hidden="true" />
                  <span className={styles.toggleLabel}>Provide monochrome option</span>
                </label>
                <label className={styles.toggle} htmlFor="branding-enablePortalBranding">
                  <input
                    id="branding-enablePortalBranding"
                    name="enablePortalBranding"
                    type="checkbox"
                    checked={brandingSettings.enablePortalBranding}
                    onChange={handleBrandingChange}
                  />
                  <span className={styles.toggleControl} aria-hidden="true" />
                  <span className={styles.toggleLabel}>Sync branding to client portal</span>
                </label>
              </div>
            </div>

            <div className={styles.previewGrid}>
              <div className={styles.brandPreview} style={brandPreviewStyle} aria-hidden="true">
                <span className={styles.brandPreviewLogo}>
                  {brandingSettings.showLogo ? 'AKTONZ' : 'Aktonz'}
                </span>
                <p className={styles.brandPreviewTagline}>{brandingSettings.tagline}</p>
                <div className={styles.brandPreviewMeta}>
                  <span>{brandingSettings.primaryColor.toUpperCase()}</span>
                  <span>•</span>
                  <span>{brandingSettings.accentColor.toUpperCase()}</span>
                </div>
              </div>

              <div className={styles.portalCard}>
                <h3>Brand usage notes</h3>
                <ul className={styles.portalList}>
                  <li>Logos are displayed at 160&times;40px inside Apex27.</li>
                  <li>Provide dark &amp; light variants when using the monochrome toggle.</li>
                  <li>Colours cascade to the client portal once syncing is enabled.</li>
                </ul>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.buttonPrimary}>
                Save branding
              </button>
            </div>
          </form>
        </section>

        <section id="portal" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Portal preferences</h2>
            <p>Align the Aktonz portal experience with your Apex27 client communications.</p>
          </div>

          {portalStatus ? (
            <p className={`${styles.statusMessage} ${styles.statusSuccess}`} role="status">
              {portalStatus}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handlePortalSubmit}>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="portal-portalUrl">
                  Portal URL
                </label>
                <input
                  id="portal-portalUrl"
                  name="portalUrl"
                  type="url"
                  className={styles.fieldControl}
                  value={portalSettings.portalUrl}
                  onChange={handlePortalChange}
                />
                <p className={styles.fieldDescription}>Shown in automated onboarding emails and SMS messages.</p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="portal-branchVisibility">
                  Branch visibility
                </label>
                <select
                  id="portal-branchVisibility"
                  name="branchVisibility"
                  className={styles.fieldControl}
                  value={portalSettings.branchVisibility}
                  onChange={handlePortalChange}
                >
                  <option value="all">All branches</option>
                  <option value="default">Default branch only</option>
                </select>
                <p className={styles.fieldDescription}>Limit portal content to the default branch when required.</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="portal-fromName">
                  Sender name
                </label>
                <input
                  id="portal-fromName"
                  name="fromName"
                  className={styles.fieldControl}
                  value={portalSettings.fromName}
                  onChange={handlePortalChange}
                />
                <p className={styles.fieldDescription}>Appears as the display name on portal notifications.</p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="portal-replyToEmail">
                  Reply-to email
                </label>
                <input
                  id="portal-replyToEmail"
                  name="replyToEmail"
                  type="email"
                  className={styles.fieldControl}
                  value={portalSettings.replyToEmail}
                  onChange={handlePortalChange}
                />
                <p className={styles.fieldDescription}>Ensure replies are routed back to the correct Apex27 inbox.</p>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Automation</span>
                <label className={styles.toggle} htmlFor="portal-enablePortal">
                  <input
                    id="portal-enablePortal"
                    name="enablePortal"
                    type="checkbox"
                    checked={portalSettings.enablePortal}
                    onChange={handlePortalChange}
                  />
                  <span className={styles.toggleControl} aria-hidden="true" />
                  <span className={styles.toggleLabel}>Enable client portal</span>
                </label>
                <label className={styles.toggle} htmlFor="portal-welcomeEmail">
                  <input
                    id="portal-welcomeEmail"
                    name="welcomeEmail"
                    type="checkbox"
                    checked={portalSettings.welcomeEmail}
                    onChange={handlePortalChange}
                  />
                  <span className={styles.toggleControl} aria-hidden="true" />
                  <span className={styles.toggleLabel}>Send welcome email automatically</span>
                </label>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.buttonPrimary}>
                Save portal preferences
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>,
    true,
  );
};

export default AdminSettingsPage;
