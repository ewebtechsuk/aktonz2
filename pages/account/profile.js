import { useState } from 'react';
import Head from 'next/head';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/Profile.module.css';

export default function Profile() {
  const [status, setStatus] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setStatus('Contact details updated');
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
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" placeholder="Ms" />

            <label htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" type="text" placeholder="Juliet" />

            <label htmlFor="surname">Surname</label>
            <input id="surname" name="surname" type="text" placeholder="Taphouse" />

            <label htmlFor="postcode">Postcode</label>
            <input id="postcode" name="postcode" type="text" placeholder="E2 8AA" />

            <label htmlFor="address">Address</label>
            <input id="address" name="address" type="text" placeholder="Flat 3, 14 Vyner Street" />

            <label htmlFor="mobilePhone">Mobile phone</label>
            <input id="mobilePhone" name="mobilePhone" type="tel" placeholder="07 000 000000" />

            <label htmlFor="homePhone">Home phone</label>
            <input id="homePhone" name="homePhone" type="tel" placeholder="020 0000 0000" />

            <label htmlFor="workPhone">Work phone</label>
            <input id="workPhone" name="workPhone" type="tel" placeholder="020 0000 0000" />

            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" placeholder="juliet@example.com" />

            <button type="submit" className={styles.button}>
              Update contact details
            </button>
          </form>
          {status ? <p className={styles.status}>{status}</p> : null}
        </section>
      </AccountLayout>
    </>
  );
}
