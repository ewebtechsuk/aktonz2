import Link from 'next/link';
import { useMemo } from 'react';

import styles from '../../styles/AdminContactCard.module.css';
import { formatAdminDate } from '../../lib/admin/formatters';

type AnyRecord = Record<string, unknown>;

type ContactDossier = {
  contact?: AnyRecord | null;
  properties?: AnyRecord[] | null;
  appointments?: AnyRecord[] | null;
  viewings?: AnyRecord[] | null;
  financial?: AnyRecord[] | null;
  notes?: string | null;
  tags?: string[] | null;
  phones?: string[] | null;
  emails?: string[] | null;
  [key: string]: unknown;
};

type LookupDetails = {
  token?: string | null;
  phone?: string | null;
  countryCode?: string | null;
};

type AdminContactCardProps = {
  status: 'loading' | 'success' | 'not-found' | 'error';
  dossier?: ContactDossier | null;
  lookup?: LookupDetails | null;
  error?: string | null;
};

type ContactProfile = {
  name: string;
  stage: string | null;
  company: string | null;
  emailAddresses: string[];
  phoneNumbers: string[];
  tags: string[];
  notes: string | null;
  avatarUrl: string | null;
  initials: string;
  address: string | null;
};

const PHONE_FIELDS = [
  'phone',
  'mobile',
  'mobilePhone',
  'mobile_phone',
  'mobileNumber',
  'mobile_number',
  'landline',
  'landLine',
  'homePhone',
  'home_phone',
  'workPhone',
  'work_phone',
  'telephone',
  'Telephone',
  'tel',
];

const EMAIL_FIELDS = ['email', 'Email', 'contactEmail', 'contact_email', 'userEmail', 'user_email'];

const TAG_FIELDS = ['tags', 'tagList', 'tag_list'];

const NAME_FIELDS = ['name', 'fullName', 'full_name', 'displayName', 'display_name'];

const COMPANY_FIELDS = ['company', 'organisation', 'organization', 'agency', 'branch'];

const STAGE_FIELDS = ['stage', 'status', 'pipelineStage', 'pipeline_stage', 'lifecycleStage', 'lifecycle_stage'];

const ADDRESS_FIELDS = [
  'address',
  'street',
  'streetAddress',
  'street_address',
  'addressLine1',
  'address_line1',
  'address1',
  'line1',
  'postcode',
  'postalCode',
  'postal_code',
  'city',
  'town',
  'county',
];

function coerceArray(value: unknown): AnyRecord[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === 'object') as AnyRecord[];
  }

  if (typeof value === 'object') {
    return Object.values(value).filter((entry) => entry && typeof entry === 'object') as AnyRecord[];
  }

  return [];
}

function extractStrings(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? null : String(entry).trim()))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalised = value.trim();
    if (!normalised || seen.has(normalised.toLowerCase())) {
      continue;
    }
    seen.add(normalised.toLowerCase());
    result.push(normalised);
  }
  return result;
}

function pickFirstString(record: AnyRecord | null, keys: string[]): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const raw = record[key];
    if (raw == null) {
      continue;
    }

    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }

  return null;
}

function buildName(record: AnyRecord | null): string {
  if (!record) {
    return 'Unknown contact';
  }

  const direct = pickFirstString(record, NAME_FIELDS);
  if (direct) {
    return direct;
  }

  const firstName = pickFirstString(record, ['firstName', 'forename', 'givenName', 'first_name']);
  const lastName = pickFirstString(record, ['surname', 'lastName', 'familyName', 'last_name']);
  const title = pickFirstString(record, ['title', 'Title']);

  const parts = [title, firstName, lastName].filter(Boolean);
  if (parts.length) {
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  const fallback = pickFirstString(record, ['contactId', 'contactID', 'id']);
  return fallback ? `Contact ${fallback}` : 'Unknown contact';
}

function buildInitials(name: string): string {
  if (!name) {
    return '?';
  }

  const matches = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  if (matches.length === 0) {
    return '?';
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return matches.join('');
}

function extractFieldStrings(record: AnyRecord | null, fields: string[]): string[] {
  if (!record) {
    return [];
  }

  const collected: string[] = [];

  for (const field of fields) {
    const value = record[field];
    if (value == null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        collected.push(trimmed);
      }
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry != null) {
          collected.push(String(entry).trim());
        }
      }
      continue;
    }
  }

  return dedupeStrings(collected.filter(Boolean));
}

function resolveContactProfile(dossier: ContactDossier | null | undefined): ContactProfile {
  const contactCandidate = (dossier?.contact && typeof dossier.contact === 'object'
    ? (dossier.contact as AnyRecord)
    : dossier && typeof dossier === 'object'
      ? (dossier as unknown as AnyRecord)
      : null) as AnyRecord | null;

  const name = buildName(contactCandidate);
  const stage = pickFirstString(contactCandidate, STAGE_FIELDS);
  const company = pickFirstString(contactCandidate, COMPANY_FIELDS);
  const avatarUrl = pickFirstString(contactCandidate, ['avatarUrl', 'avatar', 'photo', 'image']);
  const addressParts = extractFieldStrings(contactCandidate, ADDRESS_FIELDS);

  const phoneNumbers = dedupeStrings([
    ...extractFieldStrings(contactCandidate, PHONE_FIELDS),
    ...extractStrings(dossier?.phones ?? null),
  ]);
  const emailAddresses = dedupeStrings([
    ...extractFieldStrings(contactCandidate, EMAIL_FIELDS),
    ...extractStrings(dossier?.emails ?? null),
  ]);

  let tags: string[] = [];
  if (contactCandidate) {
    for (const field of TAG_FIELDS) {
      if (field in contactCandidate) {
        tags = dedupeStrings([...tags, ...extractStrings(contactCandidate[field])]);
      }
    }
  }
  tags = dedupeStrings([...tags, ...extractStrings(dossier?.tags ?? null)]);

  const notesCandidate =
    typeof dossier?.notes === 'string' && dossier.notes.trim()
      ? dossier.notes.trim()
      : typeof contactCandidate?.notes === 'string' && contactCandidate.notes.trim()
        ? String(contactCandidate.notes).trim()
        : null;

  const initials = buildInitials(name);

  const address = addressParts.length ? addressParts.join(', ') : null;

  return {
    name,
    stage: stage || null,
    company: company || null,
    avatarUrl: avatarUrl || null,
    phoneNumbers,
    emailAddresses,
    tags,
    notes: notesCandidate,
    initials,
    address,
  };
}

const CONTACT_DATE_TIME: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

function formatDate(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatted = formatAdminDate(date, CONTACT_DATE_TIME);
  return formatted || date.toLocaleString();
}

function renderStatePanel(title: string, description: string | null, tone: 'loading' | 'info' | 'error') {
  return (
    <div
      className={[
        styles.statePanel,
        tone === 'loading' ? styles.loading : '',
        tone === 'error' ? styles.error : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h1>{title}</h1>
      {tone === 'loading' ? <div className={styles.loadingSpinner} aria-hidden="true" /> : null}
      {description ? <p>{description}</p> : null}
    </div>
  );
}

const MAX_LIST_ITEMS = 4;

const AdminContactCard = ({ status, dossier, lookup, error }: AdminContactCardProps) => {
  const profile = useMemo(() => resolveContactProfile(dossier ?? null), [dossier]);

  const properties = useMemo(() => {
    const rawProperties = dossier?.properties ?? dossier?.contact?.properties ?? [];
    return coerceArray(rawProperties).slice(0, MAX_LIST_ITEMS);
  }, [dossier]);

  const appointments = useMemo(() => {
    const candidates: AnyRecord[] = [];
    if (Array.isArray(dossier?.appointments)) {
      candidates.push(...coerceArray(dossier?.appointments));
    }
    if (Array.isArray(dossier?.viewings)) {
      candidates.push(...coerceArray(dossier?.viewings));
    }

    return candidates.slice(0, MAX_LIST_ITEMS);
  }, [dossier]);

  if (status === 'loading') {
    return renderStatePanel('Looking up contact', 'Retrieving details for the incoming caller…', 'loading');
  }

  if (status === 'not-found') {
    const phoneDetail = lookup?.phone ? ` for ${lookup.phone}` : '';
    return renderStatePanel(
      'Contact not found',
      `We could not find a matching record${phoneDetail}. Double-check the number or try a different lookup token.`,
      'info',
    );
  }

  if (status === 'error') {
    return renderStatePanel(
      'Something went wrong',
      error || 'The contact service responded with an unexpected error. Please try again.',
      'error',
    );
  }

  return (
    <article className={styles.card} data-status={status}>
      <header className={styles.cardHeader}>
        {profile.avatarUrl ? (
          <img className={styles.avatar} src={profile.avatarUrl} alt="Contact avatar" />
        ) : (
          <div className={styles.initials} aria-hidden="true">
            {profile.initials}
          </div>
        )}
        <div className={styles.cardHeaderContent}>
          <h1 className={styles.contactName}>{profile.name}</h1>
          <div className={styles.metaRow}>
            {profile.stage ? <span className={styles.pill}>{profile.stage}</span> : null}
            {profile.company ? <span className={styles.metaText}>{profile.company}</span> : null}
            {lookup?.phone ? <span className={styles.metaText}>Caller: {lookup.phone}</span> : null}
          </div>
          {profile.address ? <p className={styles.address}>{profile.address}</p> : null}
        </div>
      </header>

      <section className={styles.section} aria-labelledby="contact-methods">
        <h2 id="contact-methods" className={styles.sectionTitle}>
          Contact
        </h2>
        <div className={styles.contactGrid}>
          {profile.emailAddresses.map((email) => (
            <a key={email} className={styles.contactLink} href={`mailto:${email}`}>
              {email}
            </a>
          ))}
          {profile.phoneNumbers.map((phone) => (
            <a key={phone} className={styles.contactLink} href={`tel:${phone}`}>
              {phone}
            </a>
          ))}
          {!profile.emailAddresses.length && !profile.phoneNumbers.length ? (
            <p className={styles.emptyMeta}>No saved contact methods.</p>
          ) : null}
        </div>
        {profile.tags.length ? (
          <ul className={styles.tagList}>
            {profile.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {properties.length ? (
        <section className={styles.section} aria-labelledby="associated-properties">
          <h2 id="associated-properties" className={styles.sectionTitle}>
            Properties
          </h2>
          <ul className={styles.propertyList}>
            {properties.map((property, index) => {
              const primary =
                pickFirstString(property, ['title', 'address', 'name']) ||
                pickFirstString(property, ['reference', 'ref']) ||
                `Property ${index + 1}`;
              const secondary = pickFirstString(property, ['status', 'price', 'type']);
              return (
                <li key={`${primary}-${index}`} className={styles.propertyItem}>
                  <span className={styles.propertyPrimary}>{primary}</span>
                  {secondary ? <span className={styles.propertySecondary}>{secondary}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {appointments.length ? (
        <section className={styles.section} aria-labelledby="appointments">
          <h2 id="appointments" className={styles.sectionTitle}>
            Upcoming appointments
          </h2>
          <ul className={styles.appointmentList}>
            {appointments.map((appointment, index) => {
              const summary =
                pickFirstString(appointment, ['summary', 'title', 'type']) || `Appointment ${index + 1}`;
              const when =
                pickFirstString(appointment, ['date', 'start', 'when', 'appointmentDate', 'appointment_date']) || null;
              const formattedDate = when ? formatDate(when) : null;
              const agent = pickFirstString(appointment, ['agentName', 'agent', 'negotiator']);
              const property = pickFirstString(appointment, ['propertyTitle', 'property']);

              return (
                <li key={`${summary}-${index}`} className={styles.appointmentItem}>
                  <div className={styles.appointmentHeader}>
                    <span className={styles.appointmentSummary}>{summary}</span>
                    {formattedDate ? <time>{formattedDate}</time> : null}
                  </div>
                  {property ? <p className={styles.appointmentMeta}>{property}</p> : null}
                  {agent ? <p className={styles.appointmentMeta}>With {agent}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {profile.notes ? (
        <section className={styles.section} aria-labelledby="notes">
          <h2 id="notes" className={styles.sectionTitle}>
            Notes
          </h2>
          <p className={styles.notes}>{profile.notes}</p>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <p>
          Need to update this record?{' '}
          <Link href="/admin" className={styles.footerLink}>
            Open the admin dashboard
          </Link>
          .
        </p>
      </footer>
    </article>
  );
};

AdminContactCard.defaultProps = {
  dossier: null,
  lookup: null,
  error: null,
};

export default AdminContactCard;
