import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

import styles from '../../styles/Admin.module.css';

type NavigationMatch = string | string[] | undefined;

type NavigationItem = {
  label: string;
  href: string;
  match?: NavigationMatch;
};

type AdminNavigationProps = {
  items?: NavigationItem[];
  secondaryItems?: NavigationItem[];
  onLogout?: () => void;
  logoutLoading?: boolean;
  logoutLabel?: string;
  logoutLoadingLabel?: string;
  errorMessage?: string;
  errorRole?: 'alert' | 'status' | undefined;
};

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', href: '/admin', match: ['/admin'] },
  { label: 'Sales', href: '/admin/sales', match: ['/admin/sales'] },
  { label: 'Lettings', href: '/admin/lettings', match: ['/admin/lettings'] },
  { label: 'Diary', href: '/admin/diary', match: ['/admin/diary'] },
  { label: 'Contacts', href: '/admin/contacts', match: ['/admin/contacts', '/admin/contacts/[id]'] },
  { label: 'Valuations', href: '/admin/valuations' },
  { label: 'Offers', href: '/admin/offers' },
  { label: 'Email', href: '/admin/email' },
];

function buildMatchList(href: string, match?: NavigationMatch): string[] {
  if (Array.isArray(match)) {
    return match;
  }

  if (typeof match === 'string' && match.length > 0) {
    return [match];
  }

  return [href];
}

function isRouteActive(pathname: string, href: string, match?: NavigationMatch) {
  const patterns = buildMatchList(href, match);

  return patterns.some((pattern) => {
    if (!pattern) {
      return false;
    }

    if (pathname === pattern) {
      return true;
    }

    if (pattern.endsWith(']')) {
      // Match dynamic route folders such as /admin/contacts/[id]
      const base = pattern.substring(0, pattern.lastIndexOf('/'));
      return pathname.startsWith(`${base}/`);
    }

    return pathname.startsWith(`${pattern}/`);
  });
}

const AdminNavigation = ({
  items = ADMIN_NAV_ITEMS,
  secondaryItems = [],
  onLogout,
  logoutLoading = false,
  logoutLabel = 'Sign out',
  logoutLoadingLabel = 'Signing out…',
  errorMessage,
  errorRole = 'alert',
}: AdminNavigationProps) => {
  const router = useRouter();

  const pathname = router?.pathname ?? '';

  const navItems = useMemo(() => items.filter((item) => Boolean(item?.href)), [items]);
  const pageItems = useMemo(
    () => secondaryItems.filter((item) => Boolean(item?.href)),
    [secondaryItems],
  );

  const hasNavigation = navItems.length > 0 || pageItems.length > 0 || Boolean(onLogout);

  return (
    <header className={styles.adminHeader}>
      <div className={styles.adminHeaderInner}>
        <div className={styles.adminBrand}>
          <span className={styles.adminBrandName}>Aktonz</span>
          <span className={styles.adminBrandBadge}>Admin</span>
        </div>
        {hasNavigation ? (
          <nav className={styles.adminNav} aria-label="Admin navigation">
            <ul className={styles.adminNavList}>
              {navItems.map((item) => {
                const isAnchorLink = item.href.startsWith('#');
                const isActive = !isAnchorLink && isRouteActive(pathname, item.href, item.match);
                const commonProps = {
                  className: styles.adminNavLink,
                  'data-active': isActive ? 'true' : undefined,
                  ...(isActive ? { 'aria-current': 'page' as const } : {}),
                };

                return (
                  <li key={`${item.label}-${item.href}`}>
                    {isAnchorLink ? (
                      <a {...commonProps} href={item.href}>
                        {item.label}
                      </a>
                    ) : (
                      <Link {...commonProps} href={item.href}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}

              {pageItems.length > 0 ? (
                <li className={styles.adminNavDivider} role="presentation">
                  <span />
                </li>
              ) : null}

              {pageItems.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <a className={styles.adminNavLink} href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}

              {onLogout ? (
                <li>
                  <button
                    type="button"
                    className={styles.adminNavButton}
                    onClick={onLogout}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? logoutLoadingLabel : logoutLabel}
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
        {errorMessage ? (
          <p className={styles.logoutError} role={errorRole}>
            {errorMessage}
          </p>
        ) : null}
      </div>
    </header>
  );
};

export default AdminNavigation;
