import { apiRequest } from '../../api/http';
import type { PublicPortfolio, Realisation } from '../portfolio/portfolio.api';
import type { UserProfile } from '../profile/profile.api';

export interface ArtisanPortfolio extends PublicPortfolio {}

export interface QuoteLineInput {
  description: string;
  quantity: string;
  unit_price: string;
  position?: number;
}

export interface QuoteLine extends QuoteLineInput {
  id: number;
  total: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export interface ArtisanQuote {
  id: number;
  reference: string;
  appointment: number;
  artisan: number;
  artisan_username: string;
  client: number;
  client_username: string;
  service_titre: string;
  appointment_status: string | null;
  status: QuoteStatus;
  notes: string;
  valid_until: string | null;
  subtotal: string;
  discount_amount: string;
  total: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  is_expired: boolean;
  lines: QuoteLine[];
}

export interface PaymentRecord {
  id: number;
  client: string;
  service: number;
  service_titre: string;
  artisan_username: string;
  appointment: number | null;
  quote: number | null;
  quote_reference: string | null;
  appointment_status: string | null;
  montant_initial: string;
  reduction: string;
  montant: string;
  currency: string;
  methode_paiement: string | null;
  methode_paiement_label: string | null;
  statut: 'paid' | 'unpaid';
  transaction_id: string;
  payment_reference: string;
  declared_by_username: string | null;
  declared_at: string | null;
  paid_at: string | null;
  notes: string;
  date_paiement: string;
  updated_at: string;
}

export interface PaymentWorkspaceRow {
  appointment_id: number;
  client_username: string;
  service_titre: string;
  appointment_status: string;
  date_rdv: string;
  completed_at: string | null;
  amount: string | number;
  quote_reference: string | null;
  can_declare: boolean;
  payment: PaymentRecord | null;
}


export interface CompleteServicePaymentInfo {
  appointment_id: number;
  client_username: string;
  service_titre: string;
  montant: string | number;
  currency: string;
  quote_reference: string | null;
  payment_methods: Array<{ value: string; label: string }>;
}

export interface CompleteServicePaymentResponse {
  message: string;
  appointment_status: 'termine';
  payment: PaymentRecord;
}

export interface CertificationItem {
  id: number;
  artisan: number;
  artisan_username: string;
  nom: string;
  organisme: string;
  fichier: string;
  valide_jusquau: string | null;
  status: 'pending' | 'in_review' | 'verified' | 'rejected';
  status_label: string;
  reviewed_by: number | null;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  review_note: string;
  date_ajout: string;
}

export function updateArtisanAccount(input: {
  username?: string;
  numero_momo?: string;
  qr_wave?: File | null;
}): Promise<Partial<UserProfile>> {
  const data = new FormData();
  if (input.username !== undefined) data.append('username', input.username.trim());
  if (input.numero_momo !== undefined) data.append('numero_momo', input.numero_momo.trim());
  if (input.qr_wave) data.append('qr_wave', input.qr_wave);
  return apiRequest<Partial<UserProfile>>('/accounts/profile/update/', { method: 'PUT', body: data });
}

export function requestArtisanVerification(): Promise<{ message: string; verification_status: string }> {
  return apiRequest('/accounts/artisan/verification/request/', { method: 'POST' });
}

export function getMyPortfolio(): Promise<ArtisanPortfolio> {
  return apiRequest<ArtisanPortfolio>('/portfolio/me/');
}

export function updateMyPortfolio(input: {
  bio?: string;
  site_web?: string;
  facebook?: string;
  whatsapp?: string;
  localisation?: string;
  latitude?: string;
  longitude?: string;
  visible?: boolean;
  photo_couverture?: File | null;
}): Promise<ArtisanPortfolio> {
  const data = new FormData();
  if (input.bio !== undefined) data.append('bio', input.bio.trim());
  if (input.site_web !== undefined) data.append('site_web', input.site_web.trim());
  if (input.facebook !== undefined) data.append('facebook', input.facebook.trim());
  if (input.whatsapp !== undefined) data.append('whatsapp', input.whatsapp.trim());
  if (input.localisation !== undefined) data.append('localisation', input.localisation.trim());
  if (input.latitude?.trim()) data.append('latitude', input.latitude.trim());
  if (input.longitude?.trim()) data.append('longitude', input.longitude.trim());
  if (input.visible !== undefined) data.append('visible', input.visible ? 'true' : 'false');
  if (input.photo_couverture) data.append('photo_couverture', input.photo_couverture);
  return apiRequest<ArtisanPortfolio>('/portfolio/me/', { method: 'PATCH', body: data });
}

export function addRealisation(input: { titre: string; description: string; image: File }): Promise<Realisation> {
  const data = new FormData();
  data.append('titre', input.titre.trim());
  data.append('description', input.description.trim());
  data.append('image', input.image);
  return apiRequest<Realisation>('/portfolio/realisation/add/', { method: 'POST', body: data });
}

export function deleteRealisation(id: number): Promise<void> {
  return apiRequest<void>(`/portfolio/realisation/${id}/`, { method: 'DELETE' });
}

export function getArtisanQuotes(): Promise<ArtisanQuote[]> {
  return apiRequest<ArtisanQuote[]>('/payments/quotes/artisan/');
}

export function createArtisanQuote(input: {
  appointment: number;
  notes: string;
  valid_until: string | null;
  discount_amount: string;
  lines: QuoteLineInput[];
}): Promise<ArtisanQuote> {
  return apiRequest<ArtisanQuote>('/payments/quotes/artisan/', { method: 'POST', body: input });
}

export function deleteArtisanQuote(id: number): Promise<void> {
  return apiRequest<void>(`/payments/quotes/${id}/`, { method: 'DELETE' });
}

export function sendArtisanQuote(id: number): Promise<ArtisanQuote> {
  return apiRequest<ArtisanQuote>(`/payments/quotes/${id}/send/`, { method: 'POST' });
}

export function getPaymentWorkspace(): Promise<PaymentWorkspaceRow[]> {
  return apiRequest<PaymentWorkspaceRow[]>('/payments/artisan-workspace/');
}

export function getArtisanPayments(): Promise<PaymentRecord[]> {
  return apiRequest<PaymentRecord[]>('/payments/recus-artisan/');
}

export function declarePayment(input: {
  appointment_id: number;
  statut: 'paid' | 'unpaid';
  methode_paiement?: string | null;
  payment_reference?: string;
  notes?: string;
}): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>('/payments/declare/', { method: 'POST', body: input });
}

export function getMyCertifications(): Promise<CertificationItem[]> {
  return apiRequest<CertificationItem[]>('/certifications/mes/');
}

export function addCertification(input: {
  nom: string;
  organisme: string;
  valide_jusquau: string;
  fichier: File;
}): Promise<CertificationItem> {
  const data = new FormData();
  data.append('nom', input.nom.trim());
  data.append('organisme', input.organisme.trim());
  if (input.valide_jusquau) data.append('valide_jusquau', input.valide_jusquau);
  data.append('fichier', input.fichier);
  return apiRequest<CertificationItem>('/certifications/ajouter/', { method: 'POST', body: data });
}

export function deleteCertification(id: number): Promise<void> {
  return apiRequest<void>(`/certifications/${id}/supprimer/`, { method: 'DELETE' });
}
export function getCompleteServicePayment(appointmentId: number): Promise<CompleteServicePaymentInfo> {
  return apiRequest<CompleteServicePaymentInfo>(`/payments/complete-service/${appointmentId}/`);
}

export function completeServiceWithPayment(appointmentId: number, input: {
  statut: 'paid' | 'unpaid';
  methode_paiement?: string | null;
  payment_reference?: string;
  notes?: string;
}): Promise<CompleteServicePaymentResponse> {
  return apiRequest<CompleteServicePaymentResponse>(`/payments/complete-service/${appointmentId}/`, {
    method: 'POST',
    body: input
  });
}

