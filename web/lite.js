import { compileHymnSlides } from '../src/songs/hymn-slides';
import { compileChoirSlides } from '../src/songs/choir-slides';
import { createBibleCitationSlide, CANONICAL_BOOKS } from '../src/bible/citations';
import { createProjection } from '../src/projection/state';
import { paginateSection } from '../src/songs/section-layout';
import { getLists, saveLists } from './lite-storage';

const el = id => document.getElementById(id);
const lists = ['Oraciones', 'Aviso', 'Flores', 'Ventas'];
const { state, updateDisplayPayload } = createProjection({ localIp: '', port: 0 });
const channel = new BroadcastChannel('proyector-lldm-lite');
const owner = crypto.randomUUID();
const ownerKey = 'proyector-lite-output-owner';
const catalogs = {};
let prepared = [], timeout, searchVersion = 0, listData = {};
const normalize = text => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const status = text => { el('status').textContent = text; };
const fetchJson = async name => {
  const response = await fetch('/catalogos/' + name + '.json');
  if (!response.ok) throw new Error('No se pudo cargar el catálogo. Comprueba la conexión.');
  return response.json();
};
const fontReady = document.fonts.load('800 160px Montserrat');

function broadcast() {
  updateDisplayPayload();
  channel.postMessage({ type: 'display', payload: state.displayPayload });
  el('prev').disabled = state.phase !== 'active' || state.currentSlideIndex === 0;
  el('next').disabled = state.phase !== 'active' || state.currentSlideIndex >= state.slides.length - 1;
  for (const button of el('slides').children) {
    if (state.phase === 'active' && prepared === state.slides && +button.dataset.index === state.currentSlideIndex) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
}
function ownsOutput() {
  return localStorage.getItem(ownerKey) === owner;
}
channel.onmessage = ({ data }) => {
  if (data?.type === 'request' && ownsOutput()) broadcast();
};

function show(slides, index) {
  if (!slides[index]) return;
  const fresh = state.phase !== 'active' || state.slides !== slides;
  state.slides = slides;
  state.currentSlideIndex = index;
  state.phase = 'active';
  state.contentType = slides[index].type;
  localStorage.setItem(ownerKey, owner);
  if (fresh) {
    clearTimeout(timeout);
    if (['bible', 'theme'].includes(state.contentType)) timeout = setTimeout(() => {
      if (ownsOutput()) showIdle();
    }, 120000);
  }
  broadcast();
}
function showIdle() {
  clearTimeout(timeout);
  localStorage.removeItem(ownerKey);
  state.phase = 'idle';
  broadcast();
}
function prepare(slides) {
  prepared = slides;
  el('slides').replaceChildren(...slides.map((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.index = index;
    const label = slide.sectionLabel || slide.title || slide.badge;
    const excerpt = slide.lines?.[0];
    button.textContent = [label, excerpt && excerpt !== label ? excerpt.slice(0, 90) : ''].filter(Boolean).join(' · ');
    button.addEventListener('click', () => show(slides, index));
    return button;
  }));
  status(slides.length ? 'Selecciona una diapositiva para enviarla a TV.' : '');
}
el('prev').onclick = () => show(state.slides, state.currentSlideIndex - 1);
el('next').onclick = () => show(state.slides, state.currentSlideIndex + 1);
el('idle').onclick = showIdle;
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') showIdle();
});
window.addEventListener('pagehide', () => { if (ownsOutput()) showIdle(); });

async function search() {
  const version = ++searchVersion;
  const kind = el('kind').value;
  const query = normalize(el('search').value.trim());
  const results = el('results');
  results.replaceChildren();
  try {
    if (!catalogs[kind]) catalogs[kind] = await fetchJson(kind);
    if (version !== searchVersion) return;
    const matches = catalogs[kind].filter(song => !query || normalize(`${song.number ?? ''} ${song.title}`).includes(query)).slice(0, 30);
    for (const song of matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = [song.number, song.title].filter(Boolean).join(' · ');
      button.onclick = async () => {
        try {
          await fontReady;
          if (el('kind').value === kind) prepare((kind === 'hymn' ? compileHymnSlides : compileChoirSlides)(song));
        } catch (error) { status(error.message); }
      };
      results.append(button);
    }
    if (!matches.length) status('No encontramos cantos con esa búsqueda.');
    else status('');
  } catch (error) { if (version === searchVersion) status(error.message); }
}
el('kind').onchange = () => {
  const kind = el('kind').value;
  searchVersion++;
  prepare([]);
  const songs = kind === 'hymn' || kind === 'choir';
  el('songs').hidden = !songs;
  for (const name of ['bible', 'theme', 'list']) el(name).hidden = name !== kind;
  if (songs) void search();
};
el('search').oninput = search;
for (const book of CANONICAL_BOOKS.filter(name => name !== 'Salmo')) el('book').add(new Option(book));
let bible;
el('bible').onsubmit = async event => {
  event.preventDefault();
  const book = el('book').value, chapter = el('chapter').value, verse = el('verse').value.trim();
  const mode = el('bible-mode').value;
  try {
    bible ||= await fetchJson('RVR1960');
    if (el('kind').value !== 'bible') return;
    const chapterText = bible.books[book]?.[chapter];
    const [start, end = start] = verse.split('-').map(Number);
    if (!chapterText?.[start] || !chapterText[end] || start > end) throw new Error('Revisa el capítulo y el rango de versículos.');
    const reference = createBibleCitationSlide(book, chapter, verse);
    if (mode === 'citation') { prepare([reference]); return; }
    await fontReady;
    if (el('kind').value !== 'bible') return;
    const slides = [];
    for (let number = start; number <= end; number++) {
      const text = chapterText[number];
      if (!text) continue;
      for (const layout of paginateSection([text], { width: 1520, height: 690, maxLines: 4 })) {
        slides.push({ ...reference, isTitleOnly: false, mode, version: 'RVR1960',
          lines: [], text: '', displayLines: null, verses: [{ number, text: layout.lines.join(' ') }] });
      }
    }
    prepare(slides);
  } catch (error) { status(error.message); }
};
el('theme').onsubmit = event => {
  event.preventDefault();
  const title = el('theme-title').value.trim();
  if (title) prepare([{ type: 'theme', badge: 'TEMA', title, lines: [title], text: title }]);
};
el('list-kind').onchange = () => { el('list-text').value = listData[el('list-kind').value] || ''; };
el('list').onsubmit = async event => {
  event.preventDefault();
  const title = el('list-kind').value, text = el('list-text').value.trim();
  if (!text) return;
  try {
    listData = await saveLists({ [title]: text });
    if (el('kind').value !== 'list' || el('list-kind').value !== title) return;
    await fontReady;
    prepare(paginateSection(text.split('\n').filter(line => line.trim()), { maxLines: 5, width: 1520, height: 680 })
      .map(layout => ({ type: 'custom', badge: title.toUpperCase(), title, lines: layout.displayLines, text: layout.lines.join('\n') })));
  } catch (error) { status('No se pudo guardar la lista. ' + error.message); }
};
el('export').onclick = async () => {
  try {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'proyector-lite-v1', lists: await getLists() }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proyector-lite-respaldo.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { el('backup-status').textContent = 'No se pudo exportar el respaldo.'; }
};
el('import').onchange = async event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 120000) throw new Error('El archivo supera el límite del respaldo Lite.');
    const backup = JSON.parse(await file.text());
    const entries = Object.entries(backup.lists || {});
    if (backup.format !== 'proyector-lite-v1' || !entries.every(([name, value]) => lists.includes(name) && typeof value === 'string' && value.length <= 4000)) {
      throw new Error('Selecciona un respaldo generado por Proyector Lite.');
    }
    if (!confirm('¿Importar el respaldo y reemplazar las listas que contiene?')) return;
    listData = await saveLists(Object.fromEntries(entries));
    el('list-kind').onchange();
    el('backup-status').textContent = 'Respaldo importado.';
  } catch (error) { el('backup-status').textContent = error.message; }
};
getLists().then(value => {
  listData = value;
  if (!el('list-text').value) el('list-kind').onchange();
}).catch(() => { el('backup-status').textContent = 'El navegador no permite guardar datos en este sitio.'; });
void search();
