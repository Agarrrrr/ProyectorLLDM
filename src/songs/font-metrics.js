const path = require('node:path');
const { createBoundedCache } = require('../infrastructure/bounded-cache');
const defaultFile = path.join(__dirname, '../../public/fonts/Montserrat-800.woff2');
const fonts = new Map();
let activeFontFile, activeFont;
const { preventShortWidowsForMeasure } = require('./pagination');
const widths = createBoundedCache({ maxEntries: 40000, maxBytes: 4 * 1024 * 1024 });

function width(text, size, fontFile = defaultFile) {
  if (activeFontFile !== fontFile) {
    let font = fonts.get(fontFile);
    if (!font) {
      font = require('fontkit').openSync(fontFile);
      if (fonts.size >= 8) fonts.delete(fonts.keys().next().value);
    }
    fonts.delete(fontFile); fonts.set(fontFile, font);
    activeFontFile = fontFile; activeFont = font;
  }
  const key = fontFile + ":" + text;
  let measured = widths.get(key);
  if (measured === undefined) {
    measured = { em: activeFont.layout(text).advanceWidth / activeFont.unitsPerEm, characters: [...text].length };
    widths.set(key, measured);
  }
  return measured.em * size + measured.characters * 0.5;
}

function wrapLyricLine(text, maxWidth, size, balance = false, fontFile = defaultFile) {
  const measuredWidth = (value, pixels) => width(value, pixels, fontFile);
  const tokens = preventShortWidowsForMeasure(text).replace(/(\/{2,}|[!,;])(?=[^\s/])/g, '$1 ').split(/[ \t]+/).filter(Boolean).flatMap(token => measuredWidth(token, size) > maxWidth ? token.split('\u00a0') : [token]);
  if (!tokens.length) return [''];
  const space = measuredWidth(' ', size), prefix = [0];
  for (const token of tokens) prefix.push(prefix.at(-1) + measuredWidth(token, size));
  const lineWidth = (i, j) => prefix[j] - prefix[i] + Math.max(0, j - i - 1) * space;
  const breaks = [0];
  let start = 0;
  for (let end = 1; end <= tokens.length; end++) {
    if (end > start + 1 && lineWidth(start, end) > maxWidth) { breaks.push(end - 1); start = end - 1; }
  }
  breaks.push(tokens.length);
  if (!balance || breaks.length <= 2) return breaks.slice(1).map((end, i) => tokens.slice(breaks[i], end).join(' '));

  // Balance complete words into the same number of rows, without introducing
  // short orphan rows or allowing the browser to make different page breaks.
  const count = breaks.length - 1, target = lineWidth(0, tokens.length) / count;
  const memo = new Map();
  function solve(i, rows) {
    if (!rows) return i === tokens.length ? { cost: 0, lines: [] } : null;
    const key = `${i}:${rows}`;
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (let j = i + 1; j <= tokens.length - rows + 1; j++) {
      const w = lineWidth(i, j);
      if (w > maxWidth && j > i + 1) break;
      const tail = solve(j, rows - 1);
      if (!tail) continue;
      const cost = (w - target) ** 2 + tail.cost;
      if (!best || cost < best.cost) best = { cost, lines: [tokens.slice(i, j).join(' '), ...tail.lines] };
    }
    memo.set(key, best); return best;
  }
  return solve(0, count)?.lines || breaks.slice(1).map((end, i) => tokens.slice(breaks[i], end).join(' '));
}
module.exports = { width, wrapLyricLine };
