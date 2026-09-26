import { apiRequest } from './api-client';

export interface S3Config {
  enabled: boolean;
  endpoint: string;
  protocol: 'http' | 'https';
  access_key: string;
  secret_key?: string;      // only sent on save; never returned
  secret_key_set?: boolean; // returned from API: true if a key is already stored
  bucket: string;
  region: string;
}

export const settingsAPI = {
  getS3Config: async (token: string): Promise<S3Config> => {
    return apiRequest<S3Config>('/config/s3', { token });
  },

  saveS3Config: async (token: string, config: S3Config): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/config/s3', {
      method: 'POST',
      token,
      body: JSON.stringify(config),
    });
  },
};
