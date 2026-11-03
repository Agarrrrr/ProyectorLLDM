import { initializeFloatingMonitor } from './floating-monitor.js';

let serverConnected = false;
let screenConnected = false;
let serverRevision = -1;
let screenRevision = -1;

function refreshConnection() {
  const notice = document.getElementById('tv-connection');
  const synchronized = serverConnected && screenConnected && screenRevision === serverRevision;
  notice.classList.toggle('connected', synchronized);
  notice.hidden = synchronized || (serverConnected && screenConnected);
  notice.textContent = notice.hidden ? '' : 'Sin conexión';
  document.getElementById('preview-frame-container').classList.toggle('output-unconfirmed', !synchronized);
}

export function updateConnection(connected) {
  serverConnected = connected;
  refreshConnection();
}

export function updateLiveMonitor(state) {
  serverRevision = state.revision ?? 0;
  const hasContent = state.slides.length > 0;
  const active = state.phase === 'active';
  for (const id of ['btn-toggle-idle', 'mon-btn-toggle-idle']) {
    const button = document.getElementById(id);
    button.disabled = !active && !hasContent;
    button.querySelector('span').textContent = active ? 'Mostrar fondo de reposo' : 'Reanudar proyección';
    button.title = active ? 'Mostrar el fondo institucional y conservar el contenido' : 'Volver al contenido conservado';
  }
  const nav = {
    'mon-btn-prev': !hasContent || (state.currentSlideIndex === 0 && !state.isLooping),
    'mon-btn-next': !hasContent || (state.currentSlideIndex >= state.slides.length - 1 && !state.isLooping),
    'footer-btn-prev-slide': !hasContent || (state.currentSlideIndex === 0 && !state.isLooping),
    'footer-btn-next-slide': !hasContent || (state.currentSlideIndex >= state.slides.length - 1 && !state.isLooping)
  };
  for (const [id, disabled] of Object.entries(nav)) {
    const button = document.getElementById(id);
    if (button) button.disabled = state.contentType === 'carteleria' ? false : disabled;
  }
  refreshConnection();
}

export function initializeMonitors() {
  const tv = document.getElementById('preview-iframe');
  const overlay = document.getElementById('preview-overlay-iframe');
  tv.addEventListener('load', () => {
    screenConnected = false;
    tv.contentWindow.postMessage({ type: 'REQUEST_TV_STATUS' }, location.origin);
    refreshConnection();
  });
  // The frame can finish loading before this module is initialized.
  tv.contentWindow.postMessage({ type: 'REQUEST_TV_STATUS' }, location.origin);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== tv.contentWindow || event.data?.type !== 'TV_OUTPUT_STATUS') return;
    screenConnected = event.data.connected;
    screenRevision = event.data.revision;
    refreshConnection();
  });
  const toggle = document.getElementById('btnTogglePip');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.addEventListener('click', () => {
    const collapsed = document.querySelector('.monitor-card').classList.toggle('pip-collapsed');
    document.querySelector('.right-monitor-column').classList.toggle('pip-minimized', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.title = collapsed ? 'Expandir vista de TV' : 'Minimizar vista de TV';
  });
  document.querySelectorAll('[data-output-url]').forEach(node => {
    node.textContent = new URL(node.dataset.outputUrl, location.origin).href;
  });
  initializeFloatingMonitor();
}
