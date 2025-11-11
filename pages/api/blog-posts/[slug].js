import {
  buildCanonicalUrl,
  findRelatedPosts,
  getBlogPostBySlug,
} from '../../../lib/blog-posts.mjs';

function normaliseSlug(value) {
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

  const slug = normaliseSlug(req.query.slug);
  if (!slug) {
    res.status(400).json({ error: 'Slug is required' });
    return;
  }

  try {
    const post = await getBlogPostBySlug(slug);

    if (!post || post.status !== 'published') {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    const related = await findRelatedPosts({
      slug: post.slug,
      category: post.category,
      tags: post.tags,
      limit: 3,
    });

    res.status(200).json({
      post: {
        ...post,
        canonicalUrl: buildCanonicalUrl(post.slug),
      },
      related,
    });
  } catch (error) {
    console.error(`Failed to load blog post ${slug}`, error);
    res.status(500).json({ error: 'Failed to load blog post' });
  }
}
