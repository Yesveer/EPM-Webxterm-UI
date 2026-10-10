'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { brandingAPI, BrandingConfig, DEFAULT_BRANDING } from '@/lib/branding-api';

interface BrandingContextType {
  branding: BrandingConfig;
  loading: boolean;
  /** False until we know whose branding this is.
   *
   *  Consumers that render the product NAME must wait for this. Until it
   *  flips, `branding` still holds the built-in defaults — which is the right
   *  thing for colours and layout and the wrong thing to put on screen, since
   *  an org that renamed the product would see the stock name first. */
  resolved: boolean;
  refresh: () => Promise<void>;
  setBranding: (branding: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

/** Where the last known branding is kept between visits.
 *
 *  The config is public, identical for everyone on the deployment, and tiny —
 *  the only reason it is stored at all is to have an answer before the network
 *  does. */
const CACHE_KEY = 'branding:last-known';

function readCache(): BrandingConfig | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A cache written by an older build can be missing fields that are now
    // required, so the defaults fill the gaps rather than letting `undefined`
    // reach a component.
    return { ...DEFAULT_BRANDING, ...parsed };
  } catch {
    // Private browsing, cleared storage, or a half-written entry. The network
    // answer is on its way regardless.
    return null;
  }
}

function writeCache(cfg: BrandingConfig) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
  } catch {
    // Storage full or blocked. Costs the next visit a placeholder, nothing more.
  }
}

// useLayoutEffect warns during SSR, where it is also a no-op. Falling back to
// useEffect on the server keeps the console clean without changing behaviour:
// what matters is that on the CLIENT this runs before the browser paints.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  // Deliberately NOT seeded from localStorage here. This initial state is also
  // what the server renders, and seeding it from storage the server cannot see
  // would make the two disagree — a hydration mismatch. The cache is applied a
  // moment later, in the layout effect below, before anything is painted.
  const [branding, setBrandingState] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const setBranding = useCallback((cfg: BrandingConfig) => {
    setBrandingState(cfg);
    setResolved(true);
    writeCache(cfg);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const cfg = await brandingAPI.getBranding();
      const merged = { ...DEFAULT_BRANDING, ...cfg };
      setBrandingState(merged);
      writeCache(merged);
    } catch {
      // Backend unreachable or not yet configured — keep whatever we have.
    } finally {
      // Resolved either way: with the backend down, the defaults ARE the
      // answer, and leaving a placeholder on screen forever is worse than
      // showing the stock name.
      setResolved(true);
      setLoading(false);
    }
  }, []);

  // Before paint, not after: this is what stops the stock name from appearing
  // for a frame on every visit after the first.
  useIsomorphicLayoutEffect(() => {
    const cached = readCache();
    if (cached) {
      setBrandingState(cached);
      setResolved(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the browser tab icon when a custom favicon is set — and put back the
  // default one the moment it's cleared (removed + saved).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url || '/icon.png';
  }, [branding.favicon_url]);

  return (
    <BrandingContext.Provider value={{ branding, loading, resolved, refresh, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
