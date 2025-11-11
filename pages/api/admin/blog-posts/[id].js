import {
  deleteBlogPost,
  getBlogPostById,
  updateBlogPost,
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

function normaliseId(value) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return typeof value === 'string' ? value : '';
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  const id = normaliseId(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Blog post id is required' });
    return;
  }

  if (req.method === 'HEAD') {
    const post = await getBlogPostById(id);
    if (!post) {
      res.status(404).end();
      return;
    }
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const post = await getBlogPostById(id);
    if (!post) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }
    res.status(200).json({ post });
    return;
  }

  if (req.method === 'PUT') {
    try {
      const payload = req.body || {};
      const post = await updateBlogPost(id, payload);
      if (!post) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }
      res.status(200).json({ post });
    } catch (error) {
      console.error(`Failed to update blog post ${id}`, error);
      res.status(400).json({ error: error?.message || 'Unable to update blog post' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const success = await deleteBlogPost(id);
      if (!success) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      console.error(`Failed to delete blog post ${id}`, error);
      res.status(500).json({ error: 'Unable to delete blog post' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'HEAD', 'PUT', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
