const { lyricsDefaults, validateLyrics } = require('../songs/appearance');
const fs = require('node:fs');
const path = require('node:path');

const controls = [
  { id: 'nextSlide', label: 'Siguiente diapositiva', keys: ['ArrowRight', 'Space'] },
  { id: 'previousSlide', label: 'Diapositiva anterior', keys: ['ArrowLeft'] },
  { id: 'nextSection', label: 'Siguiente estrofa o sección', keys: ['ArrowDown'] },
  { id: 'previousSection', label: 'Estrofa o sección anterior', keys: ['ArrowUp'] },
  { id: 'toggleIdle', label: 'Mostrar fondo / reanudar', keys: ['KeyB'] },
  { id: 'hideOverlay', label: 'Ocultar banner de OBS', keys: ['KeyO'] },
  { id: 'help', label: 'Guía de controles', keys: ['F1'] }
];
const CHURCH_NAME = 'La Luz del Mundo';
const graphicsDefaults = {
  background: 'institutional', bannerStyle: 'angular', bannerTone: 'navy',
  bannerPosition: 'top-right', logoColor: 'official', logoPosition: 'bottom-left', logoSize: 215,
  bannerDurationSeconds: 30, locationDurationSeconds: 75
};
const defaults = {
  church: { name: CHURCH_NAME, address: '', city: '' },
  graphics: graphicsDefaults,
  lyrics: lyricsDefaults,
  operator: { showLyricsEditor: false },
  keyboard: Object.fromEntries(controls.map(control => [control.id, control.keys]))
};
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['church', 'keyboard', 'graphics', 'lyrics', 'operator'].includes(key))) throw new Error('Ajustes no válidos.');
  const operator = value.operator ?? structuredClone(defaults.operator);
  if (!operator || typeof operator !== 'object' || Array.isArray(operator) || Object.keys(operator).some(key => key !== 'showLyricsEditor') || typeof operator.showLyricsEditor !== 'boolean') throw new Error('Opciones de interfaz no válidas.');
  const graphics = value.graphics == null ? structuredClone(graphicsDefaults) : {
    bannerDurationSeconds: graphicsDefaults.bannerDurationSeconds,
    locationDurationSeconds: graphicsDefaults.locationDurationSeconds, ...value.graphics
  };
  const choices = {
    background: ['institutional', 'classic'], bannerStyle: ['angular', 'classic'],
    bannerTone: ['navy', 'ivory', 'burgundy'], bannerPosition: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    logoColor: ['official', 'gold', 'white', 'navy', 'silver'],
    logoPosition: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'hidden']
  };
  if (!graphics || typeof graphics !== 'object' || Array.isArray(graphics) ||
      Object.keys(graphics).some(key => !Object.hasOwn(graphicsDefaults, key)) ||
      Object.entries(choices).some(([key, values]) => !values.includes(graphics[key])) ||
      !Number.isInteger(graphics.logoSize) || graphics.logoSize < 120 || graphics.logoSize > 300) throw new Error('Opciones de gráficos no válidas.');
  for (const key of ['bannerDurationSeconds', 'locationDurationSeconds']) {
    if (!Number.isInteger(graphics[key]) || graphics[key] < 0 || graphics[key] > 3600) throw new Error('La duración de OBS debe ser un número entero de 0 a 3600 segundos. Usa 0 para ocultar manualmente.');
  }
  const church = value.church;
  if (!church || Object.keys(church).some(key => !['name', 'address', 'city'].includes(key)) ||
      ['name', 'address', 'city'].some(key => typeof church[key] !== 'string' || church[key].length > 160) || church.name !== CHURCH_NAME) throw new Error('El nombre de la iglesia es La Luz del Mundo. Dirección y ciudad admiten hasta 160 caracteres.');
  const used = new Set(), keyboard = value.keyboard;
  if (!keyboard || Object.keys(keyboard).length !== controls.length) throw new Error('Controles incompletos.');
  for (const control of controls) {
    const keys = keyboard[control.id];
    if (!Array.isArray(keys) || keys.length < 1 || keys.length > 2) throw new Error('Cada acción necesita una o dos teclas.');
    for (const key of keys) {
      if (typeof key !== 'string' || !/^(?:(?:Ctrl|Alt|Shift|Meta)\+)*(?:Key[A-Z]|Digit[0-9]|Arrow(?:Right|Left|Up|Down)|Space|F(?:[1-9]|1[0-2]))$/.test(key) || key === 'Ctrl+KeyS') throw new Error('Tecla no disponible. Escape y Ctrl+S están reservados.');
      if (used.has(key)) throw new Error('Una misma tecla no puede usarse para dos acciones.');
      used.add(key);
    }
  }
  return { church: Object.fromEntries(Object.entries(church).map(([key, text]) => [key, text.trim()])), keyboard: structuredClone(keyboard), graphics: structuredClone(graphics), lyrics: validateLyrics(value.lyrics), operator: structuredClone(operator) };
}

function createSettingsService({ app, dataDir, onChange, validateExtra = () => {} }) {
  const filename = path.join(dataDir, 'settings.json');
  let snapshot = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : { revision: 0, settings: structuredClone(defaults) };
  // Old installations gain the new options without losing church data or shortcuts.
  snapshot.settings.lyrics ??= structuredClone(lyricsDefaults);
  for (const type of ['hymn', 'choir']) snapshot.settings.lyrics[type] = { ...lyricsDefaults[type], ...snapshot.settings.lyrics[type] };
  snapshot.settings.graphics = { ...graphicsDefaults, ...snapshot.settings.graphics };
  snapshot.settings.operator ??= structuredClone(defaults.operator);
  const normalizedChurch = { ...snapshot.settings.church, name: CHURCH_NAME };
  if (JSON.stringify(normalizedChurch) !== JSON.stringify(snapshot.settings.church)) {
    snapshot.settings.church = normalizedChurch;
    snapshot.revision++;
    fs.writeFileSync(filename + '.tmp', JSON.stringify(snapshot, null, 2));
    fs.renameSync(filename + '.tmp', filename);
  }
  validate(snapshot.settings);
  app.get('/api/settings', (req, res) => res.json({ ...snapshot, controls, defaults }));
  app.put('/api/settings', (req, res, next) => {
    try {
      if (req.body?.revision !== snapshot.revision) return res.status(409).json({ error: 'Otro dispositivo cambió los ajustes. Cierra y abre Ajustes para cargar la versión actual.' });
      let settings;
      try { settings = validate(req.body.settings); validateExtra(settings); } catch (error) { return res.status(400).json({ error: error.message }); }
      const updated = { revision: snapshot.revision + 1, settings };
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(filename + '.tmp', JSON.stringify(updated, null, 2));
      fs.renameSync(filename + '.tmp', filename);
      snapshot = updated;
      onChange(snapshot);
      res.json({ ...snapshot, controls, defaults });
    } catch (error) { next(error); }
  });
  return { get: () => snapshot };
}
module.exports = { createSettingsService, controls, defaults, validateSettings: validate };
