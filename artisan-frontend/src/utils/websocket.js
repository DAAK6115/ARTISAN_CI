export function createWebSocket(_username, onMessageReceived) {
  const isLocalhost = window.location.hostname === "localhost";

  const WS_BASE_URL = isLocalhost
    ? "ws://localhost:8000"
    : "wss://artisan-ci-backend.onrender.com";

  const token =
    localStorage.getItem("access") || localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentification requise pour ouvrir la messagerie.");
  }

  // Le serveur détermine l'identité du salon à partir du JWT.
  // Le username fourni par le navigateur n'est plus utilisé comme identité.
  const ws = new WebSocket(
    `${WS_BASE_URL}/ws/chat/?token=${encodeURIComponent(token)}`
  );

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessageReceived?.(data.message);
    } catch {
      // Ne jamais faire planter l'interface à cause d'un message WS mal formé.
    }
  };

  ws.onclose = () => {
    // Pas de données sensibles dans les logs du navigateur.
  };

  ws.onerror = () => {
    // L'UI gère les erreurs via les requêtes HTTP et les états de chargement.
  };

  return ws;
}
