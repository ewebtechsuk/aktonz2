import Head from 'next/head';
import type { GetServerSideProps } from 'next';
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

function buildBaseUrl(req: Parameters<GetServerSideProps>[0]['req']): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.host || 'localhost:3000';
  const proto = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function normaliseQueryValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.find((entry) => entry && entry.trim().length > 0);
  }

  return value.trim() || undefined;
}

const ContactCardPage = ({ status, context, error, lookup }: ContactCardPageProps) => {
  const title =
    status === 'success'
      ? `${context?.contact?.name ?? 'Contact'} · Aktonz`
      : status === 'not-found'
        ? 'Contact not found · Aktonz'
        : 'Contact lookup · Aktonz';

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

export const getServerSideProps: GetServerSideProps<ContactCardPageProps> = async (context) => {
  const { req, res, query } = context;
  const token =
    normaliseQueryValue(query.token as string | string[] | undefined) ||
    normaliseQueryValue(query.lookup as string | string[] | undefined) ||
    normaliseQueryValue(query.lookupToken as string | string[] | undefined);
  const phone =
    normaliseQueryValue(query.phone as string | string[] | undefined) ||
    normaliseQueryValue(query.callerId as string | string[] | undefined) ||
    normaliseQueryValue(query.callerid as string | string[] | undefined);

  const lookup = { token: token ?? null, phone: phone ?? null };

  if (!lookup.token && !lookup.phone) {
    return {
      props: {
        status: 'not-found',
        context: null,
        error: 'Missing lookup token or phone number.',
        lookup,
      },
    };
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const baseUrl = buildBaseUrl(req);
  const searchParams = new URLSearchParams();
  if (lookup.token) {
    searchParams.set('token', lookup.token);
  }
  if (lookup.phone) {
    searchParams.set('phone', lookup.phone);
  }

  const apiUrl = `${baseUrl}/api/integrations/3cx/contact-context?${searchParams.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        cookie: req.headers.cookie ?? '',
        accept: 'application/json',
      },
      method: 'GET',
    });

    if (response.status === 404) {
      return {
        props: {
          status: 'not-found',
          context: null,
          error: null,
          lookup,
        },
      };
    }

    if (!response.ok) {
      return {
        props: {
          status: 'error',
          context: null,
          error: `Lookup failed with status ${response.status}.`,
          lookup,
        },
      };
    }

    const payload = (await response.json()) as { context?: ContactContext | null } | null;
    const contactContext = payload?.context ?? null;

    if (!contactContext) {
      return {
        props: {
          status: 'not-found',
          context: null,
          error: null,
          lookup,
        },
      };
    }

    return {
      props: {
        status: 'success',
        context: contactContext,
        error: null,
        lookup,
      },
    };
  } catch (error) {
    return {
      props: {
        status: 'error',
        context: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        lookup,
      },
    };
  }
};

export default ContactCardPage;
