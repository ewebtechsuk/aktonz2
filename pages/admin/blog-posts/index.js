import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import { withBasePath } from '../../../lib/base-path.js';
import { BLOG_CATEGORIES, BLOG_POST_STATUSES, generateSlug } from '../../../lib/blog-posts-shared.js';
import styles from '../../../styles/AdminBlogPosts.module.css';

const DEFAULT_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featuredImageUrl: '',
  author: 'AKTONZ Team',
  category: BLOG_CATEGORIES[0],
  tagsInput: '',
  status: 'draft',
  publishedDate: '',
  updatedAt: '',
};

function toLocalInput(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseTags(value) {
  if (!value) {
    return [];
  }
  const parts = value.split(/[\n,]/);
  const set = new Set();
  parts.forEach((part) => {
    const cleaned = part.trim();
    if (cleaned) {
      set.add(cleaned);
    }
  });
  return Array.from(set);
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function RichTextEditor({ value, onChange }) {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef(null);

  const handleCommand = useCallback((command) => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false);
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== (value || '')) {
      editor.innerHTML = value || '<p></p>';
    }
  }, [value]);

  return (
    <div className={styles.richTextWrapper}>
      <div className={styles.richTextToolbar} role="toolbar" aria-label="Rich text formatting">
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleCommand('bold')}
        >
          Bold
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleCommand('italic')}
        >
          Italic
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleCommand('insertUnorderedList')}
        >
          Bullet list
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleCommand('insertOrderedList')}
        >
          Numbered list
        </button>
      </div>
      <div
        className={styles.richTextEditor}
        contentEditable
        suppressContentEditableWarning
        ref={editorRef}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          setIsFocused(false);
          onChange(event.currentTarget.innerHTML);
        }}
        aria-label="Blog post content"
      />
      {!isFocused ? (
        <p className={styles.formMeta}>Use the toolbar or paste formatted content. HTML is stored server-side.</p>
      ) : null}
    </div>
  );
}

export default function AdminBlogPostsPage() {
  const { user, loading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Blog posts';

  const [posts, setPosts] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM }));
  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    setTableLoading(true);
    setError('');
    try {
      const res = await fetch(withBasePath('/api/admin/blog-posts'));
      if (!res.ok) {
        throw new Error('Unable to load blog posts');
      }
      const data = await res.json();
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load blog posts');
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPosts();
    }
  }, [isAdmin, loadPosts]);

  const handleCreateNew = () => {
    setFormData({ ...DEFAULT_FORM });
    setEditingId(null);
    setSlugTouched(false);
    setFormVisible(true);
    setSuccess('');
    setError('');
  };

  const handleEdit = (post) => {
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featuredImageUrl: post.featuredImageUrl || '',
      author: post.author || 'AKTONZ Team',
      category: post.category || BLOG_CATEGORIES[0],
      tagsInput: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      status: post.status || 'draft',
      publishedDate: toLocalInput(post.publishedDate),
      updatedAt: post.updatedAt || '',
    });
    setEditingId(post.id);
    setSlugTouched(true);
    setFormVisible(true);
    setSuccess('');
    setError('');
  };

  const handleDelete = async (post) => {
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`Delete “${post.title}”?`);
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(withBasePath(`/api/admin/blog-posts/${post.id}`), {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        throw new Error('Failed to delete blog post');
      }
      setSuccess('Blog post deleted');
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blog post');
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !slugTouched) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleSlugChange = (value) => {
    setSlugTouched(true);
    updateField('slug', generateSlug(value));
  };

  const handleTagsChange = (value) => {
    updateField('tagsInput', value);
  };

  const resetForm = () => {
    setFormVisible(false);
    setFormData({ ...DEFAULT_FORM });
    setEditingId(null);
    setSlugTouched(false);
  };

  const handleSave = async (statusOverride = null) => {
    setSaving(true);
    setError('');
    setSuccess('');

    const statusToSend = statusOverride || formData.status || 'draft';
    let publishedDate = formData.publishedDate;
    if (statusToSend === 'published' && !publishedDate) {
      publishedDate = new Date().toISOString();
    } else if (publishedDate) {
      publishedDate = toIsoString(publishedDate);
    }

    const payload = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content: formData.content,
      featuredImageUrl: formData.featuredImageUrl,
      author: formData.author,
      category: formData.category,
      tags: parseTags(formData.tagsInput),
      status: statusToSend,
      publishedDate,
    };

    try {
      const url = editingId ? `/api/admin/blog-posts/${editingId}` : '/api/admin/blog-posts';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(withBasePath(url), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        throw new Error(errorPayload?.error || 'Failed to save blog post');
      }

      const data = await res.json();
      const post = data?.post;
      if (post) {
        setSuccess(editingId ? 'Blog post updated' : 'Blog post created');
        await loadPosts();
        setFormData({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          featuredImageUrl: post.featuredImageUrl || '',
          author: post.author || 'AKTONZ Team',
          category: post.category || BLOG_CATEGORIES[0],
          tagsInput: Array.isArray(post.tags) ? post.tags.join(', ') : '',
          status: post.status || 'draft',
          publishedDate: toLocalInput(post.publishedDate),
          updatedAt: post.updatedAt || '',
        });
        setEditingId(post.id);
        setSlugTouched(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = (status) => {
    const isDraft = status !== 'published';
    return (
      <span
        className={`${styles.statusBadge} ${isDraft ? styles.statusDraft : ''}`}
      >
        {isDraft ? 'Draft' : 'Published'}
      </span>
    );
  };

  const postsTable = useMemo(() => {
    if (tableLoading) {
      return <div className={styles.emptyState}>Loading posts…</div>;
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return <div className={styles.emptyState}>No posts yet. Create your first article to populate the blog.</div>;
    }

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Published</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <strong>{post.title}</strong>
                  <div className={styles.formMeta}>{post.slug}</div>
                </td>
                <td>{post.category}</td>
                <td>{formatDateTime(post.publishedDate)}</td>
                <td>{renderStatusBadge(post.status)}</td>
                <td>
                  <div className={styles.tableActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => handleEdit(post)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDelete(post)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [posts, tableLoading, handleEdit, handleDelete]);

  const renderForm = () => {
    if (!formVisible) {
      return null;
    }

    return (
      <section className={styles.formPanel} aria-label="Blog post editor">
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="blog-title">Title</label>
            <input
              id="blog-title"
              type="text"
              value={formData.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Headline for the article"
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="blog-slug">Slug</label>
            <input
              id="blog-slug"
              type="text"
              value={formData.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="auto-generated-from-title"
            />
            <span className={styles.formMeta}>Used in the public URL (https://aktonz.com/blog/slug).</span>
          </div>
          <div className={styles.formField}>
            <label htmlFor="blog-category">Category</label>
            <select
              id="blog-category"
              value={formData.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              {BLOG_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor="blog-status">Status</label>
            <select
              id="blog-status"
              value={formData.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {BLOG_POST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor="blog-author">Author</label>
            <input
              id="blog-author"
              type="text"
              value={formData.author}
              onChange={(event) => updateField('author', event.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="blog-published">Published date</label>
            <input
              id="blog-published"
              type="datetime-local"
              value={formData.publishedDate}
              onChange={(event) => updateField('publishedDate', event.target.value)}
            />
            <span className={styles.formMeta}>Set when the article should appear publicly.</span>
          </div>
        </div>

        <div className={styles.formField}>
          <label htmlFor="blog-excerpt">Excerpt</label>
          <textarea
            id="blog-excerpt"
            value={formData.excerpt}
            onChange={(event) => updateField('excerpt', event.target.value)}
            placeholder="One-paragraph summary for cards and meta description"
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="blog-featured">Featured image URL</label>
          <input
            id="blog-featured"
            type="url"
            value={formData.featuredImageUrl}
            onChange={(event) => updateField('featuredImageUrl', event.target.value)}
            placeholder="https://…"
          />
          <span className={styles.formMeta}>Paste an image link or upload through your media library and paste the URL.</span>
        </div>

        <div className={styles.formField}>
          <label htmlFor="blog-tags">Tags</label>
          <input
            id="blog-tags"
            type="text"
            value={formData.tagsInput}
            onChange={(event) => handleTagsChange(event.target.value)}
            placeholder="Comma separated tags"
          />
        </div>

        <div className={styles.formField}>
          <label>Content</label>
          <RichTextEditor
            value={formData.content}
            onChange={(value) => updateField('content', value)}
          />
        </div>

        <div className={styles.formFooter}>
          <span className={styles.formMeta}>
            {editingId
              ? `Last updated ${formatDateTime(formData.updatedAt)} · Status: ${
                  formData.status === 'published' ? 'Published' : 'Draft'
                }`
              : 'Create a new blog post'}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => resetForm()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={saving}
            onClick={() => handleSave('draft')}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving}
            onClick={() => handleSave('published')}
          >
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </section>
    );
  };

  const renderPage = () => {
    if (loading) {
      return <div className={styles.emptyState}>Loading session…</div>;
    }

    if (!isAdmin) {
      return <div className={styles.emptyState}>You need admin access to manage blog posts.</div>;
    }

    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1>Blog posts</h1>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={handleCreateNew}>
                Add new blog post
              </button>
              <button type="button" className={styles.secondaryButton} onClick={loadPosts}>
                Refresh list
              </button>
            </div>
          </div>
          <p className={styles.formMeta}>
            Draft, schedule, and publish content for the AKTONZ Landlord Insights hub. Changes sync instantly with the website.
          </p>
        </div>

        {error ? (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className={styles.successMessage} role="status">
            {success}
          </div>
        ) : null}

        {postsTable}
        {renderForm()}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main>{renderPage()}</main>
    </>
  );
}
