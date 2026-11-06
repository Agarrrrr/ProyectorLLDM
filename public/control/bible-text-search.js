import { request } from './api.js';

let searchTimer = null;
let searchSequence = 0;
let submitButton = null;
let statusNode = null;
let resultsNode = null;
let selectResult = null;

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

export function refreshBibleTextSearchActions(mode = 'citation') {
  if (!resultsNode) return;
  const label = mode === 'citation' ? 'Proyectar · Solo cita' : 'Proyectar · Cita + texto';
  resultsNode.querySelectorAll('.bible-text-search-result-action').forEach(action => { action.textContent = label; });
}

function renderResults(results, mode) {
  if (!resultsNode) return;
  const fragment = document.createDocumentFragment();
  for (const result of results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bible-text-search-result';
    button.setAttribute('aria-label', `Proyectar ${result.reference} en modo ${mode === 'citation' ? 'solo cita' : 'cita y texto'}`);
    const header = document.createElement('span');
    header.className = 'bible-text-search-result-header';
    const reference = document.createElement('strong');
    reference.textContent = result.reference;
    const action = document.createElement('span');
    action.className = 'bible-text-search-result-action';
    header.append(reference, action);
    const verseText = document.createElement('span');
    verseText.className = 'bible-text-search-result-text';
    verseText.textContent = result.text;
    button.append(header, verseText);
    button.addEventListener('click', () => selectResult?.(result));
    fragment.appendChild(button);
  }
  resultsNode.replaceChildren(fragment);
  refreshBibleTextSearchActions(mode);
}

async function searchBibleText(getVersion, getMode) {
  const input = document.getElementById('bibleTextSearchInput');
  if (!input || !statusNode || !resultsNode) return;
  const query = input.value.trim();
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const sequence = ++searchSequence;
  if (!query) {
    resultsNode.replaceChildren();
    setStatus('');
    if (submitButton) submitButton.disabled = false;
    return;
  }
  if (normalized.length < 3) {
    resultsNode.replaceChildren();
    setStatus('Escribe al menos 3 letras para buscar.');
    if (submitButton) submitButton.disabled = false;
    return;
  }
  resultsNode.replaceChildren();
  setStatus('Buscando en la versión seleccionada…');
  if (submitButton) submitButton.disabled = true;
  try {
    const params = new URLSearchParams({ q: query, version: getVersion(), limit: '16' });
    const response = await request(`/api/biblia/search?${params}`);
    const data = await response.json();
    if (sequence !== searchSequence) return;
    const results = Array.isArray(data.results) ? data.results : [];
    renderResults(results, getMode());
    if (!data.total) setStatus(`No encontramos pasajes para «${query}». Prueba con una frase más corta.`);
    else if (data.total > results.length) setStatus(`Se encontraron ${data.total} pasajes. Mostrando los primeros ${results.length}; prueba una frase más larga para precisar.`);
    else setStatus(`${results.length} pasaje${results.length === 1 ? '' : 's'}. Selecciona uno para proyectarlo.`);
  } catch (error) {
    if (sequence === searchSequence) setStatus(error.message || 'No se pudo buscar en el texto bíblico.');
  } finally {
    if (sequence === searchSequence && submitButton) submitButton.disabled = false;
  }
}

export function setupBibleTextSearch({ getMode, getVersion, onSelect }) {
  const form = document.getElementById('bibleTextSearchForm');
  const input = document.getElementById('bibleTextSearchInput');
  submitButton = document.getElementById('bibleTextSearchButton');
  statusNode = document.getElementById('bibleTextSearchStatus');
  resultsNode = document.getElementById('bibleTextSearchResults');
  selectResult = onSelect;
  if (!form || !input || !submitButton || !resultsNode) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(searchTimer);
    searchBibleText(getVersion, getMode);
  });
  window.addEventListener('bible-version-changed', () => {
    if (input.value.trim()) searchBibleText(getVersion, getMode);
  });
  input.addEventListener('input', () => {
    searchSequence++;
    window.dispatchEvent(new Event('capture-shared-drafts'));
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchBibleText(getVersion, getMode), 280);
  });
}

export function clearBibleTextSearch() {
  clearTimeout(searchTimer);
  searchSequence++;
  const input = document.getElementById('bibleTextSearchInput');
  if (input) input.value = '';
  window.dispatchEvent(new Event('capture-shared-drafts'));
  if (resultsNode) resultsNode.replaceChildren();
  setStatus('');
  if (submitButton) submitButton.disabled = false;
}