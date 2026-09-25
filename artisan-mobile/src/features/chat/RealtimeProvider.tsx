import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../api/http';
import { env } from '../../lib/env';
import { getWebSocketTicket } from './chat.api';

interface RealtimeContextValue {
  connected: boolean;
  isTyping: (userId: number) => boolean;
  sendTyping: (receiverId: number, typing: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const FALLBACK_REFRESH_MS = 8_000;
const CONNECTED_SAFETY_REFRESH_MS = 60_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const HEARTBEAT_MS = 25_000;
const HANDSHAKE_TIMEOUT_MS = 10_000;
const MAX_FAILED_HANDSHAKES = 5;
const FAILED_SERVER_COOLDOWN_MS = 60_000;

function wsUrl(ticket: string) {
  const api = new URL(env.apiBaseUrl, window.location.origin);
  api.protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  api.pathname = '/ws/chat/';
  api.search = '';
  api.hash = '';
  api.searchParams.set('ticket', ticket);
  return api.toString();
}

function reconnectDelay(attempt: number): number {
  const base = Math.min(MAX_RECONNECT_DELAY_MS, 2_000 * 2 ** Math.min(attempt, 5));
  return base + Math.round(Math.random() * 750);
}

function shouldAutoRefresh(queryKey: readonly unknown[]) {
  // Ce GET n'est valable que pendant l'étape précise "en_cours". Le
  // resynchroniser globalement après chaque événement crée des 400 inutiles.
  return queryKey[0] !== 'artisan-complete-service';
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const handshakeTimerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const connectingRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const failedHandshakeRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const typingTimersRef = useRef(new Map<number, number>());
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(() => new Set());

  const refetchActive = useCallback(() => {
    if (!navigator.onLine || document.visibilityState === 'hidden') return;
    void queryClient.refetchQueries({
      type: 'active',
      predicate: (query) => shouldAutoRefresh(query.queryKey)
    });
  }, [queryClient]);

  const invalidateBusinessData = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => shouldAutoRefresh(query.queryKey),
      refetchType: 'active'
    });
  }, [queryClient]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearHandshakeTimer = useCallback(() => {
    if (handshakeTimerRef.current !== null) {
      window.clearTimeout(handshakeTimerRef.current);
      handshakeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;

    const scheduleReconnect = (forcedDelay?: number) => {
      if (stoppedRef.current || reconnectTimerRef.current !== null || !navigator.onLine) return;

      const now = Date.now();
      const cooldownRemaining = Math.max(0, cooldownUntilRef.current - now);
      const delay = Math.max(
        forcedDelay ?? reconnectDelay(reconnectAttemptRef.current++),
        cooldownRemaining
      );

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void connect();
      }, delay);
    };

    const handleRealtimePayload = (payload: Record<string, unknown>) => {
      const type = String(payload.type ?? '');

      if (type === 'typing') {
        const senderId = Number(payload.sender_id);
        if (!Number.isInteger(senderId) || senderId <= 0) return;

        const typing = Boolean(payload.typing);
        setTypingUsers((current) => {
          const next = new Set(current);
          if (typing) next.add(senderId);
          else next.delete(senderId);
          return next;
        });

        const previous = typingTimersRef.current.get(senderId);
        if (previous) window.clearTimeout(previous);

        if (typing) {
          typingTimersRef.current.set(
            senderId,
            window.setTimeout(() => {
              setTypingUsers((current) => {
                const next = new Set(current);
                next.delete(senderId);
                return next;
              });
              typingTimersRef.current.delete(senderId);
            }, 2_000)
          );
        }
        return;
      }

      if (type === 'presence') {
        void queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] });
        return;
      }

      if (['new_message', 'message_updated', 'message_deleted', 'read', 'delivered'].includes(type)) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] }),
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] }),
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        ]);
        return;
      }

      if (type === 'notification') {
        invalidateBusinessData();
      }
    };

    async function connect() {
      if (
        stoppedRef.current ||
        connectingRef.current ||
        !navigator.onLine ||
        Date.now() < cooldownUntilRef.current ||
        socketRef.current?.readyState === WebSocket.OPEN ||
        socketRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      connectingRef.current = true;
      clearReconnectTimer();

      try {
        const { ticket } = await getWebSocketTicket();
        if (stoppedRef.current) return;

        const socket = new WebSocket(wsUrl(ticket));
        socketRef.current = socket;
        let opened = false;

        handshakeTimerRef.current = window.setTimeout(() => {
          if (socket.readyState === WebSocket.CONNECTING) socket.close();
        }, HANDSHAKE_TIMEOUT_MS);

        socket.onopen = () => {
          opened = true;
          clearHandshakeTimer();
          failedHandshakeRef.current = 0;
          reconnectAttemptRef.current = 0;
          cooldownUntilRef.current = 0;
          setConnected(true);
          socket.send(JSON.stringify({ type: 'presence_ping' }));
          refetchActive();

          clearHeartbeat();
          heartbeatRef.current = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'presence_ping' }));
            }
          }, HEARTBEAT_MS);
        };

        socket.onmessage = (event) => {
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(String(event.data)) as Record<string, unknown>;
          } catch {
            return;
          }
          handleRealtimePayload(payload);
        };

        socket.onerror = () => setConnected(false);

        socket.onclose = () => {
          clearHandshakeTimer();
          clearHeartbeat();
          setConnected(false);
          if (socketRef.current === socket) socketRef.current = null;

          if (!opened) {
            failedHandshakeRef.current += 1;
            if (failedHandshakeRef.current >= MAX_FAILED_HANDSHAKES) {
              // Si le serveur ASGI/WS n'est pas démarré (ex. HTTP 404 pendant
              // le handshake), on cesse de générer des tickets en boucle.
              cooldownUntilRef.current = Date.now() + FAILED_SERVER_COOLDOWN_MS;
              failedHandshakeRef.current = 0;
              reconnectAttemptRef.current = 0;
              scheduleReconnect(FAILED_SERVER_COOLDOWN_MS);
              return;
            }
          }

          if (!stoppedRef.current) scheduleReconnect();
        };
      } catch (error) {
        setConnected(false);
        if (error instanceof ApiError && error.status === 429) {
          cooldownUntilRef.current = Date.now() + 60_000;
          scheduleReconnect(60_000);
        } else {
          scheduleReconnect();
        }
      } finally {
        connectingRef.current = false;
      }
    }

    const onOnline = () => {
      reconnectAttemptRef.current = 0;
      cooldownUntilRef.current = 0;
      refetchActive();
      void connect();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refetchActive();
      if (!connected && Date.now() >= cooldownUntilRef.current) void connect();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    void connect();

    return () => {
      stoppedRef.current = true;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearReconnectTimer();
      clearHeartbeat();
      clearHandshakeTimer();
      for (const timer of typingTimersRef.current.values()) window.clearTimeout(timer);
      typingTimersRef.current.clear();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
    // Le cycle de connexion est volontairement indépendant de `connected`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearHandshakeTimer, clearHeartbeat, clearReconnectTimer, invalidateBusinessData, queryClient, refetchActive]);

  // Même si le WebSocket est indisponible, les deux comptes continuent à se
  // synchroniser automatiquement. Une connexion WS active rend la synchro
  // immédiate ; sinon ce polling est le filet de sécurité.
  useEffect(() => {
    const interval = window.setInterval(
      refetchActive,
      connected ? CONNECTED_SAFETY_REFRESH_MS : FALLBACK_REFRESH_MS
    );
    return () => window.clearInterval(interval);
  }, [connected, refetchActive]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      isTyping: (userId: number) => typingUsers.has(userId),
      sendTyping: (receiverId: number, typing: boolean) => {
        const socket = socketRef.current;
        if (
          !socket ||
          socket.readyState !== WebSocket.OPEN ||
          !Number.isInteger(receiverId) ||
          receiverId <= 0
        ) return;

        socket.send(JSON.stringify({ type: 'typing', receiver_id: receiverId, typing }));
      }
    }),
    [connected, typingUsers]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error('useRealtime doit être utilisé dans RealtimeProvider.');
  return value;
}
