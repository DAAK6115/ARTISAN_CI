import { apiRequest } from '../../api/http';

export interface ReviewItem {
  id: number;
  client: string;
  service: number;
  service_titre: string;
  commentaire: string;
  note: number;
  date_creation: string;
}

export function getServiceReviews(serviceId: number): Promise<ReviewItem[]> {
  return apiRequest<ReviewItem[]>(`/reviews/service/${serviceId}/`, { auth: false });
}

export function getArtisanReviews(username: string): Promise<ReviewItem[]> {
  return apiRequest<ReviewItem[]>(`/reviews/artisan/${encodeURIComponent(username)}/`, { auth: false });
}
