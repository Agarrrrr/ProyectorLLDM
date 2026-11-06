import { showToast } from './shell.js';
import { request } from './api.js';

const status = document.getElementById('updatesStatus');
const current = document.getElementById('updatesCurrent');
const save = document.getElementById('saveUpdatePreferences');
const automatic = document.getElementById('automaticUpdateChecks');
const download = document.getElementById('downloadUpdate');
const label = document.getElementById('updatePreferenceLabel');
const help = document.getElementById('updatePreferenceHelp');
const notes = document.getElementById('updateNotes');
const notesText = document.getElementById('updateNotesText');
const details = status.closest('details');
let opened = false, loaded = false, saving = false, checking = false, allowed = false, sequence = 0, timer;

function setMessage(message) {
  if (status.textContent !== message) status.textContent = message;
}

function render(snapshot, includePreferences) {
  loaded = true;
  checking = Boolean(snapshot.checking);
  allowed = snapshot.canConfigure !== false;
  if (includePreferences) automatic.checked = snapshot.preferences.automaticChecks;
  automatic.disabled = save.disabled = !allowed || saving;
  label.textContent = 'Avisar si hay una versión nueva al iniciar';
  help.textContent = snapshot.installed
    ? 'Descarga el instalador, cierra la cabina y ejecútalo para actualizar tu instalación.'
    : 'Si hay una versión nueva, puedes descargarla y extraerla en otra carpeta. Conserva tu instalación anterior para trasladar tus datos.';
  download.textContent = snapshot.installed ? 'Descargar instalador' : 'Descargar nueva versión';
  download.hidden = !snapshot.available || !snapshot.downloadUrl;
  if (download.hidden) download.removeAttribute('href');
  else download.href = snapshot.downloadUrl;
  current.textContent = snapshot.current ? `Versión: ${snapshot.current}${snapshot.checkedAt ? ' · Revisado: ' + new Date(snapshot.checkedAt).toLocaleString('es-MX') : ''}` : 'Sin consulta de versión todavía.';
  setMessage(snapshot.message + (allowed ? '' : ' Configura esta opción desde localhost en la PC del templo.'));
  notes.hidden = !snapshot.available || !snapshot.patchNotes;
  notesText.textContent = snapshot.patchNotes || '';
}

function scheduleRefresh() {
  clearTimeout(timer);
  if (opened && checking && details.open && !saving) timer = setTimeout(() => refresh(!loaded), 800);
}

async function refresh(includePreferences) {
  clearTimeout(timer);
  const turn = ++sequence;
  try {
    const snapshot = await (await request('/api/updates')).json();
    if (opened && turn === sequence) render(snapshot, includePreferences);
  } catch (error) {
    if (opened && turn === sequence) setMessage(error.message);
  } finally {
    if (turn === sequence) scheduleRefresh();
  }
}

export function openUpdateSettings() {
  opened = true;
  loaded = allowed = false;
  automatic.disabled = save.disabled = true;
  return refresh(true);
}

export function closeUpdateSettings() {
  opened = false;
  sequence++;
  clearTimeout(timer);
}

details.addEventListener('toggle', () => {
  if (opened && details.open && loaded && !saving) refresh(false);
  else clearTimeout(timer);
});

document.getElementById('updatePreferencesForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!allowed || saving) return;
  clearTimeout(timer);
  const turn = ++sequence;
  saving = true;
  automatic.disabled = save.disabled = true;
  setMessage('Guardando preferencia…');
  try {
    const response = await request('/api/updates/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automaticChecks: automatic.checked })
    });
    const snapshot = await response.json();
    if (opened && turn === sequence) {
      render(snapshot, true);
      showToast('Preferencia de actualización guardada.');
    }
  } catch (error) {
    if (opened && turn === sequence) setMessage(error.message);
  } finally {
    saving = false;
    if (opened && turn === sequence) {
      automatic.disabled = save.disabled = !allowed;
      scheduleRefresh();
    } else if (opened) refresh(true);
  }
});

async function notifyAtStartup() {
  for (let attempt = 0; attempt < 7; attempt++) {
    const snapshot = await (await request('/api/updates')).json();
    if (snapshot.available) showToast(`Versión ${snapshot.latest} disponible en Ajustes → Avanzado.`);
    if (!snapshot.checking) return;
    await new Promise(resolve => setTimeout(resolve, 650));
  }
}
notifyAtStartup().catch(() => {});
