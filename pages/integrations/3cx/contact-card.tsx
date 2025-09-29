import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import ContactCard from '../../../components/contacts/ContactCard';
import styles from '../../../styles/ContactCard.module.css';

type ContactDetails = {
  name?: string;
  stage?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  company?: string;
  preferredAgent?: { name?: string } | null;
  tags?: string[];
  searchFocus?: string;
  [key: string]: unknown;
};

type PropertySummary = {
  id?: string;
  reference?: string;
  title?: string;
  address?: string;
  status?: string;
  price?: string;
  type?: string;
  [key: string]: unknown;
};

type AppointmentSummary = {
  id?: string;
  type?: string;
  date?: string;
  summary?: string;
  agent?: { name?: string } | null;
  property?: { id?: string; title?: string; address?: string } | null;
  [key: string]: unknown;
};

type FinancialSummary = Record<string, string | number> | null;

type ContactContext = {
  contact?: ContactDetails | null;
  properties?: PropertySummary[];
  appointments?: AppointmentSummary[];
  financialSummary?: FinancialSummary;
  notes?: string;
  [key: string]: unknown;
};

type ContactCardPageProps = {
  status: 'loading' | 'success' | 'not-found' | 'error';
  context?: ContactContext | null;
  error?: string | null;
  lookup?: {
    token?: string | null;
    phone?: string | null;
  };
};

function normaliseQueryValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.find((entry) => entry && entry.trim().length > 0);
  }

  return value.trim() || undefined;
}

const ContactCardPage = () => {
  const router = useRouter();
  const [status, setStatus] = useState<ContactCardPageProps['status']>('loading');
  const [context, setContext] = useState<ContactContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ContactCardPageProps['lookup']>({ token: null, phone: null });
  const lastRequestKey = useRef<string | null>(null);

  const title = useMemo(() => {
    return status === 'success'
      ? `${context?.contact?.name ?? 'Contact'} · Aktonz`
      : status === 'not-found'
        ? 'Contact not found · Aktonz'
        : 'Contact lookup · Aktonz';
  }, [context?.contact?.name, status]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const token =
      normaliseQueryValue(router.query.token as string | string[] | undefined) ||
      normaliseQueryValue(router.query.lookup as string | string[] | undefined) ||
      normaliseQueryValue(router.query.lookupToken as string | string[] | undefined);
    const phone =
      normaliseQueryValue(router.query.phone as string | string[] | undefined) ||
      normaliseQueryValue(router.query.callerId as string | string[] | undefined) ||
      normaliseQueryValue(router.query.callerid as string | string[] | undefined);

    const nextLookup = { token: token ?? null, phone: phone ?? null };
    setLookup(nextLookup);

    if (!nextLookup.token && !nextLookup.phone) {
      setStatus('not-found');
      setContext(null);
      setError('Missing lookup token or phone number.');
      lastRequestKey.current = null;
      return;
    }

    const searchParams = new URLSearchParams();
    if (nextLookup.token) {
      searchParams.set('token', nextLookup.token);
    }
    if (nextLookup.phone) {
      searchParams.set('phone', nextLookup.phone);
    }

    const requestKey = searchParams.toString();
    if (lastRequestKey.current === requestKey) {
      return;
    }
    lastRequestKey.current = requestKey;

    const abortController = new AbortController();

    setStatus('loading');
    setContext(null);
    setError(null);

    fetch(`/api/integrations/3cx/contact-context?${requestKey}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (abortController.signal.aborted) {
          return { status: 'aborted' as const };
        }

        if (response.status === 404) {
          return { status: 'not-found' as const };
        }

        if (!response.ok) {
          return { status: 'error' as const, message: `Lookup failed with status ${response.status}.` };
        }

        try {
          const payload = (await response.json()) as { context?: ContactContext | null } | null;
          return { status: 'success' as const, context: payload?.context ?? null };
        } catch (jsonError) {
          return {
            status: 'error' as const,
            message: jsonError instanceof Error ? jsonError.message : 'Failed to parse lookup response.',
          };
        }
      })
      .then((result) => {
        if (!result || abortController.signal.aborted || result.status === 'aborted') {
          return;
        }

        if (result.status === 'not-found') {
          setStatus('not-found');
          setContext(null);
          setError(null);
          return;
        }

        if (result.status === 'error') {
          setStatus('error');
          setContext(null);
          setError(result.message);
          return;
        }

        if (!result.context) {
          setStatus('not-found');
          setContext(null);
          setError(null);
          return;
        }

        setStatus('success');
        setContext(result.context);
        setError(null);
      })
      .catch((fetchError) => {
        if (abortController.signal.aborted) {
          return;
        }

        setStatus('error');
        setContext(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
      });

    return () => {
      abortController.abort();
    };
  }, [router.isReady, router.query]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={styles.wrapper}>
        <div className={styles.wrapperInner}>
          {status === 'success' && context ? (
            <ContactCard context={context} />
          ) : (
            <div
              className={[
                styles.statePanel,
                status === 'error'
                  ? styles.error
                  : status === 'not-found'
                    ? styles.notFound
                    : status === 'loading'
                      ? styles.loading
                      : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {status === 'loading' ? (
                <>
                  <h1>Looking up contact</h1>
                  <p>Attempting to resolve the caller details...</p>
                </>
              ) : null}
              {status === 'not-found' ? (
                <>
                  <h1>Contact not found</h1>
                  <p>
                    We could not find a matching record{lookup?.phone ? ` for ${lookup.phone}` : ''}. Double-check the number or
                    try again with a one-time lookup token.
                  </p>
                </>
              ) : null}
              {status === 'error' ? (
                <>
                  <h1>Something went wrong</h1>
                  <p>{error || 'The contact context service responded with an unexpected error.'}</p>
                </>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default ContactCardPage;
