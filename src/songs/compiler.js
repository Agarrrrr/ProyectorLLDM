const { compileHymnSlides } = require('./hymn-slides');
const { compileChoirSlides } = require('./choir-slides');
const { createBoundedCache } = require('../infrastructure/bounded-cache');
function createSongCompiler({ getSettings, assets }) {
  const cache = createBoundedCache({ maxEntries: 96, maxBytes: 4 * 1024 * 1024 });
  function compile(type, song, settings = getSettings()) {
    const profile = settings.lyrics[type];
    assets.validate(settings.lyrics);
    const key = JSON.stringify([type, song.id, song.number, song.title, song.sections, profile]);
    const cached = cache.get(key);
    if (cached) return structuredClone(cached);
    const options = { ...profile, fontFile: assets.find(profile.font, 'font').file };
    const appearance = { ...profile, fontWeight: assets.find(profile.font, 'font').weight || 800, fontUrl: assets.find(profile.font, 'font').url, backgroundUrl: assets.find(profile.background, 'image')?.url || '/fondo1b.jpg' };
    const slides = (type === 'hymn' ? compileHymnSlides : compileChoirSlides)(song, options, true);
    const result = slides.map(slide => ({ ...slide, appearance }));
    cache.set(key, structuredClone(result));
    return result;
  }
  function refresh(state, settings = getSettings()) {
    const prepared = {};
    for (const type of ['hymn', 'choir']) {
      const selection = state.workspace?.selections[type];
      if (selection) prepared[type] = { ...selection, slides: compile(type, selection.item, settings) };
    }
    const active = ['hymn', 'choir'].includes(state.contentType) && state.activeItem
      ? compile(state.contentType, state.activeItem, settings) : null;
    return () => {
      Object.assign(state.workspace?.selections || {}, prepared);
      if (active) {
        const before = state.slides[state.currentSlideIndex];
        state.slides = active;
        const match = active.findIndex(slide => slide.sectionGroup === before?.sectionGroup && slide.chunkIndex === before?.chunkIndex && slide.isTitleOnly === before?.isTitleOnly);
        state.currentSlideIndex = match >= 0 ? match : Math.min(state.currentSlideIndex, active.length - 1);
      }
    };
  }
  return { compile, refresh, cacheStats: cache.stats, compileHymnSlides: song => compile('hymn', song), compileChoirSlides: song => compile('choir', song) };
}
module.exports = { createSongCompiler };
