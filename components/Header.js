import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';
import { useSession } from './SessionProvider';

export default function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [landlordOpen, setLandlordOpen] = useState(false);
  const { user, loading: sessionLoading } = useSession();

  const isLoggedIn = Boolean(user) && !sessionLoading;
  const accountHref = user?.role === 'admin' ? '/admin' : '/account';
  const accountLabel = user?.role === 'admin' ? 'Go to admin dashboard' : 'Go to your account';

  const isPathActive = (href) => router.pathname === href;
  const isSectionActive = (href) =>
    router.pathname === href || router.pathname.startsWith(`${href}/`);
  const isSellActive = isSectionActive('/sell');
  const isLandlordsActive = isSectionActive('/landlords');

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => {
    setMenuOpen(false);
    setSellOpen(false);
    setLandlordOpen(false);
  };

  const sellMenu = (
    <div
      className={styles.dropdown}
      onMouseEnter={() => setSellOpen(true)}
      onMouseLeave={() => setSellOpen(false)}
    >
      <button
        type="button"
        className={`${styles.navLink} ${styles.navButton} ${
          isSellActive ? styles.active : ''
        }`}
        onClick={() => setSellOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={sellOpen}
        aria-current={isSellActive ? 'page' : undefined}
      >
        Sell
      </button>
      <div
        className={`${styles.dropdownMenu} ${styles.sellDropdownMenu} ${
          sellOpen ? styles.show : ''
        }`}
      >
        <Link href="/valuation" onClick={closeMenu}>
          Get a valuation
        </Link>
        <Link href="/sell" onClick={closeMenu}>
          Sell your home
        </Link>
        <Link href="/sell#auctions" onClick={closeMenu}>
          Auctions
        </Link>
        <Link
          href="/sell#seller-help"
          className={`${styles.arrow} ${styles.sellArrow}`}
          onClick={closeMenu}
        >
          Help for sellers
        </Link>
      </div>
    </div>
  );

  const landlordMenu = (
    <div
      className={styles.dropdown}
      onMouseEnter={() => setLandlordOpen(true)}
      onMouseLeave={() => setLandlordOpen(false)}
    >
      <button
        type="button"
        className={`${styles.navLink} ${styles.navButton} ${
          isLandlordsActive ? styles.active : ''
        }`}
        onClick={() => setLandlordOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={landlordOpen}
        aria-current={isLandlordsActive ? 'page' : undefined}
      >
        Landlords
      </button>
      <div
        className={`${styles.dropdownMenu} ${landlordOpen ? styles.show : ''}`}
      >
        <Link href="/valuation" onClick={closeMenu}>
          Get a valuation
        </Link>
        <Link href="/about" onClick={closeMenu}>
          Why use Aktonz
        </Link>
        <Link href="/property-management" onClick={closeMenu}>
          Property management
        </Link>
        <Link href="/landlords/rent-protection" onClick={closeMenu}>
          Rent protection
        </Link>
        <Link
          href="/landlords/help"
          className={styles.arrow}
          onClick={closeMenu}
        >
          Help for Landlords
        </Link>
        <Link href="/landlords/legal-compliance" onClick={closeMenu}>
          Legal & Compliance
        </Link>
      </div>
    </div>
  );

  const navLinks = (
    <>
      <Link
        href="/for-sale"
        className={`${styles.navLink} ${
          isPathActive('/for-sale') ? styles.active : ''
        }`}
        onClick={closeMenu}
        aria-current={isPathActive('/for-sale') ? 'page' : undefined}
      >
        Buy
      </Link>
      <Link
        href="/to-rent"
        className={`${styles.navLink} ${
          isPathActive('/to-rent') ? styles.active : ''
        }`}
        onClick={closeMenu}
        aria-current={isPathActive('/to-rent') ? 'page' : undefined}
      >
        Rent
      </Link>
      {sellMenu}
      {landlordMenu}
      <Link
        href="/about"
        className={`${styles.navLink} ${
          isPathActive('/about') ? styles.active : ''
        }`}
        onClick={closeMenu}
        aria-current={isPathActive('/about') ? 'page' : undefined}
      >
        About
      </Link>
      <Link
        href="/jobs"
        className={`${styles.navLink} ${
          isPathActive('/jobs') ? styles.active : ''
        }`}
        onClick={closeMenu}
        aria-current={isPathActive('/jobs') ? 'page' : undefined}
      >
        Careers
      </Link>
      <Link
        href="/contact"
        className={`${styles.navLink} ${
          isPathActive('/contact') ? styles.active : ''
        }`}
        onClick={closeMenu}
        aria-current={isPathActive('/contact') ? 'page' : undefined}
      >
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
      {isLoggedIn ? (
        <Link
          href={accountHref}
          className={`${styles.login} ${styles.accountLink}`}
          onClick={closeMenu}
          aria-label={accountLabel}
        >
          <span className={styles.accountIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path
                d="M12 12.75a5.25 5.25 0 1 0-5.25-5.25A5.25 5.25 0 0 0 12 12.75Zm0-1.5a3.75 3.75 0 1 1 3.75-3.75A3.75 3.75 0 0 1 12 11.25Zm0 2.25A8.25 8.25 0 0 0 3.75 21h1.5a6.75 6.75 0 0 1 13.5 0h1.5A8.25 8.25 0 0 0 12 13.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className={styles.accountText}>
            {user?.firstName || user?.name || 'My account'}
          </span>
        </Link>
      ) : (
        <Link href="/login" className={styles.login} onClick={closeMenu}>
          Login
        </Link>
      )}
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">
            <img src="/aktonz-logo-modern-transparent.png" alt="Aktonz logo" />
          </Link>
        </div>

        <nav className={styles.nav}>{navLinks}</nav>

        <div className={styles.actions}>
          {actionLinks}
          <button
            type="button"
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
