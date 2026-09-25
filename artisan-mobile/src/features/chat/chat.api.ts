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

export interface ChatAccess {
  allowed: boolean;
  blocked: boolean;
  blocked_by_me: boolean;
}

export interface SendMessageInput {
  receiver: number;
  content?: string;
  media?: File | null;
  audio?: File | null;
  reply_to?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
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

export function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const hasFile = Boolean(input.media || input.audio);
  if (hasFile) {
    const body = new FormData();
    body.append('receiver', String(input.receiver));
    if (input.content?.trim()) body.append('content', input.content.trim());
    if (input.media) body.append('media', input.media);
    if (input.audio) body.append('audio', input.audio);
    if (input.reply_to) body.append('reply_to', String(input.reply_to));
    if (input.location_lat != null) body.append('location_lat', String(input.location_lat));
    if (input.location_lng != null) body.append('location_lng', String(input.location_lng));
    return apiRequest<ChatMessage>('/chat/messages/send/', { method: 'POST', body });
  }

  return apiRequest<ChatMessage>('/chat/messages/send/', {
    method: 'POST',
    body: {
      receiver: input.receiver,
      content: input.content?.trim() ?? '',
      reply_to: input.reply_to ?? undefined,
      location_lat: input.location_lat ?? undefined,
      location_lng: input.location_lng ?? undefined
    }
  });
}

export function updateMessage(id: number, content: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/chat/messages/${id}/update/`, {
    method: 'PATCH',
    body: { content: content.trim() }
  });
}

export function deleteMessage(id: number): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(`/chat/messages/${id}/delete/`, { method: 'DELETE' });
}

export function toggleChatBlock(userId: number): Promise<{ blocked: boolean }> {
  return apiRequest<{ blocked: boolean }>(`/chat/blocks/${userId}/toggle/`, { method: 'POST' });
}

export function getChatAccess(userId: number): Promise<ChatAccess> {
  return apiRequest<ChatAccess>(`/chat/access/${userId}/`);
}

export function getWebSocketTicket(): Promise<{ ticket: string }> {
  return apiRequest<{ ticket: string }>('/chat/ws-ticket/', { method: 'POST' });
}
