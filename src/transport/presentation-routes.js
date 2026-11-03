function installPresentationRoutes({ app, upload, presentationService, projectionState, broadcastState }) {
  // ==============================================================
  // RUTAS DE PRESENTACIONES POWERPOINT Y PDF
  // ==============================================================
  app.get('/api/presentations', (req, res) => {
    res.json(presentationService.getPresentations());
  });

  app.get('/api/presentations/:id', (req, res) => {
    const list = presentationService.getPresentations();
    const pres = list.find(p => p.id === req.params.id);
    if (!pres) return res.status(404).json({ error: 'Presentación no encontrada' });
    res.json(pres);
  });

  app.post('/api/presentations/upload', upload.array('files', 100), async (req, res) => {
    try {
      const title = req.body.title || '';
      const pres = await presentationService.createPresentationFromUploads(req.files, title);
      res.json({ success: true, presentation: pres });
    } catch (err) {
      console.error('[API PRESENTATIONS ERROR]', err);
      res.status(500).json({ error: err.message || 'Error procesando presentación' });
    }
  });

  app.delete('/api/presentations/:id', (req, res) => {
    const ok = presentationService.deletePresentation(req.params.id);
    res.json({ success: ok });
  });

  app.post('/api/project/presentation', (req, res) => {
    const { presentationId, startIndex = 0 } = req.body;
    const list = presentationService.getPresentations();
    const pres = list.find(p => p.id === presentationId);
    if (!pres) return res.status(404).json({ error: 'Presentación no encontrada' });

    const slides = pres.slides.map((s, idx) => ({
      type: 'presentation',
      isTitleOnly: false,
      presentationId: pres.id,
      presentationTitle: pres.title,
      slideNum: idx + 1,
      totalSlides: pres.slides.length,
      imageUrl: s.imageUrl,
      thumbUrl: s.thumbUrl || s.imageUrl,
      title: s.title || `Diapositiva ${idx + 1}`,
      sectionType: 'presentation',
      sectionLabel: `Diapositiva ${idx + 1}`,
      baseSectionLabel: `Diapositiva ${idx + 1}`,
      chunkIndex: idx,
      totalChunks: pres.slides.length,
      isFirstChunk: idx === 0,
      lines: [],
      text: pres.title
    }));

    projectionState.phase = 'active';
    projectionState.contentType = 'presentation';
    projectionState.activeItem = { id: pres.id, title: pres.title };
    projectionState.slides = slides;
    projectionState.currentSlideIndex = Math.min(Math.max(0, parseInt(startIndex, 10) || 0), slides.length - 1);

    broadcastState();
    res.json({ success: true, state: projectionState });
  });


}

module.exports = { installPresentationRoutes };
