const fs = require('fs');
const path = require('path');
const { prepareDatabase, compareAlphabetical } = require('./search');

function createCatalogRepository({ dataDir: DATA_DIR, factoryDir = path.join(DATA_DIR, 'factory'), watchFiles = true }) {
  let himnario = [];
  let coro = [];

  const FACTORY_DIR = factoryDir;
  const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(FACTORY_DIR)) fs.mkdirSync(FACTORY_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  function ensureFactoryCopies() {
    try {
      const himnarioPath = path.join(DATA_DIR, 'himnario_lldm.json');
      const factoryHimnario = path.join(FACTORY_DIR, 'himnario_lldm.json');
      if (!fs.existsSync(himnarioPath) && fs.existsSync(factoryHimnario)) fs.copyFileSync(factoryHimnario, himnarioPath, fs.constants.COPYFILE_EXCL);
      if (fs.existsSync(himnarioPath) && !fs.existsSync(factoryHimnario)) {
        fs.copyFileSync(himnarioPath, factoryHimnario);
        console.log('[FACTORY] Copia de fábrica de himnario inicializada.');
      }
      const coroPath = path.join(DATA_DIR, 'coro_lldm.json');
      const factoryCoro = path.join(FACTORY_DIR, 'coro_lldm.json');
      if (!fs.existsSync(coroPath) && fs.existsSync(factoryCoro)) fs.copyFileSync(factoryCoro, coroPath, fs.constants.COPYFILE_EXCL);
      if (fs.existsSync(coroPath) && !fs.existsSync(factoryCoro)) {
        fs.copyFileSync(coroPath, factoryCoro);
        console.log('[FACTORY] Copia de fábrica de coro inicializada.');
      }
    } catch (err) {
      console.error('[FACTORY ERROR] Error inicializando copias de fábrica:', err);
    }
  }
  ensureFactoryCopies();

  function saveCatalogToDisk(catalogType, list, { requireBackup = false } = {}) {
    const isCoro = catalogType === 'coro' || catalogType === 'choir';
    const fileName = isCoro ? 'coro_lldm.json' : 'himnario_lldm.json';
    const filePath = path.join(DATA_DIR, fileName);

    // 1. Respaldo rotativo en data/backups/
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${isCoro ? 'coro' : 'himnario'}_${ts}.json`;
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, path.join(BACKUPS_DIR, backupName));
      }
      const oldBackups = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith(isCoro ? 'coro_' : 'himnario_') && f.endsWith('.json'))
        .sort();
      while (oldBackups.length > 10) {
        const rm = oldBackups.shift();
        try { fs.unlinkSync(path.join(BACKUPS_DIR, rm)); } catch (_) {}
      }
    } catch (bkErr) {
      if (requireBackup) throw new Error('No se pudo respaldar el catálogo. La importación se canceló.');
      console.warn('[BACKUP] Error al respaldar catálogo:', bkErr);
    }

    // 2. Limpiar propiedades de indexación antes de persistir
    if (isCoro) {
      list.sort((a, b) => compareAlphabetical(a.title, b.title));
    }

    const cleanData = list.map(item => {
      const clean = { ...item };
      delete clean._idx;
      delete clean._summary;
      return clean;
    });

    // 3. Escritura física persistente en disco (UTF-8)
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(cleanData, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
    console.log(`[DATA] Base de datos ${fileName} guardada físicamente en disco (${cleanData.length} cantos).`);
  }

  function loadHimnarioDatabase() {
    try {
      const himnarioPath = path.join(DATA_DIR, 'himnario_lldm.json');
      if (fs.existsSync(himnarioPath)) {
        himnario = JSON.parse(fs.readFileSync(himnarioPath, 'utf-8'));
        prepareDatabase(himnario);
        console.log(`[DATA] Himnario LLDM cargado e indexado: ${himnario.length} cantos.`);
      }
    } catch (err) {
      console.error('[DATA ERROR] Error cargando himnario:', err);
    }
  }

  function loadCoroDatabase() {
    try {
      const coroPath = path.join(DATA_DIR, 'coro_lldm.json');
      if (fs.existsSync(coroPath)) {
        coro = JSON.parse(fs.readFileSync(coroPath, 'utf-8'));
        coro.sort((a, b) => compareAlphabetical(a.title, b.title));
        prepareDatabase(coro);
        console.log(`[DATA] Cantos del Coro LLDM cargados e indexados: ${coro.length} cantos.`);
      }
    } catch (err) {
      console.error('[DATA ERROR] Error cargando cantos del coro:', err);
    }
  }

  loadHimnarioDatabase();
  loadCoroDatabase();

  // Hot-reload de bases de datos si se edita el archivo en disco
  try {
    const coroFilePath = path.join(DATA_DIR, 'coro_lldm.json');
    if (watchFiles && fs.existsSync(coroFilePath)) {
      fs.watchFile(coroFilePath, { interval: 2000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          console.log('[DATA] Cambio detectado en coro_lldm.json. Recargando en memoria...');
          loadCoroDatabase();
        }
      });
    }
    const himnarioFilePath = path.join(DATA_DIR, 'himnario_lldm.json');
    if (watchFiles && fs.existsSync(himnarioFilePath)) {
      fs.watchFile(himnarioFilePath, { interval: 2000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          console.log('[DATA] Cambio detectado en himnario_lldm.json. Recargando en memoria...');
          loadHimnarioDatabase();
        }
      });
    }
  } catch (e) {
    console.warn('[DATA] No se pudo activar watchers:', e);
  }

  // 2. MOTOR DE PAGINACIÓN INTELIGENTE POR LÍNEAS REALES RENDERIZADAS

  return {
    get himnario() { return himnario; }, get coro() { return coro; },
    factoryDir: FACTORY_DIR, saveCatalogToDisk, loadCoroDatabase,
    close() {
      if (!watchFiles) return;
      fs.unwatchFile(path.join(DATA_DIR, 'coro_lldm.json'));
      fs.unwatchFile(path.join(DATA_DIR, 'himnario_lldm.json'));
    }
  };
}

module.exports = { createCatalogRepository };
