const { paginateSection } = require('./section-layout');
const { expandSongSections } = require('./sections');

function compileHymnSlides(hymn, maxLines = 4, includeTitleSlide = true) {
  const slides = [];
  if (!hymn) return slides;

  // Diapositiva 0: Carátula / Solo Número y Título
  if (includeTitleSlide) {
    slides.push({
      type: 'hymn',
      isTitleOnly: true,
      hymnNumber: hymn.number,
      hymnTitle: hymn.title,
      sectionType: 'title',
      sectionLabel: 'Título',
      baseSectionLabel: '',
      chunkIndex: 0,
      totalChunks: 1,
      isFirstChunk: true,
      badge: hymn.number ? `HIMNO ${hymn.number}` : '',
      title: hymn.title.toUpperCase(),
      subtitle: '',
      lines: [],
      text: hymn.title,
      slideNum: 1
    });
  }

  const sectionsToProcess = expandSongSections(hymn.sections);
  if (sectionsToProcess && sectionsToProcess.length > 0) {
    // Verificar si el himno tiene secciones divididas por puntos (Parte X) para nunca etiquetarlas como Estrofa
    const hasDotParts = sectionsToProcess.some(s => s.type === 'part' || /^Parte\b/i.test(String(s.label || '').trim()));
    const hasExplicitVerse2 = sectionsToProcess.some(s => /^Estrofa\s+[2-9]/i.test(String(s.label || '').trim()));

    sectionsToProcess.forEach((sec, secIdx) => {
      let rawLabel = String(sec.label || '').trim();
      let secType = sec.type || 'verse';

      // Si el himno se divide por puntos (••••• / *****) y no tiene estrofas numeradas, NO es estrofa
      if (hasDotParts && !hasExplicitVerse2 && secType !== 'chorus' && !/^Coro\b/i.test(rawLabel)) {
        secType = 'part';
        if (/^Estrofa\s+1$/i.test(rawLabel)) {
          rawLabel = 'Parte 1';
        }
      }

      // En lo que se proyecta en pantalla:
      // 1. Quitar el indicador de "Estrofa" de la pantalla (las estrofas no llevan texto de estrofa en pantalla)
      // 2. Solo se proyecta el indicador si es "Coro" (CORO)
      // 3. En lo que se proyecta NUNCA se pone (1/2) porque es un índice interno del operador
      const isTrueChorus = secType === 'chorus' || /^Coro\b/i.test(rawLabel);
      const controlLabelBase = rawLabel || (secType === 'chorus' ? 'Coro' : 'Canto');
      const screenIndicatorLabel = isTrueChorus ? 'CORO' : '';

      const chunks = paginateSection(sec.lines, typeof maxLines === 'object' ? maxLines : {});
      chunks.forEach((layout, chunkIdx) => {
        const chunk = layout.lines;
        // En el control interno del operador SÍ se conserva la numeración interna (ej: Coro (1/2), Estrofa 1 (1/2))
        const secLabel = chunks.length > 1 ? `${controlLabelBase} (${chunkIdx + 1}/${chunks.length})` : controlLabelBase;
        const visualLineCount = layout.visualLineCount;

        slides.push({
          type: 'hymn',
          isTitleOnly: false,
          hymnNumber: hymn.number,
          hymnTitle: hymn.title,
          sectionType: secType,
          sectionGroup: `sec_${secIdx}`,
          sectionLabel: secLabel,
          baseSectionLabel: screenIndicatorLabel,
          chunkIndex: chunkIdx,
          totalChunks: chunks.length,
          isFirstChunk: chunkIdx === 0,
          visualLineCount,
          fontSize: layout.fontSize,
          displayLines: layout.displayLines,
          badge: '',
          lines: chunk,
          text: chunk.join('\n'),
          slideNum: slides.length + 1
        });
      });
    });
  }

  return slides;
}


module.exports = { compileHymnSlides };
