let socket;
let reconnectTimer;
let connectionHandler = () => {};

export function sendWsAction(action, extra = {}) {
  if (socket?.readyState !== WebSocket.OPEN) {
    throw new Error('Sin conexión con el servidor. Espera a que se reconecte.');
  }
  socket.send(JSON.stringify({ action, ...extra }));
}

export function connectProjection({ onState, onConnection }) {
  connectionHandler = onConnection;
  clearTimeout(reconnectTimer);
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
  connectionHandler(false);
  socket.onmessage = event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'STATE_UPDATE' && message.state) {
        onState(message.state);
        connectionHandler(true);
      } else if (message.type === 'LISTS_UPDATE') {
        window.dispatchEvent(new CustomEvent('lists-updated', { detail: message }));
      } else if (message.type === 'MOBILE_DEVICE_JOINED') {
        window.dispatchEvent(new CustomEvent('mobile-device-joined', { detail: message.device }));
      }
    } catch (error) {
      console.error('No se pudo sincronizar la cabina:', error);
      connectionHandler(false);
    }
  };
  socket.onclose = () => {
    connectionHandler(false);
    reconnectTimer = setTimeout(() => connectProjection({ onState, onConnection }), 2000);
  };
  socket.onerror = () => socket.close();
}

window.addEventListener('pagehide', () => {
  clearTimeout(reconnectTimer);
  if (socket) { socket.onclose = null; socket.close(); }
});
