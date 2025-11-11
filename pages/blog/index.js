import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BLOG_CATEGORIES } from '../../lib/blog-posts-shared.js';
import { buildBlogIndexCanonical, listPublishedBlogPosts } from '../../lib/blog-posts.mjs';
import styles from '../../styles/Blog.module.css';

const CATEGORY_ALL = 'All';

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

function FeaturedCard({ post }) {
  return (
    <article className={styles.featuredCard}>
      <div className={styles.featuredImageWrapper}>
        <img
          src={post.featuredImageUrl || '/images/blog-placeholder.svg'}
          alt={post.title}
          loading="lazy"
        />
      </div>
      <div className={styles.featuredContent}>
        <span className={styles.cardMeta}>
          {post.category} · {formatDate(post.publishedDate)}
        </span>
        <h3 className={styles.cardTitle}>{post.title}</h3>
        <p className={styles.cardExcerpt}>{post.excerpt}</p>
        <Link className={styles.readMoreLink} href={`/blog/${post.slug}`}>
          Read more →
        </Link>
      </div>
    </article>
  );
}

function PostCard({ post }) {
  return (
    <article className={styles.postCard}>
      <div className={styles.postImageWrapper}>
        <img
          src={post.featuredImageUrl || '/images/blog-placeholder.svg'}
          alt={post.title}
          loading="lazy"
        />
      </div>
      <div className={styles.postBody}>
        <span className={styles.cardMeta}>{formatDate(post.publishedDate)}</span>
        <h4 className={styles.cardTitle}>{post.title}</h4>
        <p className={styles.cardExcerpt}>{post.excerpt}</p>
        <Link className={styles.readMoreLink} href={`/blog/${post.slug}`}>
          Read more →
        </Link>
      </div>
    </article>
  );
}

export default function BlogIndexPage({ posts, categories, canonicalUrl, tags, popularPosts }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ALL);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return posts.filter((post) => {
      if (activeCategory !== CATEGORY_ALL && post.category !== activeCategory) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [post.title, post.excerpt, ...(post.tags || [])].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [posts, activeCategory, searchTerm]);

  const featuredPosts = filteredPosts.slice(0, 3);
  const remainingPosts = filteredPosts.slice(3);

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (typeof window !== 'undefined') {
      window.alert('Thanks for subscribing! We will keep you posted with the latest AKTONZ landlord insights.');
    }
    form.reset();
  };

  const metaDescription = featuredPosts[0]?.excerpt ||
    'AKTONZ shares landlord strategies, property management best practices, and tenant experience insights for modern portfolios.';

  return (
    <div className={styles.page}>
      <Head>
        <title>AKTONZ Landlord Insights &amp; Services</title>
        <link rel="canonical" href={canonicalUrl} />
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content="AKTONZ Landlord Insights & Services" />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {featuredPosts[0]?.featuredImageUrl ? (
          <meta property="og:image" content={featuredPosts[0].featuredImageUrl} />
        ) : null}
      </Head>

      <div className={styles.container}>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>AKTONZ Landlord Insights &amp; Services</h1>
          <p className={styles.heroSubtitle}>
            Strategic guidance for landlords scaling professionally managed portfolios, curated by the AKTONZ team.
          </p>
        </header>

        <div className={styles.contentLayout}>
          <section>
            <nav className={styles.categoryNav} aria-label="Blog categories">
              {[CATEGORY_ALL, ...categories].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={styles.categoryButton}
                  data-active={activeCategory === category ? 'true' : undefined}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </nav>

            {filteredPosts.length === 0 ? (
              <div className={styles.emptyState}>
                No posts match your filters yet. Try another category or search term.
              </div>
            ) : (
              <>
                <section className={styles.featuredSection} aria-label="Featured posts">
                  {featuredPosts.map((post) => (
                    <FeaturedCard key={post.id} post={post} />
                  ))}
                </section>

                {remainingPosts.length > 0 ? (
                  <section className={styles.postsGrid} aria-label="All posts">
                    {remainingPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </section>
                ) : null}
              </>
            )}
          </section>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <h2 className={styles.sidebarTitle}>Search</h2>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search articles"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className={styles.sidebarCard}>
              <h2 className={styles.sidebarTitle}>Tags</h2>
              <div className={styles.tagList}>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={styles.tagPill}
                    onClick={() => setSearchTerm(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.sidebarCard}>
              <h2 className={styles.sidebarTitle}>Popular posts</h2>
              <div className={styles.popularList}>
                {popularPosts.map((post) => (
                  <div key={post.id} className={styles.popularItem}>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    <div className={styles.cardMeta}>{formatDate(post.publishedDate)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.sidebarCard}>
              <h2 className={styles.sidebarTitle}>Stay in the loop</h2>
              <p className={styles.cardExcerpt}>
                Subscribe for quarterly insights on landlord strategy, compliance, and tenant experience.
              </p>
              <form className={styles.newsletterForm} onSubmit={handleNewsletterSubmit}>
                <input className={styles.newsletterInput} type="email" name="email" placeholder="you@example.com" required />
                <button className={styles.newsletterButton} type="submit">
                  Subscribe
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const posts = await listPublishedBlogPosts();
  const canonicalUrl = buildBlogIndexCanonical();
  const categories = BLOG_CATEGORIES;
  const tagSet = new Set();
  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      if (tag) {
        tagSet.add(tag);
      }
    });
  });
  const tags = Array.from(tagSet).sort();
  const popularPosts = posts.slice(0, 3);

  return {
    props: {
      posts,
      categories,
      canonicalUrl,
      tags,
      popularPosts,
    },
  };
}
