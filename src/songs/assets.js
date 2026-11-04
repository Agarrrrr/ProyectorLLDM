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
    return { extension, name: parsed.fullName || parsed.familyName, weight: parsed.variationAxes?.wght?.default || 800 };
  }
  const weight = 800;
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: '.png', weight };
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { extension: '.jpg', weight };
  if (buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return { extension: '.webp', weight };
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
    builtin.push({ id: 'preset-' + id, name, kind: 'image', url: '/graphics/song-backgrounds/' + id + '.svg' });
  }
  function all() { return [...builtin, ...imported.map(asset => ({ ...asset, file: path.join(directory, asset.filename), url: '/song-assets/' + asset.filename }))]; }
  function find(id, kind) { return all().find(asset => asset.id === id && asset.kind === kind); }
  function validate(lyrics) {
    for (const value of Object.values(lyrics)) {
      if (!find(value.font, 'font')) throw new Error('La fuente seleccionada no está disponible.');
      if (!['original', 'solid'].includes(value.background) && !find(value.background, 'image')) throw new Error('El fondo seleccionado no está disponible.');
    }
  }
  app.get('/api/song-assets', (req, res) => res.json(all().map(({ file, filename, ...asset }) => asset)));
  app.get('/song-assets/:filename', (req, res) => {
    const asset = imported.find(value => value.filename === req.params.filename);
    if (!asset) return res.sendStatus(404);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(asset.filename, { root: directory });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } }).single('file');
  app.post('/api/song-assets/:kind', (req, res, next) => upload(req, res, error => {
    if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo debe pesar como máximo 8 MB.' : 'No se pudo cargar el archivo.' });
    try {
      const kind = req.params.kind;
      if (!req.file || !['font', 'image'].includes(kind)) return res.status(400).json({ error: 'Selecciona una fuente o una imagen.' });
      const buffer = req.file.buffer;
      const originalName = path.basename(req.file.originalname).replace(/[\x00-\x1f]/g, '').slice(0, 120);
      const { extension, weight, name = originalName } = inspectSongAsset(kind, originalName, buffer);
      const id = kind + '-' + crypto.createHash('sha256').update(buffer).digest('hex').slice(0,24);
      if (!imported.some(asset => asset.id === id)) {
        const asset = { id, name, kind, weight, filename: id + extension };
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
