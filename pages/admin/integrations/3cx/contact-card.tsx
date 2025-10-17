import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminContactCard from '../../../../components/admin/ContactCard';
import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../../components/admin/AdminNavigation';
import { useSession } from '../../../../components/SessionProvider';
import styles from '../../../../styles/AdminContactCard.module.css';

type LookupDetails = {
  token: string | null;
  phone: string | null;
  countryCode: string | null;
};

type ContactDossier = Record<string, unknown> | null;

type FetchState = {
  status: 'idle' | 'loading' | 'success' | 'not-found' | 'error';
  dossier: ContactDossier;
  error: string | null;
};

function normaliseQueryValue(value: string | string[] | undefined): string | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry && entry.trim()) {
        return entry.trim();
      }
    }
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const AdminIntegrationContactCardPage = () => {
  const router = useRouter();
  const session = useSession() as {
    user: { role?: string | null } | null;
    loading: boolean;
  };
  const { user, loading: sessionLoading } = session;
  const isAdmin = Boolean(user?.role === 'admin');

  const [lookup, setLookup] = useState<LookupDetails>({ token: null, phone: null, countryCode: null });
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle', dossier: null, error: null });

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const query = router.query;
    const token =
      normaliseQueryValue(query.token as string | string[] | undefined) ||
      normaliseQueryValue(query.lookup as string | string[] | undefined) ||
      normaliseQueryValue(query.lookupToken as string | string[] | undefined);
    const phone =
      normaliseQueryValue(query.phone as string | string[] | undefined) ||
      normaliseQueryValue(query.callerId as string | string[] | undefined) ||
      normaliseQueryValue(query.callerid as string | string[] | undefined);
    const countryCode = normaliseQueryValue(query.countryCode as string | string[] | undefined);

    setLookup({ token, phone, countryCode });
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady || sessionLoading || !isAdmin) {
      return;
    }

    const controller = new AbortController();

    const performLookup = async () => {
      if (!lookup.token && !lookup.phone) {
        setFetchState({ status: 'not-found', dossier: null, error: 'Missing phone number or lookup token.' });
        return;
      }

      setFetchState({ status: 'loading', dossier: null, error: null });

      const searchParams = new URLSearchParams();
      if (lookup.phone) {
        searchParams.set('phone', lookup.phone);
      }
      if (lookup.countryCode) {
        searchParams.set('countryCode', lookup.countryCode);
      }

      const requestUrl = `/api/integrations/3cx/contact?${searchParams.toString()}`;

      try {
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: lookup.token
            ? {
                authorization: `Bearer ${lookup.token}`,
                accept: 'application/json',
              }
            : { accept: 'application/json' },
          signal: controller.signal,
        });

        if (response.status === 404) {
          setFetchState({ status: 'not-found', dossier: null, error: null });
          return;
        }

        if (!response.ok) {
          setFetchState({
            status: 'error',
            dossier: null,
            error: `Lookup failed with status ${response.status}.`,
          });
          return;
        }

        const payload = (await response.json()) as { contact?: unknown } | null;
        const dossier =
          payload && typeof payload === 'object' && 'contact' in payload
            ? (payload.contact as ContactDossier)
            : (payload as ContactDossier);

        if (!dossier) {
          setFetchState({ status: 'not-found', dossier: null, error: null });
          return;
        }

        setFetchState({ status: 'success', dossier, error: null });
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setFetchState({ status: 'error', dossier: null, error: message });
      }
    };

    void performLookup();

    return () => {
      controller.abort();
    };
  }, [isAdmin, lookup.countryCode, lookup.phone, lookup.token, router.isReady, sessionLoading]);

  const pageTitle = useMemo(() => {
    if (fetchState.status === 'success') {
      return '3CX Contact dossier · Aktonz Admin';
    }
    if (fetchState.status === 'not-found') {
      return 'Contact not found · Aktonz Admin';
    }
    if (fetchState.status === 'error') {
      return 'Lookup failed · Aktonz Admin';
    }
    return '3CX Contact lookup · Aktonz Admin';
  }, [fetchState.status]);

  if (sessionLoading) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <AdminNavigation items={[]} />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <AdminContactCard status="loading" />
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <AdminNavigation items={[]} />
        <main className={styles.page}>
          <div className={styles.pageInner}>
            <div className={styles.statePanel}>
              <h1>Admin access required</h1>
              <p>
                You need to{' '}
                <Link href="/login">sign in with an admin account</Link> to open contact dossiers from the phone
                system.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.page}>
        <div className={styles.pageInner}>
          <AdminContactCard
            status={fetchState.status === 'idle' ? 'loading' : fetchState.status}
            dossier={fetchState.dossier}
            error={fetchState.error}
            lookup={lookup}
          />
        </div>
      </main>
    </>
  );
};

export default AdminIntegrationContactCardPage;
