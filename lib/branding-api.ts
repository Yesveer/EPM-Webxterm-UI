import { apiRequest } from './api-client';

export interface BrandingConfig {
  logo_url: string;
  favicon_url: string;
  name_part1: string;
  name_part1_color: string;
  name_part2: string;
  name_part2_color: string;
  default_theme_color: string;
  // ISO timestamp of the last time default_theme_color itself actually
  // changed — NOT bumped by unrelated saves (logo, name, ...). Lets clients
  // tell a stale personal colour choice (made before this) from a fresh one
  // (made after), without an unrelated branding edit silently resetting it.
  default_theme_color_updated_at: string;
  // How long (minutes) an idle terminal session may sit before the client
  // closes it and requires a new one. Stored/served here, enforced only by
  // the frontend — there is no server-side timer.
  terminal_idle_timeout_minutes: number;
  // ISO timestamp of the last admin save of any branding field.
  updated_at: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: '',
  favicon_url: '',
  name_part1: 'Web',
  name_part1_color: '',
  name_part2: 'Xterm',
  name_part2_color: '',
  default_theme_color: 'cyan',
  default_theme_color_updated_at: '',
  terminal_idle_timeout_minutes: 2,
  updated_at: '',
};

export const brandingAPI = {
  // Public — no token. Needed pre-login (login/signup pages, browser favicon).
  // This is a plain GET with no per-user variation, so the browser (and any proxy
  // sitting in front of the backend) is prone to caching it — meaning a reset/save
  // can look like it "didn't take" after a refresh even though the backend is
  // correct. Bypass every layer of caching explicitly: no-store on the fetch, a
  // matching header, and a cache-busting query param.
  getBranding(): Promise<BrandingConfig> {
    return apiRequest<BrandingConfig>(`/branding?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
  },

  // super_admin only.
  updateBranding(token: string, payload: Partial<BrandingConfig>): Promise<BrandingConfig> {
    return apiRequest<BrandingConfig>('/admin/branding', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
};
