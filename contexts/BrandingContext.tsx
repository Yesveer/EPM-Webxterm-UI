'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { brandingAPI, BrandingConfig, DEFAULT_BRANDING } from '@/lib/branding-api';

interface BrandingContextType {
  branding: BrandingConfig;
  loading: boolean;
  refresh: () => Promise<void>;
  setBranding: (branding: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const cfg = await brandingAPI.getBranding();
      setBranding({ ...DEFAULT_BRANDING, ...cfg });
    } catch {
      // Backend unreachable or not yet configured — keep defaults.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the browser tab icon when a custom favicon is set — and put back the
  // default WebXterm one the moment it's cleared (removed + saved).
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
    <BrandingContext.Provider value={{ branding, loading, refresh, setBranding }}>
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
