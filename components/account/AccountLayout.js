import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import styles from '../../styles/AccountLayout.module.css';
import { useSession } from '../SessionProvider';

const PRIMARY_NAV_ITEMS = [
  {
    label: 'My Aktonz',
    href: '/account',
  },
  {
    label: 'My lettings search',
    href: '/account',
    match: (pathname) => pathname.startsWith('/account'),
  },
  {
    label: 'My sales search',
    disabled: true,
  },
  {
    label: 'Lettings',
    href: '/to-rent',
  },
  {
    label: 'Selling',
    href: '/sell',
  },
];

export const DEFAULT_ACCOUNT_TABS = [
  {
    label: 'Overview',
    href: '/account',
  },
  {
    label: 'My profile',
    href: '/account/profile',
  },
  {
    label: 'Saved searches',
    href: '/account/saved-searches',
  },
  {
    label: 'Favourites',
    href: '/account/favourites',
  },
  {
    label: 'Offers & viewings',
    href: '/account/offers',
  },
  {
    label: 'Documents',
    href: '/account/documents',
  },
];

export default function AccountLayout({
  heroSubtitle,
  heroTitle,
  heroDescription,
  heroCta,
  tabs = DEFAULT_ACCOUNT_TABS,
  children,
}) {
  const router = useRouter();
  const { user, email, loading, refresh, clearSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const menuRef = useRef(null);

  const displayName = user
    ? [user.firstName, user.surname].filter(Boolean).join(' ').trim()
    : null;
  const fallbackName = email || 'Guest user';
  const userName = displayName || fallbackName;
  const userEmail = email || user?.email || '';

  const initialsSource = displayName || email || 'A';
  const userInitial = initialsSource
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  function isActive(path) {
    if (!path) return false;
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  }

  const accountLinks = useMemo(
    () => [
      { label: 'Profile', href: '/account/profile' },
      { label: 'Alerts', href: '/account/saved-searches' },
      { label: 'Favourites', href: '/account/favourites' },
      { label: 'Contacts', href: '/contact' },
    ],
    [],
  );

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.pathname]);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
    setLogoutError('');
  }

  function handleMenuItemSelect() {
    setMenuOpen(false);
    setLogoutError('');
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError('');

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to sign out. Please try again.');
      }

      clearSession();

      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after logout', refreshError);
      }

      setMenuOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
      const message = error instanceof Error ? error.message : 'Unable to sign out. Please try again.';
      setLogoutError(message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.accountPage}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>A</span>
            <span className={styles.brandText}>Aktonz</span>
          </Link>

          <nav className={styles.primaryNav} aria-label="Account sections">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = item.disabled ? false : item.match ? item.match(router.pathname) : isActive(item.href);
              const className = [
                styles.primaryNavItem,
                active ? styles.primaryNavItemActive : '',
                item.disabled ? styles.primaryNavItemDisabled : '',
              ]
                .filter(Boolean)
                .join(' ');

              if (item.disabled || !item.href) {
                return (
                  <span key={item.label} className={className} aria-disabled="true">
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div
            className={`${styles.userMenu} ${menuOpen ? styles.userMenuOpen : ''}`}
            ref={menuRef}
          >
            <button
              type="button"
              className={styles.userMenuToggle}
              onClick={toggleMenu}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="account-menu-dropdown"
              aria-label={menuOpen ? 'Close account menu' : 'Open account menu'}
            >
              <span className={styles.userInitial}>{userInitial}</span>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userStatus}>
                  {loading ? 'Loading account…' : user ? 'Logged in' : 'Not signed in'}
                </span>
              </div>
              <span className={`${styles.userCaret} ${menuOpen ? styles.userCaretOpen : ''}`} aria-hidden="true" />
            </button>

            <div
              id="account-menu-dropdown"
              className={styles.userDropdown}
              role="menu"
              aria-hidden={!menuOpen}
            >
              <div className={styles.userDropdownHeader}>
                <span className={styles.userDropdownName}>{userName}</span>
                {userEmail ? <span className={styles.userDropdownEmail}>{userEmail}</span> : null}
              </div>

              <div className={styles.userDropdownList}>
                {accountLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={styles.userDropdownLink}
                    role="menuitem"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={handleMenuItemSelect}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className={styles.userDropdownFooter}>
                <button
                  type="button"
                  className={styles.userLogoutButton}
                  onClick={handleLogout}
                  disabled={loggingOut}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {loggingOut ? 'Signing out…' : 'Logout'}
                </button>
                {logoutError ? (
                  <p className={styles.userDropdownStatus} role="status">
                    {logoutError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.hero}>
          <div className={styles.heroContent}>
            {heroSubtitle ? <p className={styles.heroEyebrow}>{heroSubtitle}</p> : null}
            {heroTitle ? <h1 className={styles.heroTitle}>{heroTitle}</h1> : null}
            {heroDescription ? (
              <p className={styles.heroDescription}>{heroDescription}</p>
            ) : null}
            {heroCta ? (
              <div className={styles.heroActions}>
                <Link href={heroCta.href} className={styles.heroButton}>
                  {heroCta.label}
                </Link>
                {heroCta.secondary ? (
                  <Link href={heroCta.secondary.href} className={styles.heroLink}>
                    {heroCta.secondary.label}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {tabs?.length ? (
          <nav className={styles.tabNav} aria-label="My Aktonz menu">
            {tabs.map((tab) => {
              const active =
                tab.href &&
                (tab.match
                  ? tab.match(router.pathname)
                  : router.pathname === tab.href || router.pathname.startsWith(`${tab.href}/`));
              const className = [
                styles.tabNavItem,
                active ? styles.tabNavItemActive : '',
                tab.disabled ? styles.tabNavItemDisabled : '',
              ]
                .filter(Boolean)
                .join(' ');

              if (!tab.href || tab.disabled) {
                return (
                  <span key={tab.label} className={className} aria-disabled="true">
                    {tab.label}
                  </span>
                );
              }

              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
