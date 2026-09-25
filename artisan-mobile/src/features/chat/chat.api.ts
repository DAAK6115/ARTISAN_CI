import { apiRequest } from '../../api/http';

export interface ChatContact {
  id: number;
  username: string;
  role: 'client' | 'artisan' | 'admin';
  unread_count: number;
  last_message: string;
  last_message_at: string | null;
  online: boolean;
  last_seen_at: string | null;
  blocked_by_me: boolean;
}

export interface ChatMessage {
  id: number;
  sender: number;
  receiver: number;
  content: string;
  timestamp: string;
  is_read: boolean;
  sender_username: string;
  receiver_username: string;
  media_url: string | null;
  audio_url: string | null;
  delivered_at: string | null;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  status: 'envoye' | 'recu' | 'lu';
  reply_to: number | null;
  reply_preview: { id: number; sender_username: string; content: string } | null;
  location_lat: string | null;
  location_lng: string | null;
}

export function getChatContacts(): Promise<ChatContact[]> {
  return apiRequest<ChatContact[]>('/chat/messages/contacts/');
}

export function getMessages(contactId: number): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(`/chat/messages/${contactId}/`);
}

export function markConversationRead(contactId: number): Promise<{ read: number }> {
  return apiRequest<{ read: number }>(`/chat/messages/${contactId}/read/`, { method: 'POST' });
}

export function sendMessage(receiver: number, content: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>('/chat/messages/send/', {
    method: 'POST',
    body: { receiver, content }
  });
}
