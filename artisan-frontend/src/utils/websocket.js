export function createWebSocket(username, onMessageReceived) {
  const isLocalhost = window.location.hostname === "localhost";

  const WS_BASE_URL = isLocalhost
    ? "ws://localhost:8000"
    : "wss://artisan-ci-backend.onrender.com";

  const ws = new WebSocket(
    `${WS_BASE_URL}/ws/chat/${encodeURIComponent(username)}/`
  );

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    onMessageReceived?.(data.message);
  };

  ws.onclose = () => {
    console.log("WebSocket déconnecté");
  };

  ws.onerror = err => {
    console.error("WebSocket error", err);
  };

  return ws;
}
