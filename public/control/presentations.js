import { setSelection } from './selection.js';
import { showToast } from './shell.js';
import { globalState, updateUiState } from './live-state.js';
import { escapeHtml } from './html.js';
import { request } from './api.js';

let currentPresentations = [];
let selectedPresentation = null;
const presentationResultsList = document.getElementById("presentationResultsList");
const presentationSearchInput = document.getElementById("presentationSearchInput");
const presentationSelectedHeader = document.getElementById("presentationSelectedHeader");
const selectedPresentationTitle = document.getElementById("selectedPresentationTitle");
const presentationSlidesGrid = document.getElementById("presentationSlidesGrid");
const pptFileInput = document.getElementById("pptFileInput");
const btnUploadPresentation = document.getElementById("btnUploadPresentation");
const pptDropzone = document.getElementById("pptDropzone");
const btnDeselectPresentation = document.getElementById("btnDeselectPresentation");
const btnProjectPresFirst = document.getElementById("btnProjectPresFirst");

async function loadPresentations(q = "") {
  try {
    const res = await request('/api/presentations');
    const list = await res.json();
    currentPresentations = list;
    renderPresentationResults(list, presentationSearchInput?.value ?? q);
  } catch (e) {
    console.error("Error cargando presentaciones:", e);
  }
}

function renderPresentationResults(list, q = "") {
  if (!presentationResultsList) return;
  presentationResultsList.innerHTML = "";
  const normQ = (q || '').trim().toLowerCase();
  const filtered = normQ
    ? list.filter(p => (p.title || '').toLowerCase().includes(normQ) || (p.filename || '').toLowerCase().includes(normQ))
    : list;

  if (filtered.length === 0) {
    presentationResultsList.innerHTML = `
      <div style="color: var(--text-muted); padding: 15px; text-align: center; font-size: 13px;">
        ${normQ ? 'No se encontraron presentaciones.' : 'No hay presentaciones guardadas. Sube un archivo .pptx o .pdf arriba.'}
      </div>
    `;
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "presentation-result-item" + (selectedPresentation && selectedPresentation.id === p.id ? " selected" : "");
    const thumb = p.coverUrl || (p.slides && p.slides[0] ? p.slides[0].imageUrl : '');
    div.innerHTML = `
      ${thumb ? `<img src="${thumb}" class="presentation-item-thumb" alt="Preview" />` : ''}
      <div class="presentation-item-info">
        <div class="presentation-item-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
        <div class="presentation-item-meta">${p.totalSlides || 0} diapositivas</div>
      </div>
      <button type="button" class="presentation-item-delete" title="Eliminar presentación">×</button>
    `;

    div.querySelector('.presentation-item-delete').addEventListener("click", (e) => {
      e.stopPropagation();
      deletePresentation(p.id, p.title);
    });

    div.addEventListener("click", () => {
      selectPresentation(p);
    });

    frag.appendChild(div);
  });
  presentationResultsList.appendChild(frag);
}

if (presentationSearchInput) {
  presentationSearchInput.addEventListener("input", () => {
    renderPresentationResults(currentPresentations, presentationSearchInput.value);
  });
}

if (btnUploadPresentation && pptFileInput) {
  btnUploadPresentation.addEventListener("click", () => pptFileInput.click());
}

if (pptDropzone && pptFileInput) {
  pptDropzone.addEventListener("click", () => pptFileInput.click());
  pptDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    pptDropzone.classList.add("drag-over");
  });
  pptDropzone.addEventListener("dragleave", () => {
    pptDropzone.classList.remove("drag-over");
  });
  pptDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    pptDropzone.classList.remove("drag-over");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadPresentationFiles(e.dataTransfer.files);
    }
  });
}

if (pptFileInput) {
  pptFileInput.addEventListener("change", () => {
    if (pptFileInput.files && pptFileInput.files.length > 0) {
      uploadPresentationFiles(pptFileInput.files);
    }
  });
}

async function uploadPresentationFiles(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  showToast("Procesando y convirtiendo diapositivas...");
  if (btnUploadPresentation) btnUploadPresentation.disabled = true;

  try {
    const res = await request('/api/presentations/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success && data.presentation) {
      showToast(`Presentación lista: ${data.presentation.title} (${data.presentation.totalSlides} diapositivas)`);
      await loadPresentations();
      selectPresentation(data.presentation);
    } else {
      showToast(`Error: ${data.error || 'No se pudo procesar la presentación'}`);
    }
  } catch (err) {
    showToast("Error de conexión al subir presentación");
  } finally {
    if (btnUploadPresentation) btnUploadPresentation.disabled = false;
    if (pptFileInput) pptFileInput.value = "";
  }
}

async function deletePresentation(id, title) {
  if (!confirm(`¿Eliminar la presentación "${title}"?`)) return;
  try {
    const res = await request(`/api/presentations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Presentación eliminada: ${title}`);
      if (selectedPresentation && selectedPresentation.id === id) {
        deselectCurrentSong();
      }
      loadPresentations(presentationSearchInput ? presentationSearchInput.value : "");
    }
  } catch (e) {
    showToast("Error eliminando presentación");
  }
}

async function selectPresentation(pres, startIndex = 0) {
  await request('/api/control/selection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'presentation', id: pres.id }) });
  setSelectedPresentation(pres);
  if (selectedPresentationTitle) {
    selectedPresentationTitle.textContent = `${pres.title.toUpperCase()} • ${pres.totalSlides} DIAPOSITIVAS`;
  }
  if (presentationSelectedHeader) {
    presentationSelectedHeader.style.display = "flex";
  }

  renderPresentationSlides(pres.slides);
  renderPresentationResults(currentPresentations, presentationSearchInput ? presentationSearchInput.value : "");

}

async function projectPresentation(startIndex = 0) {
  if (!selectedPresentation) return;
  try {
    await request('/api/project/presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentationId: selectedPresentation.id, startIndex: startIndex })
    });
    showToast(`Proyectando Diapositiva #${startIndex + 1} de ${selectedPresentation.title}`);
  } catch (e) {
    console.error("Error proyectando presentación:", e);
  }
}

function renderPresentationSlides(slides) {
  if (!presentationSlidesGrid) return;
  presentationSlidesGrid.innerHTML = "";
  if (!slides || slides.length === 0) return;

  const frag = document.createDocumentFragment();
  slides.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "slide-card presentation-slide-card";
    card.dataset.index = idx;
    card.innerHTML = `
      <div class="slide-card-header">
        <span class="badge-pres">
          <svg class="icon-inline" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Diapositiva ${idx + 1}
        </span>
        <span class="slide-idx-pill">#${idx + 1}/${slides.length}</span>
      </div>
      <div class="presentation-thumb-wrap">
        <img src="${s.thumbUrl || s.imageUrl}" class="presentation-thumb-img" alt="Slide ${idx + 1}" loading="lazy" />
      </div>
    `;

    card.addEventListener("click", () => {
      projectPresentation(idx);
      showToast(`Diapositiva #${idx + 1}`);
    });

    frag.appendChild(card);
  });
  presentationSlidesGrid.appendChild(frag);
  if (globalState) updateUiState(globalState);
}

if (btnDeselectPresentation) {
  btnDeselectPresentation.addEventListener("click", () => window.dispatchEvent(new Event('clear-preparation')));
}

if (btnProjectPresFirst) {
  btnProjectPresFirst.addEventListener("click", () => {
    if (selectedPresentation) {
      projectPresentation(0);
      showToast(`Primera Diapositiva: ${selectedPresentation.title}`);
    }
  });
}

// ==============================================================
// 8.5. LISTA SEMANAL (CARTELERÍA NATIVA HTML)
// ==============================================================

function setSelectedPresentation(value) { selectedPresentation = value; setSelection('presentation', value); }

export { currentPresentations, loadPresentations, presentationResultsList, presentationSearchInput, presentationSelectedHeader, presentationSlidesGrid, renderPresentationResults, renderPresentationSlides, selectedPresentationTitle, selectedPresentation, setSelectedPresentation };
