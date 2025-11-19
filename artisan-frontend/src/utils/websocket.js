// src/utils/websocket.js (par ex.)

export function createWebSocket(username, onMessageReceived) {
  // Choix de la base en fonction de l'environnement
  const WS_BASE_URL =
    import.meta.env.VITE_WS_URL ||
    (window.location.hostname === "localhost"
      ? "ws://localhost:8000"                             // dev
      : "wss://artisan-ci-backend.onrender.com");         // prod (Render)

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
