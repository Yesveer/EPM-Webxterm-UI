'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBranding } from './BrandingContext';

type Theme = 'light' | 'dark';
type ThemeMode = Theme | 'system';
type ThemeColor = 'cyan' | 'green' | 'purple' | 'orange' | 'blue';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  themeColor: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setThemeColor: (color: ThemeColor) => void;
}

const themeColorValues: Record<ThemeColor, { light: string; dark: string }> = {
  cyan:   { light: '173 80% 40%', dark: '173 80% 45%' },
  green:  { light: '142 76% 36%', dark: '142 76% 46%' },
  purple: { light: '262 83% 58%', dark: '262 83% 65%' },
  orange: { light: '25 95% 53%',  dark: '25 95% 58%' },
  blue:   { light: '217 91% 60%', dark: '217 91% 65%' },
};

const VALID_THEME_COLORS = Object.keys(themeColorValues) as ThemeColor[];

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { branding, loading: brandingLoading } = useBranding();

  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vsay-theme');
      return (stored as ThemeMode) || 'light';
    }
    return 'light';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vsay-theme') as ThemeMode | null;
      return stored === 'system' ? getSystemTheme() : (stored as Theme) || 'light';
    }
    return 'light';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vsay-theme-color');
      return (stored as ThemeColor) || 'cyan';
    }
    return 'cyan';
  });

  // A personal choice only wins if it was made AFTER the org's last actual
  // color change — a plain "has localStorage ever had a value" check doesn't
  // work, because existing users already have one from before this feature
  // existed (or from earlier default state), which would permanently lock
  // them out of ever seeing a new org default. Comparing timestamps means: a
  // stale personal pick (older than the last real color change) gets
  // overridden by the new default; a pick made after that stays in effect
  // until the admin changes the color again.
  //
  // Deliberately compares against default_theme_color_updated_at, NOT the
  // branding doc's blanket updated_at — the latter changes on every save
  // (logo, name, ...), which used to silently reset everyone's personal color
  // choice on the next full page load (e.g. after the 6-hour idle auto-logout
  // redirects to /login) even when the org's color never actually changed.
  useEffect(() => {
    if (brandingLoading || typeof window === 'undefined') return;
    if (!VALID_THEME_COLORS.includes(branding.default_theme_color as ThemeColor)) return;

    const personalSetAt = Number(localStorage.getItem('vsay-theme-color-set-at') || 0);
    const colorUpdatedAt = branding.default_theme_color_updated_at
      ? new Date(branding.default_theme_color_updated_at).getTime()
      : 0;
    const personalChoiceIsFresh = personalSetAt > 0 && personalSetAt > colorUpdatedAt;

    if (!personalChoiceIsFresh) {
      setThemeColorState(branding.default_theme_color as ThemeColor);
    }
  }, [brandingLoading, branding.default_theme_color, branding.default_theme_color_updated_at]);

  // Keep the resolved theme in sync with the OS preference while in "system" mode.
  useEffect(() => {
    if (mode !== 'system') {
      setTheme(mode);
      return;
    }

    setTheme(getSystemTheme());
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setTheme(getSystemTheme());
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.remove('theme-cyan', 'theme-green', 'theme-purple', 'theme-orange', 'theme-blue');

    root.classList.add(theme);
    root.classList.add(`theme-${themeColor}`);

    const colorValue = themeColorValues[themeColor][theme === 'dark' ? 'dark' : 'light'];
    root.style.setProperty('--primary', colorValue);
    root.style.setProperty('--accent', colorValue);
    root.style.setProperty('--ring', colorValue);

    localStorage.setItem('vsay-theme', mode);
  }, [theme, mode, themeColor]);

  // Explicit user action — stamps "now" so this pick is honoured until the org
  // default is next changed.
  const setThemeColor = (color: ThemeColor) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vsay-theme-color', color);
      localStorage.setItem('vsay-theme-color-set-at', String(Date.now()));
    }
    setThemeColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, themeColor, setMode, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
