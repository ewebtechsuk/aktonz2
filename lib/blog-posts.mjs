import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import {
  BLOG_CATEGORIES,
  BLOG_POST_STATUSES,
  generateSlug as sharedGenerateSlug,
} from './blog-posts-shared.js';

export { BLOG_CATEGORIES, BLOG_POST_STATUSES, generateSlug } from './blog-posts-shared.js';

const STORE_PATH = new URL('../data/blog-posts.json', import.meta.url);
const STATUS_DRAFT = BLOG_POST_STATUSES[0];
const STATUS_PUBLISHED = BLOG_POST_STATUSES[1];

function sanitizeString(value, { trim = true } = {}) {
  if (typeof value !== 'string') {
    return '';
  }
  return trim ? value.trim() : value;
}

function sanitizeUrl(value) {
  const url = sanitizeString(value);
  if (!url) {
    return '';
  }
  return url;
}

function sanitizeArrayOfStrings(value) {
  if (value == null) {
    return [];
  }
  const entries = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  const seen = new Set();
  entries.forEach((entry) => {
    const cleaned = sanitizeString(entry);
    if (cleaned) {
      seen.add(cleaned);
    }
  });
  return Array.from(seen);
}

function normaliseStatus(value) {
  const status = sanitizeString(value).toLowerCase();
  if (status === STATUS_PUBLISHED) {
    return STATUS_PUBLISHED;
  }
  return STATUS_DRAFT;
}

const slugify = sharedGenerateSlug;

function ensureSlug(slug, fallbackTitle, posts, currentId = null) {
  const existing = slugify(slug) || slugify(fallbackTitle) || `post-${randomUUID()}`;
  let candidate = existing;
  let suffix = 2;
  const taken = new Set(posts.map((post) => (post.id !== currentId ? post.slug : null)).filter(Boolean));
  while (taken.has(candidate)) {
    candidate = `${existing}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function readStore() {
  try {
    const file = await readFile(STORE_PATH, 'utf8');
    const data = JSON.parse(file);
    if (!Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.name === 'SyntaxError')) {
      return [];
    }
    throw error;
  }
}

async function writeStore(posts) {
  const payload = JSON.stringify(posts, null, 2);
  await writeFile(STORE_PATH, `${payload}\n`, 'utf8');
}

function normaliseDateInput(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    if (Number.isFinite(time)) {
      return value.toISOString();
    }
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normaliseCategory(value) {
  const category = sanitizeString(value);
  if (!category) {
    return BLOG_CATEGORIES[0];
  }
  if (BLOG_CATEGORIES.includes(category)) {
    return category;
  }
  return category;
}

function normalizePostPayload(payload = {}) {
  const title = sanitizeString(payload.title);
  const excerpt = sanitizeString(payload.excerpt);
  const content = sanitizeString(payload.content, { trim: false });
  const featuredImageUrl = sanitizeUrl(payload.featuredImageUrl);
  const author = sanitizeString(payload.author) || 'AKTONZ Team';
  const category = normaliseCategory(payload.category);
  const tags = sanitizeArrayOfStrings(payload.tags);
  const status = normaliseStatus(payload.status);
  const publishedDate = normaliseDateInput(payload.publishedDate);

  return {
    title,
    slug: slugify(payload.slug) || '',
    excerpt,
    content,
    featuredImageUrl,
    author,
    category,
    tags,
    publishedDate,
    status,
  };
}

function serialisePost(post) {
  return {
    ...post,
    tags: Array.isArray(post.tags) ? post.tags : [],
    publishedDate: post.publishedDate || null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function sortByPublishedDateDesc(a, b) {
  const aDate = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
  const bDate = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
  if (aDate === bDate) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  return bDate - aDate;
}

export async function listBlogPosts() {
  const posts = await readStore();
  const sorted = posts
    .map((post) => ({ ...post, tags: Array.isArray(post.tags) ? post.tags : [] }))
    .sort(sortByPublishedDateDesc);
  return sorted.map(serialisePost);
}

export async function listPublishedBlogPosts() {
  const posts = await listBlogPosts();
  return posts.filter((post) => post.status === STATUS_PUBLISHED);
}

export async function getBlogPostById(id) {
  const posts = await readStore();
  const post = posts.find((entry) => entry.id === id);
  return post ? serialisePost(post) : null;
}

export async function getBlogPostBySlug(slug) {
  const normalised = slugify(slug);
  if (!normalised) {
    return null;
  }
  const posts = await readStore();
  const post = posts.find((entry) => slugify(entry.slug) === normalised);
  return post ? serialisePost(post) : null;
}

export async function createBlogPost(payload = {}) {
  const posts = await readStore();
  const now = new Date().toISOString();
  const id = randomUUID();
  const data = normalizePostPayload(payload);
  const slug = ensureSlug(data.slug, data.title, posts);

  const newPost = {
    id,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    content: data.content,
    featuredImageUrl: data.featuredImageUrl,
    author: data.author,
    category: data.category,
    tags: data.tags,
    publishedDate: data.publishedDate,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  };

  posts.push(newPost);
  await writeStore(posts);
  return serialisePost(newPost);
}

export async function updateBlogPost(id, updates = {}) {
  if (!id) {
    throw new Error('Blog post id is required');
  }
  const posts = await readStore();
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return null;
  }
  const existing = posts[index];
  const data = normalizePostPayload({ ...existing, ...updates });
  const slug = ensureSlug(data.slug, data.title, posts, id);
  const updated = {
    ...existing,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    content: data.content,
    featuredImageUrl: data.featuredImageUrl,
    author: data.author,
    category: data.category,
    tags: data.tags,
    publishedDate: data.publishedDate,
    status: data.status,
    updatedAt: new Date().toISOString(),
  };
  posts[index] = updated;
  await writeStore(posts);
  return serialisePost(updated);
}

export async function deleteBlogPost(id) {
  if (!id) {
    throw new Error('Blog post id is required');
  }
  const posts = await readStore();
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return false;
  }
  posts.splice(index, 1);
  await writeStore(posts);
  return true;
}

export async function findRelatedPosts({ slug, category, tags, limit = 3 }) {
  const posts = await listPublishedBlogPosts();
  const filtered = posts.filter((post) => post.slug !== slug);
  const tagSet = new Set(tags || []);
  const scored = filtered.map((post) => {
    let score = 0;
    if (category && post.category === category) {
      score += 5;
    }
    if (tagSet.size > 0) {
      const overlap = post.tags.filter((tag) => tagSet.has(tag));
      score += overlap.length * 2;
    }
    score += new Date(post.publishedDate || post.createdAt).getTime() / 1_000_000_000_000;
    return { post, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.post);
}

export async function searchBlogPosts({ query, category, status, limit } = {}) {
  let posts = await listBlogPosts();
  if (status) {
    posts = posts.filter((post) => post.status === status);
  }
  if (category) {
    posts = posts.filter((post) => post.category === category);
  }
  const term = sanitizeString(query).toLowerCase();
  if (term) {
    posts = posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(term) ||
        (post.excerpt || '').toLowerCase().includes(term) ||
        post.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }
  if (typeof limit === 'number' && limit > 0) {
    posts = posts.slice(0, limit);
  }
  return posts;
}

export function buildCanonicalUrl(slug) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://aktonz.com';
  const trimmed = sanitizeString(base);
  const urlBase = trimmed ? trimmed.replace(/\/$/, '') : 'https://aktonz.com';
  return `${urlBase}/blog/${slug}`;
}

export function buildBlogIndexCanonical() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://aktonz.com';
  const trimmed = sanitizeString(base);
  const urlBase = trimmed ? trimmed.replace(/\/$/, '') : 'https://aktonz.com';
  return `${urlBase}/blog`;
}
