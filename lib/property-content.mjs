import {
  FaMapMarkerAlt,
  FaTrain,
  FaBook,
  FaShoppingBag,
  FaCoffee,
  FaTree,
  FaCompass,
} from 'react-icons/fa';

const DEFAULT_TOUR_LABELS = {
  virtual: 'Virtual tour',
  video: 'Video tour',
  floorplan: 'Floor plan',
  brochure: 'Download brochure',
  external: 'View link',
};

function normalizeUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  return null;
}

function classifyTourType(candidate = {}) {
  const { type, label, url } = candidate;
  if (type && DEFAULT_TOUR_LABELS[type]) {
    return { type, label: label || DEFAULT_TOUR_LABELS[type] };
  }

  const normalizedLabel = typeof label === 'string' ? label.toLowerCase() : '';
  const normalizedUrl = typeof url === 'string' ? url.toLowerCase() : '';

  if (
    /matterport|360|virtual|vtour|panorama/.test(normalizedLabel) ||
    /matterport|360|virtual|vtour|panorama/.test(normalizedUrl)
  ) {
    return { type: 'virtual', label: label || DEFAULT_TOUR_LABELS.virtual };
  }

  if (
    /video|youtube|vimeo|mp4|mov|m4v|webm/.test(normalizedLabel) ||
    /video|youtube|youtu\.be|vimeo|mp4|mov|m4v|webm/.test(normalizedUrl)
  ) {
    return { type: 'video', label: label || DEFAULT_TOUR_LABELS.video };
  }

  if (/floor ?plan/.test(normalizedLabel) || /floor-?plan/.test(normalizedUrl)) {
    return { type: 'floorplan', label: label || DEFAULT_TOUR_LABELS.floorplan };
  }

  if (/brochure|specification|download/.test(normalizedLabel) || /\.pdf($|\?)/.test(normalizedUrl)) {
    return { type: 'brochure', label: label || DEFAULT_TOUR_LABELS.brochure };
  }

  return { type: 'external', label: label || DEFAULT_TOUR_LABELS.external };
}

export function deriveTourEntries(...inputs) {
  const entries = [];
  const seen = new Set();

  const addEntry = (candidate, context = null) => {
    if (!candidate) {
      return;
    }

    if (typeof candidate === 'string') {
      const normalizedUrl = normalizeUrl(candidate);
      if (!normalizedUrl || seen.has(normalizedUrl)) {
        return;
      }
      const classification = classifyTourType({ url: normalizedUrl });
      entries.push({
        url: normalizedUrl,
        type: classification.type,
        label: classification.label,
        source: context,
      });
      seen.add(normalizedUrl);
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((value) => addEntry(value, context));
      return;
    }

    if (typeof candidate !== 'object') {
      return;
    }

    if (candidate.url || candidate.href) {
      const normalizedUrl = normalizeUrl(candidate.url || candidate.href);
      if (!normalizedUrl || seen.has(normalizedUrl)) {
        // proceed to nested lookups even if duplicate to find other items
      } else {
        const classification = classifyTourType({
          url: normalizedUrl,
          type: candidate.type,
          label: candidate.label || candidate.title || candidate.name,
        });
        entries.push({
          url: normalizedUrl,
          type: classification.type,
          label:
            candidate.label ||
            candidate.title ||
            candidate.name ||
            classification.label,
          source: candidate.source || context,
        });
        seen.add(normalizedUrl);
      }
    }

    const nestedKeys = [
      'media',
      'gallery',
      'tours',
      'tourLinks',
      'virtualTour',
      'virtualTourUrl',
      'virtualTours',
      'videoTour',
      'videoTourUrl',
      'videoTours',
      'tourUrl',
      'links',
    ];

    nestedKeys.forEach((key) => {
      if (candidate[key] != null) {
        addEntry(candidate[key], key);
      }
    });
  };

  inputs.forEach((input) => addEntry(input));

  return entries;
}

export function groupPropertyFeatures(features, options = {}) {
  const highlightCount =
    typeof options.highlightCount === 'number' && options.highlightCount >= 0
      ? options.highlightCount
      : 6;

  const normalized = [];
  const seen = new Map();

  const addFeature = (value) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addFeature);
      return;
    }

    if (typeof value === 'object') {
      Object.values(value).forEach(addFeature);
      return;
    }

    if (typeof value !== 'string') {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const canonical = trimmed.toLowerCase();
    if (seen.has(canonical)) {
      return;
    }

    seen.set(canonical, trimmed);
    normalized.push(trimmed);
  };

  addFeature(features);

  const highlighted = normalized.slice(0, highlightCount);
  const additional = normalized.slice(highlightCount);

  return {
    all: normalized,
    highlighted,
    additional,
    primary: highlighted,
    secondary: additional,
  };
}

export const LOCATION_INSIGHT_ICON_MAP = {
  default: FaMapMarkerAlt,
  transport: FaTrain,
  transit: FaTrain,
  station: FaTrain,
  travel: FaTrain,
  education: FaBook,
  schools: FaBook,
  study: FaBook,
  shopping: FaShoppingBag,
  retail: FaShoppingBag,
  dining: FaCoffee,
  food: FaCoffee,
  cafe: FaCoffee,
  leisure: FaCoffee,
  hospitality: FaCoffee,
  greenspace: FaTree,
  greenSpace: FaTree,
  parks: FaTree,
  nature: FaTree,
  coordinates: FaCompass,
  postcode: FaMapMarkerAlt,
  city: FaMapMarkerAlt,
  borough: FaMapMarkerAlt,
  neighbourhood: FaMapMarkerAlt,
  neighborhood: FaMapMarkerAlt,
  reference: FaMapMarkerAlt,
  zone: FaTrain,
};

const URL_KEY_HINTS = [
  { match: /floor[-_ ]?plan/, label: 'View floor plan', type: 'floorplan' },
  { match: /brochure|spec/, label: 'Download brochure', type: 'brochure' },
  { match: /epc/, label: 'View EPC certificate', type: 'epc' },
  { match: /video/, label: 'Video tour', type: 'video' },
  { match: /virtual|360/, label: 'Virtual tour', type: 'virtual' },
  { match: /listing|details|external/, label: 'View listing', type: 'external' },
];

function inferLinkMetadata(pathSegments, explicitLabel) {
  if (explicitLabel) {
    return { label: explicitLabel };
  }

  const segments = pathSegments
    .filter((segment) => segment != null)
    .map((segment) => segment.toString().toLowerCase());

  for (const segment of segments) {
    for (const hint of URL_KEY_HINTS) {
      if (hint.match.test(segment)) {
        return { label: hint.label, type: hint.type };
      }
    }
  }

  return {};
}

export function extractSupplementaryLinks(...inputs) {
  const links = [];
  const seen = new Set();

  const visit = (value, path = []) => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      const normalizedUrl = normalizeUrl(value);
      if (!normalizedUrl || seen.has(normalizedUrl)) {
        return;
      }
      const metadata = inferLinkMetadata(path, null);
      links.push({
        url: normalizedUrl,
        label: metadata.label || DEFAULT_TOUR_LABELS.external,
        type: metadata.type || 'external',
      });
      seen.add(normalizedUrl);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, path.concat(index)));
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (value.url || value.href) {
      const normalizedUrl = normalizeUrl(value.url || value.href);
      if (normalizedUrl && !seen.has(normalizedUrl)) {
        const metadata = inferLinkMetadata(path, value.label || value.title || value.name);
        links.push({
          url: normalizedUrl,
          label:
            value.label || value.title || value.name || metadata.label || DEFAULT_TOUR_LABELS.external,
          type: value.type || metadata.type || 'external',
        });
        seen.add(normalizedUrl);
      }
    }

    Object.entries(value).forEach(([key, nested]) => visit(nested, path.concat(key)));
  };

  inputs.forEach((input) => visit(input));

  return links;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value == null) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

function stringifyCoordinate(lat, lng) {
  if (lat == null || lng == null) {
    return null;
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    return `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
  }
  return `${lat}, ${lng}`;
}

export function computeLocationInsights(...inputs) {
  const objects = inputs.filter((value) => value && typeof value === 'object');
  const insights = [];
  const seenKeys = new Set();

  const addInsight = (key, value, description = null) => {
    if (!value) {
      return;
    }
    const normalizedKey = key || (typeof description === 'string' ? description.toLowerCase() : value);
    if (!normalizedKey || seenKeys.has(normalizedKey)) {
      return;
    }
    seenKeys.add(normalizedKey);
    insights.push({ key: normalizedKey, value, description });
  };

  const best = (selector) =>
    pickFirst(
      ...objects.map((object) => {
        try {
          return selector(object);
        } catch (error) {
          return null;
        }
      })
    );

  const locality = best((object) =>
    pickFirst(
      object.locality,
      object.area,
      object.city,
      object.town,
      object.neighbourhood,
      object.neighborhood,
      object.address?.locality,
      object.address?.area,
      object.address?.city,
      object.address?.town,
      object._scraye?.placeName,
      object._scraye?.neighbourhood,
      object._scraye?.neighborhood
    )
  );
  addInsight('city', locality, 'Local area');

  const postcode = best((object) =>
    pickFirst(
      object.outcode,
      object.postcode,
      object.postCode,
      object.address?.postcode,
      object.address?.postCode,
      object._scraye?.postcode,
      object._scraye?.postCode
    )
  );
  addInsight('postcode', postcode, 'Postcode district');

  const borough = best((object) =>
    pickFirst(
      object.borough,
      object.address?.borough,
      object.county,
      object.address?.county,
      object._scraye?.borough,
      object._scraye?.county
    )
  );
  addInsight('borough', borough, 'Borough');

  const transportZone = best((object) =>
    pickFirst(object.zone, object.transportZone, object._scraye?.zone, object._scraye?.transportZone)
  );
  if (transportZone) {
    const zoneLabel = typeof transportZone === 'number' ? `Zone ${transportZone}` : String(transportZone);
    addInsight('zone', zoneLabel, 'Transport zone');
  }

  const stationDetails = best((object) => {
    const stationCandidates = [];
    if (Array.isArray(object.nearestStations)) {
      stationCandidates.push(...object.nearestStations);
    }
    if (Array.isArray(object.transport?.nearestStations)) {
      stationCandidates.push(...object.transport.nearestStations);
    }
    if (Array.isArray(object._scraye?.nearestStations)) {
      stationCandidates.push(...object._scraye.nearestStations);
    }
    if (object._scraye?.nearestStation) {
      stationCandidates.push(object._scraye.nearestStation);
    }
    if (stationCandidates.length === 0) {
      return null;
    }

    const formatted = stationCandidates
      .map((station) => {
        if (!station) {
          return null;
        }
        if (typeof station === 'string') {
          return station.trim();
        }
        if (typeof station !== 'object') {
          return null;
        }

        const name = pickFirst(station.name, station.title, station.label);
        const distance = pickFirst(
          station.distanceText,
          station.distance,
          station.minutes,
          station.walkingTime,
          station.travelTime,
          station.time
        );
        if (!name) {
          return null;
        }
        if (!distance) {
          return name;
        }
        if (typeof distance === 'number') {
          if (distance < 1 && distance > 0) {
            return `${name} (${Math.round(distance * 1000)} m walk)`;
          }
          if (distance >= 1 && distance <= 10) {
            return `${name} (${distance.toFixed(1)} km)`;
          }
          return `${name} (${distance})`;
        }
        return `${name} (${distance})`;
      })
      .filter(Boolean);

    if (formatted.length === 0) {
      return null;
    }

    return formatted.join(' · ');
  });

  addInsight('transport', stationDetails, 'Nearby transport');

  const coordinates = best((object) =>
    stringifyCoordinate(
      pickFirst(object.latitude, object.lat, object.location?.lat, object.location?.latitude, object._scraye?.latitude),
      pickFirst(object.longitude, object.lng, object.location?.lng, object.location?.longitude, object._scraye?.longitude)
    )
  );
  addInsight('coordinates', coordinates, 'Coordinates');

  const reference = best((object) =>
    pickFirst(
      object.scrayeReference,
      object.reference,
      object.propertyReference,
      object.listingReference,
      object._scraye?.reference,
      object._scraye?.listingReference
    )
  );
  addInsight('reference', reference, 'Listing reference');

  return insights;
}
