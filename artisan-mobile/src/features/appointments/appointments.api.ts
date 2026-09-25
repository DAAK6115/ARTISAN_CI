import { apiRequest } from '../../api/http';

export interface AvailableSlot {
  start: string;
  end: string;
  label: string;
}

export interface AvailableSlotsResponse {
  service_id: number;
  date: string;
  duree_minutes: number;
  slots: AvailableSlot[];
}

export interface AppointmentItem {
  id: number;
  client: number;
  client_nom: string;
  service: number;
  service_id: number;
  service_titre: string;
  service_prix: string;
  service_duree_minutes: number;
  artisan_nom: string;
  date_rdv: string;
  date_fin: string;
  statut: string;
  statut_label: string;
  transitions_autorisees: string[];
  peut_annuler: boolean;
  commentaires: string | null;
  resume: string | null;
  motif_annulation: string;
  methode_paiement: string | null;
  note_client: number | null;
  commentaire_client: string | null;
  montant: string | null;
  rating: number | null;
  accepte_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  client_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getAvailableSlots(serviceId: number, date: string): Promise<AvailableSlotsResponse> {
  const query = new URLSearchParams({ date });
  return apiRequest<AvailableSlotsResponse>(`/appointments/creneaux/${serviceId}/?${query.toString()}`);
}

export function createAppointment(input: { service: number; date_rdv: string; commentaires?: string }): Promise<AppointmentItem> {
  return apiRequest<AppointmentItem>('/appointments/create/', {
    method: 'POST',
    body: input
  });
}

export function getMyAppointments(): Promise<AppointmentItem[]> {
  return apiRequest<AppointmentItem[]>('/appointments/mes/');
}

export function updateAppointmentStatus(appointmentId: number, statut: string, motif?: string): Promise<AppointmentItem> {
  return apiRequest<AppointmentItem>(`/appointments/${appointmentId}/changer-statut/`, {
    method: 'PATCH',
    body: { statut, motif }
  });
}
