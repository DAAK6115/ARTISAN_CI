export function createWebSocket(username, onMessageReceived) {
  const ws = new WebSocket(`ws://localhost:8000/ws/chat/${username}/`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessageReceived(data.message);
  };

  ws.onclose = () => {
    console.log('WebSocket déconnecté');
  };

  return ws;
}
