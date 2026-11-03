function createProjection({ localIp: LOCAL_IP, port: PORT }) {
  const projectionState = {
    revision: 0,
    phase: 'idle', // 'idle' | 'active'

    isLooping: false,
    contentType: null, // 'hymn' | 'bible' | 'theme' | 'special' | 'choir' | 'custom'
    activeItem: null,
    currentSlideIndex: 0,
    slides: [],
    displayPayload: {
      phase: 'idle',
      type: 'idle',
      badge: '',
      title: '',
      subtitle: '',
      lines: [],
      text: '',
      footer: '',
      slideInfo: '',
      isTitleOnly: false
    },
    playlist: [],
    networkInfo: {
      localIp: LOCAL_IP,
      port: PORT,
      networkUrl: `http://${LOCAL_IP}:${PORT}/control`,
      obsUrl: `http://${LOCAL_IP}:${PORT}/pantalla`,
      overlayUrl: `http://${LOCAL_IP}:${PORT}/overlay`
    }
  };

  function updateDisplayPayload() {
    if (projectionState.contentType !== 'carteleria') projectionState.isLooping = false;
    projectionState.currentSlideIndex = Math.max(0, Math.min(
      Math.trunc(projectionState.currentSlideIndex) || 0, Math.max(0, projectionState.slides.length - 1)
    ));
    if (projectionState.phase === 'idle' || projectionState.slides.length === 0) {
      projectionState.displayPayload = {
        phase: projectionState.phase,
        type: projectionState.phase === 'idle' ? 'idle' : 'custom',
        badge: '',
        title: '',
        subtitle: '',
        lines: [],
        text: '',
        footer: '',
        slideInfo: '',
        isTitleOnly: false
      };
      return;
    }

    const current = projectionState.slides[projectionState.currentSlideIndex];
    if (current) {
      projectionState.displayPayload = {
        phase: projectionState.phase,
        type: current.type,
        isTitleOnly: !!current.isTitleOnly,
        badge: current.badge || '',
        title: current.title || current.choirTitle || current.hymnTitle || current.reference || '',
        subtitle: current.subtitle || '',
        lines: current.lines || [],
        text: current.text || '',
        footer: current.footer || '',
        slideInfo: `${projectionState.currentSlideIndex + 1} / ${projectionState.slides.length}`,
        totalSlides: projectionState.slides.length,
        currentSlideIndex: projectionState.currentSlideIndex,
        sectionType: current.sectionType || '',
        sectionLabel: current.sectionLabel || '',
        baseSectionLabel: current.baseSectionLabel !== undefined ? current.baseSectionLabel : '',
        visualLineCount: current.visualLineCount || 0,
        fontSize: current.fontSize || 0,
        displayLines: current.displayLines || null,
        appearance: current.appearance || null,
        listKey: current.listKey || '',
        chunkIndex: current.chunkIndex || 0,
        totalChunks: current.totalChunks || 1,
        isFirstChunk: current.isFirstChunk !== undefined ? current.isFirstChunk : true,
        book: current.book || '',
        chapter: current.chapter || '',
        verse: current.verse || '',
        chapterVerse: current.chapterVerse || '',
        reference: current.reference || '',
        hymnNumber: current.hymnNumber || '',
        choirTitle: current.choirTitle || '',
        choirNumber: current.choirNumber || '',
        imageUrl: current.imageUrl || '',
        thumbUrl: current.thumbUrl || '',
        presentationId: current.presentationId || '',
        presentationTitle: current.presentationTitle || ''
      };
    }
  }


  return { state: projectionState, updateDisplayPayload };
}

module.exports = { createProjection };
