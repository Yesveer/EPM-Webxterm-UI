import { apiRequest } from './api-client';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  tenant_id: string;
  tenant_name: string;
  role: string; // super_admin, company_admin, user
  machine_role?: string; // allow_sudo, non_sudo
  groups?: string[];
  email_verified: boolean;
  api_key?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
  username: string;
  user_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_name: string; // For realm creation
  company_name: string; // Display name for organization
}

export interface VerifyOTPRequest {
  username: string;
  otp_code: string;
}

export interface SelectTenantRequest {
  session_token: string;
  tenant_id: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expires_in: number;
  session_token: string;
  available_tenants: TenantInfo[];
  must_reset_password?: boolean;
}

export interface LoginOTPResponse {
  message: string;
  requires_otp: boolean;
  username: string;
  tenants: TenantInfo[];
  session_token: string;
  otp_expires_in_min: number;
}

export interface TenantSelectionResponse {
  requires_tenant_selection: boolean;
  tenants: TenantInfo[];
  session_token: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const authAPI = {
  async login(data: LoginRequest): Promise<LoginOTPResponse | TenantSelectionResponse | AuthResponse> {
    const errors = validateLoginInput(data);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    return apiRequest<LoginOTPResponse | TenantSelectionResponse | AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async selectTenant(data: SelectTenantRequest): Promise<AuthResponse | LoginOTPResponse> {
    return apiRequest<AuthResponse | LoginOTPResponse>('/auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    if (!data.username) {
      throw new Error('Username is required');
    }
    if (!data.otp_code || data.otp_code.length !== 6) {
      throw new Error('Please enter a valid 6-digit OTP code');
    }

    return apiRequest<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const errors = validateSignupInput(data);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    return apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async refreshToken(token: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async changePassword(token: string, newPassword: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/change-password', {
      method: 'POST',
      token,
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('vsay-token');
    if (token) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token,
        });
      } catch (error) {
        console.error('Logout API error:', error);
      }
    }
    localStorage.removeItem('vsay-token');
    localStorage.removeItem('vsay-user');
    localStorage.removeItem('vsay-session-token');
    localStorage.removeItem('vsay-available-tenants');
  },
};

export function getOIDCLoginURL(provider: 'microsoft' | 'github'): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api').replace(/\/$/, '');
  return `${base}/auth/oidc/${provider}`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-z0-9]{3,}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
    return errors;
  }

  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
    });
  }

  return errors;
}

export function validateLoginInput(data: LoginRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

export function validateSignupInput(data: SignupRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.username) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (data.username.length < 3) {
    errors.push({
      field: 'username',
      message: 'Username must be at least 3 characters long',
    });
  } else if (!validateUsername(data.username)) {
    errors.push({
      field: 'username',
      message: 'Username must be lowercase letters and numbers only (e.g., john123)',
    });
  }

  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!data.first_name) {
    errors.push({ field: 'first_name', message: 'First name is required' });
  }

  if (!data.last_name) {
    errors.push({ field: 'last_name', message: 'Last name is required' });
  }

  if (!data.organization_name) {
    errors.push({ field: 'organization_name', message: 'Organization name is required' });
  }

  if (!data.company_name) {
    errors.push({ field: 'company_name', message: 'Company name is required' });
  }

  const passwordErrors = validatePassword(data.password);
  errors.push(...passwordErrors);

  return errors;
}
