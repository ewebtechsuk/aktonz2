import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminListingDetails.module.css';
import { formatOfferStatusLabel } from '../../../lib/offer-statuses.js';
import {
  FaAlignLeft,
  FaBalanceScale,
  FaBed,
  FaBullhorn,
  FaBuilding,
  FaCalendarCheck,
  FaClipboardList,
  FaGavel,
  FaImages,
  FaListUl,
  FaMapMarkedAlt,
  FaMoneyBillWave,
  FaStickyNote,
  FaUserFriends,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Marketing in progress' },
  { value: 'let_agreed', label: 'Let agreed' },
  { value: 'under_offer', label: 'Under offer' },
];

const STATUS_TONES = {
  available: 'success',
  pending: 'info',
  let_agreed: 'muted',
  under_offer: 'muted',
};

const RENT_FREQUENCY_OPTIONS = [
  { value: 'pcm', label: 'Per month' },
  { value: 'pw', label: 'Per week' },
  { value: 'pq', label: 'Per quarter' },
  { value: 'pa', label: 'Per annum' },
];

const MARKETING_TYPE_OPTIONS = [
  { value: 'portal', label: 'Portal' },
  { value: 'video', label: 'Video' },
  { value: 'virtual_tour', label: 'Virtual tour' },
  { value: 'source', label: 'Source' },
  { value: 'link', label: 'Link' },
];

function normalizeRentFrequency(value) {
  if (!value) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const upper = raw.toUpperCase();
  const direct = { W: 'pw', M: 'pcm', Q: 'pq', Y: 'pa' };
  if (direct[upper]) {
    return direct[upper];
  }

  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    w: 'pw',
    week: 'pw',
    weeks: 'pw',
    weekly: 'pw',
    perweek: 'pw',
    pw: 'pw',
    m: 'pcm',
    month: 'pcm',
    months: 'pcm',
    monthly: 'pcm',
    permonth: 'pcm',
    pm: 'pcm',
    pcm: 'pcm',
    q: 'pq',
    quarter: 'pq',
    quarters: 'pq',
    quarterly: 'pq',
    perquarter: 'pq',
    pq: 'pq',
    y: 'pa',
    year: 'pa',
    years: 'pa',
    yearly: 'pa',
    annually: 'pa',
    perannum: 'pa',
    peryear: 'pa',
    pa: 'pa',
  };

  return aliases[normalized] || normalized;
}

function formatHeroRent(amount, frequency, currency) {
  if (amount == null || amount === '') {
    return 'Rent not set';
  }

  const numeric = Number(String(amount).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Rent not set';
  }

  const normalisedFrequency = normalizeRentFrequency(frequency);
  const rentCurrency = currency && String(currency).trim() ? String(currency).trim().toUpperCase() : 'GBP';

  let formattedAmount;
  try {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: rentCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formattedAmount = formatter.format(numeric);
  } catch (error) {
    formattedAmount = `£${numeric.toLocaleString('en-GB')}`;
  }

  const frequencyLabel = RENT_FREQUENCY_OPTIONS.find((option) => option.value === normalisedFrequency)?.label;
  return frequencyLabel ? `${formattedAmount} ${frequencyLabel}` : formattedAmount;
}

function formatCurrencyValue(amount, currency = 'GBP') {
  if (amount == null || amount === '') {
    return '';
  }

  const numeric = Number(String(amount).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) {
    return '';
  }

  try {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency && String(currency).trim() ? String(currency).trim().toUpperCase() : 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(numeric);
  } catch (error) {
    return `£${numeric.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

function cloneFormValues(values) {
  return JSON.parse(JSON.stringify(values));
}

function createFormStateFromListing(listing) {
  if (!listing) {
    return null;
  }

  const marketingLinks = Array.isArray(listing.marketing?.links)
    ? listing.marketing.links.map((link) => ({
        label: link?.label || '',
        type: link?.type || 'link',
        url: link?.url || '',
      }))
    : [];

  const metadata = Array.isArray(listing.metadata)
    ? listing.metadata.map((entry) => ({
        label: entry?.label || '',
        value: entry?.value || '',
      }))
    : [];

  const images = Array.isArray(listing.images)
    ? listing.images.map((url) => ({ url: typeof url === 'string' ? url : '' }))
    : [];

  const media = Array.isArray(listing.media)
    ? listing.media.map((url) => ({ url: typeof url === 'string' ? url : '' }))
    : [];

  return {
    status: listing.status || 'available',
    availabilityLabel: listing.availabilityLabel || '',
    pricePrefix: listing.pricePrefix || '',
    title: listing.title || '',
    displayAddress: listing.displayAddress || '',
    reference: listing.reference || '',
    rentAmount: listing.rent?.amount != null ? String(listing.rent.amount) : '',
    rentFrequency: normalizeRentFrequency(listing.rent?.frequency) || '',
    rentCurrency: listing.rent?.currency || 'GBP',
    bedrooms: listing.bedrooms != null ? String(listing.bedrooms) : '',
    bathrooms: listing.bathrooms != null ? String(listing.bathrooms) : '',
    receptions: listing.receptions != null ? String(listing.receptions) : '',
    furnished: listing.furnished || '',
    propertyType: listing.propertyType || '',
    addressLine1: listing.address?.line1 || '',
    addressLine2: listing.address?.line2 || '',
    city: listing.address?.city || '',
    county: listing.address?.county || '',
    postalCode: listing.address?.postalCode || '',
    country: listing.address?.country || '',
    matchingAreasText: listing.matchingAreas?.length ? listing.matchingAreas.join('\n') : '',
    latitude: listing.coordinates?.lat != null ? String(listing.coordinates.lat) : '',
    longitude: listing.coordinates?.lng != null ? String(listing.coordinates.lng) : '',
    summary: listing.summary || '',
    description: listing.description || '',
    marketingLinks,
    metadata,
    images,
    media,
  };
}

function buildUpdatePayload(values) {
  const marketingLinks = (values.marketingLinks || [])
    .map((link) => ({
      label: link.label,
      type: link.type,
      url: link.url,
    }))
    .filter((link) => link.label || link.url);

  const metadata = (values.metadata || [])
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
    .filter((entry) => entry.label || entry.value);

  const matchingAreas = values.matchingAreasText
    ? values.matchingAreasText
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const images = (values.images || [])
    .map((item) => (item?.url ? item.url.trim() : ''))
    .filter(Boolean);

  const media = (values.media || [])
    .map((item) => (item?.url ? item.url.trim() : ''))
    .filter(Boolean);

  return {
    status: values.status,
    availabilityLabel: values.availabilityLabel,
    pricePrefix: values.pricePrefix,
    title: values.title,
    displayAddress: values.displayAddress,
    reference: values.reference,
    rent: {
      amount: values.rentAmount,
      frequency: values.rentFrequency,
      currency: values.rentCurrency,
    },
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    receptions: values.receptions,
    furnished: values.furnished,
    propertyType: values.propertyType,
    address: {
      line1: values.addressLine1,
      line2: values.addressLine2,
      city: values.city,
      county: values.county,
      postalCode: values.postalCode,
      country: values.country,
    },
    matchingAreas,
    coordinates: {
      lat: values.latitude,
      lng: values.longitude,
    },
    summary: values.summary,
    description: values.description,
    marketing: { links: marketingLinks },
    metadata,
    images,
    media,
  };
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return '—';
  }
}

function formatDateDisplay(value) {
  if (!value) {
    return '—';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    return '—';
  }
}

function formatRelativeTime(value) {
  if (!value) {
    return '';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} mo${diffMonths === 1 ? '' : 's'} ago`;
    }
    const diffYears = Math.round(diffMonths / 12);
    return `${diffYears} yr${diffYears === 1 ? '' : 's'} ago`;
  } catch (error) {
    return '';
  }
}

function renderDefinitionList(items) {
  if (!items.length) {
    return <p className={styles.metaMuted}>Nothing recorded yet.</p>;
  }

  return (
    <dl className={styles.definitionList}>
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className={styles.definitionRow}>
          <dt>{item.label}</dt>
          <dd>
            {item.type === 'phone' ? (
              <a href={`tel:${item.value}`}>{item.value}</a>
            ) : item.type === 'email' ? (
              <a href={`mailto:${item.value}`}>{item.value}</a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function flattenRecord(value, prefix = '') {
  if (value === null || value === undefined) {
    return [{ key: prefix, value: null }];
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return [{ key: prefix, value: [] }];
    }

    return value.flatMap((item, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      return flattenRecord(item, nextPrefix);
    });
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) {
      return [{ key: prefix, value: {} }];
    }

    return entries.flatMap(([key, nested]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return flattenRecord(nested, nextPrefix);
    });
  }

  return [{ key: prefix, value }];
}

function formatFlattenedValue(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '—';
  }

  if (typeof value === 'string') {
    return value.length ? value : '—';
  }

  return JSON.stringify(value);
}

export default function AdminListingDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('main-details');

  const listingId = useMemo(() => {
    if (!router.isReady) {
      return null;
    }
    const { id } = router.query;
    return Array.isArray(id) ? id[0] : id;
  }, [router.isReady, router.query]);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const basePath = router?.basePath ?? '';
      const response = await fetch(`${basePath}/api/admin/listings/${encodeURIComponent(listingId)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Listing not found');
        }
        throw new Error('Failed to fetch listing');
      }
      const payload = await response.json();
      setListing(payload.listing || null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load listing');
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, router.basePath]);

  useEffect(() => {
    if (!isAdmin || !listingId) {
      if (!isAdmin && !sessionLoading) {
        setLoading(false);
      }
      return;
    }

    fetchListing();
  }, [fetchListing, isAdmin, listingId, sessionLoading]);

  useEffect(() => {
    if (!listing) {
      setFormValues(null);
      setInitialValues(null);
      return;
    }

    const next = createFormStateFromListing(listing);
    const cloned = cloneFormValues(next);
    setFormValues(cloned);
    setInitialValues(cloneFormValues(next));
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, [listing]);

  useEffect(() => {
    setActiveTab('main-details');
  }, [listingId]);

  const pageTitle = useMemo(() => {
    const address = formValues?.displayAddress || listing?.displayAddress;
    return address ? `${address} • Aktonz Admin` : 'Listing details • Aktonz Admin';
  }, [formValues, listing]);

  const formDirty = useMemo(() => {
    if (!formValues || !initialValues) {
      return false;
    }
    return JSON.stringify(formValues) !== JSON.stringify(initialValues);
  }, [formValues, initialValues]);

  const updateForm = useCallback((updater) => {
    setFormValues((prev) => {
      if (!prev) {
        return prev;
      }
      const base = { ...prev };
      return typeof updater === 'function' ? updater(base) : updater;
    });
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, []);

  const branchDetails = useMemo(() => {
    const branch = listing?.branch;
    if (!branch) {
      return [];
    }

    const details = [];
    if (branch.name) {
      details.push({ label: 'Branch', value: branch.name });
    }
    if (branch.address) {
      details.push({ label: 'Branch address', value: branch.address });
    }
    if (branch.contact?.phone) {
      details.push({ label: 'Branch phone', value: branch.contact.phone, type: 'phone' });
    }
    if (branch.contact?.email) {
      details.push({ label: 'Branch email', value: branch.contact.email, type: 'email' });
    }
    return details;
  }, [listing]);

  const negotiatorDetails = useMemo(() => {
    const negotiator = listing?.negotiator;
    if (!negotiator) {
      return [];
    }

    const details = [];
    if (negotiator.name) {
      details.push({ label: 'Negotiator', value: negotiator.name });
    }
    if (negotiator.contact?.phone) {
      details.push({ label: 'Negotiator phone', value: negotiator.contact.phone, type: 'phone' });
    }
    if (negotiator.contact?.email) {
      details.push({ label: 'Negotiator email', value: negotiator.contact.email, type: 'email' });
    }
    return details;
  }, [listing]);

  const heroRentLabel = useMemo(() => {
    if (formValues) {
      return formatHeroRent(formValues.rentAmount, formValues.rentFrequency, formValues.rentCurrency);
    }
    return formatHeroRent(listing?.rent?.amount, listing?.rent?.frequency, listing?.rent?.currency);
  }, [formValues, listing]);

  const listingOffers = useMemo(() => {
    const offers = Array.isArray(listing?.offers) ? listing.offers : [];
    return offers.slice().sort((a, b) => {
      const right = new Date(b.updatedAt || b.date || 0).getTime();
      const left = new Date(a.updatedAt || a.date || 0).getTime();
      return right - left;
    });
  }, [listing]);

  const listingMaintenance = useMemo(() => {
    const tasks = Array.isArray(listing?.maintenanceTasks) ? listing.maintenanceTasks : [];
    return tasks.slice().sort((a, b) => {
      const left = Number.isFinite(a.dueTimestamp) ? a.dueTimestamp : Infinity;
      const right = Number.isFinite(b.dueTimestamp) ? b.dueTimestamp : Infinity;
      if (left !== right) {
        return left - right;
      }
      const leftUpdated = Number.isFinite(a.updatedAtTimestamp) ? a.updatedAtTimestamp : 0;
      const rightUpdated = Number.isFinite(b.updatedAtTimestamp) ? b.updatedAtTimestamp : 0;
      return rightUpdated - leftUpdated;
    });
  }, [listing]);

  const interestedParties = useMemo(() => {
    const parties = [];
    const seen = new Set();
    listingOffers.forEach((offer) => {
      const name = offer?.contact?.name || offer?.name || offer?.email || 'Applicant';
      const key = offer?.contact?.email || offer?.contact?.phone || offer?.email || offer?.id || name;
      if (key && !seen.has(key)) {
        seen.add(key);
        const status = offer?.status;
        parties.push({
          name,
          status,
          statusLabel: formatOfferStatusLabel(status),
          updatedAt: offer?.updatedAt || offer?.date,
        });
      }
    });
    return parties;
  }, [listingOffers]);

  const matchingAreasList = useMemo(() => {
    if (formValues?.matchingAreasText) {
      return formValues.matchingAreasText
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (Array.isArray(listing?.matchingAreas)) {
      return listing.matchingAreas.filter((item) => typeof item === 'string' && item.trim().length);
    }
    return [];
  }, [formValues?.matchingAreasText, listing]);

  const noteEntries = useMemo(() => {
    const entries = [];
    const raw = listing?.raw || {};

    const addEntry = (label, value) => {
      if (typeof value !== 'string') {
        return;
      }
      const trimmed = value.trim();
      if (trimmed) {
        entries.push({ label, value: trimmed });
      }
    };

    addEntry('Summary note', raw.summary || listing?.summary || '');
    addEntry('Print summary', raw.printSummary || '');

    for (let index = 1; index <= 6; index += 1) {
      addEntry(`Custom note ${index}`, raw[`customDescription${index}`] || '');
    }

    if (Array.isArray(raw.bullets)) {
      raw.bullets
        .map((bullet) => (typeof bullet === 'string' ? bullet.trim() : ''))
        .filter(Boolean)
        .forEach((bullet, index) => {
          entries.push({ label: `Highlight ${index + 1}`, value: bullet });
        });
    }

    return entries;
  }, [listing]);

  const financialEntries = useMemo(() => {
    const entries = [];
    const raw = listing?.raw || {};

    if (listing?.rent?.amount != null) {
      const label = formatHeroRent(listing.rent.amount, listing.rent.frequency, listing.rent.currency);
      if (label && label !== 'Rent not set') {
        entries.push({ label: 'Asking rent', value: label });
      }
    }

    if (raw.minimumTermMonths) {
      entries.push({ label: 'Minimum term', value: `${raw.minimumTermMonths} months` });
    }

    if (raw.councilTaxBand) {
      entries.push({ label: 'Council tax band', value: raw.councilTaxBand });
    }

    if (raw.councilTaxAmount != null) {
      const formatted = formatCurrencyValue(raw.councilTaxAmount, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Council tax', value: formatted });
      }
    }

    if (raw.serviceChargeAmount != null) {
      const formatted = formatCurrencyValue(raw.serviceChargeAmount, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Service charge', value: formatted });
      }
    }

    if (raw.groundRentAmount != null) {
      const formatted = formatCurrencyValue(raw.groundRentAmount, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Ground rent', value: formatted });
      }
    }

    if (raw.totalIncomeText) {
      entries.push({ label: 'Total income', value: raw.totalIncomeText });
    }

    if (raw.saleFee) {
      const formatted = formatCurrencyValue(raw.saleFee, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Sale fee', value: formatted });
      }
    }

    if (raw.groundRentDescription) {
      entries.push({ label: 'Ground rent notes', value: raw.groundRentDescription });
    }

    if (raw.serviceChargeDescription) {
      entries.push({ label: 'Service charge notes', value: raw.serviceChargeDescription });
    }

    return entries;
  }, [listing]);

  const valuationEntries = useMemo(() => {
    const entries = [];
    const raw = listing?.raw || {};

    if (raw.valuationRent != null) {
      const formatted = formatCurrencyValue(raw.valuationRent, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Valuation rent', value: formatted });
      }
    }

    if (raw.valuationPrice != null) {
      const formatted = formatCurrencyValue(raw.valuationPrice, raw.priceCurrency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Valuation price', value: formatted });
      }
    }

    if (raw.dateOfInstruction) {
      entries.push({ label: 'Instruction date', value: formatDateDisplay(raw.dateOfInstruction) });
    }

    if (raw.dateAvailableFrom) {
      entries.push({ label: 'Available from', value: formatDateDisplay(raw.dateAvailableFrom) });
    }

    if (raw.leaseYearsRemaining != null) {
      entries.push({ label: 'Lease years remaining', value: String(raw.leaseYearsRemaining) });
    }

    return entries;
  }, [listing]);

  const auctionEntries = useMemo(() => {
    const entries = [];
    const sale = (listing?.raw && typeof listing.raw === 'object' && listing.raw.sale) || {};

    if (sale.auctionDate) {
      entries.push({ label: 'Auction date', value: formatDateDisplay(sale.auctionDate) });
    }

    if (sale.auctionTime) {
      entries.push({ label: 'Auction time', value: sale.auctionTime });
    }

    if (sale.auctionLocation) {
      entries.push({ label: 'Auction location', value: sale.auctionLocation });
    }

    if (sale.auctionGuidePrice != null) {
      const formatted = formatCurrencyValue(sale.auctionGuidePrice, listing?.rent?.currency || 'GBP');
      if (formatted) {
        entries.push({ label: 'Guide price', value: formatted });
      }
    }

    if (sale.auctionNotes) {
      entries.push({ label: 'Auction notes', value: sale.auctionNotes });
    }

    return entries;
  }, [listing]);

  const roomEntries = useMemo(() => {
    const entries = [];
    const raw = listing?.raw || {};

    const addEntry = (label, value) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        entries.push({ label, value: numeric });
      }
    };

    addEntry('Bedrooms', listing?.bedrooms);
    addEntry('Bathrooms', listing?.bathrooms);
    addEntry('Receptions', listing?.receptions);
    addEntry('Ensuites', raw.ensuites);
    addEntry('Toilets', raw.toilets);
    addEntry('Kitchens', raw.kitchens);
    addEntry('Dining rooms', raw.diningRooms);
    addEntry('Garages', raw.garages);
    addEntry('Parking spaces', raw.parkingSpaces);
    addEntry('Floors', raw.floors);

    return entries;
  }, [listing]);

  const featureGroups = useMemo(() => {
    const raw = listing?.raw || {};

    const normaliseList = (value) => {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value
          .map((entry) => {
            if (typeof entry === 'string') {
              return entry.trim();
            }
            if (entry && typeof entry === 'object' && entry.label) {
              return String(entry.label).trim();
            }
            return '';
          })
          .filter(Boolean);
      }
      if (typeof value === 'string') {
        return value
          .split(/[;,\n]/)
          .map((part) => part.trim())
          .filter(Boolean);
      }
      return [];
    };

    const groups = [
      { label: 'Custom features', items: normaliseList(raw.customFeatures) },
      { label: 'Parking', items: normaliseList(raw.parkingFeatures) },
      { label: 'Heating', items: normaliseList(raw.heatingFeatures) },
      { label: 'Outside space', items: normaliseList(raw.outsideSpaceFeatures) },
      { label: 'Accessibility', items: normaliseList(raw.accessibilityFeatures) },
      { label: 'Utilities', items: normaliseList(raw.includedUtilities) },
      { label: 'Water supply', items: normaliseList(raw.waterSupplyFeatures) },
      { label: 'Electricity supply', items: normaliseList(raw.electricitySupplyFeatures) },
      { label: 'Broadband', items: normaliseList(raw.broadbandSupplyFeatures) },
      { label: 'Flood sources', items: normaliseList(raw.floodSources) },
    ];

    return groups.filter((group) => group.items.length);
  }, [listing]);

  const marketingLinksCount = useMemo(() => {
    if (formValues?.marketingLinks?.length) {
      return formValues.marketingLinks.filter((link) => (link?.label || link?.url)?.trim()).length;
    }
    if (Array.isArray(listing?.marketing?.links)) {
      return listing.marketing.links.filter((link) => (link?.label || link?.url)?.trim()).length;
    }
    return 0;
  }, [formValues?.marketingLinks, listing]);

  const metadataEntriesCount = useMemo(() => {
    if (formValues?.metadata?.length) {
      return formValues.metadata.filter((entry) => (entry?.label || entry?.value)?.trim()).length;
    }
    if (Array.isArray(listing?.metadata)) {
      return listing.metadata.filter((entry) => (entry?.label || entry?.value)?.trim()).length;
    }
    return 0;
  }, [formValues?.metadata, listing]);

  const apexFields = Array.isArray(listing?.apexFields) ? listing.apexFields : null;
  const apexRaw = listing?.apexRaw ?? null;

  const apexEntries = useMemo(() => {
    let entries = Array.isArray(apexFields) ? apexFields : [];

    if (!entries.length && apexRaw) {
      entries = flattenRecord(apexRaw);
    }

    return entries
      .filter((entry) => entry && typeof entry.key === 'string' && entry.key.length)
      .map((entry) => ({ key: entry.key, value: entry.value }));
  }, [apexFields, apexRaw]);

  const tabItems = useMemo(() => {
    const mediaCount = Array.isArray(formValues?.images)
      ? formValues.images.filter((image) => (image?.url || '').trim().length).length
      : Array.isArray(listing?.images)
        ? listing.images.filter((url) => typeof url === 'string' && url.trim().length).length
        : 0;
    const offersCount = listingOffers.length;
    const interestedCount = interestedParties.length;
    const applicantsCount = matchingAreasList.length;
    const valuationCount = valuationEntries.length;
    const roomsCount = roomEntries.length;
    const featuresCount = featureGroups.reduce((total, group) => total + group.items.length, 0) + metadataEntriesCount;

    return [
      { id: 'main-details', label: 'Main Details', icon: FaClipboardList, targetId: 'section-main-details' },
      { id: 'notes', label: 'Notes', icon: FaStickyNote, targetId: 'section-notes', badge: noteEntries.length || null },
      { id: 'financials', label: 'Financials', icon: FaMoneyBillWave, targetId: 'section-financials', badge: financialEntries.length || null },
      {
        id: 'agency',
        label: 'Agency',
        icon: FaBuilding,
        targetId: 'section-agency',
        badge: branchDetails.length + negotiatorDetails.length || null,
      },
      { id: 'leads', label: 'Leads', icon: FaUserPlus, targetId: 'section-leads', badge: offersCount || null },
      {
        id: 'interested-parties',
        label: 'Interested Parties',
        icon: FaUserFriends,
        targetId: 'section-interested-parties',
        badge: interestedCount || null,
      },
      {
        id: 'matching-applicants',
        label: 'Matching Applicants',
        icon: FaUsers,
        targetId: 'section-matching-applicants',
        badge: applicantsCount || null,
      },
      {
        id: 'valuations',
        label: 'Valuations',
        icon: FaBalanceScale,
        targetId: 'section-valuations',
        badge: valuationCount || null,
      },
      { id: 'address', label: 'Address & Map', icon: FaMapMarkedAlt, targetId: 'section-address' },
      { id: 'descriptions', label: 'Descriptions', icon: FaAlignLeft, targetId: 'section-descriptions' },
      { id: 'rooms', label: 'Rooms', icon: FaBed, targetId: 'section-rooms', badge: roomsCount || null },
      { id: 'media', label: 'Media', icon: FaImages, targetId: 'section-media', badge: mediaCount || null },
      {
        id: 'marketing',
        label: 'Marketing',
        icon: FaBullhorn,
        targetId: 'section-marketing',
        badge: marketingLinksCount || null,
      },
      {
        id: 'features',
        label: 'Features & Restrictions',
        icon: FaListUl,
        targetId: 'section-features',
        badge: featuresCount || null,
      },
      {
        id: 'auctions',
        label: 'Auctions',
        icon: FaGavel,
        targetId: 'section-auctions',
        badge: auctionEntries.length || null,
      },
      {
        id: 'viewings',
        label: 'Viewings',
        icon: FaCalendarCheck,
        targetId: 'section-viewings',
        badge: listingMaintenance.length || null,
      },
      {
        id: 'apex-record',
        label: 'Apex27 Data',
        icon: FaClipboardList,
        targetId: 'section-apex',
        badge: apexEntries.length || null,
      },
    ];
  }, [
    apexEntries.length,
    branchDetails.length,
    auctionEntries.length,
    featureGroups,
    financialEntries.length,
    formValues?.images,
    interestedParties.length,
    listing,
    listingMaintenance.length,
    listingOffers.length,
    marketingLinksCount,
    matchingAreasList.length,
    metadataEntriesCount,
    negotiatorDetails.length,
    noteEntries.length,
    roomEntries.length,
    valuationEntries.length,
  ]);

  const handleTabClick = useCallback((item) => {
    setActiveTab(item.id);
    if (typeof window !== 'undefined') {
      const section = document.getElementById(item.targetId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!formValues || !listingId) {
        return;
      }

      setSaving(true);
      setSaveError('');
      setSaveSuccess('');
      setValidationErrors([]);

      try {
        const payload = buildUpdatePayload(formValues);
        const basePath = router?.basePath ?? '';
        const response = await fetch(`${basePath}/api/admin/listings/${encodeURIComponent(listingId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          const message = errorPayload?.error || 'Failed to save listing changes.';
          setSaveError(message);
          setValidationErrors(Array.isArray(errorPayload?.details) ? errorPayload.details.filter(Boolean) : []);
          return;
        }

        const result = await response.json();
        setListing(result.listing || null);
        setSaveSuccess('Listing changes saved.');
        setValidationErrors([]);
      } catch (err) {
        console.error(err);
        setSaveError('Failed to save listing changes.');
      } finally {
        setSaving(false);
      }
    },
    [formValues, listingId, router.basePath],
  );

  const handleReset = useCallback(() => {
    if (!initialValues) {
      return;
    }
    setFormValues(cloneFormValues(initialValues));
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, [initialValues]);

  const addMarketingLink = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      marketingLinks: [...(prev.marketingLinks || []), { label: '', type: 'link', url: '' }],
    }));
  }, [updateForm]);

  const updateMarketingLink = useCallback(
    (index, field, value) => {
      updateForm((prev) => {
        const links = [...(prev.marketingLinks || [])];
        const current = links[index] || { label: '', type: 'link', url: '' };
        links[index] = { ...current, [field]: value };
        return { ...prev, marketingLinks: links };
      });
    },
    [updateForm],
  );

  const removeMarketingLink = useCallback(
    (index) => {
      updateForm((prev) => {
        const links = [...(prev.marketingLinks || [])];
        links.splice(index, 1);
        return { ...prev, marketingLinks: links };
      });
    },
    [updateForm],
  );

  const addImage = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), { url: '' }],
    }));
  }, [updateForm]);

  const updateImage = useCallback(
    (index, value) => {
      updateForm((prev) => {
        const items = [...(prev.images || [])];
        const current = items[index] || { url: '' };
        items[index] = { ...current, url: value };
        return { ...prev, images: items };
      });
    },
    [updateForm],
  );

  const removeImage = useCallback(
    (index) => {
      updateForm((prev) => {
        const items = [...(prev.images || [])];
        items.splice(index, 1);
        return { ...prev, images: items };
      });
    },
    [updateForm],
  );

  const moveImage = useCallback(
    (index, direction) => {
      updateForm((prev) => {
        const items = [...(prev.images || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= items.length) {
          return prev;
        }

        const nextItems = [...items];
        const [moved] = nextItems.splice(index, 1);
        nextItems.splice(targetIndex, 0, moved);
        return { ...prev, images: nextItems };
      });
    },
    [updateForm],
  );

  const addMediaItem = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      media: [...(prev.media || []), { url: '' }],
    }));
  }, [updateForm]);

  const updateMediaItem = useCallback(
    (index, value) => {
      updateForm((prev) => {
        const items = [...(prev.media || [])];
        const current = items[index] || { url: '' };
        items[index] = { ...current, url: value };
        return { ...prev, media: items };
      });
    },
    [updateForm],
  );

  const removeMediaItem = useCallback(
    (index) => {
      updateForm((prev) => {
        const items = [...(prev.media || [])];
        items.splice(index, 1);
        return { ...prev, media: items };
      });
    },
    [updateForm],
  );

  const moveMediaItem = useCallback(
    (index, direction) => {
      updateForm((prev) => {
        const items = [...(prev.media || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= items.length) {
          return prev;
        }

        const nextItems = [...items];
        const [moved] = nextItems.splice(index, 1);
        nextItems.splice(targetIndex, 0, moved);
        return { ...prev, media: nextItems };
      });
    },
    [updateForm],
  );

  const addMetadataEntry = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      metadata: [...(prev.metadata || []), { label: '', value: '' }],
    }));
  }, [updateForm]);

  const updateMetadataEntry = useCallback(
    (index, field, value) => {
      updateForm((prev) => {
        const entries = [...(prev.metadata || [])];
        const current = entries[index] || { label: '', value: '' };
        entries[index] = { ...current, [field]: value };
        return { ...prev, metadata: entries };
      });
    },
    [updateForm],
  );

  const removeMetadataEntry = useCallback(
    (index) => {
      updateForm((prev) => {
        const entries = [...(prev.metadata || [])];
        entries.splice(index, 1);
        return { ...prev, metadata: entries };
      });
    },
    [updateForm],
  );

  const renderContent = () => {
    if (sessionLoading || (loading && !listing && !error)) {
      return <div className={styles.stateMessage}>Loading listing details…</div>;
    }

    if (!isAdmin) {
      return <div className={styles.stateMessage}>You need admin access to view this listing.</div>;
    }

    if (error) {
      return <div className={styles.stateMessage}>{error}</div>;
    }

    if (!listing || !formValues) {
      return <div className={styles.stateMessage}>Listing details unavailable.</div>;
    }

    const statusOption = STATUS_OPTIONS.find((option) => option.value === formValues.status);
    const statusLabel = statusOption ? statusOption.label : listing.statusLabel;
    const statusTone = STATUS_TONES[formValues.status] || 'info';
    const availabilityLabel = formValues.availabilityLabel || listing.availabilityLabel;
    const referenceValue = formValues.reference || '—';
    const updatedLabel = formatDateTime(listing.updatedAt);
    const updatedRelative = formatRelativeTime(listing.updatedAt);
    return (
      <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <section id="section-main-details" className={styles.hero}>
          <div className={styles.heroTopRow}>
            <Link href="/admin/lettings/available-archive" className={styles.backLink}>
              ← Back to lettings archive
            </Link>
            <div className={styles.heroActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!formDirty || saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleReset}
                disabled={!formDirty || saving}
              >
                Discard changes
              </button>
            </div>
          </div>

          {saveSuccess ? (
            <p className={`${styles.statusMessage} ${styles.statusSuccess}`}>{saveSuccess}</p>
          ) : null}
          {saveError ? (
            <p className={`${styles.statusMessage} ${styles.statusError}`}>{saveError}</p>
          ) : null}
          {validationErrors.length ? (
            <ul className={`${styles.statusMessage} ${styles.statusError} ${styles.statusDetails}`}>
              {validationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className={styles.heroStatusGroup}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-status">
                Status
              </label>
              <select
                id="listing-status"
                className={styles.select}
                value={formValues.status}
                onChange={(event) => updateForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <span className={styles.statusBadge} data-tone={statusTone}>
              {statusLabel}
            </span>
            {availabilityLabel ? <span className={styles.availability}>{availabilityLabel}</span> : null}
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-availability">
              Availability badge label
            </label>
            <input
              id="listing-availability"
              className={styles.input}
              value={formValues.availabilityLabel}
              onChange={(event) => updateForm((prev) => ({ ...prev, availabilityLabel: event.target.value }))}
              placeholder="e.g. Available now"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-display-address">
              Display address
            </label>
            <input
              id="listing-display-address"
              className={`${styles.input} ${styles.titleInput}`}
              value={formValues.displayAddress}
              onChange={(event) => updateForm((prev) => ({ ...prev, displayAddress: event.target.value }))}
              placeholder="Property headline address"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-title">
              Marketing headline
            </label>
            <input
              id="listing-title"
              className={styles.input}
              value={formValues.title}
              onChange={(event) => updateForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Optional marketing title"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-rent-amount">
              Headline rent
            </label>
            <div className={styles.inlineFields}>
              <input
                id="listing-rent-amount"
                className={styles.input}
                value={formValues.rentAmount}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentAmount: event.target.value }))}
                placeholder="2500"
              />
              <select
                className={styles.select}
                value={formValues.rentFrequency}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentFrequency: event.target.value }))}
              >
                <option value="">Select frequency</option>
                {RENT_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                value={formValues.rentCurrency}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentCurrency: event.target.value }))}
                placeholder="GBP"
              />
            </div>
          </div>

          <div className={styles.heroRent}>{heroRentLabel}</div>

          <div className={styles.heroMetaRow}>
            <span className={styles.metaPill}>Reference {referenceValue}</span>
            <span className={styles.metaPill}>Updated {updatedLabel}</span>
            <span className={styles.metaMuted}>{updatedRelative}</span>
          </div>
        </section>

        <section className={styles.panelGroup}>
          <article id="section-rooms" className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Key facts</h2>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-bedrooms">
                    Bedrooms
                  </label>
                  <input
                    id="listing-bedrooms"
                    className={styles.input}
                    value={formValues.bedrooms}
                    onChange={(event) => updateForm((prev) => ({ ...prev, bedrooms: event.target.value }))}
                    placeholder="e.g. 2"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-bathrooms">
                    Bathrooms
                  </label>
                  <input
                    id="listing-bathrooms"
                    className={styles.input}
                    value={formValues.bathrooms}
                    onChange={(event) => updateForm((prev) => ({ ...prev, bathrooms: event.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-receptions">
                    Receptions
                  </label>
                  <input
                    id="listing-receptions"
                    className={styles.input}
                    value={formValues.receptions}
                    onChange={(event) => updateForm((prev) => ({ ...prev, receptions: event.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-furnished">
                    Furnished state
                  </label>
                  <input
                    id="listing-furnished"
                    className={styles.input}
                    value={formValues.furnished}
                    onChange={(event) => updateForm((prev) => ({ ...prev, furnished: event.target.value }))}
                    placeholder="e.g. Furnished"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-property-type">
                    Property type
                  </label>
                  <input
                    id="listing-property-type"
                    className={styles.input}
                    value={formValues.propertyType}
                    onChange={(event) => updateForm((prev) => ({ ...prev, propertyType: event.target.value }))}
                    placeholder="e.g. Apartment"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-reference-input">
                    Reference
                  </label>
                  <input
                    id="listing-reference-input"
                    className={styles.input}
                    value={formValues.reference}
                    onChange={(event) => updateForm((prev) => ({ ...prev, reference: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-price-prefix">
                    Price prefix
                  </label>
                  <input
                    id="listing-price-prefix"
                    className={styles.input}
                    value={formValues.pricePrefix}
                    onChange={(event) => updateForm((prev) => ({ ...prev, pricePrefix: event.target.value }))}
                    placeholder="e.g. Offers over"
                  />
                </div>
              </div>
            </div>
          </article>

          <article id="section-address" className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Location</h2>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-address-line1">
                    Address line 1
                  </label>
                  <input
                    id="listing-address-line1"
                    className={styles.input}
                    value={formValues.addressLine1}
                    onChange={(event) => updateForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-address-line2">
                    Address line 2
                  </label>
                  <input
                    id="listing-address-line2"
                    className={styles.input}
                    value={formValues.addressLine2}
                    onChange={(event) => updateForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-city">
                    Town/City
                  </label>
                  <input
                    id="listing-city"
                    className={styles.input}
                    value={formValues.city}
                    onChange={(event) => updateForm((prev) => ({ ...prev, city: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-county">
                    County
                  </label>
                  <input
                    id="listing-county"
                    className={styles.input}
                    value={formValues.county}
                    onChange={(event) => updateForm((prev) => ({ ...prev, county: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-postcode">
                    Postcode
                  </label>
                  <input
                    id="listing-postcode"
                    className={styles.input}
                    value={formValues.postalCode}
                    onChange={(event) => updateForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-country">
                    Country
                  </label>
                  <input
                    id="listing-country"
                    className={styles.input}
                    value={formValues.country}
                    onChange={(event) => updateForm((prev) => ({ ...prev, country: event.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="listing-matching-areas">
                  Matching areas
                </label>
                <textarea
                  id="listing-matching-areas"
                  className={styles.textarea}
                  value={formValues.matchingAreasText}
                  onChange={(event) => updateForm((prev) => ({ ...prev, matchingAreasText: event.target.value }))}
                  placeholder="Add one area per line"
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-latitude">
                    Latitude
                  </label>
                  <input
                    id="listing-latitude"
                    className={styles.input}
                    value={formValues.latitude}
                    onChange={(event) => updateForm((prev) => ({ ...prev, latitude: event.target.value }))}
                    placeholder="51.5074"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-longitude">
                    Longitude
                  </label>
                  <input
                    id="listing-longitude"
                    className={styles.input}
                    value={formValues.longitude}
                    onChange={(event) => updateForm((prev) => ({ ...prev, longitude: event.target.value }))}
                    placeholder="-0.1278"
                  />
                </div>
              </div>
            </div>
          </article>
        </section>

        <section id="section-notes" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Notes</h2>
          </header>
          <div className={styles.panelBody}>
            {noteEntries.length ? (
              renderDefinitionList(noteEntries)
            ) : (
              <p className={styles.metaMuted}>No notes synced from Apex27.</p>
            )}
          </div>
        </section>

        <section id="section-financials" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Financials</h2>
          </header>
          <div className={styles.panelBody}>
            {financialEntries.length ? (
              renderDefinitionList(financialEntries)
            ) : (
              <p className={styles.metaMuted}>No financial data recorded from Apex27.</p>
            )}
          </div>
        </section>

        <section id="section-media" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Media</h2>
          </header>
          <div className={styles.panelBody}>
            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}>
                <h3 className={styles.mediaSubheading}>Property images</h3>
                <p className={styles.mediaHint}>Displayed on the listing gallery.</p>
              </div>
              <div className={styles.repeatableList}>
                {(formValues.images || []).map((image, index) => (
                  <div key={`image-${index}`} className={`${styles.repeatableItem} ${styles.mediaItem}`}>
                    <div className={styles.repeatableHeader}>
                      <h4 className={styles.repeatableTitle}>Image {index + 1}</h4>
                      <div className={styles.mediaActions}>
                        <button
                          type="button"
                          className={styles.mediaMoveButton}
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className={styles.mediaMoveButton}
                          onClick={() => moveImage(index, 1)}
                          disabled={index === (formValues.images?.length || 0) - 1}
                        >
                          Move down
                        </button>
                        <button type="button" className={styles.removeButton} onClick={() => removeImage(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className={styles.mediaPreview}>
                      {image.url ? (
                        <img src={image.url} alt={`Preview of image ${index + 1}`} referrerPolicy="no-referrer" />
                      ) : (
                        <span className={styles.mediaEmpty}>Add an image URL to preview.</span>
                      )}
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`image-url-${index}`}>
                        Image URL
                      </label>
                      <input
                        id={`image-url-${index}`}
                        className={styles.input}
                        value={image.url}
                        onChange={(event) => updateImage(index, event.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.secondaryButton} onClick={addImage}>
                Add image
              </button>
              {!formValues.images?.length ? (
                <p className={styles.metaMuted}>No images synced from Apex27 yet.</p>
              ) : null}
            </div>

            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}>
                <h3 className={styles.mediaSubheading}>Media embeds</h3>
                <p className={styles.mediaHint}>Video tours, Matterport, hosted walkthrough links.</p>
              </div>
              <div className={styles.repeatableList}>
                {(formValues.media || []).map((item, index) => (
                  <div key={`media-${index}`} className={styles.repeatableItem}>
                    <div className={styles.repeatableHeader}>
                      <h4 className={styles.repeatableTitle}>Media item {index + 1}</h4>
                      <div className={styles.mediaActions}>
                        <button
                          type="button"
                          className={styles.mediaMoveButton}
                          onClick={() => moveMediaItem(index, -1)}
                          disabled={index === 0}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className={styles.mediaMoveButton}
                          onClick={() => moveMediaItem(index, 1)}
                          disabled={index === (formValues.media?.length || 0) - 1}
                        >
                          Move down
                        </button>
                        <button type="button" className={styles.removeButton} onClick={() => removeMediaItem(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`media-url-${index}`}>
                        Media URL
                      </label>
                      <input
                        id={`media-url-${index}`}
                        className={styles.input}
                        value={item.url}
                        onChange={(event) => updateMediaItem(index, event.target.value)}
                        placeholder="https://"
                      />
                    </div>
                    {item.url ? (
                      <a className={styles.mediaLinkPreview} href={item.url} target="_blank" rel="noreferrer">
                        Open media in new tab
                      </a>
                    ) : (
                      <span className={styles.mediaEmpty}>Add a media URL to preview.</span>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className={styles.secondaryButton} onClick={addMediaItem}>
                Add media link
              </button>
              {!formValues.media?.length ? (
                <p className={styles.metaMuted}>No media links recorded.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.panelGroup}>
          <article id="section-agency" className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Branch &amp; negotiator</h2>
            </header>
            <div className={styles.panelBody}>
              {renderDefinitionList(branchDetails.concat(negotiatorDetails))}
            </div>
          </article>

          <article id="section-marketing" className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Marketing links</h2>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.repeatableList}>
                {(formValues.marketingLinks || []).map((link, index) => (
                  <div key={`marketing-${index}`} className={styles.repeatableItem}>
                    <div className={styles.repeatableHeader}>
                      <h3 className={styles.repeatableTitle}>Link {index + 1}</h3>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeMarketingLink(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formRow}>
                        <label className={styles.formLabel} htmlFor={`marketing-label-${index}`}>
                          Label
                        </label>
                        <input
                          id={`marketing-label-${index}`}
                          className={styles.input}
                          value={link.label}
                          onChange={(event) => updateMarketingLink(index, 'label', event.target.value)}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label className={styles.formLabel} htmlFor={`marketing-type-${index}`}>
                          Type
                        </label>
                        <select
                          id={`marketing-type-${index}`}
                          className={styles.select}
                          value={link.type}
                          onChange={(event) => updateMarketingLink(index, 'type', event.target.value)}
                        >
                          {MARKETING_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`marketing-url-${index}`}>
                        URL
                      </label>
                      <input
                        id={`marketing-url-${index}`}
                        className={styles.input}
                        value={link.url}
                        onChange={(event) => updateMarketingLink(index, 'url', event.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.secondaryButton} onClick={addMarketingLink}>
                Add marketing link
              </button>
              {!formValues.marketingLinks?.length ? (
                <p className={styles.metaMuted}>No marketing links recorded.</p>
              ) : null}
            </div>
          </article>
        </section>

        <section id="section-descriptions" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Property description</h2>
          </header>
          <div className={styles.panelBody}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-summary">
                Summary
              </label>
              <textarea
                id="listing-summary"
                className={styles.textarea}
                value={formValues.summary}
                onChange={(event) => updateForm((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Short summary used on portals"
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-description">
                Full description
              </label>
              <textarea
                id="listing-description"
                className={`${styles.textarea} ${styles.descriptionTextarea}`}
                value={formValues.description}
                onChange={(event) => updateForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Detailed property description"
              />
            </div>
          </div>
        </section>

        <section id="section-features" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Features &amp; restrictions</h2>
          </header>
          <div className={styles.panelBody}>
            <div className={styles.featureSummary}>
              <h3 className={styles.featureHeading}>Synced from Apex27</h3>
              {featureGroups.length ? (
                <div className={styles.featureGroupList}>
                  {featureGroups.map((group) => (
                    <div key={group.label} className={styles.featureGroup}>
                      <h4 className={styles.featureGroupTitle}>{group.label}</h4>
                      <ul className={styles.featureList}>
                        {group.items.map((item) => (
                          <li key={`${group.label}-${item}`} className={styles.featureListItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.metaMuted}>No feature data recorded from Apex27.</p>
              )}
            </div>

            <div className={styles.featureDivider} />
            <h3 className={styles.metadataSubheading}>Additional metadata</h3>

            <div className={styles.repeatableList}>
              {(formValues.metadata || []).map((entry, index) => (
                <div key={`metadata-${index}`} className={styles.repeatableItem}>
                  <div className={styles.repeatableHeader}>
                    <h3 className={styles.repeatableTitle}>Entry {index + 1}</h3>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeMetadataEntry(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`metadata-label-${index}`}>
                        Label
                      </label>
                      <input
                        id={`metadata-label-${index}`}
                        className={styles.input}
                        value={entry.label}
                        onChange={(event) => updateMetadataEntry(index, 'label', event.target.value)}
                        placeholder="e.g. EPC rating"
                      />
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`metadata-value-${index}`}>
                        Value
                      </label>
                      <input
                        id={`metadata-value-${index}`}
                        className={styles.input}
                        value={entry.value}
                        onChange={(event) => updateMetadataEntry(index, 'value', event.target.value)}
                        placeholder="e.g. B"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={styles.secondaryButton} onClick={addMetadataEntry}>
              Add metadata entry
            </button>
            {!formValues.metadata?.length ? (
              <p className={styles.metaMuted}>No additional metadata captured.</p>
            ) : null}
          </div>
        </section>

        <section id="section-apex" className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Apex27 record</h2>
          </header>
          <div className={styles.panelBody}>
            {apexEntries.length ? (
              <div className={styles.apexFieldList}>
                {apexEntries.map(({ key, value }) => (
                  <div key={key} className={styles.apexFieldRow}>
                    <span className={styles.apexFieldKey}>{key}</span>
                    <span className={styles.apexFieldValue}>{formatFlattenedValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.metaMuted}>No Apex27 data available for this listing.</p>
            )}
            {apexRaw ? (
              <details className={styles.apexRawDetails}>
                <summary>View raw Apex27 payload</summary>
                <pre className={styles.apexRawPre}>{JSON.stringify(apexRaw, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        </section>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!formDirty || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReset}
            disabled={!formDirty || saving}
          >
            Discard changes
          </button>
        </div>
      </form>

      <section className={styles.activitySection} id="listing-activity">
        <header className={styles.activityHeader}>
          <h2 className={styles.activityTitle}>Linked activity</h2>
          <p className={styles.activitySubtitle}>
            Offers and maintenance jobs connected to this property across the Aktonz platform.
          </p>
        </header>
        <div className={styles.activityGrid}>
          <article id="section-leads" className={styles.activityCard}>
            <header className={styles.activityCardHeader}>
              <div>
                <h3>Offers</h3>
                <p className={styles.activityCountLabel}>Live and archived offers</p>
              </div>
              <span className={styles.activityCount}>{listingOffers.length}</span>
            </header>
            {listingOffers.length ? (
              <ul className={styles.activityList}>
                {listingOffers.map((offer) => (
                  <li key={offer.id} className={styles.activityListItem}>
                    <div className={styles.activityItemHeader}>
                      <span className={styles.activityPrimary}>
                        {offer.contact?.name || offer.email || 'Applicant'}
                      </span>
                      <span
                        className={`${styles.offerTag} ${
                          offer.type === 'sale' ? styles.offerTagSale : styles.offerTagRent
                        }`}
                      >
                        {offer.type === 'sale' ? 'Sale' : 'Rent'}
                      </span>
                    </div>
                    <div className={styles.activityMetaRow}>
                      <span>{offer.amount || '—'}</span>
                      <span className={styles.activityStatusLabel}>
                        {offer.statusLabel || formatOfferStatusLabel(offer.status)}
                      </span>
                    </div>
                    <div className={styles.activityMetaRow}>
                      <span>{formatDateDisplay(offer.date)}</span>
                      {offer.agent?.name ? <span>Agent {offer.agent.name}</span> : null}
                    </div>
                    <Link
                      href={`/admin/offers?id=${encodeURIComponent(offer.id)}`}
                      className={styles.activityLink}
                    >
                      Open offer workspace
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.activityEmpty}>No offers linked to this listing yet.</p>
            )}
          </article>

          <article className={styles.activityCard}>
            <header className={styles.activityCardHeader}>
              <div>
                <h3>Maintenance</h3>
                <p className={styles.activityCountLabel}>Tasks synced from Apex27</p>
              </div>
              <span className={styles.activityCount}>{listingMaintenance.length}</span>
            </header>
            {listingMaintenance.length ? (
              <ul className={styles.activityList}>
                {listingMaintenance.map((task) => (
                  <li key={task.id} className={styles.activityListItem}>
                    <div className={styles.activityItemHeader}>
                      <span className={styles.activityPrimary}>{task.title}</span>
                      <span className={styles.activityStatusBadge} data-tone={task.statusTone}>
                        {task.statusLabel}
                      </span>
                    </div>
                    <div className={styles.activityMetaRow}>
                      <span>{formatDateDisplay(task.dueAt)}</span>
                      {task.priorityLabel ? (
                        <span className={styles.activityPriorityBadge} data-level={task.priority}>
                          {task.priorityLabel}
                        </span>
                      ) : null}
                    </div>
                    {task.assignee?.name ? (
                      <div className={styles.activityMetaRow}>
                        <span>Assigned to {task.assignee.name}</span>
                      </div>
                    ) : null}
                    {task.overdue ? (
                      <span className={`${styles.activityTag} ${styles.activityTagOverdue}`}>
                        Overdue
                      </span>
                    ) : task.dueSoon ? (
                      <span className={`${styles.activityTag} ${styles.activityTagSoon}`}>
                        Due soon
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.activityEmpty}>No maintenance tasks recorded for this listing.</p>
            )}
          </article>
        </div>
      </section>

      <section id="section-interested-parties" className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Interested parties</h2>
        </header>
        <div className={styles.panelBody}>
          {interestedParties.length ? (
            <ul className={styles.simpleList}>
              {interestedParties.map((party) => (
                <li key={`${party.name}-${party.updatedAt || party.status}`} className={styles.simpleListItem}>
                  <div className={styles.simpleListPrimary}>{party.name}</div>
                  <div className={styles.simpleListMeta}>
                    {party.statusLabel ? <span>{party.statusLabel}</span> : null}
                    {party.updatedAt ? <span>{formatDateDisplay(party.updatedAt)}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.metaMuted}>No interested parties recorded for this listing.</p>
          )}
        </div>
      </section>

      <section id="section-matching-applicants" className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Matching applicants</h2>
        </header>
        <div className={styles.panelBody}>
          {matchingAreasList.length ? (
            <ul className={styles.simpleList}>
              {matchingAreasList.map((area) => (
                <li key={area} className={styles.simpleListItem}>
                  <div className={styles.simpleListPrimary}>{area}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.metaMuted}>No matching applicant areas recorded.</p>
          )}
        </div>
      </section>

      <section id="section-valuations" className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Valuations</h2>
        </header>
        <div className={styles.panelBody}>
          {valuationEntries.length ? (
            renderDefinitionList(valuationEntries)
          ) : (
            <p className={styles.metaMuted}>No valuation information recorded.</p>
          )}
        </div>
      </section>

      <section id="section-auctions" className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Auctions</h2>
        </header>
        <div className={styles.panelBody}>
          {auctionEntries.length ? (
            renderDefinitionList(auctionEntries)
          ) : (
            <p className={styles.metaMuted}>No auction details available for this listing.</p>
          )}
        </div>
      </section>

      <section id="section-viewings" className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Viewings &amp; site activity</h2>
        </header>
        <div className={styles.panelBody}>
          {listingMaintenance.length ? (
            <ul className={styles.simpleList}>
              {listingMaintenance.map((task) => (
                <li key={task.id} className={styles.simpleListItem}>
                  <div className={styles.simpleListPrimary}>{task.title}</div>
                  <div className={styles.simpleListMeta}>
                    {task.dueAt ? <span>Due {formatDateDisplay(task.dueAt)}</span> : null}
                    {task.statusLabel ? <span>{task.statusLabel}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.metaMuted}>No viewings or site activity recorded.</p>
          )}
        </div>
      </section>
      </>
    );
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.tabLayout}>
            <aside className={styles.tabSidebar}>
              <nav className={styles.tabNav} aria-label="Listing overview">
                <ul className={styles.tabNavList}>
                  {tabItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id} className={styles.tabNavItem}>
                        <button
                          type="button"
                          className={`${styles.tabNavButton} ${isActive ? styles.tabNavButtonActive : ''}`}
                          onClick={() => handleTabClick(item)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon aria-hidden="true" className={styles.tabNavIcon} />
                          <span className={styles.tabNavLabel}>{item.label}</span>
                          {item.badge ? <span className={styles.tabNavBadge}>{item.badge}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
            <div className={styles.tabContentArea}>{renderContent()}</div>
          </div>
        </div>
      </main>
    </>
  );
}
