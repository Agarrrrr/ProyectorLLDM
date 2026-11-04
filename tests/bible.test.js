const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApplication } = require('../src/app');
const { createBibleService, splitLongVerse, paginateVerseItems } = require('../src/bible/service');

test('servicio de biblia lista 8 versiones con Reina Valera 1960 por defecto', () => {
  const service = createBibleService();
  const manifest = service.getManifest();
  assert.equal(manifest.length, 8);
  assert.equal(manifest[0].id, 'RVR1960');
  assert.equal(manifest[0].isDefault, true);

  const ids = manifest.map(v => v.id);
  assert.ok(ids.includes('RVR1960'));
  assert.ok(ids.includes('NVI'));
  assert.ok(ids.includes('DHH'));
  assert.ok(ids.includes('TLA'));
  assert.ok(ids.includes('NTV'));
  assert.ok(ids.includes('LBLA'));
  assert.ok(ids.includes('RVA2015'));
  assert.ok(ids.includes('NBLA'));
});

test('validación dinámica rechaza libros, capítulos y versículos inexistentes', () => {
  const service = createBibleService();

  // Libro inexistente
  const invalidBook = service.validateCitation({ book: 'Macabeos', chapter: 1, verse: '1' });
  assert.equal(invalidBook.valid, false);

  // Capítulo excedido (Juan solo tiene 21 capítulos)
  const invalidChapter = service.validateCitation({ book: 'Juan', chapter: 22, verse: '1' });
  assert.equal(invalidChapter.valid, false);
  assert.match(invalidChapter.error, /solo tiene 21 capítulos/);

  // Versículo excedido (Juan 14 solo tiene 31 versículos)
  const invalidVerse = service.validateCitation({ book: 'Juan', chapter: 14, verse: '32' });
  assert.equal(invalidVerse.valid, false);
  assert.match(invalidVerse.error, /solo tiene 31 versículos/);

  // Rango invertido
  const invalidRange = service.validateCitation({ book: 'Juan', chapter: 14, verse: '6-2' });
  assert.equal(invalidRange.valid, false);
  assert.match(invalidRange.error, /inválido/);

  // Cita válida
  const valid = service.validateCitation({ book: 'Juan', chapter: 14, verse: '1-6' });
  assert.equal(valid.valid, true);
  assert.equal(valid.book, 'Juan');
  assert.equal(valid.chapter, 14);
  assert.equal(valid.startVerse, 1);
  assert.equal(valid.endVerse, 6);
});

test('normalización de alias bíblicos resuelve abreviaciones y nombres alternativos', () => {
  const service = createBibleService();
  assert.equal(service.findCanonicalBook('1ra de juan'), '1 Juan');
  assert.equal(service.findCanonicalBook('1jn'), '1 Juan');
  assert.equal(service.findCanonicalBook('1 cor'), '1 Corintios');
  assert.equal(service.findCanonicalBook('salmo'), 'Salmos');
  assert.equal(service.findCanonicalBook('cantares'), 'Cantares');
  assert.equal(service.findCanonicalBook('apoc'), 'Apocalipsis');
});

test('modo Solo Cita genera una diapositiva en formato carátula clásico', () => {
  const service = createBibleService();
  const slides = service.createBibleSlides({
    book: 'Juan',
    chapter: 14,
    verse: '6',
    mode: 'citation',
    versionId: 'RVR1960'
  });

  assert.equal(slides.length, 1);
  assert.equal(slides[0].type, 'bible');
  assert.equal(slides[0].mode, 'citation');
  assert.equal(slides[0].isTitleOnly, true);
  assert.equal(slides[0].title, 'JUAN');
  assert.equal(slides[0].text, '14:6');
  assert.equal(slides[0].reference, 'Juan 14:6');
});

test('modo Cita + Texto pagina versículos con números de versículo y sin saturar la pantalla', () => {
  const service = createBibleService();
  const slides = service.createBibleSlides({
    book: 'Juan',
    chapter: 14,
    verse: '1-6',
    mode: 'text',
    versionId: 'RVR1960'
  });

  assert.ok(slides.length >= 2);
  assert.ok(slides.every(s => s.type === 'bible' && s.mode === 'text'));
  assert.ok(slides.every(s => s.totalSlides === slides.length));
  assert.ok(slides.every(s => s.version === 'RVR1960'));

  // Verificar presencia de números de versículo en el HTML
  assert.ok(slides[0].formattedText.includes('class="bible-verse-num"'));
  assert.ok(slides[0].formattedText.includes('No se turbe vuestro corazón'));

  const { MIN_FONT, MAX_FONT, MAX_ROWS } = require('../src/songs/section-layout');
  assert.ok(slides.every(slide => slide.fontSize >= MIN_FONT && slide.fontSize <= MAX_FONT && slide.displayLines.length <= MAX_ROWS));
  const verseSix = slides.flatMap(slide => slide.verses).filter(verse => verse.number === 6).map(verse => verse.text).join(' ');
  assert.match(verseSix, /Yo soy el camino/);
});

test('versículos muy extensos como Ester 8:9 se dividen en límites de oraciones limpios', () => {
  const service = createBibleService();
  const slides = service.createBibleSlides({
    book: 'Ester',
    chapter: 8,
    verse: '9',
    mode: 'text',
    versionId: 'RVR1960'
  });

  assert.ok(slides.length >= 2, 'Ester 8:9 debe dividirse en al menos 2 diapositivas');
  assert.ok(slides.every(s => s.text.length <= 280), 'Cada diapositiva respeta el presupuesto de caracteres');
  assert.ok(slides.every(s => s.formattedText.includes('class="bible-verse-num"')));
});

test('soporte para múltiples versiones de la biblia (NVI, DHH, TLA, LBLA, NTV, RVA2015, NBLA)', () => {
  const service = createBibleService();
  const versions = ['RVR1960', 'NVI', 'DHH', 'TLA', 'LBLA', 'NTV', 'RVA2015', 'NBLA'];

  for (const v of versions) {
    const slides = service.createBibleSlides({
      book: 'Juan',
      chapter: 14,
      verse: '1',
      mode: 'text',
      versionId: v
    });
    assert.ok(slides.length >= 1);
    assert.ok(slides.every(slide => slide.version === v));
    assert.ok(slides.map(slide => slide.text).join(' ').length > 20);
  }

  // Verificar que NVI y RVR1960 tienen sus textos característicos
  const rvr = service.createBibleSlides({ book: 'Juan', chapter: 14, verse: '1', mode: 'text', versionId: 'RVR1960' })[0];
  const nvi = service.createBibleSlides({ book: 'Juan', chapter: 14, verse: '1', mode: 'text', versionId: 'NVI' })[0];
  assert.ok(rvr.text.includes('No se turbe'));
  assert.ok(nvi.text.includes('No se angustien'));
});

test('API REST permite consultar versiones, límites y proyectar en ambos modos', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-bible-test-'));
  const song = { id: '001', number: 1, title: 'Prueba', sections: [{ type: 'verse', label: 'Estrofa 1', lines: ['Texto'] }] };
  fs.writeFileSync(path.join(dataDir, 'himnario_lldm.json'), JSON.stringify([song]));
  fs.writeFileSync(path.join(dataDir, 'coro_lldm.json'), JSON.stringify([{ ...song, id: 'coro_001' }]));
  fs.writeFileSync(path.join(dataDir, 'presentations.json'), '[]');

  const app = createApplication({
    dataDir,
    uploadsDir: path.join(dataDir, 'uploads'),
    carteleriaDir: path.join(dataDir, 'carteleria'),
    watchFiles: false,
    obs: false
  });
  t.after(async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;

  const post = async (url, body) => {
    const response = await fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };

  const get = async url => {
    const response = await fetch(base + url);
    return { status: response.status, body: await response.json() };
  };

  // 1. Obtener versiones
  const versionsRes = await get('/api/biblia/versions');
  assert.equal(versionsRes.status, 200);
  assert.equal(versionsRes.body.length, 8);

  // 2. Obtener límites de versión
  const limitsRes = await get('/api/biblia/limits?version=NVI');
  assert.equal(limitsRes.status, 200);
  assert.equal(limitsRes.body.version, 'NVI');
  assert.ok(limitsRes.body.limits['Juan']);

  // 3. Proyectar en modo Solo Cita
  const projCitation = await post('/api/project/bible', {
    book: 'Juan',
    chapter: '3',
    verse: '16',
    mode: 'citation'
  });
  assert.equal(projCitation.status, 200);
  assert.equal(projCitation.body.state.contentType, 'bible');
  assert.equal(projCitation.body.state.slides.length, 1);
  assert.equal(projCitation.body.state.slides[0].isTitleOnly, true);

  // 4. Proyectar en modo Cita + Texto
  const projText = await post('/api/project/bible', {
    book: 'Juan',
    chapter: '14',
    verse: '1-6',
    mode: 'text',
    version: 'RVR1960'
  });
  assert.equal(projText.status, 200);
  assert.equal(projText.body.state.contentType, 'bible');
  assert.ok(projText.body.state.slides.length >= 2);
  assert.equal(projText.body.state.slides[0].mode, 'text');
  assert.equal(projText.body.state.currentSlideIndex, 0);
  assert.equal(projText.body.state.activeItem.verse, '1-6');
  const { outputSnapshot } = require('../src/transport/state-stream');
  const payload = outputSnapshot(projText.body.state).displayPayload;
  assert.equal(payload.mode, 'text');
  assert.equal(payload.version, 'RVR1960');
  assert.equal(payload.verses[0].number, 1);

  // 5. Avanzar diapositiva
  const nextSlide = await post('/api/control/action', { action: 'NEXT_SLIDE' });
  assert.equal(nextSlide.status, 200);
  assert.equal(nextSlide.body.state.currentSlideIndex, 1);
  assert.equal(nextSlide.body.state.displayPayload.mode, 'text');
  assert.notDeepEqual(nextSlide.body.state.displayPayload.verses, payload.verses);

  // 6. Rechazar cita fuera de límites
  const invalidProj = await post('/api/project/bible', {
    book: 'Juan',
    chapter: '22',
    verse: '1'
  });
  assert.equal(invalidProj.status, 400);
  assert.match(invalidProj.body.error, /solo tiene 21 capítulos/);
});
