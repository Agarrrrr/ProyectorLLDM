const fs = require('node:fs');
const path = require('node:path');

const defaultRepository = 'HuriTolentino/ProyectorLLDM';

function stableVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match && match.slice(1).map(Number);
}

function isNewer(candidate, installed) {
  const next = stableVersion(candidate), current = stableVersion(installed);
  if (!next || !current) return false;
  const difference = next.findIndex((part, index) => part !== current[index]);
  return difference !== -1 && next[difference] > current[difference];
}

function createUpdateService({ rootDir, dataDir = path.join(rootDir, 'data'), fetchRelease = fetch }) {
  const preferencesFile = path.join(dataDir, 'update-preferences.json');
  const current = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
  let releaseRepository = defaultRepository;
  try {
    const configured = JSON.parse(fs.readFileSync(path.join(rootDir, 'config', 'releases.json'), 'utf8')).repository;
    if (typeof configured === 'string' && /^[\w.-]+\/[\w.-]+$/.test(configured)) releaseRepository = configured;
  } catch {}
  let automaticChecks = true;
  try { automaticChecks = JSON.parse(fs.readFileSync(preferencesFile, 'utf8'))?.automaticChecks !== false; } catch {}
  let status = { current, available: false, message: 'Sin consulta de versión todavía.' };
  let startupCheck;
  function snapshot() { return { ...status, preferences: { automaticChecks } }; }

  async function check() {
    if (!automaticChecks) {
      status.message = 'Consulta al iniciar desactivada.';
      return snapshot();
    }
    try {
      const response = await fetchRelease('https://api.github.com/repos/' + releaseRepository + '/releases/latest', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Proyector-LLDM' },
        signal: AbortSignal.timeout(3500), redirect: 'error'
      });
      if (response.status === 404) {
        status.message = 'No hay una versión pública disponible para descargar.';
      } else {
        if (!response.ok) throw new Error('Consulta no disponible');
        const release = await response.json();
        const tag = release.tag_name;
        if (typeof tag !== 'string' || !stableVersion(tag)) throw new Error('Versión inválida');
        const available = !release.draft && !release.prerelease && isNewer(tag, current);
        if (available) {
          status = {
            current, latest: tag, available, downloadUrl: 'https://github.com/' + releaseRepository + '/releases/tag/' + tag,
            patchNotes: typeof release.body === 'string' ? release.body.slice(0, 24000) : '',
            message: 'Hay una versión nueva disponible para descargar.'
          };
        } else status.message = 'Esta instalación está al día.';
      }
    } catch { status.message = 'No se pudo comprobar si hay una versión nueva. Puedes seguir usando la cabina.'; }
    status.checkedAt = new Date().toISOString();
    return snapshot();
  }

  function configure(value) {
    if (typeof value?.automaticChecks !== 'boolean') throw Object.assign(new Error('Opción de actualización no válida.'), { status: 400 });
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(preferencesFile + '.tmp', JSON.stringify({ automaticChecks: value.automaticChecks }, null, 2));
    fs.renameSync(preferencesFile + '.tmp', preferencesFile);
    automaticChecks = value.automaticChecks;
    return snapshot();
  }

  return { snapshot, configure, checkAtStartup: () => startupCheck ??= check() };
}

module.exports = { createUpdateService };
