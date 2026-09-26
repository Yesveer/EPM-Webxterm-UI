import { apiRequest } from './api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StorageType = 's3' | 'gcs' | 'azure' | 'sftp' | 'nfs' | 'elasticsearch' | 'siem' | '';

export interface LogManagementConfig {
  retention_days: number;
  archive_enabled: boolean;
  archive_every_days: number;
  storage_type: StorageType;
  storage_configured: boolean;
  last_archive_at?: string;
  next_archive_at?: string;
}

export interface S3Creds {
  endpoint: string;
  protocol: 'http' | 'https';
  access_key: string;
  secret_key: string;
  bucket: string;
  region: string;
  path_prefix: string;
}

export interface GCSCreds {
  bucket: string;
  credentials_json: string;
  path_prefix: string;
}

export interface AzureCreds {
  account_name: string;
  account_key: string;
  container: string;
  path_prefix: string;
}

export interface SFTPCreds {
  host: string;
  port: number;
  username: string;
  password: string;
  private_key: string;
  remote_path: string;
}

export interface NFSCreds {
  mount_path: string;
  path_prefix: string;
}

export interface ElasticsearchCreds {
  url: string;
  username: string;
  password: string;
  api_key: string;
  index_prefix: string;
}

export interface SIEMCreds {
  url: string;
  token: string;
  format: 'json' | 'cef';
}

export type StorageCreds = S3Creds | GCSCreds | AzureCreds | SFTPCreds | NFSCreds | ElasticsearchCreds | SIEMCreds;

export interface SaveLogConfigPayload {
  retention_days: number;
  archive_enabled: boolean;
  archive_every_days: number;
  storage_type: StorageType;
  storage_creds?: StorageCreds;
}

export type ArchiveStatus = 'running' | 'success' | 'failed' | 'partial';

export interface ArchiveRun {
  id: string;
  started_at: string;
  finished_at?: string;
  status: ArchiveStatus;
  storage_type: string;
  trigger: 'auto' | 'manual';
  logs_archived: number;
  sessions_archived: number;
  logs_deleted: number;
  bytes_archived: number;
  archive_key: string;
  error_msg?: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const logManagementAPI = {
  getConfig: (token: string) =>
    apiRequest<LogManagementConfig>('/log-management/config', { token }),

  saveConfig: (token: string, payload: SaveLogConfigPayload) =>
    apiRequest<{ status: string }>('/log-management/config', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  testConnection: (token: string, storage_type: StorageType, storage_creds: StorageCreds) =>
    apiRequest<{ status: string; error?: string }>('/log-management/test-connection', {
      method: 'POST',
      token,
      body: JSON.stringify({ storage_type, storage_creds }),
    }),

  archiveNow: (token: string) =>
    apiRequest<{ status: string }>('/log-management/archive-now', { method: 'POST', token }),

  getRuns: (token: string) =>
    apiRequest<ArchiveRun[]>('/log-management/runs', { token }),

  restoreRun: (token: string, runId: string) =>
    apiRequest<{ logs_restored: number; sessions_restored: number }>(
      `/log-management/runs/${runId}/restore`,
      { method: 'POST', token }
    ),
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export const STORAGE_LABELS: Record<StorageType, string> = {
  s3: 'Amazon S3 / S3-Compatible',
  gcs: 'Google Cloud Storage',
  azure: 'Azure Blob Storage',
  sftp: 'SFTP Server',
  nfs: 'NFS / Local Path',
  elasticsearch: 'Elasticsearch / OpenSearch',
  siem: 'SIEM Integration',
  '': 'None (delete only)',
};

export const defaultS3Creds = (): S3Creds => ({
  endpoint: '', protocol: 'https', access_key: '', secret_key: '',
  bucket: '', region: '', path_prefix: 'vsay-logs',
});

export const defaultGCSCreds = (): GCSCreds => ({
  bucket: '', credentials_json: '', path_prefix: 'vsay-logs',
});

export const defaultAzureCreds = (): AzureCreds => ({
  account_name: '', account_key: '', container: '', path_prefix: 'vsay-logs',
});

export const defaultSFTPCreds = (): SFTPCreds => ({
  host: '', port: 22, username: '', password: '', private_key: '', remote_path: '/vsay-logs',
});

export const defaultNFSCreds = (): NFSCreds => ({
  mount_path: '/mnt/vsay-logs', path_prefix: '',
});

export const defaultElasticsearchCreds = (): ElasticsearchCreds => ({
  url: '', username: '', password: '', api_key: '', index_prefix: 'vsay-logs',
});

export const defaultSIEMCreds = (): SIEMCreds => ({
  url: '', token: '', format: 'json',
});

export function defaultCredsForType(type: StorageType): StorageCreds | undefined {
  switch (type) {
    case 's3': return defaultS3Creds();
    case 'gcs': return defaultGCSCreds();
    case 'azure': return defaultAzureCreds();
    case 'sftp': return defaultSFTPCreds();
    case 'nfs': return defaultNFSCreds();
    case 'elasticsearch': return defaultElasticsearchCreds();
    case 'siem': return defaultSIEMCreds();
    default: return undefined;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
