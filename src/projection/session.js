const fs = require('node:fs');
const path = require('node:path');

function createSession({ state, dataDir }) {
  const filename = path.join(dataDir, 'projection-session.json');
  if (fs.existsSync(filename)) {
    const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (Array.isArray(saved.slides)) Object.assign(state, {
      contentType: saved.contentType, activeItem: saved.activeItem,
      slides: saved.slides, currentSlideIndex: saved.currentSlideIndex,
      phase: 'idle', isLooping: false
    });
  }
  let previous = '';
  return { save() {
    const value = JSON.stringify({ contentType: state.contentType, activeItem: state.activeItem, slides: state.slides, currentSlideIndex: state.currentSlideIndex });
    if (value === previous) return;
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filename + '.tmp', value);
    fs.renameSync(filename + '.tmp', filename);
    previous = value;
  } };
}
module.exports = { createSession };
