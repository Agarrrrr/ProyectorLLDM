const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

function inspectSongAsset(kind, filename, buffer) {
  if (kind === 'font') {
    const extension = path.extname(filename).toLowerCase();
    if (!['.ttf', '.otf', '.woff', '.woff2'].includes(extension)) throw new Error('Usa una fuente TTF, OTF, WOFF o WOFF2.');
    const parsed = require('fontkit').create(buffer);
    if (!parsed.layout || !parsed.unitsPerEm || !parsed.characterSet?.includes(65)) throw new Error('El archivo no contiene una fuente de texto compatible.');
    return { extension, name: parsed.fullName || parsed.familyName, weight: parsed.variationAxes?.wght?.default || 800, prefix: 'font' };
  }
  const weight = 800;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: '.png', weight, mediaType: 'image', prefix: kind === 'background' ? 'bg-img' : 'image' };
  }
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { extension: '.jpg', weight, mediaType: 'image', prefix: kind === 'background' ? 'bg-img' : 'image' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: '.webp', weight, mediaType: 'image', prefix: kind === 'background' ? 'bg-img' : 'image' };
  }
  if (kind === 'background') {
    const header6 = buffer.toString('ascii', 0, 6);
    if (header6 === 'GIF87a' || header6 === 'GIF89a') {
      return { extension: '.gif', weight, mediaType: 'image', prefix: 'bg-img' };
    }
    if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      return { extension: '.mp4', weight, mediaType: 'video', prefix: 'bg-vid' };
    }
    if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return { extension: '.webm', weight, mediaType: 'video', prefix: 'bg-vid' };
    }
    const ext = path.extname(filename).toLowerCase();
    if (['.svg', '.html', '.htm'].includes(ext)) {
      const text = buffer.toString('utf8').trim();
      if (ext === '.svg' && /<svg[\s>]/i.test(text) && /<\/svg>/i.test(text)) {
        return { extension: '.svg', weight, mediaType: 'html', prefix: 'bg-html' };
      }
      if ((ext === '.html' || ext === '.htm') && /(?:<!doctype\s+html|<html[\s>]|<svg[\s>])/i.test(text)) {
        return { extension: '.html', weight, mediaType: 'html', prefix: 'bg-html' };
      }
    }
    throw new Error('Usa una imagen (PNG, JPG, WebP, GIF), un video (MP4, WebM) o un fondo animado (SVG, HTML).');
  }
  throw new Error('Usa una imagen PNG, JPG o WebP.');
}

function createSongAssets({ app, dataDir }) {
  const directory = path.join(dataDir, 'song-assets');
  fs.mkdirSync(directory, { recursive: true });
  const indexPath = path.join(directory, 'index.json');
  let imported = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
  const builtin = [
    ['montserrat', 'Montserrat', 'Montserrat-800.woff2'], ['inter', 'Inter', 'Inter.woff2'],
    ['outfit', 'Outfit', 'Outfit.woff2'], ['playfair', 'Playfair Display', 'Playfair-Display.woff2']
  ].map(([id, name, file]) => ({ id, name, kind: 'font', weight: id === 'montserrat' ? 800 : 400, file: path.join(__dirname, '../../public/fonts', file), url: '/fonts/' + file }));
  for (const [id, name] of [['navy', 'Azul noche · facetas'], ['burgundy', 'Borgoña · luz dorada'], ['emerald', 'Esmeralda · diagonales'], ['slate', 'Pizarra · ondas']]) {
    builtin.push({ id: 'preset-' + id, name, kind: 'image', mediaType: 'image', url: '/graphics/song-backgrounds/' + id + '.svg' });
  }
  function all() { return [...builtin, ...imported.map(asset => ({ ...asset, file: path.join(directory, asset.filename), url: '/song-assets/' + asset.filename }))]; }
  function find(id, kind) {
    if (kind === 'background') return all().find(asset => asset.id === id && ['image', 'background'].includes(asset.kind));
    return all().find(asset => asset.id === id && asset.kind === kind);
  }
  function validate(lyrics, graphics) {
    for (const value of [lyrics.hymn, lyrics.choir]) {
      if (!find(value.font, 'font')) throw new Error('La fuente seleccionada no está disponible.');
      if (!['original', 'solid', 'transparent'].includes(value.background) && !find(value.background, 'image')) throw new Error('El fondo seleccionado no está disponible.');
    }
    if (graphics && !['institutional', 'classic', 'transparent'].includes(graphics.background)) {
      if (!find(graphics.background, 'background')) throw new Error('El fondo de TV seleccionado no está disponible.');
    }
  }
  app.get('/api/song-assets', (req, res) => res.json(all().map(({ file, filename, ...asset }) => asset)));
  app.get('/song-assets/:filename', (req, res) => {
    const asset = imported.find(value => value.filename === req.params.filename || value.id === req.params.filename);
    if (!asset) return res.sendStatus(404);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (asset.filename.endsWith('.html') || asset.filename.endsWith('.svg')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'");
    }
    res.sendFile(asset.filename, { root: directory });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 32 * 1024 * 1024, files: 1 } }).single('file');
  app.post('/api/song-assets/:kind', (req, res, next) => upload(req, res, error => {
    if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo permitido (32 MB para fondos de TV, 8 MB para fuentes e imágenes de cantos).' : 'No se pudo cargar el archivo.' });
    try {
      const kind = req.params.kind;
      if (!req.file || !['font', 'image', 'background'].includes(kind)) return res.status(400).json({ error: 'Selecciona una fuente, una imagen o un fondo de TV.' });
      const buffer = req.file.buffer;
      if (kind !== 'background' && buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'El archivo debe pesar como máximo 8 MB.' });
      }
      const originalName = path.basename(req.file.originalname).replace(/[\x00-\x1f]/g, '').slice(0, 120);
      const { extension, weight, mediaType, prefix = kind, name = originalName } = inspectSongAsset(kind, originalName, buffer);
      const id = prefix + '-' + crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 24);
      if (!imported.some(asset => asset.id === id)) {
        const asset = { id, name, kind, weight, ...(mediaType ? { mediaType } : {}), filename: id + extension };
        fs.writeFileSync(path.join(directory, asset.filename), buffer);
        const next = [...imported, asset];
        fs.writeFileSync(indexPath + '.tmp', JSON.stringify(next, null, 2)); fs.renameSync(indexPath + '.tmp', indexPath);
        imported = next;
      }
      const { file, filename, ...asset } = find(id, kind); res.json(asset);
    } catch (error) { res.status(400).json({ error: error.message || 'Archivo no válido.' }); }
  }));
  return { find, validate };
}
module.exports = { createSongAssets, inspectSongAsset };
