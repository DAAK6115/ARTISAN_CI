import { apiRequest } from '../../api/http';

export type PricingMode = 'fixe' | 'a_partir_de' | 'sur_devis';
export type InterventionMode = 'chez_client' | 'atelier' | 'les_deux';

export interface ServiceItem {
  id: number;
  artisan: number;
  artisan_username: string;
  artisan_verified: boolean;
  titre: string;
  description: string;
  prix: string;
  categorie: string;
  categorie_label: string;
  image: string | null;
  is_active: boolean;
  mode_tarification: PricingMode;
  mode_tarification_label: string;
  duree_minutes: number;
  delai_reservation_heures: number;
  mode_intervention: InterventionMode;
  mode_intervention_label: string;
  rayon_intervention_km: number | null;
  date_creation: string;
  moyenne_avis: number | null;
  is_liked: boolean;
  is_favori: boolean;
}

export interface ServiceSearchParams {
  search?: string;
  categorie?: string;
  artisan?: string;
  mode_tarification?: PricingMode | '';
  mode_intervention?: InterventionMode | '';
  min_prix?: string;
  max_prix?: string;
}

function buildQuery(params: ServiceSearchParams = {}): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, raw]) => {
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function getServices(params: ServiceSearchParams = {}): Promise<ServiceItem[]> {
  return apiRequest<ServiceItem[]>(`/services/${buildQuery(params)}`, { auth: false });
}

export function getService(id: number): Promise<ServiceItem> {
  return apiRequest<ServiceItem>(`/services/${id}/`, { auth: false });
}
