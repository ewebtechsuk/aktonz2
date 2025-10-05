const SESSION_COOKIE_NAME = 'aktonz_session';

export function hasSessionCookie() {
  if (typeof document === 'undefined') {
    return false;
  }

  const cookies = document.cookie ? document.cookie.split(';') : [];
  return cookies.some((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
