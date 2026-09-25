import { apiRequest } from '../../api/http';
import type { AuthUser } from '../../types/auth';

export interface UserProfile {
  username: string;
  email: string;
  role: 'client' | 'artisan' | 'admin';
  numero_momo: string | null;
  qr_wave: string | null;
  is_active: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_requested_at: string | null;
  verification_reviewed_at: string | null;
  verification_note: string;
}

export function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/accounts/profile/me/');
}

export function updateProfile(input: { username?: string; numero_momo?: string | null }): Promise<Partial<UserProfile>> {
  return apiRequest<Partial<UserProfile>>('/accounts/profile/update/', {
    method: 'PUT',
    body: input
  });
}

export function getMeAfterUpdate(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/accounts/me/');
}
