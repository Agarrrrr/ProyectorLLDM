const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createApplication } = require('../src/app');
const { compileHymnSlides } = require('../src/songs/hymn-slides');
const { compileChoirSlides } = require('../src/songs/choir-slides');
const { prepareDatabase, searchSongs } = require('../src/songs/search');

const song = {
  id: '001', number: 1, title: 'A Cristo quiero', categories: [],
  sections: [
    { type: 'verse', label: 'Estrofa 1', lines: ['Primera línea', 'Segunda línea'] },
    { type: 'chorus', label: 'Coro', lines: ['Coro de prueba'] },
    { type: 'verse', label: 'Estrofa 2', lines: ['Otra estrofa'] }
  ]
};

test('himnario y coro conservan sus portadas y metadatos propios', () => {
  const hymn = compileHymnSlides(song);
  const choir = compileChoirSlides({ ...song, id: 'coro_001' });
  assert.equal(hymn[0].hymnNumber, 1);
  assert.equal(hymn[0].type, 'hymn');
  assert.equal(choir[0].choirId, 'coro_001');
  assert.equal(choir[0].badge, 'CANTO DEL CORO');
  for (const slides of [hymn, choir]) {
    assert.equal(slides[0].isTitleOnly, true);
    assert.notEqual(slides[1].sectionGroup, slides[3].sectionGroup);
  }
  assert.equal(hymn.at(-1).sectionType, 'chorus');
  assert.equal(choir.at(-1).sectionType, 'verse');
});

test('coro conserva su orden, omite respuestas y termina en el final', () => {
  const sections = [...song.sections,
    { type: 'chorus', label: 'Respuestas del coro', lines: ['Respuesta de tenor'] },
    { type: 'verse', label: 'Final', lines: ['Amén'] },
    song.sections[1]
  ];
  const slides = compileChoirSlides({ ...song, sections });
  assert.deepEqual(slides.map(slide => slide.sectionType), ['title', 'verse', 'chorus', 'verse', 'final']);
  assert.equal(slides.at(-1).text, 'Amén');
});

test('búsqueda tolera tildes y entrega recuentos aunque el JSON no los incluya', () => {
  const list = [structuredClone(song), { ...structuredClone(song), id: '002', number: 2, title: 'Ángeles cantan' }];
  prepareDatabase(list);
  assert.equal(searchSongs(list, 'angeles')[0].id, '002');
  assert.equal(searchSongs(list, '#1')[0].number, 1);
  assert.equal(searchSongs(list, 'primera')[0].totalLines, 4);
});

test('todos los cantos caben en su presupuesto estimado sin perder las palabras', () => {
  for (const [filename, compile] of [['himnario_lldm.json', compileHymnSlides], ['coro_lldm.json', compileChoirSlides]]) {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'factory', filename), 'utf8'));
    for (const item of catalog) {
      const slides = compile(item);
      const { measure, HEIGHT, MIN_FONT } = require('../src/songs/section-layout');
      assert.ok(slides.every(slide => slide.isTitleOnly || ((slide.fontSize >= MIN_FONT || (slide.fontSize >= 24 && /\/{2,}/.test(slide.text))) && measure(slide.lines, slide.fontSize).height <= HEIGHT && measure(slide.lines, slide.fontSize).maxLineWidth <= 1740)), `${item.id} excede el lienzo legible`);
      // Verify the pagination itself preserves text; chorus expansion is checked independently.
      for (const section of item.sections) {
        const { paginateSection } = require('../src/songs/section-layout');
        const normalize = text => text.replace(/\s+/g, ' ').trim();
        assert.equal(normalize(paginateSection(section.lines).flatMap(slide => slide.lines).join(' ')), normalize(section.lines.join(' ')), item.id);
      }
    }
  }
});

test('los saltos internos del JSON son flexibles; el coro del himno 1 cabe completo con letra grande', () => {
  const hymn = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'factory', 'himnario_lldm.json'), 'utf8'))[0];
  const chorusSlides = compileHymnSlides(hymn).filter(slide => slide.sectionType === 'chorus');
  assert.ok(chorusSlides.length > 0);
  assert.ok(chorusSlides.every(slide => slide.totalChunks === 1 && slide.fontSize >= 156 && slide.displayLines.length <= 6));
  const { paginateSection } = require('../src/songs/section-layout');
  const sentence = 'Cantamos juntos con alegría al Señor porque su amor permanece para siempre y su bondad nunca terminará.';
  assert.deepEqual(paginateSection(sentence.split(' ')), paginateSection([sentence]));
});

test('HTTP y dos clientes de TV comparten contenido, índice y revisión; reposo es reversible', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-test-'));
  fs.writeFileSync(path.join(dataDir, 'himnario_lldm.json'), JSON.stringify([song]));
  fs.writeFileSync(path.join(dataDir, 'coro_lldm.json'), JSON.stringify([{ ...song, id: 'coro_001' }]));
  fs.writeFileSync(path.join(dataDir, 'presentations.json'), '[]');
  const app = createApplication({ dataDir, uploadsDir: path.join(dataDir, 'uploads'), carteleriaDir: path.join(dataDir, 'missing'), watchFiles: false, obs: false });
  t.after(async () => { await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = async (url, body) => {
    const response = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const clients = [new WebSocket(base.replace('http:', 'ws:') + '/ws'), new WebSocket(base.replace('http:', 'ws:') + '/ws')];
  const messages = clients.map(() => []);
  clients.forEach((client, index) => client.on('message', message => messages[index].push(JSON.parse(message))));
  await Promise.all(clients.map(client => once(client, 'open')));
  const projected = await post('/api/project/hymn', { hymnId: 1, titleOnly: true, startIndex: -20 });
  assert.equal(projected.status, 200);
  assert.equal(projected.body.state.currentSlideIndex, 0);
  const advanced = await post('/api/control/action', { action: 'NEXT_SLIDE' });
  assert.equal(advanced.body.state.currentSlideIndex, 1);
  const pending = clients.map(client => new Promise(resolve => client.once('message', message => resolve(JSON.parse(message)))));
  const idle = await post('/api/control/action', { action: 'SET_IDLE' });
  const received = await Promise.all(pending);
  assert.deepEqual(received[0], received[1]);
  assert.equal(received[0].state.revision, idle.body.state.revision);
  assert.equal(idle.body.state.displayPayload.type, 'idle');
  const resumed = await post('/api/control/action', { action: 'SET_ACTIVE' });
  assert.equal(resumed.body.state.currentSlideIndex, 1);
  assert.equal(resumed.body.state.displayPayload.type, 'hymn');
  for (const action of ['SET_BLACKOUT', 'TOGGLE_BLACKOUT']) {
    assert.equal((await post('/api/control/action', { action, value: true })).status, 400);
  }
  const state = await (await fetch(base + '/api/state')).json();
  assert.equal('isBlackout' in state, false);
  assert.equal(state.phase, 'active');
  for (const [url, body] of [
    ['/api/project/choir', { choirId: 'coro_001' }],
    ['/api/project/bible', { book: 'Juan', chapter: '3', verse: '16' }],
    ['/api/project/theme', { title: 'Tema de prueba' }],
    ['/api/project/special', { type: 'Carta Apostólica', date: 'Hoy' }],
    ['/api/project/drone', {}],
    ['/api/project/custom', { text: 'Aviso de prueba' }]
  ]) assert.equal((await post(url, body)).status, 200);
  await post('/api/project/hymn', { hymnId: 1, titleOnly: true });
  assert.ok(messages.every(items => items.some(message => message.type === 'OVERLAY_EVENT')), 'los envíos a TV también identifican el contenido en OBS');
  assert.equal((await post('/api/project/carteleria', {})).status, 503);
  assert.equal((await (await fetch(base + '/api/state')).json()).contentType, 'hymn');

  const saved = await post('/api/songs/himnos/001/save', {
    title: 'Título editado', sections: song.sections, updateActiveProjection: false
  });
  assert.equal(saved.status, 200);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'himnario_lldm.json')))[0].title, 'Título editado');
  assert.equal((await (await fetch(base + '/api/state')).json()).activeItem.title, song.title);
  const bannerReceived = new Promise(resolve => {
    const listen = raw => { const message = JSON.parse(raw); if (message.type === 'OVERLAY_EVENT') { clients[0].off('message', listen); resolve(message); } };
    clients[0].on('message', listen);
  });
  await post('/api/overlay/broadcast', { type: 'custom', text: 'Banner explícito' });
  assert.equal((await bannerReceived).payload.text, 'Banner explícito');
  const cleared = await post('/api/control/action', { action: 'CLEAR_PROJECTION' });
  assert.equal(cleared.body.state.activeItem, null);
  assert.equal(cleared.body.state.displayPayload.type, 'idle');
  assert.ok(messages.every(items => items.every(message => message.type !== 'OVERLAY_HIDE')), 'Fondo no oculta el banner de OBS');
  const reconnect = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  const [initial] = await once(reconnect, 'message');
  assert.equal(JSON.parse(initial).state.revision, cleared.body.state.revision);
  reconnect.close();
});
