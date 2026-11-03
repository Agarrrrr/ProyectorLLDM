import { keyboardAction } from './settings-state.js';
import { closeSettings } from './settings.js';
import { request } from './api.js';
import { clearEscapeFields } from './escape.js';
import { showToast } from './shell.js';
import { getSelection } from './selection.js';
import { hideOverlay } from './transmission.js';
import { suggestionsDiv, updateInputPlaceholders } from './bible.js';
import { hymnResultsList, hymnSearchInput, hymnSelectedHeader, hymnSlidesGrid, resetHymnSearch, selectedHymn, setHymnListCollapsed, setSelectedHymn } from './hymn.js';
import { choirResultsList, choirSearchInput, choirSelectedHeader, choirSlidesGrid, resetChoirSearch, selectedChoirSong, setChoirListCollapsed, setSelectedChoirSong } from './choir.js';
import { currentPresentations, presentationResultsList, presentationSearchInput, presentationSelectedHeader, presentationSlidesGrid, renderPresentationResults, selectedPresentation, setSelectedPresentation } from './presentations.js';
import { globalState } from './live-state.js';
import { closeShortcutsModal, shortcutsModal, toggleShortcutsModal } from './shortcuts.js';
import { closeLyricsEditor, lyricsEditorModal, saveLyricsToDisk } from './lyrics-editor.js';
import { sendWsAction } from './connection.js';

const btnPrevSlide = document.getElementById("btn-prev-slide");
if (btnPrevSlide) btnPrevSlide.addEventListener("click", () => sendWsAction('PREV_SLIDE'));
const btnNextSlide = document.getElementById("btn-next-slide");
if (btnNextSlide) btnNextSlide.addEventListener("click", () => sendWsAction('NEXT_SLIDE'));

document.getElementById("footer-btn-prev-slide").addEventListener("click", () => sendWsAction('PREV_SLIDE'));
document.getElementById("footer-btn-next-slide").addEventListener("click", () => sendWsAction('NEXT_SLIDE'));
document.getElementById("footer-btn-prev-sec").addEventListener("click", () => sendWsAction('PREV_SECTION'));
document.getElementById("footer-btn-next-sec").addEventListener("click", () => sendWsAction('NEXT_SECTION'));

document.getElementById('footer-btn-background').addEventListener('click', () => {
  deselectCurrentSong({ notify: false, blurActive: true });
  sendWsAction('CLEAR_PROJECTION');
});

// BOTONES DE NAVEGACIÓN DEL MONITOR EN VIVO (PC)
document.getElementById("mon-btn-prev").addEventListener("click", () => sendWsAction('PREV_SLIDE'));
document.getElementById("mon-btn-next").addEventListener("click", () => sendWsAction('NEXT_SLIDE'));
document.getElementById("mon-btn-prev-sec").addEventListener("click", () => sendWsAction('PREV_SECTION'));
document.getElementById("mon-btn-next-sec").addEventListener("click", () => sendWsAction('NEXT_SECTION'));

function clearSearchAndInputs({ includeAllCoreTabs = false } = {}) {
  let clearedAny = false;

  // Limpiar buscador de Himnario si tiene texto o si se pide limpiar pestañas principales
  if (hymnSearchInput && (includeAllCoreTabs || hymnSearchInput.value.length > 0)) {
    if (resetHymnSearch({ uncollapse: true })) clearedAny = true;
  }

  // Limpiar buscador de Coro si tiene texto o si se pide limpiar pestañas principales
  if (choirSearchInput && (includeAllCoreTabs || choirSearchInput.value.length > 0)) {
    if (resetChoirSearch({ uncollapse: true })) clearedAny = true;
  }

  // Limpiar campos de Temas y Citas Bíblicas
  for (const id of ['themeInput', 'searchBook', 'chapter', 'verse']) {
    const el = document.getElementById(id);
    if (el && el.value.length > 0) {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      clearedAny = true;
    }
  }
  if (suggestionsDiv) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
  }
  updateInputPlaceholders();

  // Si estamos en Presentaciones o Transmisión, limpiar también el filtro activo
  if (!includeAllCoreTabs) {
    if (presentationSearchInput && presentationSearchInput.value.length > 0) {
      presentationSearchInput.value = '';
      presentationSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
      renderPresentationResults(currentPresentations, '');
      clearedAny = true;
    }
    const activePane = document.querySelector('.tab-pane.active');
    if (activePane && activePane.id !== 'tab-carteleria') {
      if (clearEscapeFields(activePane, false)) clearedAny = true;
    }
  }

  return clearedAny;
}

function deselectCurrentSong({ notify = true, blurActive = true, includePresentation = true } = {}) {
  let wasSelected = false;

  // 1. Quitar selección de Himno Local
  if (selectedHymn || getSelection('hymn') || (hymnSelectedHeader && hymnSelectedHeader.style.display !== 'none')) {
    setSelectedHymn(null);
    if (hymnSelectedHeader) hymnSelectedHeader.style.display = 'none';
    if (hymnSlidesGrid) hymnSlidesGrid.innerHTML = '';
    setHymnListCollapsed(false);
    if (hymnResultsList) {
      const items = hymnResultsList.querySelectorAll('.hymn-result-item');
      items.forEach(it => it.classList.remove('selected'));
    }
    wasSelected = true;
  }

  // 2. Quitar selección de Canto del Coro
  if (selectedChoirSong || getSelection('choir') || (choirSelectedHeader && choirSelectedHeader.style.display !== 'none')) {
    setSelectedChoirSong(null);
    if (choirSelectedHeader) choirSelectedHeader.style.display = 'none';
    if (choirSlidesGrid) choirSlidesGrid.innerHTML = '';
    setChoirListCollapsed(false);
    if (choirResultsList) {
      const items = choirResultsList.querySelectorAll('.choir-result-item');
      items.forEach(it => it.classList.remove('selected'));
    }
    wasSelected = true;
  }

  // 3. Quitar selección de Presentación PowerPoint
  if (includePresentation && (selectedPresentation || getSelection('presentation') || (presentationSelectedHeader && presentationSelectedHeader.style.display !== 'none'))) {
    setSelectedPresentation(null);
    if (presentationSelectedHeader) presentationSelectedHeader.style.display = 'none';
    if (presentationSlidesGrid) {
      presentationSlidesGrid.innerHTML = `
        <div class="slides-placeholder">
          <svg class="icon" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <p>Selecciona una presentación y envía una diapositiva a TV. Después avanza con las flechas o Espacio.</p>
        </div>
      `;
    }
    if (presentationResultsList) {
      const items = presentationResultsList.querySelectorAll('.presentation-result-item');
      items.forEach(it => it.classList.remove('selected'));
    }
    wasSelected = true;
  }

  // 3.5. Si la cartelería semanal está activa en TV
  if (globalState && globalState.contentType === 'carteleria') {
    wasSelected = true;
  }

  request('/api/control/selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearAll: true })
  }).catch(() => {});


  if (blurActive && document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  if (notify) {
    showToast(wasSelected ? "Selección quitada." : "No hay contenido seleccionado.");
  }
  return wasSelected;
}

const btnDeselectHymn = document.getElementById("btnDeselectHymn");
if (btnDeselectHymn) {
  btnDeselectHymn.addEventListener("click", () => {
    clearSearchAndInputs({ includeAllCoreTabs: false });
    deselectCurrentSong({ notify: true });
  });
}

const btnDeselectChoir = document.getElementById("btnDeselectChoir");
if (btnDeselectChoir) {
  btnDeselectChoir.addEventListener("click", () => {
    clearSearchAndInputs({ includeAllCoreTabs: false });
    deselectCurrentSong({ notify: true });
  });
}

function toggleStageState() {
  if (globalState && globalState.phase === 'active') {
    deselectCurrentSong({ notify: false, blurActive: true });
    sendWsAction('SET_IDLE');
    showToast("Pantalla en Reposo");
  } else {
    sendWsAction('SET_ACTIVE');
    showToast("Pantalla Activada (En Proyección)");
  }
}

document.getElementById("btn-toggle-idle").addEventListener("click", toggleStageState);
document.getElementById("mon-btn-toggle-idle").addEventListener("click", toggleStageState);

// ==============================================================
// 10. ATAJOS DE TECLADO GLOBALES (FLECHAS, ESPACIO, ESCAPE, F1)
// ==============================================================
window.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing) return;
  const editorOpen = lyricsEditorModal && lyricsEditorModal.style.display !== 'none';
  if (event.key === 'Escape') {
    event.preventDefault();
    try { sendWsAction('CLEAR_PROJECTION'); } catch (error) { showToast(error.message); }
    const deletion = document.getElementById('songDeleteDialog');
    if (deletion?.open) { deletion.close(); return; }
    const settings = document.getElementById('settingsDialog');
    if (settings?.open) { closeSettings(); return; }
    if (editorOpen) { closeLyricsEditor(); return; }
    if (shortcutsModal?.style.display === 'flex') { closeShortcutsModal(); return; }
    clearSearchAndInputs({ includeAllCoreTabs: false });
    deselectCurrentSong({ notify: false, blurActive: true });
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && editorOpen) {
    event.preventDefault(); saveLyricsToDisk(); return;
  }
  if (document.querySelector('dialog[open]') || editorOpen || event.repeat) return;
  const inputActive = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  const action = keyboardAction(event);
  if (!action || (inputActive && action !== 'help')) return;
  event.preventDefault();
  const commands = {
    nextSlide: () => sendWsAction('NEXT_SLIDE'), previousSlide: () => sendWsAction('PREV_SLIDE'),
    nextSection: () => sendWsAction('NEXT_SECTION'), previousSection: () => sendWsAction('PREV_SECTION'),
    toggleIdle: toggleStageState, hideOverlay, help: toggleShortcutsModal
  };
  try { commands[action]?.(); } catch (error) { showToast(error.message); }
});

export { deselectCurrentSong };

window.addEventListener('clear-preparation', () => deselectCurrentSong({ notify: true }));
