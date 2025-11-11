import Head from 'next/head';
import Link from 'next/link';

import { buildCanonicalUrl, findRelatedPosts, getBlogPostBySlug } from '../../lib/blog-posts.mjs';
import styles from '../../styles/BlogPost.module.css';

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildShareLinks({ title, url }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];
}

export default function BlogPostPage({ post, related = [] }) {
  const shareLinks = buildShareLinks({ title: post.title, url: post.canonicalUrl });
  const metaDescription = post.excerpt || 'AKTONZ Landlord Insights';

  return (
    <div className={styles.page}>
      <Head>
        <title>{post.title} — AKTONZ Blog</title>
        <link rel="canonical" href={post.canonicalUrl} />
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={post.canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publishedDate || post.createdAt} />
        {post.featuredImageUrl ? <meta property="og:image" content={post.featuredImageUrl} /> : null}
      </Head>

      <article className={styles.container}>
        <div className={styles.heroImageWrapper}>
          <img src={post.featuredImageUrl || '/images/blog-placeholder.svg'} alt={post.title} />
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            {post.category} · {formatDate(post.publishedDate)} · {post.author}
          </div>
          <h1 className={styles.title}>{post.title}</h1>
          {post.excerpt ? <p className={styles.subtitle}>{post.excerpt}</p> : null}
          <div className={styles.content} dangerouslySetInnerHTML={{ __html: post.content }} />

          <div className={styles.ctaBox}>
            <h2>Interested in how AKTONZ can help you?</h2>
            <p>
              Speak with our landlord services team to unlock tailored property management, compliance support, and portfolio growth strategies.
            </p>
            <Link className={styles.ctaButton} href="/contact">
              Talk to our team
            </Link>
          </div>

          <div className={styles.shareBar}>
            <span className={styles.shareLabel}>Share</span>
            {shareLinks.map((link) => (
              <a
                key={link.label}
                className={styles.shareButton}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>

          {related.length > 0 ? (
            <section className={styles.related} aria-label="Related posts">
              <h2 className={styles.relatedHeading}>Related posts</h2>
              <div className={styles.relatedGrid}>
                {related.map((item) => (
                  <div key={item.id} className={styles.relatedCard}>
                    <div className={styles.meta}>{formatDate(item.publishedDate)}</div>
                    <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                    <p>{item.excerpt}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const slug = params?.slug;
  const post = await getBlogPostBySlug(slug);

  if (!post || post.status !== 'published') {
    return { notFound: true };
  }

  const canonicalUrl = buildCanonicalUrl(post.slug);
  const related = await findRelatedPosts({
    slug: post.slug,
    category: post.category,
    tags: post.tags,
    limit: 3,
  });

  return {
    props: {
      post: {
        ...post,
        canonicalUrl,
      },
      related,
    },
  };
}
