import { apiRequest } from '../../api/http';
import type { AppointmentItem } from '../appointments/appointments.api';
import type { ServiceItem } from '../home/services.api';

export interface ArtisanClientItem {
  id: number;
  username: string;
  appointments_count: number;
  completed_count: number;
  paid_total: number | string;
  last_appointment_at: string;
  last_service: string;
  last_status: string;
}

export interface ArtisanAvailabilityItem {
  id: number;
  jour_semaine: number;
  jour_label: string;
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
}

export interface ArtisanTimeOffItem {
  id: number;
  debut: string;
  fin: string;
  motif: string;
  created_at: string;
}

export interface ServiceFormInput {
  titre: string;
  description: string;
  prix: string;
  categorie: string;
  mode_tarification: 'fixe' | 'a_partir_de' | 'sur_devis';
  duree_minutes: string;
  delai_reservation_heures: string;
  mode_intervention: 'chez_client' | 'atelier' | 'les_deux';
  rayon_intervention_km: string;
  image?: File | null;
}

export const SERVICE_CATEGORIES = [
  ['alimentation', 'Alimentation'],
  ['artisanat_d_art', 'Artisanat d’Art'],
  ['btp', 'Bâtiment et Travaux Publics'],
  ['bois', 'Bois et dérivés'],
  ['cuir', 'Cuir et Peaux'],
  ['coiffure_esthetique', 'Coiffure et Esthétique'],
  ['couture_habillement', 'Couture et Habillement'],
  ['electronique', 'Électronique et Électromécanique'],
  ['energie_renouvelable', 'Énergie Renouvelable'],
  ['mecanique_auto', 'Mécanique et Réparation Automobile'],
  ['metallurgie_soudure', 'Métallurgie et Soudure'],
  ['savonnerie', 'Production de savon et produits ménagers'],
  ['serigraphie', 'Sérigraphie et Impression'],
  ['services_numeriques', 'Services Numériques'],
  ['transport', 'Transport et Logistique Artisanale']
] as const;

export function getArtisanAppointments(): Promise<AppointmentItem[]> {
  return apiRequest<AppointmentItem[]>('/appointments/mes-rendezvous-artisan/');
}

export function getArtisanClients(): Promise<ArtisanClientItem[]> {
  return apiRequest<ArtisanClientItem[]>('/appointments/artisan-clients/');
}

export function getArtisanServices(): Promise<ServiceItem[]> {
  return apiRequest<ServiceItem[]>('/services/mes-prestations/');
}

function serviceFormData(input: ServiceFormInput): FormData {
  const data = new FormData();
  data.append('titre', input.titre.trim());
  data.append('description', input.description.trim());
  data.append('prix', input.mode_tarification === 'sur_devis' ? '0' : input.prix.trim());
  data.append('categorie', input.categorie);
  data.append('mode_tarification', input.mode_tarification);
  data.append('duree_minutes', input.duree_minutes);
  data.append('delai_reservation_heures', input.delai_reservation_heures);
  data.append('mode_intervention', input.mode_intervention);
  if (input.rayon_intervention_km.trim()) {
    data.append('rayon_intervention_km', input.rayon_intervention_km.trim());
  }
  if (input.image) data.append('image', input.image);
  return data;
}

export function createArtisanService(input: ServiceFormInput): Promise<ServiceItem> {
  return apiRequest<ServiceItem>('/services/', {
    method: 'POST',
    body: serviceFormData(input)
  });
}

export function updateArtisanService(id: number, input: ServiceFormInput): Promise<ServiceItem> {
  return apiRequest<ServiceItem>(`/services/${id}/`, {
    method: 'PATCH',
    body: serviceFormData(input)
  });
}

export function deleteArtisanService(id: number): Promise<void> {
  return apiRequest<void>(`/services/${id}/`, { method: 'DELETE' });
}

export function getArtisanAvailabilities(): Promise<ArtisanAvailabilityItem[]> {
  return apiRequest<ArtisanAvailabilityItem[]>('/appointments/disponibilites/');
}

export function createArtisanAvailability(input: {
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
}): Promise<ArtisanAvailabilityItem> {
  return apiRequest<ArtisanAvailabilityItem>('/appointments/disponibilites/', {
    method: 'POST',
    body: input
  });
}

export function deleteArtisanAvailability(id: number): Promise<void> {
  return apiRequest<void>(`/appointments/disponibilites/${id}/`, { method: 'DELETE' });
}

export function getArtisanTimeOffs(): Promise<ArtisanTimeOffItem[]> {
  return apiRequest<ArtisanTimeOffItem[]>('/appointments/indisponibilites/');
}

export function createArtisanTimeOff(input: {
  debut: string;
  fin: string;
  motif: string;
}): Promise<ArtisanTimeOffItem> {
  return apiRequest<ArtisanTimeOffItem>('/appointments/indisponibilites/', {
    method: 'POST',
    body: input
  });
}

export function deleteArtisanTimeOff(id: number): Promise<void> {
  return apiRequest<void>(`/appointments/indisponibilites/${id}/`, { method: 'DELETE' });
}
