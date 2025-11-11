export const BLOG_POST_STATUSES = Object.freeze(['draft', 'published']);

export const BLOG_CATEGORIES = Object.freeze([
  'Landlord Services & Strategy',
  'Property Management Best Practices',
  'Tenant Experience & Support',
  'Market Intelligence & Insights',
  'Compliance & Legal Updates',
]);

export function generateSlug(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
