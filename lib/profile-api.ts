import { apiRequest } from './api-client';

export interface ProfileData {
  id: string;
  username: string;
  email: string;
  api_key: string;
  avatar_url: string;
  created_at: string;
}

export interface ResetPasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UploadAvatarRequest {
  avatar_url: string;
}

export const profileAPI = {
  async getProfile(token: string): Promise<ProfileData> {
    return apiRequest<ProfileData>('/profile', {
      method: 'GET',
      token,
    });
  },

  async regenerateAPIKey(token: string): Promise<{ api_key: string; message: string }> {
    return apiRequest<{ api_key: string; message: string }>('/profile/regenerate-api-key', {
      method: 'POST',
      token,
    });
  },

  async resetPassword(token: string, data: ResetPasswordRequest): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/profile/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  async uploadAvatar(token: string, data: UploadAvatarRequest): Promise<{ avatar_url: string; message: string }> {
    return apiRequest<{ avatar_url: string; message: string }>('/profile/upload-avatar', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  async refreshToken(currentToken: string): Promise<{ token: string }> {
    return apiRequest<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token: currentToken }),
    });
  },
};
