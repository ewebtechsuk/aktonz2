import { useState } from 'react';
import styles from '../styles/ViewingForm.module.css';

export default function ViewingForm({ propertyTitle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.viewingButton} onClick={() => setOpen(true)}>
        Book a viewing
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}></div>
      )}
      {open && (
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Book a viewing</h2>
            <button
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <p className={styles.address}>{propertyTitle}</p>
            <label>
              Name
              <input type="text" name="name" />
            </label>
            <label>
              Email
              <input type="email" name="email" />
            </label>
            <label>
              Phone
              <input type="tel" name="phone" />
            </label>
            <label>
              Preferred Date
              <input type="date" name="date" />
            </label>
            <label>
              Preferred Time
              <input type="time" name="time" />
            </label>
            <button type="submit" className={styles.submit}>
              Request viewing
            </button>
          </form>
        </div>
      )}
    </>
  );
}

