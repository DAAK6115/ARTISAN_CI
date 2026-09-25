import { ApiError, apiRequest } from '../../api/http';
import type { AppointmentItem } from '../appointments/appointments.api';
import type { ServiceItem } from '../home/services.api';
import type { PublicPortfolio } from '../portfolio/portfolio.api';
import type { ReviewItem } from '../reviews/reviews.api';

export interface FavoriteItem {
  id: number;
  service: ServiceItem;
  date_added: string;
}

export interface QuoteLineItem {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  position: number;
  total: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface ClientQuoteItem {
  id: number;
  reference: string;
  appointment: number;
  artisan: number;
  artisan_username: string;
  client: number;
  client_username: string;
  service_titre: string;
  appointment_status: string;
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
  lines: QuoteLineItem[];
}

export interface PaymentAttemptItem {
  id: number;
  provider_reference: string;
  status: string;
  gateway: string;
  checkout_url: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ClientPaymentItem {
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
  statut: PaymentStatus;
  transaction_id: string;
  payment_reference: string;
  provider: 'manual' | 'geniuspay';
  provider_reference: string;
  provider_status: string;
  checkout_url: string;
  initiated_at: string | null;
  confirmed_at: string | null;
  failed_at: string | null;
  declared_by_username: string | null;
  declared_at: string | null;
  paid_at: string | null;
  notes: string;
  date_paiement: string;
  updated_at: string;
  attempts: PaymentAttemptItem[];
}

export interface ClientPaymentWorkspaceRow {
  appointment_id: number;
  service_titre: string;
  artisan_username: string;
  appointment_status: string;
  completed_at: string | null;
  amount: string | number | null;
  quote_reference: string | null;
  can_pay: boolean;
  error: string;
  payment: ClientPaymentItem | null;
}

export interface GeniusPayInitiation {
  payment: ClientPaymentItem;
  checkout_url: string;
  provider_reference: string;
}

export interface NotificationServiceMini {
  id: number;
  titre: string;
  artisan_username: string;
}

export interface NotificationItem {
  id: number;
  titre: string;
  message: string;
  lu: boolean;
  date_envoi: string;
  lien_redirection: string;
  rendez_vous: number | null;
  rendez_vous_id: number | null;
  service: NotificationServiceMini | null;
  destinataire: number;
}

export type SupportStatus = 'new' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export interface SupportTicketItem {
  id: number;
  requester_username: string;
  requester_role: string;
  objet: string;
  message: string;
  statut: SupportStatus;
  statut_label: string;
  priorite: 'low' | 'normal' | 'high' | 'urgent';
  priorite_label: string;
  admin_response: string;
  assigned_to_username: string | null;
  date_envoi: string;
  updated_at: string;
  closed_at: string | null;
}

export interface CreateReviewInput {
  rendez_vous: number;
  service: number;
  note: number;
  commentaire: string;
}

export function getFavorites(): Promise<FavoriteItem[]> {
  return apiRequest<FavoriteItem[]>('/favoris/mes/');
}

export function toggleFavorite(serviceId: number): Promise<{ is_favorite?: boolean; is_favori?: boolean }> {
  return apiRequest(`/favoris/toggle/${serviceId}/`, { method: 'POST' });
}

export function getClientQuotes(): Promise<ClientQuoteItem[]> {
  return apiRequest<ClientQuoteItem[]>('/payments/quotes/client/');
}

export function acceptQuote(id: number): Promise<ClientQuoteItem> {
  return apiRequest<ClientQuoteItem>(`/payments/quotes/${id}/accept/`, { method: 'POST' });
}

export function rejectQuote(id: number): Promise<ClientQuoteItem> {
  return apiRequest<ClientQuoteItem>(`/payments/quotes/${id}/reject/`, { method: 'POST' });
}

export function getClientPayments(): Promise<ClientPaymentItem[]> {
  return apiRequest<ClientPaymentItem[]>('/payments/mes/');
}

export function getClientPaymentWorkspace(): Promise<ClientPaymentWorkspaceRow[]> {
  return apiRequest<ClientPaymentWorkspaceRow[]>('/payments/client-workspace/');
}

export function initiateGeniusPayPayment(appointmentId: number): Promise<GeniusPayInitiation> {
  return apiRequest<GeniusPayInitiation>(`/payments/geniuspay/initiate/${appointmentId}/`, { method: 'POST' });
}

export function syncGeniusPayPayment(paymentId: number): Promise<ClientPaymentItem> {
  return apiRequest<ClientPaymentItem>(`/payments/geniuspay/sync/${paymentId}/`, { method: 'POST' });
}

export function getMyReviews(): Promise<ReviewItem[]> {
  return apiRequest<ReviewItem[]>('/reviews/mes/');
}

export function createReview(input: CreateReviewInput): Promise<ReviewItem & { rendez_vous?: number }> {
  return apiRequest('/reviews/create/', { method: 'POST', body: input });
}

export function getNotifications(): Promise<NotificationItem[]> {
  return apiRequest<NotificationItem[]>('/notifications/');
}

export function markNotificationRead(id: number): Promise<{ message: string }> {
  return apiRequest(`/notifications/${id}/lu/`, { method: 'PATCH' });
}

export function getSupportTickets(): Promise<SupportTicketItem[]> {
  return apiRequest<SupportTicketItem[]>('/support/mes/');
}

export function createSupportTicket(input: { objet: string; message: string }): Promise<SupportTicketItem> {
  return apiRequest<SupportTicketItem>('/support/envoyer/', { method: 'POST', body: input });
}

function normalizeCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['results', 'data', 'items']) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }
  throw new ApiError('Réponse invalide reçue pour la liste des artisans proches.', 502, payload);
}

export async function getNearbyArtisans(params: { lat: number; lng: number; radius: number }): Promise<PublicPortfolio[]> {
  const lat = Number(params.lat.toFixed(4));
  const lng = Number(params.lng.toFixed(4));
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(params.radius) });
  const payload = await apiRequest<unknown>(`/portfolio/map/?${query.toString()}`, { auth: false });
  return normalizeCollection<PublicPortfolio>(payload);
}

export function completedAppointmentsForReview(appointments: AppointmentItem[]): AppointmentItem[] {
  return appointments.filter((item) => item.statut === 'effectue');
}
