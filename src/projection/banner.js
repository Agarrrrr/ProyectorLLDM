function projectionBanner(state) {
  const item = state.activeItem;
  if (state.phase !== 'active' || !item) return null;
  switch (state.contentType) {
    case 'hymn': {
      const text = [item.number, item.title].filter(Boolean).join(' ');
      return { type: 'hymn', text, fullText: text };
    }
    case 'choir':
      return { type: 'choir', tag: 'CORO DE LA IGLESIA', text: item.title, songTitle: item.title, fullText: `Coro: ${item.title}` };
    case 'bible': {
      const slide = state.slides[0];
      return { type: 'bible', book: slide.book, chapterVerse: slide.chapterVerse, fullText: [slide.book, slide.chapterVerse].filter(Boolean).join(' ') };
    }
    case 'theme':
      return { type: 'theme', theme: item.title, fullText: item.title };
    case 'special':
      return { type: 'special', book: item.type, date: item.date, location: item.location, fullText: [item.type, item.date, item.location].filter(Boolean).join(' - ') };
    case 'custom':
      return { type: 'custom', text: item.text, fullText: item.text };
    case 'drone':
      return { type: 'drone', location: item.location };
    default:
      return null;
  }
}

function createProjectionPublisher({ getState, broadcastState, broadcastOverlay }) {
  let lastKey;
  function observe() { lastKey = JSON.stringify(projectionBanner(getState())); }
  observe();
  function publish({ repeat = false } = {}) {
    const banner = projectionBanner(getState());
    const changed = JSON.stringify(banner) !== lastKey;
    broadcastState();
    if (banner && (changed || repeat)) broadcastOverlay(banner);
  }
  return { observe, publish };
}

module.exports = { projectionBanner, createProjectionPublisher };
