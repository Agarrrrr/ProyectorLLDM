import { updateSongProgress, revealCurrentCard } from './song-cards.js';
import { getSelection } from './selection.js';
import { showToast } from './shell.js';
import { isSameItem } from './html.js';
import { request } from './api.js';
import { updateLiveMonitor } from './monitor.js';
import { updateCarteleriaUi } from './carteleria.js';
import { syncBibleSlides } from './bible.js';

let globalState = null;

const statusBadge = document.getElementById("status-badge");
const statusText = document.getElementById("status-text");
const monitorStatusBadge = document.getElementById('monitor-status-badge');
const monitorStatusText = document.getElementById('monitor-status-text');

function updateUiState(state) {
  globalState = state;
  updateLiveMonitor(state);
  updateCarteleriaUi(state);
  syncBibleSlides(state);
  const active = state.phase === 'active';
  statusBadge.className = `status-badge status-${active ? 'active' : 'idle'}`;
  statusText.textContent = active ? 'EN PROYECCIÓN' : 'REPOSO';
  monitorStatusBadge.className = statusBadge.className;
  monitorStatusText.textContent = active ? 'EN VIVO' : 'REPOSO';

  const grids = { hymn: 'hymnSlidesGrid', choir: 'choirSlidesGrid', presentation: 'presentationSlidesGrid', bible: 'bibleSlidesGrid' };
  for (const [type, id] of Object.entries(grids)) {
    const matches = state.phase === 'active' && state.contentType === type && (type === 'bible' || isSameItem(getSelection(type), state.activeItem));
    document.getElementById(id)?.querySelectorAll('.slide-card').forEach((card, index) => {
      const current = matches && state.currentSlideIndex === index;
      card.classList.toggle('active-slide', current);
      if (current) card.setAttribute('aria-current', 'step');
      else card.removeAttribute('aria-current');
    });
    if (type !== 'presentation' && type !== 'bible') updateSongProgress(document.getElementById(id), state, matches);
    revealCurrentCard(document.getElementById(id), matches, state.currentSlideIndex);
  }

  // Sincronizar IP local de red si viene en el estado
  if (state.networkInfo && state.networkInfo.localIp) {
    updateNetworkIpDisplay(state.networkInfo.localIp);
  }
}

// ==============================================================
// GESTIÓN DE IP LOCAL Y ENLACE DE CONEXIÓN
// ==============================================================
async function updateNetworkIpDisplay(ipFromServer) {
  let ip = ipFromServer;
  if (!ip) {
    try {
      const res = await request('/api/ip');
      const data = await res.json();
      ip = data.ip;
    } catch (_) {
      ip = window.location.hostname;
    }
  }
  const port = window.location.port || '4000';
  const fullDisplay = ip ? `${ip}:${port}` : window.location.host;
  const headerEl = document.getElementById('header-ip-address');
  if (headerEl) headerEl.textContent = fullDisplay;
  const monEl = document.getElementById('monitor-ip-text');
  if (monEl) monEl.textContent = ip || window.location.hostname;
}

const headerIpBadge = document.getElementById('header-ip-badge');
if (headerIpBadge) {
  headerIpBadge.addEventListener('click', () => {
    showToast('Enlaza un celular desde Ajustes → Avanzado → Conectar celular por QR.');
  });
}

// CONTROL DEL MODAL DE ATAJOS DE TECLADO (F1)

export { globalState, updateNetworkIpDisplay, updateUiState };
