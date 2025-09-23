import Link from 'next/link';
import { useRouter } from 'next/router';

import styles from '../../styles/AccountLayout.module.css';

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
    label: 'Offers & viewings',
    disabled: true,
  },
  {
    label: 'Documents',
    disabled: true,
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

  function isActive(path) {
    if (!path) return false;
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
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

          <div className={styles.userMenu}>
            <span className={styles.userInitial}>JT</span>
            <div className={styles.userDetails}>
              <span className={styles.userName}>Juliet Taphouse</span>
              <span className={styles.userStatus}>Logged in</span>
            </div>
            <button type="button" className={styles.userCaret} aria-label="Account menu" />
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
