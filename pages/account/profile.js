import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';

import AccountLayout from '../../components/account/AccountLayout';
import { useSession } from '../../components/SessionProvider';
import styles from '../../styles/Profile.module.css';

const INITIAL_FORM = {
  title: '',
  firstName: '',
  surname: '',
  postcode: '',
  address: '',
  mobilePhone: '',
  homePhone: '',
  workPhone: '',
  email: '',
};

export default function Profile() {
  const { refresh } = useSession();
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/account/profile');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to load contact details');
      }
      const data = await res.json();
      const contact = data?.contact || {};
      const next = { ...INITIAL_FORM };
      for (const key of Object.keys(next)) {
        if (contact[key] != null) {
          next[key] = contact[key];
        }
      }
      setForm(next);
    } catch (err) {
      console.error('Failed to load contact details', err);
      setStatus(err instanceof Error ? err.message : 'Unable to load contact details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('Updating your details...');

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update contact details');
      }

      setStatus('Contact details updated');
      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after profile update', refreshError);
      }
    } catch (err) {
      console.error('Profile update failed', err);
      setStatus(err instanceof Error ? err.message : 'Failed to update contact details');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Update your contact details | Aktonz</title>
      </Head>
      <AccountLayout
        heroSubtitle="Account settings"
        heroTitle="Update your contact details"
        heroDescription="Keep your details up to date so your Aktonz team can reach you quickly with the latest updates."
        heroCta={{
          label: 'View saved searches',
          href: '/account/saved-searches',
        }}
      >
        <section className={styles.profileCard}>
          <h2 className={styles.heading}>Contact details</h2>
          {loading ? (
            <p className={styles.status}>Loading your profile…</p>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange} />

              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" type="text" value={form.firstName} onChange={handleChange} />

              <label htmlFor="surname">Surname</label>
              <input id="surname" name="surname" type="text" value={form.surname} onChange={handleChange} />

              <label htmlFor="postcode">Postcode</label>
              <input id="postcode" name="postcode" type="text" value={form.postcode} onChange={handleChange} />

              <label htmlFor="address">Address</label>
              <input id="address" name="address" type="text" value={form.address} onChange={handleChange} />

              <label htmlFor="mobilePhone">Mobile phone</label>
              <input id="mobilePhone" name="mobilePhone" type="tel" value={form.mobilePhone} onChange={handleChange} />

              <label htmlFor="homePhone">Home phone</label>
              <input id="homePhone" name="homePhone" type="tel" value={form.homePhone} onChange={handleChange} />

              <label htmlFor="workPhone">Work phone</label>
              <input id="workPhone" name="workPhone" type="tel" value={form.workPhone} onChange={handleChange} />

              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />

              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? 'Saving…' : 'Update contact details'}
              </button>
            </form>
          )}
          {status ? <p className={styles.status}>{status}</p> : null}
        </section>
      </AccountLayout>
    </>
  );
}
