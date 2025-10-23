export const EXPIRES_SOON_THRESHOLD_SECONDS = 24 * 60 * 60;

export function formatRelativeSeconds(seconds) {
  if (seconds == null || Number.isNaN(seconds)) {
    return null;
  }

  if (!Number.isFinite(seconds)) {
    return null;
  }

  if (seconds <= 0) {
    return 'expired';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatDateTime(timestamp) {
  if (!timestamp || Number.isNaN(timestamp)) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch (error) {
    return null;
  }
}

export function getExpiresInSeconds(status) {
  if (!status) {
    return null;
  }

  if (typeof status.expiresInSeconds === 'number' && !Number.isNaN(status.expiresInSeconds)) {
    return status.expiresInSeconds;
  }

  if (typeof status.expiresAt === 'number' && !Number.isNaN(status.expiresAt)) {
    return Math.round((status.expiresAt - Date.now()) / 1000);
  }

  return null;
}

export function describeMicrosoftConnection(statusState) {
  const state = statusState || { loading: true, loaded: false, data: null, error: null };

  if (state.loading && !state.loaded) {
    return {
      status: 'loading',
      tone: 'info',
      badgeLabel: 'Checking',
      bannerMessage: 'Checking Microsoft 365 connection…',
      detailMessage: 'Fetching the latest Microsoft Graph status.',
      actionLabel: 'Checking status…',
      actionDisabled: true,
      suppressQuery: false,
    };
  }

  if (!state.loaded && !state.loading) {
    return {
      status: 'idle',
      tone: 'info',
      badgeLabel: 'Pending',
      bannerMessage: 'Microsoft 365 status will appear once your admin session is ready.',
      detailMessage: 'Waiting for the admin session to load.',
      actionLabel: 'Connect Microsoft 365',
      actionDisabled: true,
      suppressQuery: false,
    };
  }

  if (state.error) {
    return {
      status: 'error',
      tone: 'error',
      badgeLabel: 'Status unavailable',
      bannerMessage: state.error,
      detailMessage: 'Reload this page or reconnect to refresh the status.',
      actionLabel: 'Connect Microsoft 365',
      actionDisabled: false,
      suppressQuery: true,
    };
  }

  const data = state.data || {};
  const expiresIn = getExpiresInSeconds(data);
  const relative = formatRelativeSeconds(expiresIn);
  const expiryLabel = formatDateTime(data.expiresAt);

  if (!data.connected) {
    return {
      status: 'disconnected',
      tone: 'error',
      badgeLabel: 'Disconnected',
      bannerMessage: 'Aktonz cannot send email until Microsoft 365 is connected.',
      detailMessage: 'Use the button above to connect info@aktonz.com.',
      actionLabel: 'Connect Microsoft 365',
      actionDisabled: false,
      suppressQuery: true,
      relative,
      expiryLabel,
    };
  }

  if (expiresIn != null && expiresIn <= 0) {
    return {
      status: 'expired',
      tone: 'error',
      badgeLabel: 'Needs attention',
      bannerMessage: 'Microsoft 365 access has expired. Reconnect to restore email delivery.',
      detailMessage: expiryLabel ? `Token expired ${expiryLabel}.` : 'Token expired. Reconnect now.',
      actionLabel: 'Reconnect Microsoft 365',
      actionDisabled: false,
      suppressQuery: true,
      relative,
      expiryLabel,
    };
  }

  if (expiresIn != null && expiresIn <= EXPIRES_SOON_THRESHOLD_SECONDS) {
    return {
      status: 'expiring',
      tone: 'warning',
      badgeLabel: 'Expires soon',
      bannerMessage: relative
        ? `Microsoft 365 connection expires in ${relative}. Refresh now to avoid disruption.`
        : 'Microsoft 365 connection expires soon. Refresh to avoid disruption.',
      detailMessage: expiryLabel
        ? `Token refresh due ${expiryLabel}.`
        : 'Refresh the connection to keep sending email.',
      actionLabel: 'Refresh connection',
      actionDisabled: false,
      suppressQuery: false,
      relative,
      expiryLabel,
    };
  }

  return {
    status: 'connected',
    tone: 'success',
    badgeLabel: 'Connected',
    bannerMessage: relative
      ? `Microsoft 365 is connected. Token refresh due in ${relative}.`
      : 'Microsoft 365 is connected and ready.',
    detailMessage: 'Aktonz will send enquiries from info@aktonz.com.',
    actionLabel: 'Refresh connection',
    actionDisabled: false,
    suppressQuery: false,
    relative,
    expiryLabel,
  };
}
