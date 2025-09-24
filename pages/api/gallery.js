import gallery from '../../data/gallery.json';

function normalize(value) {
  return value ? String(value).trim().toLowerCase() : '';
}

function withOrder(section) {
  return {
    category: section.category,
    slug: section.slug,
    itemsCount: Array.isArray(section.items) ? section.items.length : 0,
    items: Array.isArray(section.items)
      ? section.items.map((item, index) => ({
          ...item,
          order: index + 1,
        }))
      : [],
  };
}

function flattenItems(sections) {
  const flat = [];
  sections.forEach((section) => {
    section.items.forEach((item) => {
      flat.push({
        ...item,
        category: section.category,
        categorySlug: section.slug,
      });
    });
  });
  return flat;
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS', 'HEAD']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sections = gallery.map(withOrder);
  const totalSections = sections.length;
  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
  const meta = {
    generatedAt: new Date().toISOString(),
    totalSections,
    totalItems,
  };

  const { slug, category, view } = req.query;
  const requestedSlug = normalize(slug || category);
  const responseIsFlat = normalize(view) === 'flat';

  if (requestedSlug) {
    const section = sections.find(
      (item) => normalize(item.slug) === requestedSlug || normalize(item.category) === requestedSlug
    );

    if (!section) {
      return res.status(404).json({ error: 'Gallery category not found' });
    }

    if (responseIsFlat) {
      return res.status(200).json({
        ...meta,
        items: flattenItems([section]),
      });
    }

    return res.status(200).json({
      ...meta,
      section,
    });
  }

  if (responseIsFlat) {
    return res.status(200).json({
      ...meta,
      items: flattenItems(sections),
    });
  }

  return res.status(200).json({
    ...meta,
    sections,
  });
}
