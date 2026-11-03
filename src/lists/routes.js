const { text } = require('express');
const { createListsService, slideKeys, SLIDE_META, validWeek } = require('./service');

function buildSlideObjects(week) {
  return slideKeys(week).map(listKey => {
    const [kind, page] = listKey.split(':');
    return {
      type: 'carteleria',
      listKey,
      title: (SLIDE_META[kind]?.title || 'Lista de oraciones') + (page ? ` · Página ${Number(page) + 1}` : ''),
      badge: SLIDE_META[kind]?.badge || 'LISTA SEMANAL'
    };
  });
}

function installListsRoutes({ app, dataDir, projectionState: state, broadcastState, broadcastMessage, hasApp, intervalMs }) {
  function refreshSlides() {
    if (state.contentType !== 'carteleria') return;
    const previous = state.slides[state.currentSlideIndex]?.listKey;
    state.slides = buildSlideObjects(lists.getState().document.currentWeek);
    state.currentSlideIndex = Math.max(0, state.slides.findIndex(slide => slide.listKey === previous));
    if (!state.slides.length) { state.phase = 'idle'; state.isLooping = false; }
    broadcastState();
  }
  const lists = createListsService({ dataDir, onChange(snapshot) {
    broadcastMessage({ type: 'LISTS_UPDATE', ...snapshot });
    refreshSlides();
  } });
  app.get('/api/lists', (req, res) => res.json(lists.getState()));
  app.get('/api/lists/week/export', (req, res) => {
    const { currentWeek, weeks } = lists.getState().document;
    const date = req.query.date;
    const week = date === undefined ? currentWeek : Object.hasOwn(weeks, date) ? weeks[date] : null;
    if (!week) return res.status(404).json({ error: 'No se encontró la semana.' });
    res.attachment(`semana-${week.startDate}.json`).json({ format: 'proyector-lldm-week', version: 1, week });
  });
  app.post('/api/lists/week/import', text({ type: 'application/octet-stream', limit: '2mb', inflate: false }), (req, res, next) => {
    let week;
    try {
      const file = JSON.parse(String(req.body || '').replace(/^\uFEFF/, ''));
      if (file?.format === 'proyector-lldm-week' && file.version === 1 && validWeek(file.week)) week = file.week;
    } catch {}
    if (!week) return res.status(400).json({ error: 'Selecciona un archivo de semana exportado desde Proyector.' });
    const previous = lists.getState().document.weeks[week.startDate];
    if (previous && req.query.replace !== String(lists.getState().revision)) {
      return res.status(409).json({ error: 'Ya existe una semana guardada con esa fecha.', date: week.startDate, revision: lists.getState().revision });
    }
    try {
      lists.patch([{ path: ['weeks', week.startDate], before: previous ?? null, value: week }]);
      res.status(201).json({ date: week.startDate });
    } catch (error) { next(error); }
  });
  app.post('/api/lists/initialize', (req, res, next) => {
    try {
      if (lists.getState().document.currentWeek) return res.json(lists.getState());
      res.json(lists.patch([
        { path: ['currentWeek'], before: null, value: req.body.currentWeek },
        { path: ['customSalesGroups'], before: null, value: req.body.customSalesGroups }
      ]));
    } catch (error) { next(error); }
  });
  app.patch('/api/lists', (req, res, next) => {
    try { res.json(lists.patch(req.body.operations)); }
    catch (error) { if (error.status === 409) return res.status(409).json({ error: error.message, ...lists.getState() }); next(error); }
  });
  app.get('/api/carteleria/info', (req, res) => res.json({
    hasApp: hasApp(),
    slides: slideKeys(lists.getState().document.currentWeek),
    isLooping: state.isLooping,
    rotationSeconds: lists.getState().document.rotationSeconds
  }));
  function project(loop, requestedIndex, requestedKey) {
    if (!hasApp()) throw Object.assign(new Error('Lista de oraciones no disponible en este equipo.'), { status: 503 });
    const slides = buildSlideObjects(lists.getState().document.currentWeek);
    if (!slides.length) throw Object.assign(new Error('Activa al menos una diapositiva visible en la lista.'), { status: 400 });
    let startIndex = 0;
    if (typeof requestedKey === 'string' && requestedKey) {
      const idx = slides.findIndex(s => s.listKey === requestedKey);
      if (idx === -1) throw Object.assign(new Error('Esa página ya no está incluida en TV.'), { status: 409 });
      startIndex = idx;
    } else if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < slides.length) {
      startIndex = requestedIndex;
    }
    Object.assign(state, {
      contentType: 'carteleria',
      phase: 'active',
      activeItem: { id: 'lista-semanal', title: 'Lista de oraciones' },
      slides,
      currentSlideIndex: startIndex,
      isLooping: loop
    });
  }
  app.post('/api/project/carteleria', (req, res, next) => {
    try {
      project(req.body?.loop !== false, req.body?.index, req.body?.listKey);
      broadcastState();
      res.json({ success: true, state });
    } catch (error) { next(error); }
  });
  app.post('/api/project/carteleria/playback', (req, res) => {
    if (typeof req.body?.playing !== 'boolean') return res.status(400).json({ error: 'Indica si la lista debe reproducirse.' });
    if (state.contentType !== 'carteleria' || state.phase !== 'active') return res.status(409).json({ error: 'Primero envía la lista a TV.' });
    state.isLooping = req.body.playing;
    broadcastState(); res.json({ success: true, state });
  });
  app.post('/api/project/carteleria/toggle-loop', (req, res, next) => {
    try {
      if (state.contentType !== 'carteleria' || state.phase !== 'active') project(true);
      else state.isLooping = !state.isLooping;
      broadcastState();
      res.json({ success: true, isLooping: state.isLooping, state });
    } catch (error) { next(error); }
  });
  // One clock for every display, including a display that joins halfway through.
  let timer, lastKey;
  function syncPlayback() {
    if (state.contentType !== 'carteleria' || state.phase !== 'active' || !state.isLooping || state.slides.length < 2) {
      clearTimeout(timer); timer = null; lastKey = null; return;
    }
    const duration = intervalMs ?? lists.getState().document.rotationSeconds * 1000;
    const key = JSON.stringify([state.currentSlideIndex, duration, state.slides.map(slide => slide.listKey)]);
    if (key === lastKey && timer) return;
    clearTimeout(timer); lastKey = key;
    timer = setTimeout(() => {
      timer = null;
      state.currentSlideIndex = (state.currentSlideIndex + 1) % state.slides.length;
      broadcastState();
    }, duration);
    timer.unref();
  }
  return { syncPlayback, close: () => clearTimeout(timer) };
}

module.exports = { installListsRoutes };
