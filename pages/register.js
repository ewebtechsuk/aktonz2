import Link from 'next/link';
import styles from '../styles/Register.module.css';

export default function Register() {
  return (
    <div className={styles.container}>
      <div className={styles.brandSection}>
        <h1>Aktonz</h1>
        <p>Insight. Information. Control. Wherever you are.</p>
        <p className={styles.subtitle}>Stay on top of what's happening with your property.</p>
      </div>
      <div className={styles.formSection}>
        <Link href="/">← Back</Link>
        <h2>Create an account</h2>
        <form>
          <label htmlFor="email">Email address *</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password *</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required />
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          <button type="submit" className={styles.button}>Register</button>
        </form>
        <p className={styles.signIn}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
        <p className={styles.legal}>
          By registering you agree to our <Link href="#">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
