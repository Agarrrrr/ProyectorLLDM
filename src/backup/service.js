const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const crc32 = require('node:zlib').crc32 ?? require('buffer-crc32').unsigned;
const yauzl = require('yauzl');
const yazl = require('yazl');
const { defaults, validateSettings } = require('../settings/service');
const { validateDocument } = require('../lists/service');
const { inspectSongAsset } = require('../songs/assets');

const limit = 256 * 1024 * 1024;
const jsonLimit = 16 * 1024 * 1024;
const sections = {
  settings: ['settings.json', 'song-assets'],
  hymn: ['himnario_lldm.json'],
  choir: ['coro_lldm.json'],
  lists: ['lista-oraciones.json'],
  presentations: ['presentations.json', 'presentations']
};
const defaultFiles = {
  'settings.json': { revision: 0, settings: defaults },
  'lista-oraciones.json': { revision: 0, document: { currentWeek: null, weeks: {}, customSalesGroups: null, rotationSeconds: 15 } },
  'presentations.json': []
};
const fileRules = {
  'song-assets': /^(?:index\.json|font-[a-f0-9]{24}\.(?:otf|ttf|woff2?)|image-[a-f0-9]{24}\.(?:jpg|webp|png))$/,
  presentations: /^pres_[a-f0-9-]{36}\/slide_\d+\.png$/
};
const files = Object.values(sections).flat();
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value));
const exists = fs.existsSync;

function entryAllowed(name) {
  const [root, ...rest] = name.split('/');
  return Object.hasOwn(fileRules, root) ? fileRules[root].test(rest.join('/')) : !rest.length && files.includes(root);
}

function validateContents(directory) {
  const json = name => read(path.join(directory, name));
  const has = name => exists(path.join(directory, name));
  const validRevision = value => Number.isSafeInteger(value?.revision) && value.revision >= 0 && value.revision < Number.MAX_SAFE_INTEGER;
  if (has('settings.json')) {
    const snapshot = json('settings.json');
    if (!validRevision(snapshot)) throw new Error('Revisión de ajustes inválida.');
    const settings = validateSettings(snapshot.settings);
    const assets = has('song-assets/index.json') ? json('song-assets/index.json') : [];
    if (!Array.isArray(assets) || assets.some(asset => !asset || !['font', 'image'].includes(asset.kind) ||
      typeof asset.id !== 'string' || typeof asset.name !== 'string' ||
      typeof asset.filename !== 'string' || !entryAllowed('song-assets/' + asset.filename) ||
      !asset.filename.startsWith(asset.id + '.') || !has('song-assets/' + asset.filename))) throw new Error('Índice de fuentes o fondos inválido.');
    for (const asset of assets) {
      const filename = path.join(directory, 'song-assets', asset.filename);
      if (fs.statSync(filename).size > 8 * 1024 * 1024) throw new Error('Una fuente o fondo supera 8 MiB.');
      try {
        const { extension } = inspectSongAsset(asset.kind, asset.filename, fs.readFileSync(filename));
        if (path.extname(asset.filename) !== extension) throw new Error();
      } catch {
        throw new Error('Una fuente o fondo del respaldo tiene un formato inválido: ' + asset.filename);
      }
    }
    for (const profile of [settings.lyrics.hymn, settings.lyrics.choir]) {
      if (!['montserrat', 'inter', 'outfit', 'playfair'].includes(profile.font) && !assets.some(asset => asset.kind === 'font' && asset.id === profile.font)) throw new Error('Falta una fuente de los ajustes.');
      if (!['original', 'solid', 'preset-navy', 'preset-burgundy', 'preset-emerald', 'preset-slate'].includes(profile.background) &&
        !assets.some(asset => asset.kind === 'image' && asset.id === profile.background)) throw new Error('Falta un fondo de los ajustes.');
    }
  }
  if (has('lista-oraciones.json')) {
    const snapshot = json('lista-oraciones.json');
    if (!validRevision(snapshot)) throw new Error('Revisión de listas inválida.');
    validateDocument(snapshot.document);
  }
  for (const name of ['himnario_lldm.json', 'coro_lldm.json']) {
    if (!has(name)) continue;
    const songs = json(name);
    if (!Array.isArray(songs) || songs.length > 10000 || songs.some(song => typeof song?.title !== 'string' ||
      !['string', 'number'].includes(typeof song.id) || !Array.isArray(song.sections) || song.sections.some(section =>
        !Array.isArray(section?.lines) || section.lines.some(line => typeof line !== 'string')) ||
      (song.categories != null && (!Array.isArray(song.categories) || song.categories.some(item => typeof item !== 'string'))))) {
      throw new Error('Catálogo inválido.');
    }
  }
  if (has('presentations.json')) {
    const presentations = json('presentations.json');
    const slideExists = (value, id) => typeof value === 'string' && value.startsWith('/uploads/presentations/' + id + '/') &&
      entryAllowed(value.slice('/uploads/'.length)) && has(value.slice('/uploads/'.length));
    if (!Array.isArray(presentations) || presentations.some(item => typeof item?.title !== 'string' ||
      !/^pres_[a-f0-9-]{36}$/.test(item.id) || !slideExists(item.coverUrl, item.id) || !Array.isArray(item.slides) ||
      item.slides.some(slide => !slideExists(slide?.imageUrl, item.id) || !slideExists(slide.thumbUrl, item.id)))) {
      throw new Error('Faltan diapositivas o el índice de presentaciones es inválido.');
    }
  }
}

function unpack(filename, directory) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, { lazyEntries: true, strictFileNames: true }, (error, archive) => {
      if (error) return reject(error);
      const seen = new Set();
      let size = 0;
      function fail(error) { archive.close(); reject(error); }
      archive.on('error', fail);
      archive.on('end', () => resolve(seen));
      archive.on('entry', entry => {
        const name = entry.fileName;
        const max = name.endsWith('.json') ? jsonLimit : limit;
        size += entry.uncompressedSize;
        if (seen.size >= 10000 || size > limit || entry.uncompressedSize > max ||
          seen.has(name) || (name !== 'manifest.json' && !entryAllowed(name))) {
          return fail(new Error('El ZIP contiene rutas inesperadas o supera los límites del respaldo.'));
        }
        seen.add(name);
        archive.openReadStream(entry, async (error, stream) => {
          if (error) return fail(error);
          try {
            const target = path.join(directory, name);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            let checksum = 0;
            const verify = new Transform({
              transform(chunk, encoding, callback) {
                checksum = crc32(chunk, checksum);
                callback(null, chunk);
              },
              flush(callback) {
                callback(checksum === entry.crc32 ? null : new Error('Archivo dañado dentro del ZIP: ' + name));
              }
            });
            await pipeline(stream, verify, fs.createWriteStream(target, { flags: 'wx' }));
            archive.readEntry();
          } catch (error) { fail(error); }
        });
      });
      archive.readEntry();
    });
  });
}

function restorePaths(dataDir, uploadsDir) {
  return {
    pending: path.join(dataDir, 'restore-pending'),
    recovery: path.join(dataDir, 'backups', 'restore-previous'),
    destination: name => name === 'presentations' ? uploadsDir : path.join(dataDir, name)
  };
}

function applyPendingRestore(dataDir, uploadsDir) {
  const { pending, recovery, destination } = restorePaths(dataDir, uploadsDir);
  const ready = path.join(pending, 'apply.json');
  if (!exists(ready)) return;
  const journal = path.join(pending, 'journal.json');
  function rollback(names) {
    for (const name of names) {
      const previous = path.join(recovery, name);
      const staged = path.join(pending, name);
      const target = destination(name);
      if (!exists(staged) && exists(target)) fs.renameSync(target, staged);
      if (exists(previous)) fs.renameSync(previous, target);
    }
  }
  if (exists(journal)) {
    rollback(read(journal));
    fs.rmSync(ready);
    fs.rmSync(journal);
    console.warn('[RESPALDO] Se recuperaron los datos previos a una restauración interrumpida.');
    return;
  }
  const names = read(ready).flatMap(key => sections[key]);
  fs.rmSync(recovery, { recursive: true, force: true });
  fs.mkdirSync(recovery, { recursive: true });
  write(journal + '.tmp', names);
  fs.renameSync(journal + '.tmp', journal);
  try {
    for (const name of names) {
      const target = destination(name);
      const staged = path.join(pending, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (name === 'settings.json' || name === 'lista-oraciones.json') {
        const snapshot = read(staged);
        let previousRevision = 0;
        // A connected editor may still hold a higher revision from before the restart.
        try { previousRevision = read(target).revision; } catch {}
        snapshot.revision = Math.max(snapshot.revision, Number.isSafeInteger(previousRevision) ? previousRevision : 0) + 1;
        write(staged, snapshot);
      }
      if (exists(target)) fs.renameSync(target, path.join(recovery, name));
      fs.renameSync(staged, target);
    }
  } catch (error) {
    rollback(names);
    fs.rmSync(ready);
    fs.rmSync(journal);
    console.warn('[RESPALDO] Se conservaron los datos previos:', error.message);
    return;
  }
  // Rename the directory to commit the operation before removing staging metadata.
  const completed = path.join(dataDir, 'restore-completed-' + randomUUID());
  fs.renameSync(pending, completed);
  fs.rmSync(completed, { recursive: true, force: true });
  console.log('[RESPALDO] Restauración aplicada. Copia anterior en data/backups/restore-previous.');
}

function installBackupRoutes({ app, dataDir, uploadsDir, isOwner = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) }) {
  const { pending, destination } = restorePaths(dataDir, uploadsDir);
  let preview;
  let inspecting = false;
  app.use('/api/backup', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!isOwner(req)) {
      return res.status(403).json({ error: 'Abre Ajustes desde la computadora donde se ejecuta Proyector.' });
    }
    next();
  });
  app.get('/api/backup/status', (req, res) => res.json({ pending: exists(path.join(pending, 'apply.json')) }));
  app.delete('/api/backup/restore', (req, res) => {
    if (inspecting) return res.status(409).json({ error: 'Espera a que termine la revisión del ZIP.' });
    fs.rmSync(pending, { recursive: true, force: true });
    preview = null;
    res.json({ pending: false });
  });
  app.get('/api/backup', async (req, res, next) => {
    try {
      const selected = Object.keys(sections).filter(key => key !== 'presentations' || req.query.presentations === '1');
      const archive = new yazl.ZipFile();
      const entries = [];
      let size = 0;
      for (const name of selected.flatMap(key => sections[key])) {
        const source = destination(name);
        if (Object.hasOwn(fileRules, name)) {
          if (!exists(source)) continue;
          for (const relative of fs.readdirSync(source, { recursive: true }).map(file => file.replaceAll('\\', '/'))) {
            const entry = name + '/' + relative;
            if (!entryAllowed(entry)) continue;
            const file = path.join(source, relative);
            const stat = fs.lstatSync(file);
            if (!stat.isFile() || fs.realpathSync(file) !== path.join(fs.realpathSync(source), relative)) continue;
            entries.push([file, entry]);
            size += stat.size;
          }
        } else if (exists(source)) {
          entries.push([source, name]);
          size += fs.statSync(source).size;
        } else if (Object.hasOwn(defaultFiles, name)) {
          archive.addBuffer(Buffer.from(JSON.stringify(defaultFiles[name])), name);
        } else {
          archive.addBuffer(Buffer.from('[]'), name);
        }
      }
      if (size > limit || entries.length > 9900) return res.status(400).json({ error: 'El respaldo supera 256 MiB o contiene demasiados archivos. Intenta sin presentaciones.' });
      for (const [source, name] of entries) {
        if (name.endsWith('.json')) {
          const content = fs.readFileSync(source);
          if (content.length > jsonLimit) return res.status(400).json({ error: 'Un registro JSON supera el límite de 16 MiB del respaldo.' });
          archive.addBuffer(content, name);
        } else {
          archive.addFile(source, name, { compress: false });
        }
      }
      archive.addBuffer(Buffer.from(JSON.stringify({ format: 'proyector-lldm-backup', version: 1, sections: selected, createdAt: new Date().toISOString() })), 'manifest.json');
      res.attachment('proyector-lldm-respaldo-' + new Date().toISOString().slice(0, 10) + '.zip');
      const transfer = pipeline(archive.outputStream, res);
      archive.on('error', error => archive.outputStream.destroy(error));
      archive.end();
      await transfer;
    } catch (error) { if (!res.destroyed) next(error); }
  });
  app.post('/api/backup/inspect', async (req, res) => {
    if (inspecting || exists(path.join(pending, 'apply.json'))) return res.status(409).json({ error: 'Ya hay una restauración en revisión o pendiente de reinicio.' });
    inspecting = true;
    preview = null;
    try {
      const length = Number(req.get('content-length'));
      if (!req.is('application/octet-stream') || !Number.isSafeInteger(length) || length < 1 || length > limit ||
          (req.get('content-encoding') && req.get('content-encoding') !== 'identity')) {
        return res.status(400).json({ error: 'Selecciona un archivo ZIP de hasta 256 MiB.' });
      }
      fs.rmSync(pending, { recursive: true, force: true });
      fs.mkdirSync(pending, { recursive: true });
      const filename = path.join(pending, 'incoming.zip');
      let received = 0;
      const bounded = new Transform({
        transform(chunk, encoding, callback) {
          received += chunk.length;
          callback(received > limit ? new Error('El ZIP supera 256 MiB.') : null, chunk);
        }
      });
      await pipeline(req, bounded, fs.createWriteStream(filename, { flags: 'wx' }));
      const seen = await unpack(filename, pending);
      fs.rmSync(filename);
      const manifest = read(path.join(pending, 'manifest.json'));
      if (manifest?.format !== 'proyector-lldm-backup' || manifest.version !== 1 || !Array.isArray(manifest.sections) ||
        !manifest.sections.length || manifest.sections.some(key => !Object.hasOwn(sections, key)) ||
        new Set(manifest.sections).size !== manifest.sections.length) throw new Error('Formato de respaldo no compatible.');
      const expected = manifest.sections.flatMap(key => sections[key]);
      if ([...seen].some(name => name !== 'manifest.json' && !expected.includes(name.split('/')[0])) ||
        expected.some(name => !Object.hasOwn(fileRules, name) && !seen.has(name))) throw new Error('El respaldo está incompleto.');
      for (const name of expected.filter(name => Object.hasOwn(fileRules, name))) fs.mkdirSync(path.join(pending, name), { recursive: true });
      validateContents(pending);
      preview = { token: randomUUID(), sections: manifest.sections };
      res.json({ ...preview, createdAt: manifest.createdAt });
    } catch (error) {
      fs.rmSync(pending, { recursive: true, force: true });
      res.status(400).json({ error: 'No se pudo leer el respaldo. ' + error.message });
    } finally { inspecting = false; }
  });
  app.post('/api/backup/restore', (req, res, next) => {
    const { token, sections: selected } = req.body || {};
    if (!preview || token !== preview.token || !Array.isArray(selected) || !selected.length ||
      new Set(selected).size !== selected.length || selected.some(key => !preview.sections.includes(key))) {
      return res.status(400).json({ error: 'Revisa el ZIP y selecciona las secciones que quieres restaurar.' });
    }
    try {
      write(path.join(pending, 'apply.tmp'), selected);
      fs.renameSync(path.join(pending, 'apply.tmp'), path.join(pending, 'apply.json'));
      preview = null;
      res.json({ pending: true });
    } catch (error) { next(error); }
  });
}

module.exports = { applyPendingRestore, installBackupRoutes };
