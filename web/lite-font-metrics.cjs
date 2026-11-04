const { preventShortWidowsForMeasure } = require('../src/songs/pagination');
const context = document.createElement('canvas').getContext('2d');

function width(text, size) {
  context.font = `800 ${size}px Montserrat`;
  return context.measureText(text).width + [...text].length * 0.5;
}

function wrapLyricLine(text, maxWidth, size) {
  const tokens = preventShortWidowsForMeasure(text).replace(/(\/{2,}|[!,;])(?=[^\s/])/g, '$1 ').split(/[ \t]+/);
  const lines = [];
  let line = '';
  for (const token of tokens) {
    const candidate = line ? line + ' ' + token : token;
    if (line && width(candidate, size) > maxWidth) {
      lines.push(line);
      line = token;
    } else line = candidate;
  }
  return [...lines, line];
}

module.exports = { width, wrapLyricLine };
