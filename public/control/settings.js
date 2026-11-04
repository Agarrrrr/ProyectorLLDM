import { openLyricsAppearance, closeLyricsAppearance } from './lyrics-appearance.js';
import { openUpdateSettings, closeUpdateSettings } from './updates.js';
import { resetLibrary } from './song-library.js';
import { openSettingsTabs, activateSettingsTab } from './settings-tabs.js';
import { request } from './api.js';
import { acceptSettings, keyFromEvent, keyLabel } from './settings-state.js';
import { showToast } from './shell.js';
import { openGraphicsSettings, closeGraphicsSettings } from './graphics-settings.js';
import { openSurface, closeSurface } from './motion.js';
import './choir-import.js';
import './backup.js';
import './mobile-access.js';

const dialog = document.getElementById('settingsDialog');
const form = document.getElementById('settingsForm');
const controlsList = document.getElementById('settingsControls');
const message = document.getElementById('settingsMessage');
let snapshot, draft, capture;
const fields = { address: 'churchAddress', city: 'churchCity' };
const quickEditor = document.getElementById('showQuickLyricsEditor');
function renderOperatorSettings() {
  draft.operator ??= { showLyricsEditor: false };
  quickEditor.checked = draft.operator.showLyricsEditor;
}
quickEditor.addEventListener('change', () => { if (draft) draft.operator.showLyricsEditor = quickEditor.checked; });

function renderControls() {
  controlsList.replaceChildren();
  for (const control of snapshot.controls) {
    const row = document.createElement('div'); row.className = 'settings-control-row';
    const label = document.createElement('span'); label.textContent = control.label; row.appendChild(label);
    const buttons = document.createElement('div'); buttons.className = 'settings-key-buttons';
    draft.keyboard[control.id].forEach((key, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = keyLabel(key);
      button.setAttribute('aria-label', `Cambiar tecla de ${control.label}: ${keyLabel(key)}`);
      button.addEventListener('click', () => {
        if (capture) capture.button.textContent = keyLabel(draft.keyboard[capture.id][capture.index]);
        capture = { id: control.id, index, button };
        button.textContent = 'Pulsa una tecla…'; button.focus();
      });
      // Keyboard capture belongs to this control, never to the global navigator.
      button.addEventListener('keydown', event => {
        if (capture?.button !== button) return;
        if (event.key === 'Escape') { capture = null; renderControls(); return; }
        event.preventDefault(); event.stopImmediatePropagation();
        const binding = keyFromEvent(event);
        if (!binding) return;
        if (!/^(?:(?:Ctrl|Alt|Shift|Meta)\+)*(?:Key[A-Z]|Digit[0-9]|Arrow(?:Right|Left|Up|Down)|Space|F(?:[1-9]|1[0-2]))$/.test(binding) || binding === 'Ctrl+KeyS') {
          message.textContent = 'Esa tecla está reservada. Elige una letra, flecha, función o combinación.'; return;
        }
        const inUse = Object.entries(draft.keyboard).some(([id, keys]) => keys.some((key, i) => key === binding && (id !== control.id || i !== index)));
        if (inUse) { message.textContent = 'Esa tecla ya está asignada a otra acción.'; return; }
        draft.keyboard[control.id][index] = binding; capture = null; message.textContent = ''; renderControls();
      });
      buttons.appendChild(button);
    });
    row.appendChild(buttons); controlsList.appendChild(row);
  }
}

async function openSettings() {
  try {
    snapshot = await (await request('/api/settings')).json();
    acceptSettings(snapshot.settings, snapshot.revision);
    draft = structuredClone(snapshot.settings);
    renderOperatorSettings();
    openUpdateSettings();
    for (const [key, id] of Object.entries(fields)) document.getElementById(id).value = draft.church[key];
    resetLibrary(); await openLyricsAppearance(draft, snapshot.defaults); openSettingsTabs();
    message.textContent = ''; capture = null; renderControls(); openGraphicsSettings(draft); openSurface(dialog, () => dialog.showModal());
  } catch (error) { showToast(error.message); }
}
document.querySelectorAll('[data-open-settings]').forEach(button => button.addEventListener('click', openSettings));
export function closeSettings() { closeSurface(dialog, () => dialog.close()); }
document.getElementById('closeSettings').addEventListener('click', closeSettings);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeSettings(); });
document.getElementById('resetControls').addEventListener('click', () => { draft.keyboard = structuredClone(snapshot.defaults.keyboard); capture = null; renderControls(); message.textContent = 'Controles originales preparados. Guarda para aplicarlos.'; });
document.getElementById('resetAllSettings').addEventListener('click', async () => {
  if (!draft || !confirm('¿Preparar los ajustes iniciales de iglesia, letras, fondo, OBS, teclado e interfaz? Los cantos y archivos importados se conservarán. Después debes guardar para aplicarlos.')) return;
  const section = document.querySelector('[data-settings-section][aria-selected="true"]').dataset.settingsSection;
  Object.assign(draft, structuredClone(snapshot.defaults));
  renderOperatorSettings();
  for (const [key, id] of Object.entries(fields)) document.getElementById(id).value = draft.church[key];
  capture = null;
  renderControls();
  openGraphicsSettings(draft);
  await openLyricsAppearance(draft, snapshot.defaults);
  activateSettingsTab(section);
  message.textContent = 'Valores iniciales preparados. Revisa las pestañas y pulsa Guardar ajustes para aplicarlos.';
});
dialog.addEventListener('close', () => { capture = null; closeGraphicsSettings(); closeLyricsAppearance(); closeUpdateSettings(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (dialog.dataset.closing) return;
  for (const [key, id] of Object.entries(fields)) draft.church[key] = document.getElementById(id).value.trim();
  const save = document.getElementById('saveSettings'); save.disabled = true;
  try {
    const updated = await (await request('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: snapshot.revision, settings: draft }) })).json();
    acceptSettings(updated.settings, updated.revision); closeSettings(); showToast('Ajustes guardados');
  } catch (error) { message.textContent = error.message; }
  finally { save.disabled = false; }
});

request('/api/settings').then(response => response.json()).then(data => acceptSettings(data.settings, data.revision)).catch(error => showToast(error.message));
