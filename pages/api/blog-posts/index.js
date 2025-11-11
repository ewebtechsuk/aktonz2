import {
  BLOG_CATEGORIES,
  listPublishedBlogPosts,
} from '../../../lib/blog-posts.mjs';

function normaliseValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return typeof value === 'string' ? value : '';
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const category = normaliseValue(req.query.category);
    const status = normaliseValue(req.query.status) || 'published';
    const sort = normaliseValue(req.query.sort) || 'publishedDate_desc';
    const limitValue = normaliseValue(req.query.limit);
    const limit = Number.parseInt(limitValue, 10);

    let posts = await listPublishedBlogPosts();

    if (category) {
      posts = posts.filter((post) => post.category === category);
    }

    if (status !== 'published') {
      posts = posts.filter((post) => post.status === 'published');
    }

    if (sort === 'publishedDate_asc') {
      posts = posts.slice().reverse();
    }

    if (Number.isFinite(limit) && limit > 0) {
      posts = posts.slice(0, limit);
    }

    const payload = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImageUrl: post.featuredImageUrl,
      publishedDate: post.publishedDate,
      category: post.category,
      author: post.author,
      tags: post.tags,
    }));

    res.status(200).json({
      posts: payload,
      meta: {
        total: payload.length,
        categories: BLOG_CATEGORIES,
      },
      filters: {
        category,
        status: 'published',
        sort,
      },
    });
  } catch (error) {
    console.error('Failed to load blog posts feed', error);
    res.status(500).json({ error: 'Failed to load blog posts' });
  }
}
