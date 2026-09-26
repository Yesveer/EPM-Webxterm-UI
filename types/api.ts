export interface User {
  id: string;
  username: string;
  email: string;
  api_key?: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface APIErrorResponse {
  error: string;
  message?: string;
}
