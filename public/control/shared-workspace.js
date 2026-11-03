import { updateSharedHistories } from './history-store.js';
import { request } from './api.js';
import { showToast } from './shell.js';
import { getSelection } from './selection.js';
import * as hymn from './hymn.js';
import * as choir from './choir.js';
import * as presentations from './presentations.js';
import { updateInputPlaceholders } from './bible.js';

const DRAFT_IDS = ['themeInput', 'searchBook', 'chapter', 'verse', 'hymnSearchInput', 'choirSearchInput', 'presentationSearchInput'];
const previous = new Map();
const pending = new Map();

const features = {
  hymn: { module: hymn, set: hymn.setSelectedHymn, title: hymn.selectedHymnTitle, header: hymn.hymnSelectedHeader, grid: hymn.hymnSlidesGrid, render: hymn.renderHymnSlides, collapse: hymn.setHymnListCollapsed },
  choir: { module: choir, set: choir.setSelectedChoirSong, title: choir.selectedChoirTitle, header: choir.choirSelectedHeader, grid: choir.choirSlidesGrid, render: choir.renderChoirSlides, collapse: choir.setChoirListCollapsed },
  presentation: { set: presentations.setSelectedPresentation, title: presentations.selectedPresentationTitle, header: presentations.presentationSelectedHeader, grid: presentations.presentationSlidesGrid, render: presentations.renderPresentationSlides }
};

export function synchronizeWorkspace(state) {
  updateSharedHistories(state.workspace?.histories);

  for (const [type, feature] of Object.entries(features)) {
    const selection = state.workspace?.selections?.[type];
    if (selection === undefined) continue;
    const key = JSON.stringify(selection);
    if (previous.get(type) === key) continue;
    previous.set(type, key);
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

  for (const [id, value] of Object.entries(state.workspace?.drafts ?? {})) {
    if (pending.has(id)) {
      if (pending.get(id) !== value) continue;
      pending.delete(id);
    }
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
  for (const id of ['themeInput', 'searchBook', 'chapter', 'verse']) {
    const el = document.getElementById(id);
    if (el) publish(id, el.value);
  }
});
