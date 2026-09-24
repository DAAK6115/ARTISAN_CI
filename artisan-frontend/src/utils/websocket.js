import axios from './axiosInstance';

function resolveWsBaseUrl() {
  const explicit = (process.env.REACT_APP_WS_BASE_URL || '').replace(/\/$/, '');
  if (explicit) return explicit;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (local) return 'ws://localhost:8000';
  return 'wss://artisan-ci-backend.onrender.com';
}

export function createChatSocket(onEvent) {
  let socket = null;
  let stopped = false;
  let retryMs = 1000;
  let retryTimer = null;
  let heartbeat = null;

  const emit = (payload) => onEvent?.(payload);

  const connect = async () => {
    if (stopped) return;
    try {
      const { data } = await axios.post('/chat/ws-ticket/');
      if (!data?.ticket || stopped) return;
      socket = new WebSocket(`${resolveWsBaseUrl()}/ws/chat/?ticket=${encodeURIComponent(data.ticket)}`);

      socket.onopen = () => {
        retryMs = 1000;
        emit({ type: 'socket_status', connected: true });
        heartbeat = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'presence_ping' }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try { emit(JSON.parse(event.data)); } catch { /* ignore malformed event */ }
      };

      socket.onclose = () => {
        if (heartbeat) window.clearInterval(heartbeat);
        heartbeat = null;
        emit({ type: 'socket_status', connected: false });
        if (!stopped) {
          retryTimer = window.setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, 15000);
        }
      };

      socket.onerror = () => socket?.close();
    } catch {
      emit({ type: 'socket_status', connected: false });
      if (!stopped) {
        retryTimer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      }
    }
  };

  connect();

  return {
    sendTyping(receiverId, typing) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'typing', receiver_id: receiverId, typing: Boolean(typing) }));
      }
    },
    close() {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (heartbeat) window.clearInterval(heartbeat);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'page_closed');
    },
  };
}
