import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SessionContext = createContext({
  user: null,
  loading: true,
  error: null,
  email: null,
  refresh: () => {},
  setSession: () => {},
  clearSession: () => {},
});


async function fetchSession() {
  const res = await fetch('/api/account/me', { credentials: 'include' });

  if (res.status === 401) {
    return { contact: null, email: null };
  }


  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || 'Unable to load account');
  }

  const data = await res.json();
  return data;
}

function deriveSessionState(payload) {
  const contact = payload?.contact || payload?.user || null;
  const email = payload?.email || contact?.email || null;

  return {
    user: contact || null,
    email: email || null,
    loading: false,
    error: null,
  };
}

export function SessionProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: null, email: null });

  const applySession = useCallback((payload) => {
    setState(deriveSessionState(payload));
  }, []);

  const clear = useCallback(() => {
    setState({ user: null, email: null, loading: false, error: null });
  }, []);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchSession();
      applySession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load account';
      setState({ user: null, email: null, loading: false, error: message });
    }
  }, [applySession]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    return {
      user: state.user,
      email: state.email || state.user?.email || null,
      loading: state.loading,
      error: state.error,
      refresh: load,
      setSession: applySession,
      clearSession: clear,
    };
  }, [state.user, state.email, state.loading, state.error, load, applySession, clear]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

