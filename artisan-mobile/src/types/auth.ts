export type UserRole = 'client' | 'artisan' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export interface BrowserLoginResponse {
  access: string;
  username: string;
  role: UserRole;
}

export interface BrowserRefreshResponse {
  access: string;
}
