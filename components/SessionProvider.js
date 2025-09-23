import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SessionContext = createContext({ user: null, loading: true, error: null, email: null, refresh: () => {} });

async function fetchSession() {
  const res = await fetch('/api/account/me');
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || 'Unable to load account');
  }
  const data = await res.json();
  return data;
}

export function SessionProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: null, email: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await fetchSession();
      setState({ user: data?.contact || null, loading: false, error: null, email: data?.email || data?.contact?.email || null });
    } catch (err) {
      setState({ user: null, loading: false, error: err instanceof Error ? err.message : 'Unable to load account', email: null });
    }
  }, []);

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
    };
  }, [state.user, state.email, state.loading, state.error, load]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

