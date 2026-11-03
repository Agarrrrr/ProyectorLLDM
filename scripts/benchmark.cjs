// Read-only benchmark: uses the installed catalog, never starts the server or writes data.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { createSongCompiler } = require('../src/songs/compiler');
const { createProjection } = require('../src/projection/state');
const { prepareDatabase } = require('../src/songs/search');
const { defaults } = require('../src/settings/service');
const { outputSnapshot, cleanWireValue } = require('../src/transport/state-stream');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/factory/himnario_lldm.json'), 'utf8'));
if (!catalog.length) throw new Error('Se necesita al menos un himno para medir.');
const song = catalog.slice().sort((a, b) => JSON.stringify(b.sections).length - JSON.stringify(a.sections).length)[Math.min(10, catalog.length - 1)];
prepareDatabase([song]);
const assets = { validate() {}, find(id, kind) {
  if (kind === 'font') return { file: path.join(root, 'public/fonts/Montserrat-800.woff2'), url: '/fonts/Montserrat-800.woff2', weight: 800 };
} };
const compiler = createSongCompiler({ getSettings: () => defaults, assets });
const timings = [];
let slides;
for (let i = 0; i < 16; i++) {
  const start = performance.now(); slides = compiler.compile('hymn', song); timings.push(performance.now() - start);
}
const { state, updateDisplayPayload } = createProjection({ localIp: '127.0.0.1', port: 4000 });
Object.assign(state, { phase: 'active', contentType: 'hymn', activeItem: song, slides, currentSlideIndex: 1,
  settings: defaults, settingsRevision: 0, workspace: { selections: { hymn: { item: song, slides }, choir: null, presentation: null }, drafts: {}, histories: {} } });
updateDisplayPayload();
const packet = snapshot => ({ type: 'STATE_UPDATE', state: snapshot });
const previousBytes = Buffer.byteLength(JSON.stringify(packet(state)));
const controlBytes = Buffer.byteLength(JSON.stringify(packet(state), cleanWireValue));
const outputBytes = Buffer.byteLength(JSON.stringify(packet(outputSnapshot(state)), cleanWireValue));
console.log(JSON.stringify({ song: song.id, title: song.title, sections: song.sections.length, slides: slides.length,
  firstMs: timings[0], repeatAverageMs: timings.slice(1).reduce((a, b) => a + b, 0) / 15,
  previousFullSnapshotBytes: previousBytes, controlSnapshotBytes: controlBytes, tvSnapshotBytes: outputBytes,
  tvReductionPercent: (1 - outputBytes / previousBytes) * 100, cache: compiler.cacheStats(),
  processMemoryMB: { heap: process.memoryUsage().heapUsed / 1048576, rss: process.memoryUsage().rss / 1048576 }
}, null, 2));
