import { useState } from 'react';
import styles from '../styles/OfferDrawer.module.css';

export default function OfferDrawer({ propertyTitle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.offerButton} onClick={() => setOpen(true)}>
        Make an offer
      </button>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)}></div>}
      <aside className={`${styles.drawer} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>Make an offer</h2>
          <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
            &times;
          </button>
        </div>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <p className={styles.address}>{propertyTitle}</p>
          <label>
            Offer price
            <input type="number" name="price" />
          </label>
          <label>
            Frequency
            <select name="frequency">
              <option value="pw">Per week</option>
              <option value="pcm">Per month</option>
            </select>
          </label>
          <button type="submit" className={styles.submit}>
            Make an offer
          </button>
        </form>
      </aside>
    </>
  );
}
