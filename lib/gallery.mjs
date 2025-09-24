import { readFile } from 'node:fs/promises';

const GALLERY_PATH = new URL('../data/gallery.json', import.meta.url);

function sanitizeString(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function slugify(value, fallback) {
  const normalized = sanitizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized) {
    return normalized;
  }

  return fallback;
}

function normalizeId(value) {
  return sanitizeString(value).toLowerCase();
}

function buildItemId(sectionSlug, itemSlug, seenIds) {
  const base = `${sectionSlug}/${itemSlug}`;
  let candidate = base;
  let suffix = 2;

  while (seenIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  seenIds.add(candidate);
  return candidate;
}

function normalizeUrl(value) {
  const url = sanitizeString(value);
  return url || null;
}

let cachedGallery = null;

async function loadGallery() {
  if (cachedGallery) {
    return cachedGallery;
  }

  const raw = await readFile(GALLERY_PATH, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('Failed to parse gallery data');
  }

  const sections = Array.isArray(parsed) ? parsed : [];
  const seenIds = new Set();
  const flatItems = [];

  const normalizedSections = sections.map((section, sectionIndex) => {
    const category = sanitizeString(section.category) || 'Gallery';
    const slug = slugify(section.slug || category, `category-${sectionIndex + 1}`);

    const items = Array.isArray(section.items) ? section.items : [];

    const normalizedItems = items.map((item, itemIndex) => {
      const order = itemIndex + 1;
      const itemSlug = slugify(
        item.title || item.slide || item.agency || `style-${order}`,
        `style-${order}`,
      );
      const id = buildItemId(slug, itemSlug, seenIds);

      const normalizedItem = {
        id,
        order,
        category,
        categorySlug: slug,
        title: sanitizeString(item.title) || null,
        slide: sanitizeString(item.slide) || null,
        agency: sanitizeString(item.agency) || null,
        thumbnailUrl: normalizeUrl(item.thumbnailUrl),
        presentationUrl: normalizeUrl(item.presentationUrl),
      };

      flatItems.push(normalizedItem);
      return normalizedItem;
    });

    return {
      category,
      slug,
      order: sectionIndex + 1,
      items: normalizedItems,
    };
  });

  const itemMap = new Map(flatItems.map((item) => [normalizeId(item.id), item]));

  cachedGallery = {
    sections: normalizedSections,
    items: flatItems,
    itemMap,
    generatedAt: new Date().toISOString(),
  };

  return cachedGallery;
}

export async function listGallerySections() {
  const { sections } = await loadGallery();
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));
}

export async function flattenGalleryItems() {
  const { items } = await loadGallery();
  return items.map((item) => ({ ...item }));
}

export async function getGalleryItemById(id) {
  if (!id) {
    return null;
  }

  const normalizedId = normalizeId(id);
  const { itemMap } = await loadGallery();
  return itemMap.get(normalizedId) || null;
}

export async function resetGalleryCache() {
  cachedGallery = null;
}
