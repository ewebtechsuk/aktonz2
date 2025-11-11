import { useId, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaFilePdf, FaPlayCircle, FaRulerCombined, FaVrCardboard } from 'react-icons/fa';
import styles from '../styles/PropertyDetails.module.css';

function isLikelyAssetUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith('/')) return true;
  return false;
}

function coerceLinkEntry(entry) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!isLikelyAssetUrl(trimmed)) {
      return null;
    }
    return { url: trimmed, label: null, rawType: null, subtype: null };
  }

  if (typeof entry !== 'object') {
    return null;
  }

  const urlFields = [
    'url',
    'href',
    'link',
    'value',
    'downloadUrl',
    'fileUrl',
    'assetUrl',
    'src',
    'path',
  ];
  let url = null;
  for (const field of urlFields) {
    const candidate = entry[field];
    if (typeof candidate === 'string' && isLikelyAssetUrl(candidate)) {
      url = candidate.trim();
      break;
    }
  }

  if (!url) {
    return null;
  }

  const labelFields = [
    'label',
    'name',
    'title',
    'displayName',
    'description',
    'heading',
    'text',
  ];
  let label = null;
  for (const field of labelFields) {
    const candidate = entry[field];
    if (typeof candidate === 'string' && candidate.trim()) {
      label = candidate.trim();
      break;
    }
  }

  const rawType = typeof entry.type === 'string' ? entry.type : null;
  const subtype = typeof entry.subtype === 'string' ? entry.subtype : null;

  return { url, label, rawType, subtype };
}

function formatLabel(label) {
  if (!label) return null;
  const cleaned = String(label).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function createFloorplanItems(floorplans) {
  const entries = floorplans
    .map((entry) => coerceLinkEntry(entry))
    .filter((entry) => entry && isLikelyAssetUrl(entry.url));

  return entries.map((entry, index) => {
    const countSuffix = entries.length > 1 ? ` ${index + 1}` : '';
    const title =
      formatLabel(entry.label) ||
      (entries.length > 1 ? `Floorplan${countSuffix}` : 'Floorplan');

    return {
      key: `floorplan-${index}`,
      url: entry.url,
      title,
      cta: 'View floorplan',
      Icon: FaRulerCombined,
    };
  });
}

function createBrochureItems(brochures) {
  const entries = brochures
    .map((entry) => coerceLinkEntry(entry))
    .filter((entry) => entry && isLikelyAssetUrl(entry.url));

  return entries.map((entry, index) => {
    const countSuffix = entries.length > 1 ? ` ${index + 1}` : '';
    const defaultTitle = entries.length > 1 ? `Brochure${countSuffix}` : 'Property brochure';
    const title = formatLabel(entry.label) || defaultTitle;
    const isPdf = /\.pdf($|\?)/i.test(entry.url);

    return {
      key: `brochure-${index}`,
      url: entry.url,
      title,
      cta: isPdf ? 'Download PDF' : 'View brochure',
      Icon: FaFilePdf,
    };
  });
}

function detectTourSubtype(entry) {
  if (!entry) return null;
  const explicitSubtype = entry.subtype || entry.rawType;
  const explicit = typeof explicitSubtype === 'string' ? explicitSubtype.toLowerCase() : '';
  const urlLower = entry.url.toLowerCase();

  if (explicit.includes('video')) return 'video';
  if (explicit.includes('virtual') || explicit.includes('360')) return 'virtual';

  if (/matterport|360|virtual|tour/.test(urlLower)) return 'virtual';
  if (/youtube|youtu\.be|vimeo|video/.test(urlLower)) return 'video';
  if (/\.(mp4|webm|ogg)$/i.test(urlLower)) return 'video';
  return null;
}

function createTourItems(tours) {
  const entries = tours
    .map((entry) => coerceLinkEntry(entry))
    .filter((entry) => entry && isLikelyAssetUrl(entry.url))
    .map((entry) => ({ ...entry, subtype: detectTourSubtype(entry) }));

  if (entries.length === 0) {
    return [];
  }

  const subtypeTotals = entries.reduce((acc, entry) => {
    const key = entry.subtype || 'tour';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const subtypeCounters = {};

  return entries.map((entry, index) => {
    const subtype = entry.subtype || 'tour';
    subtypeCounters[subtype] = (subtypeCounters[subtype] || 0) + 1;
    const shouldNumber = (subtypeTotals[subtype] || 0) > 1;

    let defaultTitle;
    if (subtype === 'video') {
      defaultTitle = 'Video tour';
    } else if (subtype === 'virtual') {
      defaultTitle = '360° tour';
    } else {
      defaultTitle = 'Virtual tour';
    }

    if (shouldNumber) {
      defaultTitle = `${defaultTitle} ${subtypeCounters[subtype]}`;
    }

    const title = formatLabel(entry.label) || defaultTitle;

    let cta = 'Open tour';
    if (subtype === 'video') {
      cta = 'Watch now';
    } else if (subtype === 'virtual') {
      cta = 'Explore tour';
    }

    const Icon = subtype === 'video' ? FaPlayCircle : FaVrCardboard;

    return {
      key: `tour-${index}`,
      url: entry.url,
      title,
      cta,
      Icon,
    };
  });
}

export default function MediaHighlights({ floorplans = [], brochures = [], tours = [] }) {
  const cards = [
    ...createFloorplanItems(floorplans),
    ...createBrochureItems(brochures),
    ...createTourItems(tours),
  ];

  if (cards.length === 0) {
    return null;
  }

  const trackRef = useRef(null);
  const listId = useId();

  const handleScroll = (direction) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const firstCard = track.querySelector('li');
    if (!firstCard) {
      return;
    }

    const { width } = firstCard.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
    track.scrollBy({
      left: (width + gap) * direction,
      behavior: 'smooth',
    });
  };

  return (
    <section className={`${styles.contentRail} ${styles.mediaHighlights}`} aria-label="Supplementary media">
      <h2 className={styles.mediaHighlightsTitle}>Explore more media</h2>
      <div className={styles.mediaHighlightsViewport}>
        <button
          type="button"
          className={`${styles.carouselControl} ${styles.carouselControlPrev}`}
          aria-label="Scroll media left"
          onClick={() => handleScroll(-1)}
          aria-controls={listId}
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        <ul ref={trackRef} className={styles.mediaHighlightsTrack} id={listId}>
          {cards.map(({ key, url, title, cta, Icon }) => (
            <li key={key} className={styles.mediaHighlightItem}>
              <a
                href={url}
                className={styles.mediaHighlightCard}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${title} — ${cta}`}
              >
                <span className={styles.mediaHighlightIcon} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles.mediaHighlightText}>
                  <span className={styles.mediaHighlightLabel}>{title}</span>
                  <span className={styles.mediaHighlightCta}>{cta}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${styles.carouselControl} ${styles.carouselControlNext}`}
          aria-label="Scroll media right"
          onClick={() => handleScroll(1)}
          aria-controls={listId}
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
