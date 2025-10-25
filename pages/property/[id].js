import { useMemo } from 'react';
import PropertyList from '../../components/PropertyList';
import MediaGallery from '../../components/MediaGallery';
import OfferDrawer from '../../components/OfferDrawer';
import ViewingForm from '../../components/ViewingForm';
import NeighborhoodInfo from '../../components/NeighborhoodInfo';
import FavoriteButton from '../../components/FavoriteButton';
import PropertySustainabilityPanel from '../../components/PropertySustainabilityPanel';
import AgentCard from '../../components/AgentCard';
import MediaHighlights from '../../components/MediaHighlights';

import MortgageCalculator from '../../components/MortgageCalculator';
import RentAffordability from '../../components/RentAffordability';
import PropertyMap from '../../components/PropertyMap';
import Head from 'next/head';
import {
  fetchPropertyById,
  fetchPropertiesByTypeCachedFirst,
  extractMedia,
  normalizeImages,
  extractPricePrefix,
  resolveSecurityDepositSource,
  resolveHoldingDepositSource,
} from '../../lib/apex27.mjs';
import {
  resolvePropertyIdentifier,
  propertyMatchesIdentifier,
} from '../../lib/property-id.mjs';
import {
  resolvePropertyTypeLabel,
  formatPropertyTypeLabel,
} from '../../lib/property-type.mjs';
import styles from '../../styles/PropertyDetails.module.css';
import { FaBed, FaBath, FaCouch } from 'react-icons/fa';
import {
  formatPriceGBP,
  formatPricePrefix,
  formatRentFrequency,
} from '../../lib/format.mjs';
import {
  parsePriceNumber,
  rentToMonthly,
  formatPropertyPriceLabel,
} from '../../lib/rent.js';
import { formatOfferFrequencyLabel } from '../../lib/offer-frequency.mjs';
import {
  normalizeDeposit,
  formatDepositDisplay,
  formatAvailabilityDate,
  resolveAvailabilityDate,
} from '../../lib/deposits.mjs';
import agentsData from '../../data/agents.json';

const AGENT_ENTRIES = Array.isArray(agentsData) ? agentsData : [];
const AGENT_MAP = new Map(
  AGENT_ENTRIES.filter((agent) => agent && agent.id != null).map((agent) => [
    String(agent.id),
    agent,
  ])
);
const AGENT_PLACEHOLDER_IMAGE = '/images/agent-placeholder.svg';
const DEFAULT_AGENT_PROFILE = (() => {
  const primary = AGENT_ENTRIES.find((entry) => entry && entry.name) || null;
  return {
    id: primary?.id ? String(primary.id) : 'aktonz-default',
    name: primary?.name || 'Aktonz advisor',
    title: 'Your Aktonz property expert',
    jobTitle: primary?.jobTitle || 'Local lettings specialist',
    responseSla: 'Replies within 15 minutes during business hours.',
    reviewSnippet:
      '“Exceptional communication and proactive updates throughout the letting process.”',
    reviewAttribution: 'Landlord review, March 2024',
    photo: primary?.photo || AGENT_PLACEHOLDER_IMAGE,
  };
})();

function normalizeAgentString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function pickFirstAgentString(...values) {
  for (const value of values) {
    const normalized = normalizeAgentString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function collectAgentCandidates(rawProperty) {
  const candidates = [];
  const pushCandidate = (candidate) => {
    if (candidate && typeof candidate === 'object') {
      candidates.push(candidate);
    }
  };

  if (!rawProperty || typeof rawProperty !== 'object') {
    return candidates;
  }

  pushCandidate(rawProperty.agent);
  pushCandidate(rawProperty.negotiator);
  pushCandidate(rawProperty.user);
  pushCandidate(rawProperty.assignedAgent);
  pushCandidate(rawProperty.owner);
  pushCandidate(rawProperty.primaryContact);
  pushCandidate(rawProperty.marketing?.agent);

  return candidates;
}

function isLikelyAssetUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  return trimmed.startsWith('/');
}

function extractSupplementaryLinks(source, keywords) {
  if (!source || typeof source !== 'object') {
    return [];
  }

  const normalizedKeywords = Array.isArray(keywords)
    ? keywords
        .map((keyword) =>
          typeof keyword === 'string' ? keyword.toLowerCase().trim() : null
        )
        .filter(Boolean)
    : [];

  if (normalizedKeywords.length === 0) {
    return [];
  }

  const matchesKeyword = (value) => {
    if (!value) {
      return false;
    }
    const text = String(value).toLowerCase();
    return normalizedKeywords.some((keyword) => text.includes(keyword));
  };

  const results = new Map();
  const seen = new Set();

  const addResult = (url, label = null) => {
    if (!isLikelyAssetUrl(url)) {
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    const normalizedLabel = label && typeof label === 'string' ? label.trim() : null;
    const existing = results.get(trimmed);
    if (existing) {
      if (!existing.label && normalizedLabel) {
        existing.label = normalizedLabel;
      }
      return;
    }
    results.set(trimmed, {
      url: trimmed,
      label: normalizedLabel || null,
    });
  };

  const traverse = (value, key = '', depth = 0) => {
    if (value == null) {
      return;
    }

    if (depth > 5) {
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!isLikelyAssetUrl(trimmed)) {
        return;
      }
      if (matchesKeyword(trimmed) || matchesKeyword(key)) {
        addResult(trimmed, matchesKeyword(trimmed) ? trimmed : key);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((entry) => traverse(entry, key, depth + 1));
      return;
    }

    const labelFields = [
      'label',
      'name',
      'title',
      'description',
      'tag',
      'type',
      'category',
      'filename',
      'fileName',
      'displayName',
      'heading',
      'text',
    ];
    let matchedLabel = null;
    for (const field of labelFields) {
      const candidate = value[field];
      if (typeof candidate === 'string' && matchesKeyword(candidate)) {
        matchedLabel = candidate.trim();
        break;
      }
    }

    const urlFields = [
      'url',
      'href',
      'link',
      'value',
      'downloadUrl',
      'fileUrl',
      'assetUrl',
      'path',
      'src',
      'file',
    ];
    for (const field of urlFields) {
      const candidate = value[field];
      if (typeof candidate !== 'string') {
        continue;
      }
      const trimmed = candidate.trim();
      if (!isLikelyAssetUrl(trimmed)) {
        continue;
      }
      if (
        matchedLabel ||
        matchesKeyword(field) ||
        matchesKeyword(key) ||
        matchesKeyword(trimmed)
      ) {
        addResult(trimmed, matchedLabel || field || key);
      }
    }

    for (const [childKey, childValue] of Object.entries(value)) {
      traverse(childValue, childKey, depth + 1);
    }
  };

  const prioritizedKeys = [
    'floorplan',
    'floorPlan',
    'floorplans',
    'floorPlans',
    'floorplanUrl',
    'floorPlanUrl',
    'floorplanUrls',
    'floorPlanUrls',
    'brochure',
    'brochures',
    'brochureUrl',
    'brochureUrls',
    'documents',
    'files',
    'attachments',
    'downloads',
    'resources',
    'metadata',
    'links',
    'gallery',
    'images',
    'media',
    'sale',
    'lettings',
    'marketing',
    '_scraye',
  ];

  prioritizedKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      traverse(source[key], key, 0);
    }
  });

  traverse(source, '', 0);

  return Array.from(results.values());
}

function deriveTourEntries(mediaUrls, metadataEntries) {
  const results = [];
  const seen = new Set();

  const metadata = Array.isArray(metadataEntries) ? metadataEntries : [];
  const metadataByUrl = new Map();

  metadata.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const rawValue = entry.value;
    if (typeof rawValue !== 'string') {
      return;
    }
    const url = rawValue.trim();
    if (!isLikelyAssetUrl(url)) {
      return;
    }

    const descriptorFields = [entry.label, entry.name, entry.title, entry.description];
    const descriptor = descriptorFields.find(
      (field) => typeof field === 'string' && field.trim()
    );
    const descriptorLower = descriptor ? descriptor.toLowerCase() : '';
    const typeLower = typeof entry.type === 'string' ? entry.type.toLowerCase() : '';
    const urlLower = url.toLowerCase();

    const isTour =
      descriptorLower.includes('tour') ||
      descriptorLower.includes('video') ||
      typeLower.includes('tour') ||
      typeLower.includes('video') ||
      /matterport|youtube|youtu\.be|vimeo|virtual|walkthrough|360/.test(urlLower) ||
      /\.(mp4|webm|ogg)$/i.test(urlLower);

    if (!isTour) {
      return;
    }

    let subtype = null;
    if (typeLower.includes('video') || descriptorLower.includes('video')) {
      subtype = 'video';
    } else if (
      typeLower.includes('virtual') ||
      typeLower.includes('360') ||
      descriptorLower.includes('virtual') ||
      descriptorLower.includes('360') ||
      urlLower.includes('matterport') ||
      urlLower.includes('360')
    ) {
      subtype = 'virtual';
    }

    metadataByUrl.set(url, {
      label: descriptor || null,
      subtype,
    });
  });

  const append = (candidateUrl) => {
    if (typeof candidateUrl !== 'string') {
      return;
    }
    const url = candidateUrl.trim();
    if (!isLikelyAssetUrl(url) || seen.has(url)) {
      return;
    }
    seen.add(url);
    const metadataInfo = metadataByUrl.get(url) || {};
    results.push({
      url,
      label: metadataInfo.label || null,
      subtype: metadataInfo.subtype || null,
    });
  };

  const mediaList = Array.isArray(mediaUrls) ? mediaUrls : [];
  mediaList.forEach((url) => append(url));
  metadataByUrl.forEach((_, url) => append(url));

  return results;
}

function resolveAgentProfile(rawProperty) {
  const baseProfile = { ...DEFAULT_AGENT_PROFILE };
  if (!rawProperty || typeof rawProperty !== 'object') {
    return baseProfile;
  }

  const candidateObjects = collectAgentCandidates(rawProperty);
  const idCandidates = [
    rawProperty.agentId,
    rawProperty.assignedAgentId,
    rawProperty.negotiatorId,
    rawProperty.userId,
    rawProperty.agent?.id,
    rawProperty.negotiator?.id,
    rawProperty.user?.id,
    rawProperty.assignedAgent?.id,
    rawProperty.owner?.id,
    rawProperty.marketing?.agent?.id,
  ]
    .map((value) => normalizeAgentString(value))
    .filter(Boolean);

  const resolvedAgentId =
    idCandidates.find((candidate) => AGENT_MAP.has(candidate)) ||
    idCandidates[0] ||
    baseProfile.id;

  const mappedAgent = AGENT_MAP.get(resolvedAgentId) || null;
  const namedCandidate =
    candidateObjects.find((candidate) =>
      Boolean(
        pickFirstAgentString(
          candidate.name,
          candidate.fullName,
          candidate.displayName,
          candidate.title
        )
      )
    ) || null;

  const resolvedName =
    pickFirstAgentString(
      rawProperty.agentName,
      rawProperty.assignedAgentName,
      rawProperty.agent?.name,
      rawProperty.agent?.fullName,
      rawProperty.agent?.displayName,
      namedCandidate?.name,
      namedCandidate?.fullName,
      namedCandidate?.displayName,
      mappedAgent?.name
    ) || baseProfile.name;

  const resolvedTitle =
    pickFirstAgentString(
      rawProperty.agentTitle,
      rawProperty.agentHeading,
      rawProperty.marketing?.agent?.title,
      namedCandidate?.title,
      namedCandidate?.tagline,
      mappedAgent?.title
    ) || baseProfile.title;

  const resolvedJobTitle =
    pickFirstAgentString(
      rawProperty.agentJobTitle,
      rawProperty.agent?.jobTitle,
      rawProperty.agent?.role,
      namedCandidate?.jobTitle,
      namedCandidate?.role,
      namedCandidate?.position,
      mappedAgent?.jobTitle,
      mappedAgent?.role
    ) || baseProfile.jobTitle;

  const resolvedResponseSla =
    pickFirstAgentString(
      rawProperty.agentResponseSla,
      rawProperty.agentResponseSLA,
      rawProperty.agent?.responseSla,
      rawProperty.agent?.responseSLA,
      namedCandidate?.responseSla,
      namedCandidate?.responseSLA,
      mappedAgent?.responseSla
    ) || baseProfile.responseSla;

  const resolvedReviewSnippet =
    pickFirstAgentString(
      rawProperty.agentReviewSnippet,
      rawProperty.agentReviewQuote,
      rawProperty.agent?.reviewSnippet,
      rawProperty.agent?.reviewQuote,
      namedCandidate?.reviewSnippet,
      namedCandidate?.reviewQuote,
      mappedAgent?.reviewSnippet
    ) || baseProfile.reviewSnippet;

  const resolvedReviewAttribution =
    pickFirstAgentString(
      rawProperty.agentReviewAttribution,
      rawProperty.agentReviewSource,
      rawProperty.agent?.reviewAttribution,
      rawProperty.agent?.reviewSource,
      namedCandidate?.reviewAttribution,
      namedCandidate?.reviewSource,
      mappedAgent?.reviewAttribution
    ) || baseProfile.reviewAttribution;

  const resolvedPhoto =
    pickFirstAgentString(
      rawProperty.agent?.photo,
      rawProperty.agent?.image,
      rawProperty.agent?.avatar,
      rawProperty.agent?.avatarUrl,
      namedCandidate?.photo,
      namedCandidate?.image,
      namedCandidate?.avatar,
      namedCandidate?.avatarUrl,
      namedCandidate?.profilePhoto,
      mappedAgent?.photo,
      baseProfile.photo,
      AGENT_PLACEHOLDER_IMAGE
    ) || AGENT_PLACEHOLDER_IMAGE;

  return {
    id: resolvedAgentId,
    name: resolvedName,
    title: resolvedTitle,
    jobTitle: resolvedJobTitle,
    responseSla: resolvedResponseSla,
    reviewSnippet: resolvedReviewSnippet,
    reviewAttribution: resolvedReviewAttribution,
    photo: resolvedPhoto,
  };
}

function normalizeScrayeReference(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const prefixPattern = /^scraye[-\s]?/i;
  if (prefixPattern.test(normalized)) {
    const suffix = normalized.replace(prefixPattern, '').replace(/\s+/g, '');
    return suffix ? `SCRAYE-${suffix.toUpperCase()}` : 'SCRAYE';
  }

  const cleaned = normalized.replace(/\s+/g, '');
  if (/^scraye-/i.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  return `SCRAYE-${cleaned.toUpperCase()}`;
}

function deriveScrayeReference(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const direct =
    rawProperty.scrayeReference ||
    rawProperty._scraye?.reference ||
    rawProperty._scraye?.listingReference;
  if (direct) {
    return normalizeScrayeReference(direct);
  }

  const source = typeof rawProperty.source === 'string' ? rawProperty.source.toLowerCase() : '';
  if (source !== 'scraye') {
    return null;
  }

  const candidates = [rawProperty.sourceId, rawProperty._scraye?.sourceId, rawProperty.id];
  for (const candidate of candidates) {
    const reference = normalizeScrayeReference(candidate);
    if (reference) {
      return reference;
    }
  }

  return null;
}

function normalizeEpcScoreValue(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return String(Math.round(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const bandMatch = trimmed.match(/([A-G])$/i);
    if (bandMatch) {
      return bandMatch[1].toUpperCase();
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return String(Math.round(numeric));
    }

    return trimmed;
  }

  return null;
}

function deriveEpcScore(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const candidates = [
    rawProperty.epcScore,
    rawProperty.epcRating,
    rawProperty.epcBand,
    rawProperty.epcEeCurrent,
    rawProperty.epcEiCurrent,
    rawProperty.epcArCurrent,
    rawProperty.energyPerformance?.score,
    rawProperty.energyPerformance?.currentScore,
    rawProperty.energyPerformance?.rating,
    rawProperty.energyPerformance?.currentRating,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeEpcScoreValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeCouncilTaxBand(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const bandMatch = trimmed.match(/([A-H])$/i);
    if (bandMatch) {
      return bandMatch[1].toUpperCase();
    }

    return trimmed;
  }

  return null;
}

function deriveCouncilTaxBand(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const candidates = [
    rawProperty.councilTaxBand,
    rawProperty.council_tax_band,
    rawProperty.councilTax?.band,
    rawProperty.councilTax?.value,
    rawProperty.councilTaxBanding,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCouncilTaxBand(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeTenureValue(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.toLowerCase();
    const collapsed = normalized.replace(/[\s_-]+/g, '');

    if (['fh', 'freehold', 'freeholder'].includes(collapsed)) {
      return 'Freehold';
    }

    if (['lh', 'leasehold', 'leaseholder', 'lease'].includes(collapsed)) {
      return 'Leasehold';
    }

    if (collapsed.includes('shareoffreehold') || collapsed.includes('sharefreehold')) {
      return 'Share of freehold';
    }

    if (normalized.includes('commonhold')) {
      return 'Commonhold';
    }

    if (normalized.includes('feuhold')) {
      return 'Feuhold';
    }

    return trimmed
      .split(/[\s_]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  return null;
}

function deriveTenure(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return null;
  }

  const candidates = [
    rawProperty.tenure,
    rawProperty.tenureType,
    rawProperty.tenure_type,
    rawProperty.tenureStatus,
    rawProperty.tenureLabel,
    rawProperty.sales?.tenure,
    rawProperty.sales?.tenureType,
    rawProperty.details?.tenure,
    rawProperty.details?.tenureType,
    rawProperty._scraye?.tenure,
    rawProperty._scraye?.tenureType,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        const normalizedEntry = normalizeTenureValue(entry);
        if (normalizedEntry) {
          return normalizedEntry;
        }
      }
      continue;
    }

    if (candidate && typeof candidate === 'object') {
      const nested = [
        candidate.value,
        candidate.type,
        candidate.label,
        candidate.name,
        candidate.description,
      ];
      for (const nestedCandidate of nested) {
        const normalizedNested = normalizeTenureValue(nestedCandidate);
        if (normalizedNested) {
          return normalizedNested;
        }
      }
    }

    const normalized = normalizeTenureValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function formatTenureHighlight(value) {
  if (value == null) {
    return null;
  }

  const normalized = normalizeTenureValue(value) ?? (typeof value === 'string' ? value.trim() : '');
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes('tenure')) {
    return normalized;
  }

  return `${normalized} tenure`;
}

function formatEpcHighlight(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (lower.startsWith('epc')) {
    return normalized;
  }

  if (/^[A-G]$/i.test(normalized)) {
    return `EPC ${normalized.toUpperCase()}`;
  }

  return `EPC ${normalized}`;
}

function formatCouncilTaxHighlight(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  if (/^[A-H]$/i.test(normalized)) {
    return `Council tax band ${normalized.toUpperCase()}`;
  }

  const bandMatch = /band\s*([A-H])\b/i.exec(normalized);
  if (bandMatch) {
    const suffix = normalized.slice(bandMatch.index + bandMatch[0].length).trim();
    const label = `Council tax band ${bandMatch[1].toUpperCase()}`;
    return suffix ? `${label} ${suffix}` : label;
  }

  const lower = normalized.toLowerCase();
  if (lower.startsWith('council tax')) {
    return normalized;
  }

  return `Council tax ${normalized}`;
}

function normalizeBooleanFlag(value) {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    if (value > 0) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['y', 'yes', 'true', '1', 'included'].includes(normalized)) {
      return true;
    }
    if (['n', 'no', 'false', '0', 'excluded'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function deriveIncludedUtilities(rawProperty) {
  if (!rawProperty || typeof rawProperty !== 'object') {
    return {};
  }

  const sources = [
    rawProperty.rentalFlags,
    rawProperty.rentFlags,
    rawProperty.lettingFlags,
    rawProperty.lettings?.flags,
  ];

  const source = sources.find((value) => value && typeof value === 'object');
  if (!source) {
    return {};
  }

  const mapping = {
    all: ['allBillsIncluded'],
    water: ['waterBillIncluded', 'waterIncluded'],
    gas: ['gasBillIncluded', 'gasIncluded'],
    electricity: ['electricityBillIncluded', 'electricityIncluded'],
    internet: ['internetBillIncluded', 'wifiIncluded', 'broadbandIncluded'],
    councilTax: ['councilTaxIncluded'],
    tvLicence: ['tvLicenceIncluded', 'tvLicenseIncluded'],
  };

  const result = {};
  for (const [normalizedKey, candidateKeys] of Object.entries(mapping)) {
    let value = null;
    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        value = normalizeBooleanFlag(source[key]);
        if (value != null) {
          break;
        }
      }
    }
    result[normalizedKey] = value;
  }

  return result;
}

const RENT_PREBUILD_STATUSES = [
  'available',
  'under_offer',
  'let_agreed',
  'let',
  'let_stc',
  'let_by',
];

const SALE_PREBUILD_STATUSES = ['available', 'under_offer', 'sold'];

async function loadPrebuildPropertyIds(limit = null) {
  try {
    const [rentProperties, saleProperties] = await Promise.all([
      fetchPropertiesByTypeCachedFirst('rent', {
        statuses: RENT_PREBUILD_STATUSES,
      }),
      fetchPropertiesByTypeCachedFirst('sale', {
        statuses: SALE_PREBUILD_STATUSES,
      }),
    ]);

    const ids = [];
    const seen = new Set();

    const addProperty = (property) => {
      if (!property || typeof property !== 'object') {
        return;
      }

      const identifier = resolvePropertyIdentifier(property);
      if (!identifier) {
        return;
      }

      const normalized = String(identifier).trim();
      if (!normalized) {
        return;
      }

      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        return;
      }

      seen.add(dedupeKey);
      ids.push(normalized);
    };

    rentProperties.forEach(addProperty);
    saleProperties.forEach(addProperty);

    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
      return ids.slice(0, limit);
    }

    return ids;
  } catch (error) {
    console.warn('Unable to derive prebuild property ids from cache', error);
    return [];
  }
}

export default function Property({ property, recommendations }) {
  const hasLocation = property?.latitude != null && property?.longitude != null;
  const agentProfile = property?.agentProfile;
  const priceLabel = formatPropertyPriceLabel(property);
  const rentFrequencyLabel = useMemo(() => {
    if (!property?.rentFrequency) {
      return '';
    }
    return formatOfferFrequencyLabel(property.rentFrequency);
  }, [property?.rentFrequency]);

  const formattedPrimaryPrice = useMemo(() => {
    if (!property?.price) {
      return '';
    }

    if (!property?.rentFrequency) {
      return priceLabel || property.price;
    }

    const numericPrice = parsePriceNumber(property.price);
    if (!numericPrice) {
      return priceLabel || property.price;
    }

    return formatPriceGBP(numericPrice, { isSale: true });
  }, [priceLabel, property?.price, property?.rentFrequency]);

  const secondaryRentLabel = useMemo(() => {
    if (!property?.rentFrequency || !property?.price) {
      return '';
    }

    const normalized = formatRentFrequency(property.rentFrequency);
    if (!normalized || normalized === 'pcm') {
      return '';
    }

    const monthly = rentToMonthly(property.price, property.rentFrequency);
    if (!Number.isFinite(monthly) || monthly <= 0) {
      return '';
    }

    return `Approx. ${formatPriceGBP(monthly, { isSale: true })} per month`;
  }, [property?.price, property?.rentFrequency]);
  const descriptionParagraphs = useMemo(() => {
    if (!property?.description) {
      return [];
    }

    return property.description
      .split(/\r?\n\r?\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [property?.description]);
  const summaryStats = useMemo(() => {
    const stats = [];

    if (property?.bedrooms != null) {
      stats.push({
        key: 'bedrooms',
        icon: FaBed,
        value: property.bedrooms,
        label: property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms',
      });
    }

    if (property?.bathrooms != null) {
      stats.push({
        key: 'bathrooms',
        icon: FaBath,
        value: property.bathrooms,
        label: property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms',
      });
    }

    if (property?.receptions != null) {
      stats.push({
        key: 'receptions',
        icon: FaCouch,
        value: property.receptions,
        label: property.receptions === 1 ? 'Reception' : 'Receptions',
      });
    }

    return stats;
  }, [property?.bathrooms, property?.bedrooms, property?.receptions]);
  const complianceHighlights = useMemo(() => {
    const highlights = [];

    const epcLabel = formatEpcHighlight(property?.epcScore);
    if (epcLabel) {
      highlights.push({ key: 'epc', label: epcLabel });
    }

    const councilTaxLabel = formatCouncilTaxHighlight(property?.councilTaxBand);
    if (councilTaxLabel) {
      highlights.push({ key: 'councilTax', label: councilTaxLabel });
    }

    const tenureLabel = formatTenureHighlight(property?.tenure);
    if (tenureLabel) {
      highlights.push({ key: 'tenure', label: tenureLabel });
    }

    return highlights;
  }, [property?.councilTaxBand, property?.epcScore, property?.tenure]);
  const floorplanLinks = Array.isArray(property?.floorplans) ? property.floorplans : [];
  const brochureLinks = Array.isArray(property?.brochures) ? property.brochures : [];
  const tourEntries = useMemo(
    () => deriveTourEntries(property?.media, property?.metadata),
    [property?.media, property?.metadata]
  );
  const hasMediaHighlights =
    floorplanLinks.length > 0 || brochureLinks.length > 0 || tourEntries.length > 0;
  const headlinePrice = formattedPrimaryPrice || priceLabel || '';
  const numericPriceValue = useMemo(() => {
    if (property?.priceValue != null && Number.isFinite(Number(property.priceValue))) {
      return Number(property.priceValue);
    }
    if (property?.price != null) {
      const parsed = Number(String(property.price).replace(/[^0-9.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }, [property?.price, property?.priceValue]);

  const securityDepositInfo = useMemo(
    () =>
      normalizeDeposit(
        property?.securityDeposit,
        numericPriceValue,
        property?.rentFrequency,
        property?.depositType
      ),
    [
      property?.depositType,
      property?.rentFrequency,
      property?.securityDeposit,
      numericPriceValue,
    ]
  );

  const holdingDepositInfo = useMemo(
    () =>
      normalizeDeposit(
        property?.holdingDeposit,
        numericPriceValue,
        property?.rentFrequency
      ),
    [property?.holdingDeposit, property?.rentFrequency, numericPriceValue]
  );

  const isLettings = Boolean(property?.rentFrequency);
  const securityDepositResolved = formatDepositDisplay(securityDepositInfo, {
    fallback: null,
  });
  const holdingDepositResolved = formatDepositDisplay(holdingDepositInfo, {
    fallback: null,
  });
  const securityDepositLabel = securityDepositResolved ?? (isLettings ? 'Please enquire' : null);
  const holdingDepositLabel = holdingDepositResolved ?? (isLettings ? 'Please enquire' : null);
  const shouldShowSecurityDeposit = Boolean(securityDepositLabel);
  const shouldShowHoldingDeposit = Boolean(holdingDepositLabel);

  const availabilityRaw = useMemo(
    () =>
      property?.availableAt ??
      property?.availableDate ??
      property?.available_from ??
      property?.availableFrom ??
      property?.available ??
      property?.dateAvailableFrom ??
      property?.dateAvailable ??
      property?.date_available_from ??
      property?.date_available ??
      null,
    [
      property?.available,
      property?.availableAt,
      property?.availableDate,
      property?.availableFrom,
      property?.available_from,
      property?.dateAvailable,
      property?.dateAvailableFrom,
      property?.date_available,
      property?.date_available_from,
    ]
  );

  const availabilityLabel = formatAvailabilityDate(availabilityRaw, {
    fallback: isLettings ? 'Please enquire' : null,
  });
  const shouldShowAvailability = Boolean(availabilityLabel);
  const mapProperties = useMemo(
    () => {
      if (!hasLocation || !property) return [];
      return [
        {
          id: property.id,
          title: property.title,
          price: property.price,
          rentFrequency: property.rentFrequency,
          tenure: property.tenure ?? null,
          image: property.image ?? null,
          propertyType: property.propertyType ?? property.type ?? null,
          lat: property.latitude,
          lng: property.longitude,
        },
      ];
    },
    [
      hasLocation,
      property?.id,
      property?.image,
      property?.latitude,
      property?.longitude,
      property?.price,
      property?.rentFrequency,
      property?.tenure,
      property?.title,
      property?.propertyType,
      property?.type,
    ]
  );

  if (!property) {
    return (
      <>
        <Head>
          <title>Property not found | Aktonz</title>
        </Head>
        <main className={styles.main}>
          <h1>Property not found</h1>
        </main>
      </>
    );
  }
  const features = Array.isArray(property.features) ? property.features : [];
  const displayType =
    property.typeLabel ??
    property.propertyTypeLabel ??
    formatPropertyTypeLabel(property.propertyType ?? property.type ?? null);
  const locationLabel = (() => {
    const parts = [];
    if (property.city) {
      parts.push(property.city);
    }
    if (property.outcode) {
      parts.push(property.outcode);
    }
    return parts.join(' · ');
  })();
  const scrayeReference = !property.rentFrequency
    ? property.scrayeReference ?? property._scraye?.reference ?? null
    : null;
  const pricePrefixLabel =
    !property.rentFrequency && property.pricePrefix
      ? formatPricePrefix(property.pricePrefix)
      : '';

  const showMortgageCalculator = Boolean(!property.rentFrequency && property.price);
  const showRentCalculator = Boolean(property.rentFrequency && property.price);
  const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0;

  const navSections = useMemo(() => {
    const sectionsList = [];
    if (hasLocation) {
      sectionsList.push({ id: 'property-location', label: 'Location' });
    }
    if (features.length > 0) {
      sectionsList.push({ id: 'property-features', label: 'Key features' });
    }
    if (showMortgageCalculator || showRentCalculator) {
      sectionsList.push({ id: 'property-calculators', label: 'Calculators' });
    }
    if (hasRecommendations) {
      sectionsList.push({ id: 'property-recommendations', label: 'Recommendations' });
    }
    return sectionsList;
  }, [
    features.length,
    hasLocation,
    hasRecommendations,
    showMortgageCalculator,
    showRentCalculator,
  ]);

  return (
    <>
      <Head>
        <title>{property.title ? `${property.title} | Aktonz` : 'Property details'}</title>
      </Head>
      <main className={styles.main}>
        <section className={`${styles.contentRail} ${styles.hero} ${styles.heroGrid}`}>
          {(property.images?.length > 0 || property.media?.length > 0) && (
            <div className={styles.sliderWrapper}>
              <MediaGallery images={property.images} media={property.media} />
            </div>
          )}
          <div className={styles.heroGrid}>
            <div className={styles.summary}>
              <div className={styles.summaryMain}>
                <div className={styles.summaryIntro}>
                  {displayType && <span className={styles.typeBadge}>{displayType}</span>}
                  {locationLabel && (
                    <span className={styles.locationLabel}>{locationLabel}</span>
                  )}
                  {summaryStats.length > 0 && (
                    <ul className={styles.statsList}>
                      {summaryStats.map((stat) => (
                        <li key={stat.key} className={styles.statItem}>
                          <stat.icon aria-hidden="true" />
                          <span>
                            <strong>{stat.value}</strong> {stat.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {complianceHighlights.length > 0 && (
                    <ul className={styles.complianceHighlights}>
                      {complianceHighlights.map((highlight) => (
                        <li key={highlight.key}>{highlight.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            {(pricePrefixLabel || headlinePrice) && (
              <aside className={styles.summarySidebar}>
                <div className={styles.summarySidebarInner}>
                  <div className={styles.priceCard}>
                    <div className={styles.priceHeader}>
                      {pricePrefixLabel && (
                        <span className={styles.pricePrefixBadge}>{pricePrefixLabel}</span>
                      )}
                      {headlinePrice && (
                        <div className={styles.priceHeadline}>
                          <span className={styles.pricePrimaryValue}>{headlinePrice}</span>
                          {rentFrequencyLabel && (
                            <span className={styles.priceFrequency}>{rentFrequencyLabel}</span>
                          )}
                        </div>
                      )}
                      {secondaryRentLabel && (
                        <p className={styles.priceSecondary}>{secondaryRentLabel}</p>
                      )}
                    </div>
                    {(shouldShowSecurityDeposit ||
                      shouldShowHoldingDeposit ||
                      shouldShowAvailability) && (
                      <dl className={styles.rentMeta}>
                        {shouldShowSecurityDeposit && (
                          <>
                            <dt>Security deposit</dt>
                            <dd>{securityDepositLabel}</dd>
                          </>
                        )}
                        {shouldShowHoldingDeposit && (
                          <>
                            <dt>Holding deposit</dt>
                            <dd>{holdingDepositLabel}</dd>
                          </>
                        )}
                        {shouldShowAvailability && (
                          <>
                            <dt>Available from</dt>
                            <dd>{availabilityLabel}</dd>
                          </>
                        )}
                      </dl>
                    )}
                    <div className={styles.priceActions}>
                      <OfferDrawer property={property} />
                      <ViewingForm property={property} />
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>

        {hasMediaHighlights && (
          <MediaHighlights
            floorplans={floorplanLinks}
            brochures={brochureLinks}
            tours={tourEntries}
          />
        )}

      {hasLocation && (
        <section className={`${styles.contentRail} ${styles.mapSection}`}>
          <h2>Location</h2>
          <div className={styles.mapContainer}>
            <PropertyMap
              mapId="property-details-map"
              center={[property.latitude, property.longitude]}
              zoom={16}
              properties={mapProperties}
            />
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section className={`${styles.contentRail} ${styles.features}`}>
          <h2>Key features</h2>
          <ul>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${styles.contentRail} ${styles.modules}`}>
        {agentProfile && (
          <AgentCard className={styles.agentCard} agent={agentProfile} />
        )}
        <PropertySustainabilityPanel property={property} />

        <NeighborhoodInfo lat={property.latitude} lng={property.longitude} />
        {!property.rentFrequency && property.price && (
          <section className={styles.calculatorSection}>
            <h2>Mortgage Calculator</h2>
            <MortgageCalculator defaultPrice={parsePriceNumber(property.price)} />
          </section>
        )}

        {features.length > 0 && (
          <section
            id="property-features"
            className={`${styles.contentRail} ${styles.features} ${styles.sectionAnchor}`}
          >
            <h2>Key features</h2>
            <ul>
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </section>
        )}
      </section>

        <div className={`${styles.contentRail} ${styles.modules}`}>
          <PropertySustainabilityPanel property={property} />

          <NeighborhoodInfo lat={property.latitude} lng={property.longitude} />
          {showMortgageCalculator && (
            <section
              id="property-calculators"
              className={`${styles.calculatorSection} ${styles.sectionAnchor}`}
            >
              <h2>Mortgage Calculator</h2>
              <MortgageCalculator defaultPrice={parsePriceNumber(property.price)} />
            </section>
          )}

          {showRentCalculator && (
            <section
              id={showMortgageCalculator ? undefined : 'property-calculators'}
              className={`${styles.calculatorSection} ${styles.sectionAnchor}`}
            >
              <h2>Rent Affordability</h2>
              <RentAffordability
                defaultRent={rentToMonthly(property.price, property.rentFrequency)}
              />
            </section>
          )}
        </div>

        <section className={`${styles.contentRail} ${styles.contact}`}>
          <p>Interested in this property?</p>
          <a href="tel:+441234567890">Call our team</a>
        </section>

        {hasRecommendations && (
          <section
            id="property-recommendations"
            className={`${styles.contentRail} ${styles.related} ${styles.sectionAnchor}`}
          >
            <h2>You might also be interested in</h2>
            <PropertyList properties={recommendations} />
          </section>
        )}
      </main>
    </>
  );
}

export async function getStaticPaths() {
  const ids = await loadPrebuildPropertyIds();
  const paths = ids.map((id) => ({ params: { id: String(id) } }));
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const rawProperty = await fetchPropertyById(params.id);
  let formatted = null;
  if (rawProperty) {
    const imgList = normalizeImages(rawProperty.images || []);
    const isSalePrice = rawProperty.rentFrequency == null;
    const propertyTypeValue =
      rawProperty.propertyType ||
      rawProperty.type ||
      rawProperty.property_type ||
      rawProperty.property_type_code ||
      '';
    const propertyTypeLabel =
      resolvePropertyTypeLabel(rawProperty) ??
      formatPropertyTypeLabel(propertyTypeValue);
    const rawOutcode =
      rawProperty.outcode ??
      rawProperty.postcode ??
      rawProperty.postCode ??
      rawProperty.address?.postcode ??
      null;
    const normalizedOutcode =
      typeof rawOutcode === 'string' && rawOutcode.trim()
        ? rawOutcode.trim().split(/\s+/)[0]
        : null;
    const cityCandidates = [
      rawProperty.city,
      rawProperty.town,
      rawProperty.locality,
      rawProperty.area,
      rawProperty._scraye?.placeName,
    ];
    const normalizedCity =
      cityCandidates.find(
        (value) => typeof value === 'string' && value.trim()
      )?.trim() ?? null;
    const numericPriceValue = (() => {
      if (rawProperty.priceValue != null && Number.isFinite(Number(rawProperty.priceValue))) {
        return Number(rawProperty.priceValue);
      }
      if (rawProperty.price != null) {
        const parsed = Number(String(rawProperty.price).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return null;
    })();

    const rawAvailabilityValue = (() => {
      const candidates = [
        rawProperty.availableAt,
        rawProperty.availableDate,
        rawProperty.available_from,
        rawProperty.availableFrom,
        rawProperty.available,
        rawProperty.dateAvailableFrom,
        rawProperty.dateAvailable,
        rawProperty.date_available_from,
        rawProperty.date_available,
      ];
      for (const candidate of candidates) {
        if (candidate != null) {
          return candidate;
        }
      }
      return null;
    })();

    const resolvedAvailabilityDate = resolveAvailabilityDate(rawAvailabilityValue);
    const normalizedAvailability = resolvedAvailabilityDate
      ? resolvedAvailabilityDate.toISOString()
      : typeof rawAvailabilityValue === 'string'
      ? rawAvailabilityValue.trim()
      : null;

    const securityDepositSource = resolveSecurityDepositSource(rawProperty);
    const holdingDepositSource = resolveHoldingDepositSource(rawProperty);

    const securityDeposit = normalizeDeposit(
      securityDepositSource,
      numericPriceValue,
      rawProperty.rentFrequency,
      rawProperty.depositType
    );

    const holdingDeposit = normalizeDeposit(
      holdingDepositSource,
      numericPriceValue,
      rawProperty.rentFrequency
    );

    const derivedEpcScore = deriveEpcScore(rawProperty);
    const derivedCouncilTaxBand = deriveCouncilTaxBand(rawProperty);
    const derivedTenure = deriveTenure(rawProperty);

    formatted = {
      id: resolvePropertyIdentifier(rawProperty) ?? String(params.id),
      title:
        rawProperty.displayAddress ||
        rawProperty.address1 ||
        rawProperty.title ||
        '',
      description: rawProperty.description || rawProperty.summary || '',
      price:
        rawProperty.price != null
          ? rawProperty.priceCurrency === 'GBP'
            ? formatPriceGBP(rawProperty.price, { isSale: isSalePrice })
            : rawProperty.price
          : null,
      pricePrefix: extractPricePrefix(rawProperty) ?? null,
      priceValue: numericPriceValue,

      rentFrequency: rawProperty.rentFrequency ?? null,
      image: imgList[0] || null,
      images: imgList,
      agentProfile: resolveAgentProfile(rawProperty),
      media: extractMedia(rawProperty),
      floorplans: extractSupplementaryLinks(rawProperty, [
        'floorplan',
        'floor plan',
        'floor_plan',
      ]),
      brochures: extractSupplementaryLinks(rawProperty, [
        'brochure',
        'particulars',
        'specification',
        'spec sheet',
      ]),
      metadata: Array.isArray(rawProperty.metadata) ? rawProperty.metadata : [],
      tenure: derivedTenure,
      features: (() => {
        const rawFeatures =
          rawProperty.mainFeatures ||
          rawProperty.keyFeatures ||
          rawProperty.features ||
          rawProperty.bullets ||
          [];
        if (Array.isArray(rawFeatures)) return rawFeatures;
        if (typeof rawFeatures === 'string') {
          return rawFeatures
            .split(/\r?\n|,/)
            .map((f) => f.trim())
            .filter(Boolean);
        }
        return [];
      })(),
      propertyType: propertyTypeValue || null,
      propertyTypeLabel: propertyTypeLabel ?? null,
      type: propertyTypeValue || '',
      typeLabel: propertyTypeLabel ?? null,
      receptions:
        rawProperty.receptionRooms ?? rawProperty.receptions ?? null,
      bedrooms: rawProperty.bedrooms ?? rawProperty.beds ?? null,
      bathrooms: rawProperty.bathrooms ?? rawProperty.baths ?? null,
      latitude: rawProperty.latitude ?? null,
      longitude: rawProperty.longitude ?? null,
      city: normalizedCity,
      outcode: normalizedOutcode,
      source: rawProperty.source ?? null,
      _scraye: rawProperty._scraye ?? null,
      depositType: rawProperty.depositType ?? null,
      securityDeposit,
      holdingDeposit,
      availableAt: normalizedAvailability,
      scrayeReference: deriveScrayeReference(rawProperty),
      epcScore: derivedEpcScore,
      councilTaxBand: derivedCouncilTaxBand,
      includedUtilities: deriveIncludedUtilities(rawProperty),
    };
  }

  const allRent = await fetchPropertiesByTypeCachedFirst('rent');
  const recommendations = allRent
    .filter((p) => !propertyMatchesIdentifier(p, params.id))
    .slice(0, 4);

  return { props: { property: formatted, recommendations } };
}
