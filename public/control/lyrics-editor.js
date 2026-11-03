import { showToast } from './shell.js';
import { openSurface, closeSurface } from './motion.js';
import { hymnSearchInput, renderHymnSlides, searchHymns, selectedHymn, selectedHymnTitle, setSelectedHymn } from './hymn.js';
import { choirSearchInput, renderChoirSlides, searchChoir, selectedChoirSong, selectedChoirTitle, setSelectedChoirSong } from './choir.js';
import { escapeHtml } from './html.js';
import { request } from './api.js';

let currentEditingCatalog = null; // 'himnos' | 'coro'
let currentEditingSong = null;    // Objeto canto original
let editingSections = [];         // [{ type, label, lines: [] }]
let editingViewMode = 'blocks';   // 'blocks' | 'fulltext'

const lyricsEditorModal = document.getElementById("lyricsEditorModal");
const lyricsEditorTitleInput = document.getElementById("lyricsEditorTitleInput");
const lyricsEditorHeaderTitle = document.getElementById("lyricsEditorHeaderTitle");
const lyricsEditorSongSub = document.getElementById("lyricsEditorSongSub");
const customLyricsBadge = document.getElementById("customLyricsBadge");
const editorBlocksContainer = document.getElementById("editorBlocksContainer");
const editorSectionsList = document.getElementById("editorSectionsList");
const editorFullTextContainer = document.getElementById("editorFullTextContainer");
const lyricsEditorFullTextArea = document.getElementById("lyricsEditorFullTextArea");
const chkUpdateActiveProj = document.getElementById("chkUpdateActiveProj");

const btnModeBlocks = document.getElementById("btnModeBlocks");
const btnModeFullText = document.getElementById("btnModeFullText");
const btnAddVerseSec = document.getElementById("btnAddVerseSec");
const btnAddChorusSec = document.getElementById("btnAddChorusSec");
const btnRestoreFactory = document.getElementById("btnRestoreFactory");
const btnCancelLyrics = document.getElementById("btnCancelLyrics");
const btnSaveLyrics = document.getElementById("btnSaveLyrics");
const btnCloseLyricsEditor = document.getElementById("btnCloseLyricsEditor");

const btnOpenHymnLyricsEditor = document.getElementById("btnOpenHymnLyricsEditor");
const btnOpenChoirLyricsEditor = document.getElementById("btnOpenChoirLyricsEditor");

if (btnOpenHymnLyricsEditor) {
  btnOpenHymnLyricsEditor.addEventListener("click", () => {
    if (selectedHymn) openLyricsEditor('himnos', selectedHymn);
  });
}

if (btnOpenChoirLyricsEditor) {
  btnOpenChoirLyricsEditor.addEventListener("click", () => {
    if (selectedChoirSong) openLyricsEditor('coro', selectedChoirSong);
  });
}

export async function openLyricsEditor(catalog, song) {
  try {
    const data = await (await request(`/api/songs/${catalog}/${encodeURIComponent(song.id || song.number)}`)).json();
    prepareLyricsEditor(catalog, data.song, data.isCustomized);
  } catch (error) { showToast(error.message, 'error'); }
}
export function openNewLyricsEditor(catalog) {
  prepareLyricsEditor(catalog, { isNew: true, title: '', sections: [{ type: 'verse', label: 'Estrofa 1', lines: [] }] }, false);
}
function prepareLyricsEditor(catalog, song, customized) {
  currentEditingCatalog = catalog; currentEditingSong = song;
  editingSections = structuredClone(song.sections || []);
  if (!editingSections.length) editingSections = [{ type: 'verse', label: 'Estrofa 1', lines: [] }];
  lyricsEditorTitleInput.value = song.title;
  lyricsEditorSongSub.textContent = song.isNew ? `Agregar ${catalog === 'coro' ? 'canto del coro' : 'himno'}` : `${catalog === 'coro' ? 'Coro' : 'Himno'} ${song.number || ''} · ${song.title}`;
  customLyricsBadge.style.display = customized ? 'inline-block' : 'none';
  document.getElementById('lyricsEditorNumberLabel').hidden = !song.isNew || catalog !== 'himnos';
  document.getElementById('lyricsEditorNumber').value = '';
  btnRestoreFactory.hidden = !!song.isNew;
  btnRestoreFactory.style.display = song.isNew ? 'none' : '';
  chkUpdateActiveProj.checked = false; chkUpdateActiveProj.disabled = !!song.isNew;
  editingViewMode = 'blocks'; setEditorViewMode('blocks'); renderEditorSections();
  openSurface(lyricsEditorModal, () => { lyricsEditorModal.style.display = 'flex'; });
}

function closeLyricsEditor() {
  if (lyricsEditorModal) closeSurface(lyricsEditorModal, () => { lyricsEditorModal.style.display = 'none'; });
  currentEditingCatalog = null;
  currentEditingSong = null;
  editingSections = [];
}

function setEditorViewMode(mode) {
  editingViewMode = mode;
  if (mode === 'blocks') {
    if (btnModeBlocks) btnModeBlocks.classList.add("active");
    if (btnModeFullText) btnModeFullText.classList.remove("active");
    if (editorBlocksContainer) editorBlocksContainer.style.display = "flex";
    if (editorFullTextContainer) editorFullTextContainer.style.display = "none";
  } else {
    if (btnModeBlocks) btnModeBlocks.classList.remove("active");
    if (btnModeFullText) btnModeFullText.classList.add("active");
    if (editorBlocksContainer) editorBlocksContainer.style.display = "none";
    if (editorFullTextContainer) editorFullTextContainer.style.display = "flex";
  }
}

function syncBlocksToSections() {
  if (!editorSectionsList) return;
  const cards = editorSectionsList.querySelectorAll('.section-card');
  const updated = [];
  cards.forEach((card, idx) => {
    const typeSelect = card.querySelector('.section-type-select');
    const labelInput = card.querySelector('.section-label-input');
    const textarea = card.querySelector('.section-textarea');

    const secType = typeSelect ? typeSelect.value : 'verse';
    const secLabel = labelInput ? labelInput.value.trim() : (secType === 'chorus' ? 'Coro' : `Estrofa ${idx + 1}`);
    const lines = textarea ? textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0) : [];

    updated.push({
      type: secType,
      label: secLabel,
      lines: lines
    });
  });
  editingSections = updated;
}

function sectionsToFullText(sections) {
  return sections.map(sec => {
    const labelStr = sec.label ? sec.label.trim() : (sec.type === 'chorus' ? 'Coro' : 'Estrofa');
    const linesStr = (sec.lines || []).join('\n');
    return `[${labelStr}]\n${linesStr}`;
  }).join('\n\n');
}

function fullTextToSections(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const chunks = raw.split(/\n\s*\n/);
  const sections = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    let label = '';
    let type = 'verse';

    const headerMatch = lines[0].match(/^\[([^\]]+)\]$/) || lines[0].match(/^(Estrofa\s*\d+|Coro|Parte\s*\d+|Canto)[\s:]*$/i);
    if (headerMatch) {
      label = headerMatch[1].trim();
      lines.shift();
    }

    if (!label) {
      const verseCount = sections.filter(s => s.type === 'verse').length + 1;
      label = `Estrofa ${verseCount}`;
    }

    if (/\brespuestas?\b/i.test(label)) {
      type = 'response';
    } else if (/^(?:final|finale|coda|cierre|solo final|final común|campanas y coda|coro final)$/i.test(label)) {
      type = 'final';
    } else if (/coro/i.test(label)) {
      type = 'chorus';
    } else if (/parte/i.test(label)) {
      type = 'part';
    } else if (/canto/i.test(label)) {
      type = 'canto';
    } else {
      type = 'verse';
    }

    if (lines.length > 0) {
      sections.push({ type, label, lines });
    }
  }

  return sections.length > 0 ? sections : [{ type: 'verse', label: 'Estrofa 1', lines: [''] }];
}

function renderEditorSections() {
  if (!editorSectionsList) return;
  editorSectionsList.innerHTML = "";

  editingSections.forEach((sec, idx) => {
    const card = document.createElement("div");
    const isChorus = sec.type === 'chorus';
    card.className = `section-card ${isChorus ? 'is-chorus' : 'is-verse'}`;
    card.dataset.index = idx;

    const lineCount = sec.lines ? sec.lines.length : 0;

    card.innerHTML = `
      <div class="section-card-header">
        <div class="section-header-left">
          <select class="section-type-select">
            <option value="verse" ${sec.type === 'verse' ? 'selected' : ''}>Estrofa</option>
            <option value="chorus" ${sec.type === 'chorus' ? 'selected' : ''}>Coro</option>
            <option value="canto" ${sec.type === 'canto' ? 'selected' : ''}>Canto</option>
            <option value="part" ${sec.type === 'part' ? 'selected' : ''}>Parte</option>
            <option value="bridge" ${sec.type === 'bridge' ? 'selected' : ''}>Puente</option>
            <option value="final" ${sec.type === 'final' ? 'selected' : ''}>Final</option>
            <option value="response" ${sec.type === 'response' ? 'selected' : ''}>Respuesta</option>
          </select>
          <input type="text" class="section-label-input" value="${escapeHtml(sec.label || '')}" placeholder="Etiqueta">
        </div>
        <div class="section-header-right">
          <button type="button" class="btn-sec-action btn-move-up" title="Mover hacia arriba" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''}>▲</button>
          <button type="button" class="btn-sec-action btn-move-down" title="Mover hacia abajo" ${idx === editingSections.length - 1 ? 'disabled style="opacity:0.4;"' : ''}>▼</button>
          <button type="button" class="btn-sec-action btn-sec-delete" title="Eliminar sección">Eliminar</button>
        </div>
      </div>
      <div class="section-card-body">
        <textarea class="section-textarea" rows="4" placeholder="Escribe aquí las líneas de esta sección (un renglón por línea)...">${escapeHtml((sec.lines || []).join('\n'))}</textarea>
        <div class="section-meta-info">
          <span class="sec-line-count">${lineCount} líneas</span>
          <span>La letra se distribuye según los ajustes del visor</span>
        </div>
      </div>
    `;

    const textarea = card.querySelector('.section-textarea');
    const countSpan = card.querySelector('.sec-line-count');
    const typeSelect = card.querySelector('.section-type-select');
    const labelInput = card.querySelector('.section-label-input');

    textarea.addEventListener('input', () => {
      const count = textarea.value.split('\n').filter(l => l.trim().length > 0).length;
      countSpan.textContent = `${count} líneas`;
    });

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'final') labelInput.value = 'Final';
      if (typeSelect.value === 'response') labelInput.value = 'Respuesta';
      if (typeSelect.value === 'chorus') {
        card.className = 'section-card is-chorus';
        if (/^Estrofa\b/i.test(labelInput.value)) labelInput.value = 'Coro';
      } else {
        card.className = 'section-card is-verse';
        if (labelInput.value.toLowerCase() === 'coro') labelInput.value = `Estrofa ${idx + 1}`;
      }
    });

    card.querySelector('.btn-move-up').addEventListener('click', () => {
      if (idx > 0) {
        syncBlocksToSections();
        const temp = editingSections[idx];
        editingSections[idx] = editingSections[idx - 1];
        editingSections[idx - 1] = temp;
        renderEditorSections();
      }
    });

    card.querySelector('.btn-move-down').addEventListener('click', () => {
      if (idx < editingSections.length - 1) {
        syncBlocksToSections();
        const temp = editingSections[idx];
        editingSections[idx] = editingSections[idx + 1];
        editingSections[idx + 1] = temp;
        renderEditorSections();
      }
    });

    card.querySelector('.btn-sec-delete').addEventListener('click', () => {
      if (editingSections.length <= 1) {
        showToast("El canto debe tener al menos una sección", "error");
        return;
      }
      syncBlocksToSections();
      editingSections.splice(idx, 1);
      renderEditorSections();
    });

    editorSectionsList.appendChild(card);
  });
}

if (btnModeBlocks) {
  btnModeBlocks.addEventListener("click", () => {
    if (editingViewMode === 'fulltext') {
      if (lyricsEditorFullTextArea) {
        editingSections = fullTextToSections(lyricsEditorFullTextArea.value);
      }
      setEditorViewMode('blocks');
      renderEditorSections();
    }
  });
}

if (btnModeFullText) {
  btnModeFullText.addEventListener("click", () => {
    if (editingViewMode === 'blocks') {
      syncBlocksToSections();
      if (lyricsEditorFullTextArea) {
        lyricsEditorFullTextArea.value = sectionsToFullText(editingSections);
      }
      setEditorViewMode('fulltext');
    }
  });
}

if (btnAddVerseSec) {
  btnAddVerseSec.addEventListener("click", () => {
    syncBlocksToSections();
    const vCount = editingSections.filter(s => s.type === 'verse').length + 1;
    editingSections.push({
      type: 'verse',
      label: `Estrofa ${vCount}`,
      lines: ['']
    });
    renderEditorSections();
    setTimeout(() => {
      if (editorBlocksContainer) editorBlocksContainer.scrollTop = editorBlocksContainer.scrollHeight;
    }, 50);
  });
}

if (btnAddChorusSec) {
  btnAddChorusSec.addEventListener("click", () => {
    syncBlocksToSections();
    editingSections.push({
      type: 'chorus',
      label: 'Coro',
      lines: ['']
    });
    renderEditorSections();
    setTimeout(() => {
      if (editorBlocksContainer) editorBlocksContainer.scrollTop = editorBlocksContainer.scrollHeight;
    }, 50);
  });
}

if (btnRestoreFactory) {
  btnRestoreFactory.addEventListener("click", restoreFactoryLyrics);
}

if (btnCancelLyrics) {
  btnCancelLyrics.addEventListener("click", closeLyricsEditor);
}

if (btnCloseLyricsEditor) {
  btnCloseLyricsEditor.addEventListener("click", closeLyricsEditor);
}

if (btnSaveLyrics) {
  btnSaveLyrics.addEventListener("click", saveLyricsToDisk);
}

if (lyricsEditorModal) {
  lyricsEditorModal.addEventListener("click", (e) => {
    if (e.target === lyricsEditorModal) {
      closeLyricsEditor();
    }
  });
}

async function saveLyricsToDisk() {
  if (!currentEditingCatalog || !currentEditingSong) return;

  if (editingViewMode === 'fulltext') {
    const txt = lyricsEditorFullTextArea ? lyricsEditorFullTextArea.value : '';
    editingSections = fullTextToSections(txt);
  } else {
    syncBlocksToSections();
  }

  const cleanSections = editingSections.filter(s => s.lines && s.lines.length > 0);
  if (cleanSections.length === 0) {
    showToast("Agrega al menos una sección con líneas de letra", "error");
    return;
  }

  const newTitle = lyricsEditorTitleInput ? lyricsEditorTitleInput.value.trim() : currentEditingSong.title;
  if (!newTitle || newTitle.length > 200) { showToast('Escribe un título de entre 1 y 200 caracteres.'); return; }
  const updateActive = chkUpdateActiveProj ? chkUpdateActiveProj.checked : false;

  const origText = btnSaveLyrics.innerHTML;
  btnSaveLyrics.disabled = true;
  btnSaveLyrics.innerHTML = `<span>Guardando en archivo...</span>`;

  try {
    const songKey = currentEditingSong.id || currentEditingSong.number;
    const url = currentEditingSong.isNew ? `/api/library/${currentEditingCatalog}` : `/api/songs/${currentEditingCatalog}/${encodeURIComponent(songKey)}/save`;
    const res = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        number: Number(document.getElementById('lyricsEditorNumber').value),
        sections: cleanSections,
        updateActiveProjection: updateActive
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar');
    }

    if (currentEditingCatalog === 'himnos') {
      if (selectedHymn && (String(selectedHymn.id) === String(data.song.id) || String(selectedHymn.number) === String(data.song.number))) {
        setSelectedHymn({ ...selectedHymn, ...data.song });
        selectedHymnTitle.textContent = selectedHymn.number ? `HIMNO ${selectedHymn.number} - ${selectedHymn.title.toUpperCase()}` : selectedHymn.title.toUpperCase();
        renderHymnSlides(data.slides);
      }
      const hi = document.getElementById("hymnSearchInput");
      searchHymns(hi ? hi.value.trim() : "");
    } else {
      if (selectedChoirSong && (String(selectedChoirSong.id) === String(data.song.id) || String(selectedChoirSong.number) === String(data.song.number))) {
        setSelectedChoirSong({ ...selectedChoirSong, ...data.song });
        selectedChoirTitle.textContent = selectedChoirSong.title ? `CANTO DEL CORO - ${selectedChoirSong.title.toUpperCase()}` : 'CANTO DEL CORO';
        renderChoirSlides(data.slides);
      }
      const ci = document.getElementById("choirSearchInput");
      searchChoir(ci ? ci.value.trim() : "");
    }

    window.dispatchEvent(new Event('song-catalog-changed'));
    showToast("Canto guardado");
    closeLyricsEditor();
  } catch (err) {
    console.error("Error guardando letra:", err);
    showToast("Error al guardar: " + err.message, "error");
  } finally {
    btnSaveLyrics.disabled = false;
    btnSaveLyrics.innerHTML = origText;
  }
}

async function restoreFactoryLyrics() {
  if (!currentEditingCatalog || !currentEditingSong) return;

  const songLabel = (currentEditingCatalog === 'himnos' && currentEditingSong.number) ? `#${currentEditingSong.number} ${currentEditingSong.title}` : currentEditingSong.title;
  if (!confirm(`¿Restaurar la letra oficial de fábrica para ${songLabel}?\n\nLos cambios en este archivo se sobrescribirán con la versión original.`)) {
    return;
  }

  if (!newTitle || newTitle.length > 200) { showToast('Escribe un título de entre 1 y 200 caracteres.'); return; }
  const updateActive = chkUpdateActiveProj ? chkUpdateActiveProj.checked : false;

  try {
    const songKey = currentEditingSong.id || currentEditingSong.number;
    const res = await request(`/api/songs/${currentEditingCatalog}/${songKey}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updateActiveProjection: updateActive })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al restaurar letra');
    }

    if (currentEditingCatalog === 'himnos') {
      if (selectedHymn && (String(selectedHymn.id) === String(data.song.id) || String(selectedHymn.number) === String(data.song.number))) {
        setSelectedHymn({ ...selectedHymn, ...data.song });
        selectedHymnTitle.textContent = selectedHymn.number ? `HIMNO ${selectedHymn.number} - ${selectedHymn.title.toUpperCase()}` : selectedHymn.title.toUpperCase();
        renderHymnSlides(data.slides);
      }
      const hi = document.getElementById("hymnSearchInput");
      searchHymns(hi ? hi.value.trim() : "");
    } else {
      if (selectedChoirSong && (String(selectedChoirSong.id) === String(data.song.id) || String(selectedChoirSong.number) === String(data.song.number))) {
        setSelectedChoirSong({ ...selectedChoirSong, ...data.song });
        selectedChoirTitle.textContent = selectedChoirSong.title ? `CANTO DEL CORO - ${selectedChoirSong.title.toUpperCase()}` : 'CANTO DEL CORO';
        renderChoirSlides(data.slides);
      }
      const ci = document.getElementById("choirSearchInput");
      searchChoir(ci ? ci.value.trim() : "");
    }

    showToast("Letra restaurada a version original de fabrica");
    closeLyricsEditor();
  } catch (err) {
    console.error("Error restaurando letra de fábrica:", err);
    showToast("Error al restaurar: " + err.message, "error");
  }
}

// BOTONES DE CONTROL REMOTO INFERIOR MÓVIL

export { closeLyricsEditor, lyricsEditorModal, saveLyricsToDisk };
