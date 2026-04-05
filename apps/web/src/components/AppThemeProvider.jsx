import React from 'react';
import { ThemeProvider } from 'next-themes';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

/** Legacy `dark` choice → forest walk (runs once per load before ThemeProvider reads storage). */
if (typeof window !== 'undefined') {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('blb-theme-') && localStorage.getItem(k) === 'dark') {
        localStorage.setItem(k, 'forest-walk');
      }
    }
  } catch {
    /* ignore */
  }
}

const THEME_CLASS_MAP = {
  light: 'light',
  /** System prefers dark → same look as explicit Forest walk */
  dark: 'forest-walk',
  'forest-walk': 'forest-walk',
  'night-dream': 'night-dream',
  forest: 'forest',
  'winter-blue': 'winter-blue',
};

/**
 * Per-user theme preference (localStorage key includes user id so each account keeps its own choice).
 */
export function AppThemeProvider({ children }) {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  const storageKey = `blb-theme-${currentUser?.id ?? 'guest'}`;
  const path = location.pathname;
  const isTenantPortal = userRole === 'tenant' || path.startsWith('/tenant');

  let defaultTheme = 'system';
  if (isTenantPortal) {
    defaultTheme = 'forest';
  } else if (userRole === 'landlord') {
    defaultTheme = 'forest-walk';
  } else if (userRole === 'staff') {
    defaultTheme = 'system';
  } else {
    // Guest: landlord-facing pages default to forest walk; staff login area stays system
    defaultTheme = path.startsWith('/staff') ? 'system' : 'forest-walk';
  }

  return (
    <ThemeProvider
      key={storageKey}
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={storageKey}
      themes={['light', 'forest-walk', 'night-dream', 'forest', 'winter-blue', 'system']}
      value={THEME_CLASS_MAP}
    >
      {children}
    </ThemeProvider>
  );
}
