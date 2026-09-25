import { apiRequest } from '../../api/http';
import type { AuthUser, BrowserLoginResponse } from '../../types/auth';

export interface LoginInput {
  identifier: string;
  password: string;
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
