const fs = require('fs');
const path = require('path');
const { prepareDatabase, searchSongs } = require('../songs/search');
const { CANONICAL_BOOKS, createBibleCitationSlide } = require('../bible/citations');
const { createBibleService } = require('../bible/service');
const { normalizeChoirSection } = require('../songs/sections');

function installCatalogRoutes({ app, catalogs, projectionState, broadcastState, publishProjection, songCompiler, bibleService, dataDir }) {
  const bible = bibleService || createBibleService({ dataDir });
  const { compileHymnSlides, compileChoirSlides } = songCompiler;
  app.param('catalog', (req, res, next, value) => {
    if (!['himnos', 'himnario', 'coro', 'choir'].includes(value)) return res.status(400).json({ error: 'Catálogo no reconocido.' });
    next();
  });
  // 6. RUTAS DE API REST
  // Búsqueda de Himnos (Lazy normalizado, sin límite artificial de 50)
  app.get('/api/himnos', (req, res) => {
    const query = req.query.q || '';
    const isFull = req.query.full === 'true';
    res.json(searchSongs(catalogs.himnario, query, isFull));
  });

  // Obtener detalle de himno y compilar diapositivas
  app.get('/api/himnos/:id', (req, res) => {
    const maxLines = parseInt(req.query.maxLines, 10) || 4;
    const hymn = catalogs.himnario.find(h => h.id === req.params.id || h.number == req.params.id);
    if (!hymn) return res.status(404).json({ error: 'Himno no encontrado' });

    const slides = compileHymnSlides(hymn, maxLines);
    res.json({ hymn, slides });
  });

  // Proyectar Himno
  app.post('/api/project/hymn', (req, res) => {
    const { hymnId, maxLines = 4, startIndex, titleOnly = false } = req.body;
    const hymn = catalogs.himnario.find(h => h.id === hymnId || h.number == hymnId);
    if (!hymn) return res.status(404).json({ error: 'Himno no encontrado' });

    const slides = compileHymnSlides(hymn, maxLines, true);
    projectionState.phase = 'active';
    projectionState.contentType = 'hymn';
    projectionState.activeItem = hymn;
    projectionState.slides = slides;

    let chosenIndex = 0;
    if (titleOnly) {
      chosenIndex = 0;
    } else if (typeof startIndex === 'number') {
      chosenIndex = Math.max(0, Math.min(Math.trunc(startIndex) || 0, slides.length - 1));
    } else {
      // Si no se especifica y no es titleOnly, entrar directo a la estrofa 1 (índice 1)
      chosenIndex = slides.length > 1 ? 1 : 0;
    }

    projectionState.currentSlideIndex = chosenIndex;

    publishProjection({ repeat: req.body.announce === true });
    res.json({ success: true, state: projectionState });
  });

  // API Biblia: Versiones disponibles
  app.get('/api/biblia/versions', (req, res) => {
    res.json(bible.getManifest());
  });

  // API Biblia: Límites de capítulos y versículos por versión
  app.get('/api/biblia/limits', (req, res) => {
    const version = req.query.version || 'RVR1960';
    try {
      const limits = bible.getLimits(version);
      const meta = bible.findVersionMeta(version);
      res.json({ version: meta.id, name: meta.name, limits });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // API Biblia: Lista de libros
  app.get('/api/biblia/books', (req, res) => {
    const version = req.query.version || 'RVR1960';
    try {
      const vData = bible.getVersion(version);
      res.json(Object.keys(vData.books || {}));
    } catch (_) {
      res.json(CANONICAL_BOOKS);
    }
  });

  // Busca pasajes por texto, ignorando tildes, espacios y puntuación.
  app.get('/api/biblia/search', (req, res) => {
    const query = String(req.query.q || '').trim();
    const version = String(req.query.version || 'RVR1960');
    if (query.length > 300) return res.status(400).json({ error: 'La búsqueda no puede superar 300 caracteres.' });
    try {
      res.json(bible.searchVerses({ query, versionId: version, limit: req.query.limit }));
    } catch (err) {
      res.status(400).json({ error: err.message || 'No se pudo buscar en el texto bíblico.' });
    }
  });

  // Proyectar Cita Bíblica (Modo Solo Cita o Cita + Texto Bíblico)
  app.post('/api/project/bible', (req, res) => {
    const { book, chapter, verse, mode = 'citation', version = 'RVR1960', startIndex = 0, announce = true } = req.body || {};
    if (!book) {
      return res.status(400).json({ error: 'Libro requerido para proyectar cita bíblica' });
    }

    try {
      const { fontSize, minFontSize, maxLines } = projectionState.settings.lyrics.hymn;
      const slides = bible.createBibleSlides({ book, chapter, verse, mode, versionId: version, profile: { fontSize, minFontSize, maxLines } });
      if (!slides || slides.length === 0) {
        return res.status(400).json({ error: 'Cita inválida' });
      }

      projectionState.phase = 'active';
      projectionState.contentType = 'bible';
      projectionState.isLooping = false;
      projectionState.activeItem = {
        book: slides[0].book,
        chapter: slides[0].chapter,
        verse: String(verse ?? '').trim(),
        mode: slides[0].mode,
        version: slides[0].version
      };
      projectionState.slides = slides;
      const chosenIndex = typeof startIndex === 'number'
        ? Math.max(0, Math.min(Math.trunc(startIndex) || 0, slides.length - 1))
        : 0;
      projectionState.currentSlideIndex = chosenIndex;

      publishProjection({ repeat: announce !== false });
      res.json({ success: true, state: projectionState });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Error al proyectar cita bíblica' });
    }
  });

  // Recargar base de datos del coro manualmente
  app.post('/api/coro/reload', (req, res) => {
    catalogs.loadCoroDatabase();
    res.json({ success: true, count: catalogs.coro.length });
  });

  // API Cantos del Coro: Búsqueda (Lazy normalizado, sin límite artificial de 50)
  app.get('/api/coro', (req, res) => {
    const query = req.query.q || '';
    const isFull = req.query.full === 'true';
    res.json(searchSongs(catalogs.coro, query, isFull, { alphabetical: true }));
  });

  // Obtener detalle de canto del coro y compilar diapositivas
  app.get('/api/coro/:id', (req, res) => {
    const maxLines = parseInt(req.query.maxLines, 10) || 4;
    const song = catalogs.coro.find(c => c.id === req.params.id || c.number == req.params.id);
    if (!song) return res.status(404).json({ error: 'Canto del coro no encontrado' });

    const slides = compileChoirSlides(song, maxLines, true);
    res.json({ song, slides });
  });

  // Proyectar Canto del Coro
  app.post('/api/project/choir', (req, res) => {
    const { choirId, songId, title, maxLines = 4, startIndex, titleOnly = false } = req.body;
    const searchKey = choirId || songId;
    let song = null;
    if (searchKey) {
      song = catalogs.coro.find(c => c.id === searchKey || c.number == searchKey);
    }
    if (!song && title) {
      song = catalogs.coro.find(c => (c.title || '').toLowerCase() === title.trim().toLowerCase());
    }

    if (song) {
      const slides = compileChoirSlides(song, maxLines, true);
      projectionState.phase = 'active';
      projectionState.contentType = 'choir';
      projectionState.isLooping = false;
      projectionState.activeItem = song;
      projectionState.slides = slides;

      let chosenIndex = 0;
      if (titleOnly) {
        chosenIndex = 0;
      } else if (typeof startIndex === 'number') {
        chosenIndex = Math.max(0, Math.min(Math.trunc(startIndex) || 0, slides.length - 1));
      } else {
        chosenIndex = slides.length > 1 ? 1 : 0;
      }

      projectionState.currentSlideIndex = chosenIndex;

      publishProjection({ repeat: req.body.announce === true });
      return res.json({ success: true, state: projectionState });
    }

    if (title) {
      const cleanTitle = title.trim();
      const slide = {
        type: 'choir',
        badge: 'CANTO DEL CORO',
        title: cleanTitle,
        lines: [cleanTitle],
        text: cleanTitle,
        footer: 'Iglesia La Luz Del Mundo',
        slideNum: 1
      };

      projectionState.phase = 'active';
      projectionState.contentType = 'choir';
      projectionState.isLooping = false;
      projectionState.activeItem = { title: cleanTitle };
      projectionState.slides = [slide];
      projectionState.currentSlideIndex = 0;


      publishProjection({ repeat: req.body.announce === true });
      return res.json({ success: true, state: projectionState });
    }

    return res.status(400).json({ error: 'Canto del coro no encontrado o título requerido' });
  });

  // ==============================================================
  // API: EDITOR DE LETRA COMPLETA (EMERGENCIA Y PERSISTENCIA EN DISCO)
  // ==============================================================

  // 1. Obtener datos completos de un canto para edición y comparación con fábrica
  app.get('/api/songs/:catalog/:id', (req, res) => {
    const catalog = (req.params.catalog || '').toLowerCase();
    const isCoro = catalog === 'coro' || catalog === 'choir';
    const list = isCoro ? catalogs.coro : catalogs.himnario;
    const song = list.find(s => String(s.id) === String(req.params.id) || String(s.number) === String(req.params.id));
    if (!song) return res.status(404).json({ error: 'Canto no encontrado en ' + catalog });
    const editorSections = entry => isCoro ? (entry.sections || []).map(normalizeChoirSection) : (entry.sections || []);

    // Comparar con copia de fábrica
    const factoryPath = path.join(catalogs.factoryDir, isCoro ? 'coro_lldm.json' : 'himnario_lldm.json');
    let factorySong = null;
    let isCustomized = false;
    try {
      if (fs.existsSync(factoryPath)) {
        const fList = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
        factorySong = fList.find(s => String(s.id) === String(req.params.id) || String(s.number) === String(req.params.id)) || null;
        if (factorySong) {
          isCustomized = (song.title !== factorySong.title) || (JSON.stringify(editorSections(song)) !== JSON.stringify(editorSections(factorySong)));
        }
      }
    } catch (e) {
      console.error('[FACTORY CHECK ERROR]', e);
    }

    res.json({
      song: {
        id: song.id,
        number: song.number,
        title: song.title,
        sections: editorSections(song),
        totalLines: song.totalLines || 0
      },
      isCustomized,
      factorySong: factorySong ? {
        id: factorySong.id,
        number: factorySong.number,
        title: factorySong.title,
        sections: factorySong.sections || [],
        totalLines: factorySong.totalLines || 0
      } : null
    });
  });

  // 2. Guardar letra modificada físicamente en disco (persistente)
  app.post('/api/songs/:catalog/:id/save', (req, res) => {
    const catalog = (req.params.catalog || '').toLowerCase();
    const isCoro = catalog === 'coro' || catalog === 'choir';
    const list = isCoro ? catalogs.coro : catalogs.himnario;
    const existingSong = list.find(s => String(s.id) === String(req.params.id) || String(s.number) === String(req.params.id));
    if (!existingSong) return res.status(404).json({ error: 'Canto no encontrado' });
    const song = structuredClone(existingSong);

    const { title, sections, updateActiveProjection } = req.body;
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'Secciones requeridas y deben ser un arreglo no vacío' });
    }

    const cleanSections = sections.map((sec, sIdx) => {
      const rawLines = Array.isArray(sec.lines) ? sec.lines : String(sec.lines || '').split('\n');
      const cleanLines = rawLines
        .map(l => String(l || '').trim())
        .filter(l => l.length > 0);
      return {
        type: ['verse', 'chorus', 'canto', 'part', 'final', 'response', 'bridge'].includes(sec.type) ? sec.type : 'verse',
        label: sec.label ? String(sec.label).trim() : (sec.type === 'chorus' ? 'Coro' : `Estrofa ${sIdx + 1}`),
        lines: cleanLines
      };
    }).filter(sec => sec.lines.length > 0);

    if (cleanSections.length === 0) {
      return res.status(400).json({ error: 'El canto debe contener al menos una sección con líneas de texto.' });
    }

    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return res.status(400).json({ error: 'El título debe contener entre 1 y 200 caracteres.' });
    if (title.trim().length > 0) {
      song.title = String(title).trim();
    }
    song.sections = cleanSections;
    song.totalLines = cleanSections.reduce((sum, s) => sum + s.lines.length, 0);

    // Recompilar diapositivas
    const slides = isCoro ? compileChoirSlides(song, 4, true) : compileHymnSlides(song, 4, true);

    // Guardar en disco físicamente (no solo memoria)
    catalogs.saveCatalogToDisk(isCoro ? 'coro' : 'himnario', list.map(item => item === existingSong ? song : item));
    list[list.indexOf(existingSong)] = song;
    projectionState.catalogRevision = (projectionState.catalogRevision || 0) + 1;

    // Reindexar búsqueda
    prepareDatabase(list);

    projectionState.workspace.selections[isCoro ? 'choir' : 'hymn'] = { item: song, slides };
    broadcastState();

    // Si se marcó actualizar proyección activa y el canto está en pantalla
    if (updateActiveProjection && projectionState.phase === 'active') {
      const isMatchingType = isCoro ? projectionState.contentType === 'choir' : projectionState.contentType === 'hymn';
      const isMatchingItem = projectionState.activeItem && ((song.id != null && String(projectionState.activeItem.id) === String(song.id)) || (song.number != null && String(projectionState.activeItem.number) === String(song.number)));
      if (isMatchingType && isMatchingItem) {
        projectionState.activeItem = song;
        projectionState.slides = slides;
        if (projectionState.currentSlideIndex >= slides.length) {
          projectionState.currentSlideIndex = Math.max(0, slides.length - 1);
        }
        broadcastState();
      }
    }

    res.json({
      success: true,
      song: {
        id: song.id,
        number: song.number,
        title: song.title,
        sections: song.sections,
        totalLines: song.totalLines
      },
      slides
    });
  });

  // 3. Restaurar letra original de fábrica
  app.post('/api/songs/:catalog/:id/restore', (req, res) => {
    const catalog = (req.params.catalog || '').toLowerCase();
    const isCoro = catalog === 'coro' || catalog === 'choir';
    const list = isCoro ? catalogs.coro : catalogs.himnario;
    const existingSong = list.find(s => String(s.id) === String(req.params.id) || String(s.number) === String(req.params.id));
    if (!existingSong) return res.status(404).json({ error: 'Canto no encontrado' });
    const song = structuredClone(existingSong);

    const factoryPath = path.join(catalogs.factoryDir, isCoro ? 'coro_lldm.json' : 'himnario_lldm.json');
    if (!fs.existsSync(factoryPath)) {
      return res.status(404).json({ error: 'No existe copia de fábrica en el sistema' });
    }

    let factorySong = null;
    try {
      const fList = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
      factorySong = fList.find(s => String(s.id) === String(req.params.id) || String(s.number) === String(req.params.id));
    } catch (err) {
      return res.status(500).json({ error: 'Error leyendo archivo de fábrica: ' + err.message });
    }

    if (!factorySong) {
      return res.status(404).json({ error: 'Este canto no fue encontrado en la versión oficial de fábrica' });
    }

    // Restaurar atributos
    song.title = factorySong.title;
    song.sections = JSON.parse(JSON.stringify(factorySong.sections || []));
    song.totalLines = factorySong.totalLines || (song.sections ? song.sections.reduce((sum, s) => sum + (s.lines ? s.lines.length : 0), 0) : 0);

    // Recompilar diapositivas
    const slides = isCoro ? compileChoirSlides(song, 4, true) : compileHymnSlides(song, 4, true);

    // Guardar en disco el archivo físico
    catalogs.saveCatalogToDisk(isCoro ? 'coro' : 'himnario', list.map(item => item === existingSong ? song : item));
    list[list.indexOf(existingSong)] = song;
    projectionState.catalogRevision = (projectionState.catalogRevision || 0) + 1;

    // Reindexar
    prepareDatabase(list);

    projectionState.workspace.selections[isCoro ? 'choir' : 'hymn'] = { item: song, slides };
    broadcastState();

    const { updateActiveProjection } = req.body;
    if (updateActiveProjection && projectionState.phase === 'active') {
      const isMatchingType = isCoro ? projectionState.contentType === 'choir' : projectionState.contentType === 'hymn';
      const isMatchingItem = projectionState.activeItem && ((song.id != null && String(projectionState.activeItem.id) === String(song.id)) || (song.number != null && String(projectionState.activeItem.number) === String(song.number)));
      if (isMatchingType && isMatchingItem) {
        projectionState.activeItem = song;
        projectionState.slides = slides;
        if (projectionState.currentSlideIndex >= slides.length) {
          projectionState.currentSlideIndex = Math.max(0, slides.length - 1);
        }
        broadcastState();
      }
    }

    res.json({
      success: true,
      restored: true,
      song: {
        id: song.id,
        number: song.number,
        title: song.title,
        sections: song.sections,
        totalLines: song.totalLines
      },
      slides
    });
  });


}

module.exports = { installCatalogRoutes };
