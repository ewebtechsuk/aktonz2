import { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      <Link href="/for-sale" className={styles.navLink} onClick={closeMenu}>
        Buy
      </Link>
      <Link href="/to-rent" className={styles.navLink} onClick={closeMenu}>
        Rent
      </Link>
      <Link href="/landlords" className={styles.navLink} onClick={closeMenu}>
        Landlords
      </Link>
      <Link href="/sell" className={styles.navLink} onClick={closeMenu}>
        Sell
      </Link>
      <Link href="/discover" className={styles.navLink} onClick={closeMenu}>
        Discover
      </Link>
      <Link href="/contact" className={styles.navLink} onClick={closeMenu}>
        Contact
      </Link>
    </>
  );

  const actionLinks = (
    <>
      <Link
        href="/valuation"
        className={styles.cta}
        onClick={closeMenu}
      >
        Get a valuation
      </Link>
      <Link href="/login" className={styles.login} onClick={closeMenu}>
        Login
      </Link>
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">Aktonz</Link>
        </div>

        <nav className={styles.nav}>{navLinks}</nav>

        <div className={styles.actions}>
          {actionLinks}
          <button
            className={styles.hamburger}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <nav
        className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}
      >
        {navLinks}
        {actionLinks}
      </nav>
    </header>
  );
}

