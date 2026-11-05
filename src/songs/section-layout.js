const { wrapLyricLine, width } = require('./font-metrics');
const { createBoundedCache } = require('../infrastructure/bounded-cache');
const paginationCache = createBoundedCache({ maxEntries: 512, maxBytes: 4 * 1024 * 1024 });
const WIDTH = 1740, HEIGHT = 980, MIN_FONT = 156, MAX_FONT = 207, GAP = 3, MAX_ROWS = 6;

function measure(lines, fontSize, options = {}) {
  const rows = lines.flatMap(line => wrapLyricLine(line, options.width || WIDTH, fontSize, false, options.fontFile));
  const visualLineCount = rows.length;
  const maxLineWidth = Math.max(0, ...rows.map(row => width(row, fontSize, options.fontFile)));
  return { fontSize, visualLineCount, maxLineWidth, height: visualLineCount * fontSize * 1.01 + Math.max(0, visualLineCount - 1) * (options.lineGap ?? GAP) + fontSize * 0.11 };
}
function fit(lines, options = {}) {
  const maxFont = options.fontSize || MAX_FONT;
  const minFont = options.minFontSize || MIN_FONT;
  for (let step = 0; step <= Math.ceil((maxFont - minFont) / 3); step++) {
    const size = Math.max(minFont, maxFont - step * 3);
    const layout = measure(lines, size, options);
    if (layout.height <= (options.height || HEIGHT) && layout.visualLineCount <= (options.maxLines || MAX_ROWS) && layout.maxLineWidth <= (options.width || WIDTH)) return layout;
  }
  return null;
}

// An unclosed triple marker protects the rest of this section only.
function repetitionRanges(text) {
  const opened = new Map(), ranges = [];
  for (const match of text.matchAll(/\/{2,}/g)) {
    const key = match[0].length;
    if (opened.has(key)) { ranges.push([opened.get(key), match.index + key]); opened.delete(key); }
    else opened.set(key, match.index);
  }
  for (const [length, start] of opened) if (length >= 3) ranges.push([start, text.length]);
  return ranges;
}

function paginateUncached(rawLines, options = {}) {
  const maxRows = options.maxLines || MAX_ROWS;
  const minimumFont = options.minFontSize || MIN_FONT;
  const text = (rawLines || []).map(line => String(line).trim()).filter(Boolean).join(' ');
  if (!text) return [];
  const complete = fit([text], options);
  if (complete) return [withDisplayLines({ lines: [text], ...complete }, options)];

  const words = [...text.matchAll(/\S+/g)];
  const ranges = [];
  for (const [a, b] of repetitionRanges(text).sort((left, right) => left[0] - right[0])) {
    const first = words.find(word => word.index + word[0].length > a);
    const last = words.findLast(word => word.index < b);
    const start = first.index, end = last.index + last[0].length;
    if (ranges.length && start < ranges.at(-1)[1]) ranges.at(-1)[1] = Math.max(end, ranges.at(-1)[1]);
    else ranges.push([start, end]);
  }
  for (const [start, end] of ranges) {
    const lines = [text.slice(start, end)];
    if (fit(lines, options)) continue;
    // A repetition stays on a single slide, even if it needs a smaller font.
    const smaller = { ...options, minFontSize: 24 };
    const layout = fit(lines, smaller) || fit(lines, { ...smaller, maxLines: Number.MAX_SAFE_INTEGER });
    if (!layout) throw Object.assign(new Error('La repetición no cabe completa en el cuadro. Revisa sus palabras y marcadores.'), { status: 422 });
    return [
      ...paginateUncached([text.slice(0, start)], options),
      withDisplayLines({ lines, ...layout }, options),
      ...paginateUncached([text.slice(end)], options)
    ];
  }
  const dp = new Array(words.length + 1);
  dp[words.length] = { pages: 0, penalty: 0 };
  for (let i = words.length - 1; i >= 0; i--) {
    const start = words[i].index;
    for (let j = i + 1; j <= words.length; j++) {
      const end = words[j - 1].index + words[j - 1][0].length;
      const fragment = text.slice(start, end);
      const minimumLayout = measure([fragment], minimumFont, options);
      const rows = minimumLayout.visualLineCount;
      if (rows > maxRows) break;
      if (minimumLayout.maxLineWidth > (options.width || WIDTH) || minimumLayout.height > (options.height || HEIGHT)) continue;
      if (j < words.length && ranges.some(([a, b]) => end > a && end < b)) continue;
      const tail = dp[j];
      if (!tail) continue;
      const punctuation = /[.!?;:,/][»”"')]*$/.test(fragment);
      const penalty = tail.penalty + (maxRows - rows) ** 2 + (rows < 3 ? 250 : 0) + (punctuation ? 0 : 12);
      const candidate = { pages: 1 + tail.pages, penalty, next: j, text: fragment };
      if (!dp[i] || candidate.pages < dp[i].pages || (candidate.pages === dp[i].pages && candidate.penalty < dp[i].penalty)) dp[i] = candidate;
    }
  }
  if (!dp[0]) throw Object.assign(new Error('Esta sección no se puede paginar con letra grande. Revisa sus palabras y marcadores.'), { status: 422 });
  const slides = [];
  for (let i = 0; i < words.length; i = dp[i].next) {
    const lines = [dp[i].text];
    const layout = fit(lines, options);
    if (!layout) throw Object.assign(new Error('Una palabra supera el ancho disponible. Revisa la separación del texto.'), { status: 422 });
    slides.push(withDisplayLines({ lines, ...layout }, options));
  }
  return slides;
}
function paginateSection(rawLines, options = {}) {
  const text = (rawLines || []).map(line => String(line).trim()).filter(Boolean).join(' ');
  const key = JSON.stringify([text, options.fontFile || '', options.fontSize || MAX_FONT, options.minFontSize || MIN_FONT, options.maxLines || MAX_ROWS, options.width || WIDTH, options.height || HEIGHT, options.lineGap ?? GAP]);
  const cached = paginationCache.get(key);
  if (cached) return structuredClone(cached);
  const result = paginateUncached([text], options);
  paginationCache.set(key, structuredClone(result));
  return result;
}
function withDisplayLines(slide, options = {}) {
  return { ...slide, displayLines: slide.lines.flatMap(line => wrapLyricLine(line, options.width || WIDTH, slide.fontSize, true, options.fontFile)) };
}
function fitSection(text, options = {}) {
  const layout = fit([text], options);
  return layout && withDisplayLines({ lines: [text], ...layout }, options);
}
module.exports = { paginateSection, fitSection, repetitionRanges, measure, MIN_FONT, MAX_FONT, HEIGHT, MAX_ROWS };
