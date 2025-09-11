import styles from '../styles/Home.module.css';
import contactStyles from '../styles/Contact.module.css';

export default function Contact() {
  return (
    <main className={styles.main}>
      <div className={contactStyles.container}>
        <h1>Contact Us</h1>
        <form className={contactStyles.form}>
          <div className={contactStyles.field}>
            <label htmlFor="name">Name</label>
            <input id="name" type="text" placeholder="Your name" required />
          </div>
          <div className={contactStyles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className={contactStyles.field}>
            <label htmlFor="message">Message</label>
            <textarea id="message" rows="4" placeholder="How can we help?" required />
          </div>
          <button className={contactStyles.button} type="submit">Send Message</button>
        </form>
      </div>
    </main>
  );
}
