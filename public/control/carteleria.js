import { request } from './api.js';
import { showToast } from './shell.js';
import { sendWsAction } from './connection.js';

const play = document.getElementById('btnPlayCarteleria');
const pause = document.getElementById('btnToggleCarteleriaLoop');
const previous = document.getElementById('btnPrevCarteleriaSlide');
const next = document.getElementById('btnNextCarteleriaSlide');
const notice = document.getElementById('carteleria-availability');
const editor = document.getElementById('carteleria-editor-frame');
const duration = document.getElementById('carteleriaDuration');
const durationStatus = document.getElementById('carteleriaDurationStatus');
let supportsDuration = false;
let rotationSeconds = 15;
let state, available = false;

function updateWeek(week) {
  if (!week?.startDate) return;
  const end = new Date(week.startDate + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() + (7 - end.getUTCDay()) % 7);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  const format = date => date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  document.getElementById('carteleriaWeekBadge').textContent = format(start) + ' al ' + format(end);
}
export function updateCarteleriaUi(value) {
  state = value;
  const active = available && state.contentType === 'carteleria' && state.phase === 'active';
  pause.disabled = !active;
  pause.querySelector('svg').innerHTML = active && state.isLooping ? '<path d="M8 5v14M16 5v14"/>' : '<path d="M7 4l14 8-14 8z"/>';
  pause.setAttribute('aria-pressed', String(active && !state.isLooping));
  pause.title = active && state.isLooping ? 'Pausar la lista y conservar esta pantalla' : 'Reanudar la lista desde esta pantalla';
  document.getElementById('carteleriaLoopLabel').textContent = !active || state.isLooping ? 'Pausar' : 'Reanudar';
  previous.disabled = !active || (!state.isLooping && state.currentSlideIndex === 0);
  next.disabled = !active || (!state.isLooping && state.currentSlideIndex >= state.slides.length - 1);
}
play.addEventListener('click', async () => {
  try { await request('/api/project/carteleria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loop: true }) }); }
  catch (error) { showToast(error.message); }
});
pause.addEventListener('click', async () => {
  try { await request('/api/project/carteleria/playback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playing: !state.isLooping }) }); }
  catch (error) { showToast(error.message); }
});
previous.addEventListener('click', () => sendWsAction('PREV_SLIDE'));
next.addEventListener('click', () => sendWsAction('NEXT_SLIDE'));
document.getElementById('btnStopCarteleria').addEventListener('click', () => sendWsAction('CLEAR_PROJECTION'));
function updateLists(snapshot) {
  updateWeek(snapshot.document.currentWeek);
  supportsDuration = Number.isInteger(snapshot.document.rotationSeconds);
  durationStatus.textContent = supportsDuration ? '' : 'Reinicia el servidor para activar el tiempo configurable.';
  duration.disabled = !available || !supportsDuration;
  rotationSeconds = snapshot.document.rotationSeconds ?? 15;
  if (document.activeElement !== duration) duration.value = rotationSeconds;
}
duration.addEventListener('change', async () => {
  if (!supportsDuration) return;
  if (!duration.reportValidity()) return;
  const seconds = Number(duration.value);
  duration.disabled = true;
  durationStatus.textContent = 'Guardando duración…';
  try {
    const response = await request('/api/lists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations: [{ path: ['rotationSeconds'], before: rotationSeconds, value: seconds }] }) });
    updateLists(await response.json());
    duration.value = rotationSeconds;
    durationStatus.textContent = `Cada vista durará ${rotationSeconds} segundos.`;
    showToast('Duración guardada');
  } catch (error) {
    showToast(error.message);
    try { updateLists(await (await request('/api/lists')).json()); } catch {}
    duration.value = rotationSeconds;
    durationStatus.textContent = supportsDuration ? error.message : 'Reinicia el servidor para activar el tiempo configurable.';
  } finally { duration.disabled = !available || !supportsDuration; }
});
window.addEventListener('lists-updated', event => updateLists(event.detail));
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== editor?.contentWindow) return;
  if (event.data?.type === 'CARTELERIA_EMBED_HEIGHT' && Number.isFinite(event.data.height)) editor.style.height = Math.max(540, Math.ceil(event.data.height) + 8) + 'px';
});
async function initialize() {
  play.disabled = true;
  try {
    const info = await (await request('/api/carteleria/info')).json();
    available = info.hasApp; play.disabled = !available; notice.hidden = available;
    notice.textContent = available ? '' : 'Lista de oraciones no disponible en este equipo.';
    const snapshot = await (await request('/api/lists')).json(); updateLists(snapshot);
    if (state) updateCarteleriaUi(state);
  } catch { notice.hidden = false; notice.textContent = 'Sin conexión'; }
}
initialize();
