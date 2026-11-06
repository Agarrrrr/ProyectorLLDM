import { request } from './api.js';
import { escapeHtml } from './html.js';

const fields = [...document.querySelectorAll('[data-graphics-field]')];
const backgroundSelect = document.querySelector('[data-graphics-field="background"]');
const animateBackgroundCheckbox = document.querySelector('[data-graphics-field="animateBackground"]');
const backgroundUpload = document.getElementById('tvBackgroundUpload');
const backgroundMessage = document.getElementById('tvBackgroundMessage');
const background = document.getElementById('settingsBackgroundPreview');
const overlay = document.getElementById('settingsOverlayPreview');
const sample = document.getElementById('settingsGraphicSample');
const toggle = document.getElementById('settingsToggleGraphic');
let draft, previewVisible = true, assets = [];

const builtinBackgrounds = [
  ['institutional', 'Institucional · logo sobre blanco'],
  ['classic', 'Centenario · líneas doradas (animado)'],
  ['transparent', 'Transparente · cámaras en TV (canto → cámaras → canto)']
];

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function renderBackgroundOptions() {
  if (!backgroundSelect || !draft) return;
  const current = draft.graphics.background || 'institutional';
  const customAssets = assets.filter(asset => ['image', 'background'].includes(asset.kind));
  backgroundSelect.innerHTML =
    builtinBackgrounds.map(([id, name]) => option(id, name, current)).join('') +
    customAssets.map(asset => {
      const tag = asset.mediaType === 'video' ? ' · Video' : asset.mediaType === 'html' ? ' · Animado' : '';
      return option(asset.id, `${asset.name}${tag}`, current);
    }).join('');
  backgroundSelect.value = current;
  if (animateBackgroundCheckbox) {
    animateBackgroundCheckbox.disabled = current !== 'classic';
  }
}

function graphicSample() {
  const church = draft.church;
  return {
    bible: { type: 'bible', book: 'Juan', chapterVerse: '3:16' },
    theme: { type: 'theme', theme: church.name },
    choir: { type: 'choir', text: 'El coro canta' },
    special: { type: 'special', book: 'Carta Apostólica' },
    drone: { type: 'drone', location: church.city, tag: [church.name, church.address].filter(Boolean).join(' • ') }
  }[sample.value];
}
function updatePreview(includeSample = false) {
  if (!draft) return;
  if (includeSample) { previewVisible = true; toggle.textContent = 'Ocultar ejemplo'; }
  for (const frame of [background, overlay]) frame.contentWindow?.postMessage({
    type: 'GRAPHICS_PREVIEW', settings: draft,
    graphic: includeSample && frame === overlay ? graphicSample() : undefined
  }, location.origin);
}
fields.forEach(field => field.addEventListener('input', () => {
  if (!draft) return;
  draft.graphics[field.dataset.graphicsField] = field.type === 'checkbox' ? field.checked
    : ['range', 'number'].includes(field.type) ? (field.value === '' ? null : Number(field.value)) : field.value;
  document.querySelector('[data-graphics-field="bannerTone"]').disabled = draft.graphics.bannerStyle === 'classic';
  if (animateBackgroundCheckbox) {
    animateBackgroundCheckbox.disabled = draft.graphics.background !== 'classic';
  }
  updatePreview();
}));
if (backgroundUpload) {
  backgroundUpload.addEventListener('change', async event => {
    const input = event.target;
    const file = input.files[0];
    if (!file || !draft) return;
    const targetDraft = draft;
    const data = new FormData();
    data.append('file', file);
    input.disabled = true;
    if (backgroundMessage) backgroundMessage.textContent = 'Importando fondo de reposo…';
    try {
      const asset = await (await request('/api/song-assets/background', { method: 'POST', body: data })).json();
      if (draft !== targetDraft) return;
      assets = await (await request('/api/song-assets')).json();
      if (draft !== targetDraft) return;
      targetDraft.graphics.background = asset.id;
      renderBackgroundOptions();
      updatePreview();
      if (backgroundMessage) backgroundMessage.textContent = `Fondo «${asset.name}» importado. Pulsa Guardar para aplicarlo en las TV.`;
    } catch (error) {
      if (backgroundMessage) backgroundMessage.textContent = error.message;
    } finally {
      input.disabled = false;
      input.value = '';
    }
  });
}
sample.addEventListener('change', () => updatePreview(true));
document.getElementById('settingsReplayGraphic').addEventListener('click', () => updatePreview(true));
toggle.addEventListener('click', () => {
  if (!draft) return;
  if (!previewVisible) { updatePreview(true); return; }
  previewVisible = false;
  toggle.textContent = 'Mostrar ejemplo';
  overlay.contentWindow?.postMessage({ type: 'GRAPHICS_PREVIEW', settings: draft, hideGraphic: true }, location.origin);
});
background.addEventListener('load', () => updatePreview());
overlay.addEventListener('load', () => updatePreview(true));
export async function openGraphicsSettings(settings) {
  if (!settings?.graphics) throw new Error('Reinicia el servidor de Proyector LLDM y recarga la página para activar los ajustes de gráficos.');
  draft = settings;
  previewVisible = true; toggle.textContent = 'Ocultar ejemplo';
  if (backgroundMessage) backgroundMessage.textContent = '';
  try {
    assets = await (await request('/api/song-assets')).json();
  } catch {
    assets = [];
  }
  if (draft !== settings) return;
  renderBackgroundOptions();
  fields.forEach(field => {
    const value = draft.graphics[field.dataset.graphicsField];
    if (field.type === 'checkbox') field.checked = value !== false;
    else field.value = value;
  });
  document.querySelector('[data-graphics-field="bannerTone"]').disabled = draft.graphics.bannerStyle === 'classic';
  if (animateBackgroundCheckbox) {
    animateBackgroundCheckbox.disabled = draft.graphics.background !== 'classic';
  }
  background.src = '/idle.html?appearancePreview=1';
  overlay.src = '/overlay?obs=1&appearancePreview=1';
}
export function closeGraphicsSettings() {
  draft = null;
  if (backgroundMessage) backgroundMessage.textContent = '';
  background.src = overlay.src = 'about:blank';
}
