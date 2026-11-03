const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function renderer(width, height) {
  const scale = Math.min(width / 1920, height / 1080);
  const window = {
    OutputViewport: { scale: () => scale, pixels: value => value * scale, length: value => `${value / 16}rem` },
    addEventListener() {},
    getComputedStyle: element => ({ fontSize: `${element.logicalFont * scale}px`, lineHeight: `${element.logicalFont * 1.01 * scale}px`, fontStyle: 'normal', fontWeight: '900', fontFamily: 'Montserrat', letterSpacing: '0px' })
  };
  const textMeasure = { font: '', measureText(text) {
    return { width: text.length * Number(this.font.match(/([\d.]+)px/)[1]) * 0.65 };
  } };
  const context = vm.createContext({ window, getComputedStyle: window.getComputedStyle, URLSearchParams, location: { search: '?lyricsPreview=1' },
    document: { getElementById: () => ({}), createElement: () => ({ getContext: () => textMeasure }) } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/pantalla/app.js'), 'utf8'), context);
  return { context, scale };
}

function textElement(scale, size, textWidth = 0) {
  let logicalFont = size;
  return {
    textContent: 'Texto',
    get logicalFont() { return logicalFont; },
    get scrollWidth() { return Math.round(Math.max(1780, textWidth * logicalFont / size) * scale); },
    style: { set fontSize(value) { logicalFont = parseFloat(value) * 16; } }
  };
}

test('el minivisor conserva el tamaño proporcional pese al redondeo de las medidas del navegador', () => {
  for (const [width, height] of [[1920, 1080], [720, 404], [478, 268], [171, 96], [200, 112], [3840, 2160]]) {
    const { context, scale } = renderer(width, height);
    const line = textElement(scale, 156);
    const stanza = { scrollHeight: Math.round(966 * scale), classList: { contains: () => true }, querySelectorAll: () => [line] };
    context.container = { querySelector: selector => selector === '.hymn-lines-container' ? stanza : null };
    vm.runInContext('autoFitSlideContent(container)', context);
    assert.equal(line.logicalFont, 156, `${width}×${height}: no reducir una estrofa que cabe`);
    const book = textElement(scale, 240), reference = textElement(scale, 290);
    context.container = { querySelector: selector => selector === '.display-book-title' ? book : reference };
    vm.runInContext('autoScaleBibleSoloCita(container)', context);
    assert.equal(book.logicalFont, 240);
    assert.equal(reference.logicalFont, 290);
  }
});

test('el ajuste sigue reduciendo texto que realmente excede el cuadro', () => {
  const { context, scale } = renderer(720, 404);
  const line = textElement(scale, 156, 2200);
  const stanza = { scrollHeight: 100, classList: { contains: () => true }, querySelectorAll: () => [line] };
  context.container = { querySelector: selector => selector === '.hymn-lines-container' ? stanza : null };
  vm.runInContext('autoFitSlideContent(container)', context);
  assert.ok(line.logicalFont < 156 && line.logicalFont > 24);
  assert.ok(line.scrollWidth <= Math.ceil(1780 * scale));
});

test('una cita larga elige el mismo tamaño en el minivisor y la TV', () => {
  let referenceSize;
  for (const [width, height] of [[1920, 1080], [170, 95], [3840, 2160]]) {
    const { context, scale } = renderer(width, height);
    const book = textElement(scale, 240), reference = textElement(scale, 290);
    book.textContent = '2 TESALONICENSES';
    context.container = { querySelector: selector => selector === '.display-book-title' ? book : reference };
    vm.runInContext('autoScaleBibleSoloCita(container)', context);
    referenceSize ??= book.logicalFont;
    assert.ok(book.logicalFont < 240 && book.logicalFont > 90);
    assert.equal(book.logicalFont, referenceSize);
  }
});
