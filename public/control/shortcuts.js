import { getSettings, keyLabel } from './settings-state.js';
import { openSurface, closeSurface } from './motion.js';

const shortcutsModal = document.getElementById("shortcutsModal");
const btnOpenShortcuts = document.getElementById("btnOpenShortcuts");
const btnOpenShortcutsMonitor = document.getElementById("btnOpenShortcutsMonitor");
const btnCloseShortcutsModal = document.getElementById("btnCloseShortcutsModal");

function renderShortcuts() {
  const settings = getSettings();
  if (!settings) return;
  const labels = { nextSlide: 'Siguiente diapositiva', previousSlide: 'Diapositiva anterior', nextSection: 'Siguiente estrofa o sección', previousSection: 'Estrofa o sección anterior', toggleIdle: 'Fondo / reanudar', hideOverlay: 'Ocultar banner de OBS', help: 'Abrir / cerrar esta guía' };
  const body = shortcutsModal.querySelector('.shortcuts-modal-body'); body.replaceChildren();
  for (const [id, label] of Object.entries(labels)) {
    const row = document.createElement('div'); row.className = 'pc-control-row';
    const text = document.createElement('span'); text.className = 'pc-control-desc'; text.textContent = label;
    const keys = document.createElement('span'); keys.className = 'kbd-group';
    for (const binding of settings.keyboard[id]) { const key = document.createElement('span'); key.className = 'kbd-key'; key.textContent = keyLabel(binding); keys.appendChild(key); }
    row.append(text, keys); body.appendChild(row);
  }
  for (const [label, key] of [['Fondo de TV y limpiar campos', 'Esc'], ['Confirmar tema o cita', 'Enter'], ['Guardar en editor de letras', 'Ctrl+S']]) {
    const row = document.createElement('div'); row.className = 'pc-control-row';
    const text = document.createElement('span'); text.className = 'pc-control-desc'; text.textContent = label;
    const code = document.createElement('span'); code.className = 'kbd-key'; code.textContent = key; row.append(text, code); body.appendChild(row);
  }
}
window.addEventListener('settings-changed', () => {
  renderShortcuts();
  const label = (getSettings()?.keyboard.help || []).map(keyLabel).join(' / ');
  for (const id of ['btnOpenShortcuts', 'btnOpenShortcutsMonitor']) { const button = document.getElementById(id); if (button) { button.title = 'Guía de controles (' + label + ')'; button.querySelector('span').textContent = 'Controles (' + label + ')'; } }
});
function openShortcutsModal() {
  renderShortcuts();
  if (shortcutsModal) openSurface(shortcutsModal, () => { shortcutsModal.style.display = 'flex'; });
}

function closeShortcutsModal() {
  if (shortcutsModal) closeSurface(shortcutsModal, () => { shortcutsModal.style.display = 'none'; });
}

function toggleShortcutsModal() {
  if (shortcutsModal) {
    if (shortcutsModal.style.display === "none" || !shortcutsModal.style.display) {
      openShortcutsModal();
    } else {
      closeShortcutsModal();
    }
  }
}

if (btnOpenShortcuts) btnOpenShortcuts.addEventListener("click", toggleShortcutsModal);
if (btnOpenShortcutsMonitor) btnOpenShortcutsMonitor.addEventListener("click", toggleShortcutsModal);
if (btnCloseShortcutsModal) btnCloseShortcutsModal.addEventListener("click", closeShortcutsModal);

if (shortcutsModal) {
  shortcutsModal.addEventListener("click", (e) => {
    if (e.target === shortcutsModal) {
      closeShortcutsModal();
    }
  });
}

// ==============================================================
// 8D. LÓGICA DEL EDITOR DE LETRA COMPLETA (MODO PRIVADO DE EMERGENCIA)
// ==============================================================

export { closeShortcutsModal, shortcutsModal, toggleShortcutsModal };
