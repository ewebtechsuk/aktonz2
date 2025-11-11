import {
  BLOG_CATEGORIES,
  BLOG_POST_STATUSES,
  createBlogPost,
  searchBlogPosts,
} from '../../../../lib/blog-posts.mjs';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import { readSession } from '../../../../lib/session.js';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function normaliseQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return typeof value === 'string' ? value : '';
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const query = normaliseQueryValue(req.query.q);
      const category = normaliseQueryValue(req.query.category);
      const status = normaliseQueryValue(req.query.status);
      const limitValue = normaliseQueryValue(req.query.limit);
      const limit = Number.parseInt(limitValue, 10);

      const posts = await searchBlogPosts({
        query,
        category: category || undefined,
        status: status || undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      });

      res.status(200).json({
        posts,
        meta: {
          total: posts.length,
          categories: BLOG_CATEGORIES,
          statuses: BLOG_POST_STATUSES,
        },
        filters: {
          query,
          category,
          status,
        },
      });
    } catch (error) {
      console.error('Failed to list blog posts', error);
      res.status(500).json({ error: 'Failed to list blog posts' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const post = await createBlogPost(payload);
      res.status(201).json({ post });
    } catch (error) {
      console.error('Failed to create blog post', error);
      res.status(400).json({ error: error?.message || 'Unable to create blog post' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'HEAD', 'POST']);
  res.status(405).end('Method Not Allowed');
}
