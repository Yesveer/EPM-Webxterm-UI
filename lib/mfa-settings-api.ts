import { apiRequest } from './api-client';

export interface MFASettings {
  otp_enabled: boolean;
  otp_expiry_minutes: number;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  // Never carries the real password — only whether one is currently stored.
  smtp_password_set: boolean;
  smtp_from: string;
  updated_at: string;
  updated_by?: string;
}

// Payload for a save. smtp_password is optional — omit it (or send '') to
// keep whatever password is already stored; only send it when changing it.
export interface UpdateMFASettingsPayload {
  otp_enabled?: boolean;
  otp_expiry_minutes?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_from?: string;
}

export const mfaSettingsAPI = {
  // super_admin only.
  get(token: string): Promise<MFASettings> {
    return apiRequest<MFASettings>('/admin/mfa-settings', {
      method: 'GET',
      token,
    });
  },

  // super_admin only.
  update(token: string, payload: UpdateMFASettingsPayload): Promise<MFASettings> {
    return apiRequest<MFASettings>('/admin/mfa-settings', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
};
