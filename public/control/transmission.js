import { showToast } from './shell.js';
import { sendWsAction } from './connection.js';

function broadcastToOverlay(payload) {
  sendWsAction('BROADCAST_OVERLAY', { payload });

}

function hideOverlay() {
  sendWsAction('HIDE_OVERLAY');
  showToast('Banner de transmisión ocultado');
}

export { broadcastToOverlay, hideOverlay };
