const fs = require('node:fs');
const path = require('node:path');

const defaultRepository = 'HuriTolentino/ProyectorLLDM';

function stableVersion(value) {
  if (typeof value !== 'string') return null;
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match && match.slice(1).map(Number);
}

function isNewer(candidate, installed) {
  const next = stableVersion(candidate), current = stableVersion(installed);
  if (!next || !current) return false;
  const difference = next.findIndex((part, index) => part !== current[index]);
  return difference !== -1 && next[difference] > current[difference];
}

function createUpdateService({ rootDir, dataDir = path.join(rootDir, 'data'), fetchRelease = fetch, installed = false }) {
  const preferencesFile = path.join(dataDir, 'update-preferences.json');
  const current = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
  let repository = defaultRepository;
  try {
    const configured = JSON.parse(fs.readFileSync(path.join(rootDir, 'config', 'releases.json'), 'utf8')).repository;
    if (typeof configured === 'string' && /^[\w.-]+\/[\w.-]+$/.test(configured)) repository = configured;
  } catch {}
  let automaticChecks = true;
  try { automaticChecks = JSON.parse(fs.readFileSync(preferencesFile, 'utf8'))?.automaticChecks !== false; } catch {}
  let status = { current, available: false, message: 'Sin consulta de versión todavía.' };
  let startupCheck;
  let checkId = 0;
  function snapshot() { return { ...status, installed, preferences: { automaticChecks } }; }

  async function check() {
    const id = ++checkId;
    const finish = (message, extra = {}) => {
      if (id === checkId) status = { current, available: false, checkedAt: new Date().toISOString(), message, ...extra };
      return snapshot();
    };
    if (!automaticChecks) return finish('Aviso de nuevas versiones desactivado.');
    status = { current, available: false, checking: true, message: 'Buscando una versión nueva…' };
    try {
      const response = await fetchRelease('https://api.github.com/repos/' + repository + '/releases/latest', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Proyector-LLDM' },
        signal: AbortSignal.timeout(3500), redirect: 'error'
      });
      if (response.status === 404) return finish('No hay una versión pública disponible para descargar.');
      if (!response.ok) throw new Error('Consulta no disponible');
      const release = await response.json();
      const tag = release.tag_name;
      if (!stableVersion(tag)) throw new Error('Versión inválida');
      if (release.draft || release.prerelease || !isNewer(tag, current)) return finish('Esta instalación está al día.');
      const releaseBase = 'https://github.com/' + repository + '/releases/';
      let downloadUrl = releaseBase + 'tag/' + tag;
      if (installed) {
        const assetName = 'Proyector-LLDM-Setup-' + tag.replace(/^v/, '') + '.exe';
        const hasInstaller = Array.isArray(release.assets) &&
          release.assets.some(asset => asset?.name === assetName && asset.state === 'uploaded' && asset.size > 0);
        if (!hasInstaller) return finish('La nueva versión aún no tiene un instalador de Windows disponible.');
        downloadUrl = releaseBase + 'download/' + tag + '/' + assetName;
      }
      return finish(installed ? 'Hay una versión nueva. Descarga el instalador y ejecútalo cuando termines de usar la cabina.' :
        'Hay una versión nueva disponible para descargar.', {
        latest: tag, available: true, downloadUrl,
        patchNotes: typeof release.body === 'string' ? release.body.slice(0, 24000) : ''
      });
    } catch {
      return finish('No se pudo comprobar si hay una versión nueva. Puedes seguir usando la cabina.');
    }
  }

  function configure(value) {
    if (typeof value?.automaticChecks !== 'boolean') throw Object.assign(new Error('Opción de actualización no válida.'), { status: 400 });
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(preferencesFile + '.tmp', JSON.stringify({ automaticChecks: value.automaticChecks }, null, 2));
    fs.renameSync(preferencesFile + '.tmp', preferencesFile);
    if (automaticChecks !== value.automaticChecks) {
      automaticChecks = value.automaticChecks;
      startupCheck = check();
    }
    return snapshot();
  }

  return { snapshot, configure, checkAtStartup: () => startupCheck ??= check() };
}

module.exports = { createUpdateService };
