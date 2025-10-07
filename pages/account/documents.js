import { useEffect, useMemo, useState } from 'react';

import AccountLayout from '../../components/account/AccountLayout';
import { useSession } from '../../components/SessionProvider';
import styles from '../../styles/AccountDocuments.module.css';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select a category' },
  { value: 'tenancy', label: 'Tenancy' },
  { value: 'sale', label: 'Sale' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
];

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function AccountDocumentsPage() {
  const { loading: sessionLoading } = useSession();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDocuments() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/account/documents', { credentials: 'include' });
        if (cancelled) return;
        if (response.status === 401) {
          setRequiresAuth(true);
          setDocuments([]);
          setError('Sign in to manage your tenancy documents.');
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load documents');
        }
        const payload = await response.json();
        if (cancelled) return;
        const items = Array.isArray(payload?.documents) ? payload.documents : [];
        setDocuments(items);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load documents', err);
        setError('We could not load your documents. Please try again.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDocuments = documents.length > 0;
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b?.uploadedAt || 0) - new Date(a?.uploadedAt || 0));
  }, [documents]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setFeedback('');
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (requiresAuth) {
      setFeedback('Please sign in to upload documents.');
      return;
    }
    if (!file) {
      setFeedback('Choose a file to upload.');
      return;
    }

    setUploading(true);
    setFeedback('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch('/api/account/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          data: dataUrl,
          category,
          note,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to upload document');
      }
      if (payload?.document) {
        setDocuments((prev) => [payload.document, ...prev.filter((doc) => doc.id !== payload.document.id)]);
        setFeedback('Document uploaded successfully.');
        setFile(null);
        setCategory('');
        setNote('');
      }
    } catch (err) {
      console.error('Document upload failed', err);
      setFeedback(err instanceof Error ? err.message : 'Unable to upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    setDeletingId(id);
    setFeedback('');
    try {
      const response = await fetch(`/api/account/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete document');
      }
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error('Failed to delete document', err);
      setFeedback(err instanceof Error ? err.message : 'Unable to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AccountLayout
      heroSubtitle="My documents"
      heroTitle="Tenancy & sale documents"
      heroDescription="Securely share identity, compliance and contractual documents with the Aktonz team."
    >
      {requiresAuth ? (
        <div className={styles.feedback} role="alert">
          Please sign in to upload or download your documents.
        </div>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Upload documents</h2>
            <p>Accepted formats include PDF, JPEG and PNG with a maximum size of 10MB.</p>
          </div>
        </div>
        <form className={styles.uploadForm} onSubmit={handleUpload}>
          <div className={styles.uploadRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="document-file">Select file</label>
              <input
                id="document-file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {file ? (
                <span className={styles.fileHint}>
                  {file.name} • {formatFileSize(file.size)}
                </span>
              ) : null}
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="document-category">Category</label>
              <select
                id="document-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="document-note">Notes</label>
            <textarea
              id="document-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Add any context for the team (optional)"
            />
          </div>
          {feedback ? (
            <p className={styles.feedback} role="alert">
              {feedback}
            </p>
          ) : null}
          <button type="submit" className={styles.submitButton} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Stored documents</h2>
            <p>Download or remove documents you no longer need.</p>
          </div>
        </div>
        <div className={styles.listingCard}>
          {loading && !hasDocuments ? (
            <p className={styles.placeholder}>Loading your documents…</p>
          ) : null}
          {error ? <p className={styles.feedback}>{error}</p> : null}
          {!loading && !hasDocuments && !error ? (
            <p className={styles.placeholder}>No documents uploaded yet. Use the form above to add your first file.</p>
          ) : null}
          <ul className={styles.documentList}>
            {sortedDocuments.map((doc) => (
              <li key={doc.id} className={styles.documentCard}>
                <div className={styles.documentHeader}>
                  <div>
                    <h3>{doc.fileName}</h3>
                    <p className={styles.documentMeta}>
                      {formatFileSize(doc.size)} · {doc.mimeType || 'Unknown type'}
                    </p>
                    <p className={styles.documentMeta}>Uploaded {formatDate(doc.uploadedAt) || '—'}</p>
                    {doc.category ? <span className={styles.badge}>{doc.category}</span> : null}
                    {doc.note ? <p className={styles.documentNote}>{doc.note}</p> : null}
                  </div>
                  <div className={styles.documentActions}>
                    <a
                      href={`/api/account/documents/${doc.id}`}
                      className={styles.actionButton}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? 'Removing…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {sessionLoading && !hasDocuments ? (
        <p className={styles.placeholder}>Checking your account…</p>
      ) : null}
    </AccountLayout>
  );
}
