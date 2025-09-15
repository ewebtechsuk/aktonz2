import { useState } from 'react';
import Head from 'next/head';
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
      <main className={styles.main}>
        <h1 className={styles.heading}>Update your contact details</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" type="text" />

          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" type="text" />

          <label htmlFor="surname">Surname</label>
          <input id="surname" name="surname" type="text" />

          <label htmlFor="postcode">Postcode</label>
          <input id="postcode" name="postcode" type="text" />

          <label htmlFor="address">Address</label>
          <input id="address" name="address" type="text" />

          <label htmlFor="mobilePhone">Mobile phone</label>
          <input id="mobilePhone" name="mobilePhone" type="tel" />

          <label htmlFor="homePhone">Home phone</label>
          <input id="homePhone" name="homePhone" type="tel" />

          <label htmlFor="workPhone">Work phone</label>
          <input id="workPhone" name="workPhone" type="tel" />

          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" />

          <button type="submit" className={styles.button}>Update contact details</button>
        </form>
        {status && <p className={styles.status}>{status}</p>}
      </main>
    </>
  );
}

