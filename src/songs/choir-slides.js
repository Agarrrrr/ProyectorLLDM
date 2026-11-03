const { paginateSection } = require('./section-layout');
const { choirSections } = require('./sections');

function compileChoirSlides(song, maxLines = 4, includeTitleSlide = true) {
  const slides = [];
  if (!song) return slides;

  // Diapositiva 0: Carátula / Solo Título
  if (includeTitleSlide) {
    slides.push({
      type: 'choir',
      isTitleOnly: true,
      choirId: song.id,
      choirNumber: song.number,
      choirTitle: song.title,
      sectionType: 'title',
      sectionLabel: 'Título',
      baseSectionLabel: '',
      chunkIndex: 0,
      totalChunks: 1,
      isFirstChunk: true,
      badge: 'CANTO DEL CORO',
      title: song.title.toUpperCase(),
      subtitle: '',
      lines: [],
      text: song.title,
      slideNum: 1
    });
  }

  const sectionsToProcess = choirSections(song.sections);
  if (sectionsToProcess && sectionsToProcess.length > 0) {
    sectionsToProcess.forEach((sec, secIdx) => {
      const secType = sec.type;
      const isTrueChorus = secType === 'chorus';
      const controlLabelBase = sec.label || (secType === 'chorus' ? 'Coro' : 'Canto');
      const screenIndicatorLabel = isTrueChorus ? 'CORO' : '';

      const chunks = paginateSection(sec.lines, typeof maxLines === 'object' ? maxLines : {});
      chunks.forEach((layout, chunkIdx) => {
        const chunk = layout.lines;
        const secLabel = chunks.length > 1 ? `${controlLabelBase} (${chunkIdx + 1}/${chunks.length})` : controlLabelBase;
        const visualLineCount = layout.visualLineCount;

        slides.push({
          type: 'choir',
          isTitleOnly: false,
          choirId: song.id,
          choirNumber: song.number,
          choirTitle: song.title,
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
          title: song.title.toUpperCase(),
          lines: chunk,
          text: chunk.join('\n'),
          slideNum: slides.length + 1
        });
      });
    });
  }

  return slides;
}


module.exports = { compileChoirSlides };
