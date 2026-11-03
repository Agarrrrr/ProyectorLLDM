import { decorateSongCard } from './song-cards.js';
import { setSelection } from './selection.js';
import { broadcastToOverlay } from './transmission.js';
import { showToast } from './shell.js';
import { globalState, updateUiState } from './live-state.js';
import { escapeHtml } from './html.js';
import { request } from './api.js';

let currentChoirList = [];
let selectedChoirSong = null;
let choirSearchDebounceTimer = null;

const choirSearchInput = document.getElementById("choirSearchInput");
const choirSearchBox = document.getElementById("choirSearchBox");
const choirResultsList = document.getElementById("choirResultsList");
const choirSelectedHeader = document.getElementById("choirSelectedHeader");
const selectedChoirTitle = document.getElementById("selectedChoirTitle");
const choirSlidesGrid = document.getElementById("choirSlidesGrid");
const btnShowChoirList = document.getElementById("btnShowChoirList");

function cleanTitleForSort(str) {
  if (!str) return '';
  return String(str)
    .replace(/^[^a-zA-Z0-9\u00C0-\u017F]+/, '')
    .trim();
}

function compareAlphabetical(a, b) {
  const cleanA = cleanTitleForSort(a);
  const cleanB = cleanTitleForSort(b);
  const comp = cleanA.localeCompare(cleanB, 'es', { sensitivity: 'base' });
  if (comp !== 0) return comp;
  return String(a || '').localeCompare(String(b || ''), 'es');
}

function setChoirListCollapsed(collapsed) {
  const isCollapsed = Boolean(collapsed);
  if (choirSearchBox) {
    choirSearchBox.classList.toggle("collapsed", isCollapsed);
    choirSearchBox.style.display = isCollapsed ? "none" : "flex";
  }
  if (choirResultsList) {
    choirResultsList.classList.toggle("collapsed", isCollapsed);
    choirResultsList.style.display = isCollapsed ? "none" : "grid";
  }
  if (btnShowChoirList) {
    btnShowChoirList.classList.toggle("visible", isCollapsed);
    btnShowChoirList.style.display = isCollapsed ? "inline-flex" : "none";
  }
}
const setChoirListCollapsedOnMobile = setChoirListCollapsed;

if (btnShowChoirList) {
  btnShowChoirList.addEventListener("click", () => {
    setChoirListCollapsed(false);
    if (choirSearchInput) {
      choirSearchInput.focus();
      choirSearchInput.select?.();
    }
  });
}

if (choirSearchInput) {
  choirSearchInput.addEventListener("focus", () => {
    setChoirListCollapsed(false);
  });
}

let choirSearchSeq = 0;
async function searchChoir(q) {
  const mySeq = ++choirSearchSeq;
  try {
    const res = await request(`/api/coro?q=${encodeURIComponent(q)}`);
    const songs = await res.json();
    if (mySeq !== choirSearchSeq) return;
    if (!q && Array.isArray(songs)) {
      songs.sort((a, b) => compareAlphabetical(a.title, b.title));
    }
    currentChoirList = songs;
    renderChoirResults(songs);
    if (!q && Array.isArray(songs)) {
      const lbl = document.getElementById("tabCoroLabel");
      if (lbl) lbl.textContent = 'Coro';
    }
  } catch (e) {
    if (mySeq === choirSearchSeq) console.error("Error buscando cantos del coro:", e);
  }
}

function renderChoirResults(songs) {
  if (!choirResultsList) return;
  choirResultsList.innerHTML = "";
  if (songs.length === 0) {
    choirResultsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">No se encontraron cantos del coro.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const div = document.createElement("div");
    div.className = "choir-result-item" + (selectedChoirSong && String(selectedChoirSong.id || selectedChoirSong.number) === String(s.id || s.number) ? " selected" : "");
    div.dataset.choirId = String(s.id || s.number || '');
    div.innerHTML = `
      <div class="choir-item-title">${escapeHtml(s.title)}</div>
    `;
    div.addEventListener("click", () => {
      selectChoirSong(s);
    });
    frag.appendChild(div);
  }
  choirResultsList.appendChild(frag);
}

async function selectChoirSong(song) {
  setSelectedChoirSong(song);
  if (selectedChoirTitle) {
    selectedChoirTitle.textContent = song.title ? `CANTO DEL CORO - ${song.title.toUpperCase()}` : 'CANTO DEL CORO';
  }
  if (choirSelectedHeader) {
    choirSelectedHeader.style.display = "flex";
  }
  document.activeElement.blur();
  setChoirListCollapsed(true);

  const detail = await (await request(`/api/coro/${song.id || song.number}`)).json();
  if (String(selectedChoirSong?.id || selectedChoirSong?.number) !== String(song.id || song.number)) return;
  renderChoirSlides(detail.slides);
  try {
    await request('/api/control/selection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'choir', id: song.id || song.number })
    });
  } catch (error) {
    if (error.status !== 404) showToast(error.message);
  }
}

function renderChoirSlides(slides) {
  if (!choirSlidesGrid) return;
  choirSlidesGrid.innerHTML = "";
  const frag = document.createDocumentFragment();
  slides.forEach((s, idx) => {
    const isChorus = s.sectionType === 'chorus';
    const card = document.createElement("div");
    card.className = "slide-card" + (s.isTitleOnly ? " title-slide-card" : (isChorus ? " chorus-slide-card" : " verse-slide-card"));

    if (s.isTitleOnly) {
      card.innerHTML = `
        <div class="title-label">CANTO DEL CORO</div>
        <div style="font-size: 13px; font-weight: 700; color: #fff;">${escapeHtml(s.title || '')}</div>
      `;
    } else {
      const badgeHtml = isChorus
        ? `<span class="badge-coro"><svg class="icon-inline" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> ${escapeHtml(s.sectionLabel || 'CORO')}</span>`
        : `<span class="badge-estrofa">${escapeHtml(s.sectionLabel || 'Canto')}</span>`;

      card.innerHTML = `
        <div class="slide-card-header">
          ${badgeHtml}
          <span class="slide-idx-pill">#${idx + 1}</span>
        </div>
        <div class="slide-card-lines">${escapeHtml((s.displayLines || s.lines || []).join('\n'))}</div>
      `;
    }

    card.addEventListener("click", async () => {
      await request('/api/project/choir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choirId: selectedChoirSong.id || selectedChoirSong.number,
          startIndex: idx
        })
      });
      showToast(`Proyectando Diapositiva #${idx + 1}`);
    });

    decorateSongCard(card, s, idx, slides.length);
    frag.appendChild(card);
  });
  choirSlidesGrid.appendChild(frag);
  if (globalState) updateUiState(globalState);
}

const btnProjectChoirTitleOnly = document.getElementById("btnProjectChoirTitleOnly");
if (btnProjectChoirTitleOnly) {
  btnProjectChoirTitleOnly.addEventListener("click", async () => {
    if (!selectedChoirSong) return;
    document.activeElement.blur();
    await request('/api/project/choir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choirId: selectedChoirSong.id || selectedChoirSong.number,
        titleOnly: true,
        announce: true
      })
    });
    showToast(`Solo Título en Pantalla: ${selectedChoirSong.title}`);
  });
}

const btnProjectChoirWithLyrics = document.getElementById("btnProjectChoirWithLyrics");
if (btnProjectChoirWithLyrics) {
  btnProjectChoirWithLyrics.addEventListener("click", async () => {
    if (!selectedChoirSong) return;
    document.activeElement.blur();
    await request('/api/project/choir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choirId: selectedChoirSong.id || selectedChoirSong.number,
        startIndex: 1,
        announce: true
      })
    });
    showToast(`Proyectando Letra: ${selectedChoirSong.title}`);
  });
}

const btnProjectChoirOverlay = document.getElementById("btnProjectChoirOverlay");
if (btnProjectChoirOverlay) {
  btnProjectChoirOverlay.addEventListener("click", () => {
    if (!selectedChoirSong) {
      showToast("Selecciona un canto del coro primero");
      return;
    }
    broadcastToOverlay({
      type: 'choir',
      tag: 'CORO DE LA IGLESIA',
      text: selectedChoirSong.title,
      songTitle: selectedChoirSong.title,
      fullText: `Coro: ${selectedChoirSong.title}`
    });
    showToast(`Enviado a Transmisión OBS: ${selectedChoirSong.title}`);
  });
}

if (choirSearchInput) {
  choirSearchInput.addEventListener("input", (e) => {
    setChoirListCollapsedOnMobile(false);
    clearTimeout(choirSearchDebounceTimer);
    const val = e.target.value.trim();
    choirSearchDebounceTimer = setTimeout(() => {
      searchChoir(val);
    }, 150);
  });

  choirSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(choirSearchDebounceTimer);
      const q = choirSearchInput.value.trim().toLowerCase();
      if (currentChoirList.length > 0) {
        const exactMatch = currentChoirList.find(c => (c.title || '').toLowerCase() === q) || currentChoirList[0];
        if (exactMatch) {
          selectChoirSong(exactMatch);
          return;
        }
      }
      searchChoir(choirSearchInput.value.trim()).then(() => {
        if (currentChoirList.length > 0) {
          const exactMatch = currentChoirList.find(c => (c.title || '').toLowerCase() === q) || currentChoirList[0];
          if (exactMatch) selectChoirSong(exactMatch);
        }
      });
    }
  });
}

function resetChoirSearch({ uncollapse = true } = {}) {
  clearTimeout(choirSearchDebounceTimer);
  const hadValue = Boolean(choirSearchInput && choirSearchInput.value.length > 0);
  if (choirSearchInput) {
    choirSearchInput.value = "";
    choirSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    clearTimeout(choirSearchDebounceTimer);
  }
  if (uncollapse) setChoirListCollapsedOnMobile(false);
  searchChoir("");
  return hadValue;
}

const clearChoirSearchBtn = document.getElementById("clearChoirSearchBtn");
if (clearChoirSearchBtn) {
  clearChoirSearchBtn.addEventListener("click", () => {
    resetChoirSearch({ uncollapse: true });
  });
}

function setSelectedChoirSong(value) {
  selectedChoirSong = value;
  setSelection('choir', value);
  if (choirResultsList) {
    const selKey = value ? String(value.id || value.number || '') : '';
    choirResultsList.querySelectorAll('.choir-result-item').forEach(it => {
      it.classList.toggle('selected', Boolean(selKey && it.dataset.choirId === selKey));
    });
  }
}

export { choirResultsList, choirSearchInput, choirSelectedHeader, choirSlidesGrid, currentChoirList, renderChoirSlides, resetChoirSearch, searchChoir, selectedChoirSong, selectedChoirTitle, setChoirListCollapsed, setSelectedChoirSong };
