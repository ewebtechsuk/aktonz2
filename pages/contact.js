import styles from '../styles/Home.module.css';

export default function Contact() {
  return (
    <main className={styles.main}>
      <h1>Contact Us</h1>
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" placeholder="Your name" />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
        <label htmlFor="message">Message</label>
        <textarea id="message" rows="4" placeholder="How can we help?" />
        <button type="submit">Send Message</button>
      </form>
    </main>
  );
}
