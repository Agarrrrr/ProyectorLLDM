import { showToast } from './shell.js';
import { request } from './api.js';
const status = document.getElementById('updatesStatus');
const current = document.getElementById('updatesCurrent');
const save = document.getElementById('saveUpdatePreferences');
const automatic = document.getElementById('automaticUpdateChecks');
const download = document.getElementById('downloadUpdate');
let opened = false, sequence = 0;
function render(snapshot, includePreferences = true) {
  const allowed = snapshot.canConfigure !== false;
  if (includePreferences) {
    automatic.checked = snapshot.preferences.automaticChecks;
  }
  download.hidden = !snapshot.available;
  if (snapshot.available) download.href = snapshot.downloadUrl;
  automatic.disabled = save.disabled = !allowed;
  current.textContent = snapshot.current ? `Versión: ${snapshot.current.slice(0, 8)}${snapshot.checkedAt ? ' · Revisado: ' + new Date(snapshot.checkedAt).toLocaleString('es-MX') : ''}` : 'Sin consulta de versión todavía.';
  status.textContent = snapshot.message + (allowed ? '' : ' Configura esta opción desde localhost en la PC del templo.');
  document.getElementById('updateNotes').hidden = !snapshot.available || !snapshot.patchNotes;
  document.getElementById('updateNotesText').textContent = snapshot.patchNotes || '';
}
export async function openUpdateSettings() {
  opened = true; const turn = ++sequence;
  try { const snapshot = await (await request('/api/updates')).json(); if (opened && turn === sequence) render(snapshot); }
  catch (error) { if (opened && turn === sequence) status.textContent = error.message; }
}
export function closeUpdateSettings() { opened = false; sequence++; }
async function perform(url, method, body) {
  save.disabled = true; status.textContent = 'Procesando…';
  try {
    const response = await request(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const snapshot = await response.json();
    if (opened) {
      render(snapshot, method === 'PUT');
      if (method === 'PUT') status.textContent = 'Preferencias guardadas. ' + status.textContent;
    }
  } catch (error) { if (opened) status.textContent = error.message; }
  finally { save.disabled = false; }
}
document.getElementById('updatePreferencesForm').addEventListener('submit', event => {
  event.preventDefault();
  perform('/api/updates/preferences', 'PUT', { automaticChecks: automatic.checked });
});

request('/api/updates').then(response => response.json()).then(snapshot => {
  if (snapshot.available) showToast(`Versión ${snapshot.latest} disponible en Ajustes → Avanzado.`);
}).catch(() => {});
