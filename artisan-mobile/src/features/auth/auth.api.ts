import { apiRequest } from '../../api/http';
import type { AuthUser, BrowserLoginResponse, UserRole } from '../../types/auth';

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface RegisterResponse {
  message: string;
}

export async function login(input: LoginInput): Promise<BrowserLoginResponse> {
  return apiRequest<BrowserLoginResponse>('/accounts/session/login/', {
    method: 'POST',
    auth: false,
    body: {
      email: input.identifier.trim(),
      password: input.password
    }
  });
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/accounts/register/', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
    body: {
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
      password: input.password,
      role: input.role
    }
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/accounts/me/');
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/accounts/session/logout/', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false
  });
}
export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/accounts/password-reset/request/', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
    body: { email: email.trim().toLowerCase() }
  });
}

export function confirmPasswordReset(input: {
  email: string;
  code: string;
  new_password: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/accounts/password-reset/confirm/', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
    body: {
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
      new_password: input.new_password
    }
  });
}

