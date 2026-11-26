import React, { createContext, useContext, useMemo, useState } from 'react';

export type AppMode = 'demo' | 'live';

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);
const MODE_KEY = 'wattscape.app-mode';

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, updateMode] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'demo';
    return window.sessionStorage.getItem(MODE_KEY) === 'live' ? 'live' : 'demo';
  });
  const value = useMemo<AppModeContextValue>(() => ({
    mode,
    setMode: (next) => {
      window.sessionStorage.setItem(MODE_KEY, next);
      updateMode(next);
    },
  }), [mode]);
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const value = useContext(AppModeContext);
  if (!value) throw new Error('useAppMode must be used inside AppModeProvider');
  return value;
}
