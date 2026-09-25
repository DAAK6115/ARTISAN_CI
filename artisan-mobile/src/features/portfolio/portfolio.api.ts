import { ApiError, apiRequest } from '../../api/http';

export interface Realisation {
  id: number;
  titre: string;
  image: string | null;
  description: string;
  date: string;
}

export interface PublicPortfolio {
  id: number;
  artisan_id: number;
  artisan_nom: string;
  artisan_verified: boolean;
  artisan_verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  bio: string;
  photo_couverture: string | null;
  site_web: string | null;
  facebook: string | null;
  whatsapp: string | null;
  localisation: string | null;
  latitude: number | null;
  longitude: number | null;
  visible: boolean;
  realisations: Realisation[];
}

export async function getPublicPortfolio(username: string): Promise<PublicPortfolio | null> {
  try {
    return await apiRequest<PublicPortfolio>(`/portfolio/artisans/${encodeURIComponent(username)}/`, { auth: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
