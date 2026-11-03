import { decorateSongCard } from './song-cards.js';
import { setSelection } from './selection.js';
import { broadcastToOverlay } from './transmission.js';
import { showToast } from './shell.js';
import { globalState, updateUiState } from './live-state.js';
import { escapeHtml } from './html.js';
import { request } from './api.js';

let currentHymnList = [];
let selectedHymn = null;
let hymnSearchDebounceTimer = null;

const hymnSearchInput = document.getElementById("hymnSearchInput");
const hymnSearchBox = document.getElementById("hymnSearchBox");
const hymnResultsList = document.getElementById("hymnResultsList");
const hymnSelectedHeader = document.getElementById("hymnSelectedHeader");
const selectedHymnTitle = document.getElementById("selectedHymnTitle");
const hymnSlidesGrid = document.getElementById("hymnSlidesGrid");
const btnShowHymnList = document.getElementById("btnShowHymnList");

function setHymnListCollapsed(collapsed) {
  const isCollapsed = Boolean(collapsed);
  if (hymnSearchBox) {
    hymnSearchBox.classList.toggle("collapsed", isCollapsed);
    hymnSearchBox.style.display = isCollapsed ? "none" : "flex";
  }
  if (hymnResultsList) {
    hymnResultsList.classList.toggle("collapsed", isCollapsed);
    hymnResultsList.style.display = isCollapsed ? "none" : "grid";
  }
  if (btnShowHymnList) {
    btnShowHymnList.classList.toggle("visible", isCollapsed);
    btnShowHymnList.style.display = isCollapsed ? "inline-flex" : "none";
  }
}
const setHymnListCollapsedOnMobile = setHymnListCollapsed;

if (btnShowHymnList) {
  btnShowHymnList.addEventListener("click", () => {
    setHymnListCollapsed(false);
    if (hymnSearchInput) {
      hymnSearchInput.focus();
      hymnSearchInput.select?.();
    }
  });
}

if (hymnSearchInput) {
  hymnSearchInput.addEventListener("focus", () => {
    setHymnListCollapsed(false);
  });
}

let hymnSearchSeq = 0;
async function searchHymns(q) {
  const mySeq = ++hymnSearchSeq;
  try {
    const res = await request(`/api/himnos?q=${encodeURIComponent(q)}`);
    const hymns = await res.json();
    if (mySeq !== hymnSearchSeq) return;
    currentHymnList = hymns;
    renderHymnResults(hymns);
  } catch (e) {
    if (mySeq === hymnSearchSeq) console.error("Error buscando himnos:", e);
  }
}

function renderHymnResults(hymns) {
  hymnResultsList.innerHTML = "";
  if (hymns.length === 0) {
    hymnResultsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">No se encontraron himnos.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < hymns.length; i++) {
    const h = hymns[i];
    const div = document.createElement("div");
    div.className = "hymn-result-item" + (selectedHymn && String(selectedHymn.number) === String(h.number) ? " selected" : "");
    div.dataset.hymnNumber = String(h.number || h.id || '');
    div.innerHTML = `
      <div class="hymn-item-num">${h.number ? '#' + h.number : ''}</div>
      <div class="hymn-item-title">${escapeHtml(h.title)}</div>
    `;
    div.addEventListener("click", () => {
      selectHymn(h);
    });
    frag.appendChild(div);
  }
  hymnResultsList.appendChild(frag);
}

async function selectHymn(hymn) {
  setSelectedHymn(hymn);
  selectedHymnTitle.textContent = hymn.number ? `HIMNO ${hymn.number} - ${hymn.title.toUpperCase()}` : hymn.title.toUpperCase();
  hymnSelectedHeader.style.display = "flex";
  document.activeElement.blur();
  setHymnListCollapsed(true);

  const detail = await (await request(`/api/himnos/${hymn.number || hymn.id}`)).json();
  if (String(selectedHymn?.number || selectedHymn?.id) !== String(hymn.number || hymn.id)) return;
  renderHymnSlides(detail.slides);
  try {
    await request('/api/control/selection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hymn', id: hymn.number || hymn.id })
    });
  } catch (error) {
    if (error.status !== 404) showToast(error.message);
  }
}

function renderHymnSlides(slides) {
  hymnSlidesGrid.innerHTML = "";
  const frag = document.createDocumentFragment();
  slides.forEach((s, idx) => {
    const isChorus = s.sectionType === 'chorus' || (s.sectionLabel && s.sectionLabel.toLowerCase().includes('coro'));
    const card = document.createElement("div");
    card.className = "slide-card" + (s.isTitleOnly ? " title-slide-card" : (isChorus ? " chorus-slide-card" : " verse-slide-card"));

    if (s.isTitleOnly) {
      card.innerHTML = `
        <div class="title-label">${s.hymnNumber ? 'HIMNO ' + s.hymnNumber : 'CARÁTULA'}</div>
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
      await request('/api/project/hymn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hymnId: selectedHymn.number || selectedHymn.id,
          startIndex: idx
        })
      });
      showToast(`Proyectando Diapositiva #${idx + 1}`);
    });

    decorateSongCard(card, s, idx, slides.length);
    frag.appendChild(card);
  });
  hymnSlidesGrid.appendChild(frag);
  if (globalState) updateUiState(globalState);
}

document.getElementById("btnProjectHymnTitleOnly").addEventListener("click", async () => {
  if (!selectedHymn) return;
  document.activeElement.blur();
  await request('/api/project/hymn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hymnId: selectedHymn.number || selectedHymn.id,
      titleOnly: true,
      announce: true
    })
  });
  showToast(`Solo Número en Pantalla: Himno ${selectedHymn.number}`);
});

document.getElementById("btnProjectHymnWithLyrics").addEventListener("click", async () => {
  if (!selectedHymn) return;
  document.activeElement.blur();
  await request('/api/project/hymn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hymnId: selectedHymn.number || selectedHymn.id,
      startIndex: 1,
      announce: true
    })
  });
  showToast(`Proyectando Letra: Himno ${selectedHymn.number}`);
});

document.getElementById("btnProjectHymnOverlay").addEventListener("click", () => {
  if (!selectedHymn) {
    showToast("Selecciona un himno primero");
    return;
  }
  const hymnText = selectedHymn.number ? `${selectedHymn.number} ${selectedHymn.title}` : selectedHymn.title;
  broadcastToOverlay({
    type: 'hymn',
    text: hymnText,
    fullText: hymnText
  });
  showToast(`Enviado a Transmisión OBS: ${hymnText}`);
});

hymnSearchInput.addEventListener("input", (e) => {
  setHymnListCollapsedOnMobile(false);
  clearTimeout(hymnSearchDebounceTimer);
  const val = e.target.value.trim();
  hymnSearchDebounceTimer = setTimeout(() => {
    searchHymns(val);
  }, 150);
});

hymnSearchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    clearTimeout(hymnSearchDebounceTimer);
    const q = hymnSearchInput.value.trim();
    if (currentHymnList.length > 0) {
      const exactMatch = currentHymnList.find(h => String(h.number) === q) || currentHymnList[0];
      if (exactMatch) {
        selectHymn(exactMatch);
        return;
      }
    }
    searchHymns(q).then(() => {
      if (currentHymnList.length > 0) {
        const exactMatch = currentHymnList.find(h => String(h.number) === q) || currentHymnList[0];
        if (exactMatch) selectHymn(exactMatch);
      }
    });
  }
});

function resetHymnSearch({ uncollapse = true } = {}) {
  clearTimeout(hymnSearchDebounceTimer);
  const hadValue = Boolean(hymnSearchInput && hymnSearchInput.value.length > 0);
  if (hymnSearchInput) {
    hymnSearchInput.value = "";
    hymnSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
    clearTimeout(hymnSearchDebounceTimer);
  }
  if (uncollapse) setHymnListCollapsedOnMobile(false);
  searchHymns("");
  return hadValue;
}

document.getElementById("clearHymnSearchBtn").addEventListener("click", () => {
  resetHymnSearch({ uncollapse: true });
});

function setSelectedHymn(value) {
  selectedHymn = value;
  setSelection('hymn', value);
  if (hymnResultsList) {
    const selKey = value ? String(value.number || value.id || '') : '';
    hymnResultsList.querySelectorAll('.hymn-result-item').forEach(it => {
      it.classList.toggle('selected', Boolean(selKey && it.dataset.hymnNumber === selKey));
    });
  }
}

export { hymnResultsList, hymnSearchInput, hymnSelectedHeader, hymnSlidesGrid, renderHymnSlides, resetHymnSearch, searchHymns, selectedHymn, selectedHymnTitle, setHymnListCollapsed, setSelectedHymn };
