import { updateSharedHistories } from './history-store.js';
import { request } from './api.js';
import { showToast } from './shell.js';
import { getSelection } from './selection.js';
import { isSameItem } from './html.js';
import * as hymn from './hymn.js';
import * as choir from './choir.js';
import * as presentations from './presentations.js';
import { updateInputPlaceholders } from './bible.js';

const DRAFT_IDS = ['themeInput', 'searchBook', 'chapter', 'verse', 'bibleTextSearchInput', 'hymnSearchInput', 'choirSearchInput', 'presentationSearchInput'];
const isLocalPc = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
let initialized = false;
const previous = new Map();
const pending = new Map();

const features = {
  hymn: { module: hymn, set: hymn.setSelectedHymn, title: hymn.selectedHymnTitle, header: hymn.hymnSelectedHeader, grid: hymn.hymnSlidesGrid, render: hymn.renderHymnSlides, collapse: hymn.setHymnListCollapsed },
  choir: { module: choir, set: choir.setSelectedChoirSong, title: choir.selectedChoirTitle, header: choir.choirSelectedHeader, grid: choir.choirSlidesGrid, render: choir.renderChoirSlides, collapse: choir.setChoirListCollapsed },
  presentation: { set: presentations.setSelectedPresentation, title: presentations.selectedPresentationTitle, header: presentations.presentationSelectedHeader, grid: presentations.presentationSlidesGrid, render: presentations.renderPresentationSlides }
};

function applySelection(type, feature, selection) {
  feature.set(selection?.item ?? null);
  feature.header.style.display = selection ? 'flex' : 'none';
  if (selection) {
    const { item, slides } = selection;
    feature.title.textContent = type === 'hymn'
      ? `HIMNO ${item.number ? item.number + ' — ' : ''}${item.title.toUpperCase()}`
      : type === 'choir'
        ? `CANTO DEL CORO — ${item.title.toUpperCase()}`
        : item.title.toUpperCase();
    feature.render(slides);
    feature.collapse?.(true);
  } else {
    feature.grid.replaceChildren();
    feature.collapse?.(false);
  }
}

export function synchronizeWorkspace(state) {
  updateSharedHistories(state.workspace?.histories);

  for (const [type, feature] of Object.entries(features)) {
    const selection = state.workspace?.selections?.[type];
    if (selection === undefined) continue;
    const key = JSON.stringify(selection);
    if (previous.get(type) === key) continue;
    previous.set(type, key);

    const localCurrent = getSelection(type);
    const isProjectedType = state.phase === 'active' && state.contentType === type && selection?.item && isSameItem(selection.item, state.activeItem);
    const isSameSelectedSong = localCurrent && selection?.item && isSameItem(localCurrent, selection.item);
    // Cada dispositivo mantiene su propia ventana/selección local de preparación,
    // pero adopta la selección al iniciar en la PC, cuando se proyecta en vivo a TV,
    // o cuando se edita la letra del mismo canto que ya tenía abierto.
    if ((!initialized && isLocalPc) || isProjectedType || isSameSelectedSong) {
      applySelection(type, feature, selection);
    }
  }

  // Los borradores de búsqueda/texto y la pestaña activa son independientes por dispositivo.
  // Solo la PC local restaura su borrador guardado una única vez al abrir la cabina.
  if (!initialized && isLocalPc) {
    for (const [id, value] of Object.entries(state.workspace?.drafts ?? {})) {
      if (id === 'activeTab') {
        document.querySelectorAll('.tab-item').forEach(tab => {
          const active = tab.dataset.tab === value;
          tab.classList.toggle('active', active);
          tab.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === value));
      } else {
        const input = document.getElementById(id);
        if (input && input.value !== value) {
          input.value = value;
          if (id === 'hymnSearchInput') hymn.searchHymns(value);
          if (id === 'choirSearchInput') choir.searchChoir(value);
          if (id === 'presentationSearchInput') presentations.renderPresentationResults(presentations.currentPresentations, value);
        }
      }
    }
    updateInputPlaceholders();
  }

  // El nombre del ministro es persistente para toda la cabina y nunca se borra con Esc/Fondo.
  const ministerEl = document.getElementById('ministerInput');
  if (ministerEl && document.activeElement !== ministerEl) {
    const savedMinister = state.workspace?.drafts?.ministerInput ?? (() => { try { return localStorage.getItem('lldm_minister_name'); } catch { return ''; } })() ?? '';
    if (savedMinister && ministerEl.value !== savedMinister) {
      ministerEl.value = savedMinister;
    }
  }

  initialized = true;
}

let queued = {}, publishing = false;
async function flushDrafts() {
  if (publishing) return;
  publishing = true;
  try {
    while (Object.keys(queued).length) {
      const values = queued; queued = {};
      try {
        await request('/api/control/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      } catch (error) {
        for (const [id, value] of Object.entries(values)) if (pending.get(id) === value) pending.delete(id);
        showToast(error.message);
      }
    }
  } finally { publishing = false; }
}
function publish(id, value) {
  if (!isLocalPc) return;
  pending.set(id, value); queued[id] = value;
  queueMicrotask(flushDrafts);
}

for (const id of DRAFT_IDS) {
  const input = document.getElementById(id);
  input?.addEventListener('input', () => publish(id, input.value));
  input?.addEventListener('change', () => publish(id, input.value));
}

window.addEventListener('content-tab-changed', event => {
  publish('activeTab', event.detail);
});

window.addEventListener('capture-shared-drafts', () => {
  for (const id of ['themeInput', 'searchBook', 'chapter', 'verse', 'bibleTextSearchInput']) {
    const el = document.getElementById(id);
    if (el) publish(id, el.value);
  }
});
