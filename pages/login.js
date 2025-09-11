import styles from '../styles/Home.module.css';

export default function Login() {
  return (
    <main className={styles.main}>
      <h1>Login</h1>
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}
