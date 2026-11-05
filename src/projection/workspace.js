const fs = require('node:fs');
const path = require('node:path');

const SONG_TYPES = ['hymn', 'choir', 'presentation'];

function createWorkspace({ app, state, catalogs, presentationService, broadcastState, dataDir, songCompiler }) {
  const { compileHymnSlides, compileChoirSlides } = songCompiler;
  const filename = path.join(dataDir, 'control-workspace.json');
  const saved = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {};
  state.workspace = {
    selections: { hymn: null, choir: null, presentation: null },
    drafts: saved.drafts || {},
    histories: saved.histories || { searchHistory: [], themeHistory: [] }
  };

  let persistedValue = '';
  function persist() {
    const value = JSON.stringify({ drafts: state.workspace.drafts, histories: state.workspace.histories, selections: Object.fromEntries(SONG_TYPES.map(type => [type, state.workspace.selections[type]?.item?.id ?? state.workspace.selections[type]?.item?.number ?? null])) }, null, 2);
    if (value === persistedValue) return;
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filename + '.tmp', value);
    fs.renameSync(filename + '.tmp', filename);
    persistedValue = value;
  }

  let lastActiveItem, lastActiveSlides, lastActiveType;
  function adoptProjection() {
    if (state.phase === 'active' && state.activeItem && SONG_TYPES.includes(state.contentType)) {
      const catalog = state.contentType === 'hymn' ? catalogs.himnario : state.contentType === 'choir' ? catalogs.coro : null;
      if (catalog && !catalog.some(item => item.id === state.activeItem.id)) { persist(); return; }
      // Compare the live source, not the prepared selection: an editor may prepare
      // a new version while the old version deliberately remains on the TV.
      if (lastActiveItem !== state.activeItem || lastActiveSlides !== state.slides || lastActiveType !== state.contentType) {
        lastActiveItem = state.activeItem; lastActiveSlides = state.slides; lastActiveType = state.contentType;
        state.workspace.selections[state.contentType] = { item: state.activeItem, slides: state.slides };
      }
    }
    persist();
  }

  function resolveSelectionEntry(type, id) {
    if (id == null || id === '') return null;
    const list = type === 'hymn' ? catalogs.himnario : type === 'choir' ? catalogs.coro : type === 'presentation' ? presentationService.getPresentations() : null;
    if (!list) return null;
    const item = list.find(entry => String(entry.id) === String(id) || String(entry.number) === String(id));
    if (!item) return null;
    const slides = type === 'hymn' ? compileHymnSlides(item) : type === 'choir' ? compileChoirSlides(item) : item.slides;
    return { item, slides };
  }

  for (const type of SONG_TYPES) state.workspace.selections[type] = resolveSelectionEntry(type, saved.selections?.[type]);

  app.post('/api/control/selection', (req, res) => {
    const { type, id, clearAll } = req.body || {};
    if (clearAll) {
      for (const key of SONG_TYPES) state.workspace.selections[key] = null;
      broadcastState();
      return res.json({ success: true });
    }
    if (!SONG_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo no válido.' });
    if (id == null) {
      state.workspace.selections[type] = null;
    } else {
      const resolved = resolveSelectionEntry(type, id);
      if (!resolved) return res.status(404).json({ error: 'Contenido no encontrado.' });
      state.workspace.selections[type] = resolved;
    }
    broadcastState();
    res.json({ success: true });
  });

  const draftFields = new Set(['themeInput', 'searchBook', 'chapter', 'verse', 'bibleTextSearchInput', 'activeTab', 'hymnSearchInput', 'choirSearchInput', 'presentationSearchInput']);
  app.patch('/api/control/drafts', (req, res) => {
    for (const [id, value] of Object.entries(req.body || {})) {
      if (!draftFields.has(id) || typeof value !== 'string' || value.length > 3000) return res.status(400).json({ error: 'Campo no válido.' });
    }
    if (req.body.activeTab && !['tab-himnario', 'tab-biblia', 'tab-coro', 'tab-carteleria', 'tab-presentacion', 'tab-overlay'].includes(req.body.activeTab)) return res.status(400).json({ error: 'Pestaña no válida.' });
    Object.assign(state.workspace.drafts, req.body);
    broadcastState();
    res.json({ success: true });
  });

  // Sincronización maestra desde la PC principal hacia todos los demás dispositivos
  app.post('/api/control/pc-sync', (req, res) => {
    const { selections = {}, drafts = {} } = req.body || {};
    for (const type of SONG_TYPES) {
      const selId = selections[type];
      state.workspace.selections[type] = selId != null ? resolveSelectionEntry(type, selId) : null;
    }
    const nextDrafts = {};
    for (const [id, value] of Object.entries(drafts)) {
      if (draftFields.has(id) && typeof value === 'string' && value.length <= 3000) {
        nextDrafts[id] = value;
      }
    }
    state.workspace.drafts = nextDrafts;
    broadcastState();
    res.json({ success: true, state });
  });

  app.post('/api/control/history', (req, res) => {
    const { name, add = [], remove = [], clear = false } = req.body;
    if (!['searchHistory', 'themeHistory'].includes(name) || !Array.isArray(add) || !Array.isArray(remove) ||
        [...add, ...remove].some(item => typeof item !== 'string' || item.length > 3000)) return res.status(400).json({ error: 'Historial no válido.' });
    const before = clear ? [] : state.workspace.histories[name].filter(item => !remove.includes(item));
    state.workspace.histories[name] = [...new Set([...before, ...add])].slice(name === 'themeHistory' ? -8 : -50);
    persist();
    broadcastState();
    res.json({ success: true });
  });

  return { adoptProjection };
}

module.exports = { createWorkspace };
