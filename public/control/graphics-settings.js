const fields = [...document.querySelectorAll('[data-graphics-field]')];
const background = document.getElementById('settingsBackgroundPreview');
const overlay = document.getElementById('settingsOverlayPreview');
const sample = document.getElementById('settingsGraphicSample');
const toggle = document.getElementById('settingsToggleGraphic');
let draft, previewVisible = true;
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
  draft.graphics[field.dataset.graphicsField] = ['range', 'number'].includes(field.type) ? (field.value === '' ? null : Number(field.value)) : field.value;
  document.querySelector('[data-graphics-field="bannerTone"]').disabled = draft.graphics.bannerStyle === 'classic';
  updatePreview();
}));
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
export function openGraphicsSettings(settings) {
  if (!settings?.graphics) throw new Error('Reinicia el servidor de Proyector LLDM y recarga la página para activar los ajustes de gráficos.');
  draft = settings;
  previewVisible = true; toggle.textContent = 'Ocultar ejemplo';
  fields.forEach(field => { field.value = draft.graphics[field.dataset.graphicsField]; });
  document.querySelector('[data-graphics-field="bannerTone"]').disabled = draft.graphics.bannerStyle === 'classic';
  background.src = '/idle.html?appearancePreview=1';
  overlay.src = '/overlay?obs=1&appearancePreview=1';
}
export function closeGraphicsSettings() {
  draft = null;
  background.src = overlay.src = 'about:blank';
}
