const net = require('node:net');
const { execFile } = require('node:child_process');

function openBrowser(port) {
  if (process.env.PROYECTOR_OPEN_BROWSER !== '1') return;
  const url = `http://localhost:${port}/control`;
  const [cmd, args] = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  execFile(cmd, args, { windowsHide: true }, error => {
    if (error) console.warn(`[INICIO] Abre ${url} en tu navegador.`);
  });
}

function portInUse(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = result => { socket.destroy(); resolve(result); };
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false));
    socket.setTimeout(800, () => finish(false));
  });
}
async function start() {
  const port = Number(process.env.PORT) || 4000;
  if (await portInUse(port)) {
    console.log(`[INICIO] El puerto ${port} ya está en uso. No se iniciará otra instancia ni se actualizarán sus archivos.`);
    console.log(`Si Proyector ya está abierto, entra a http://localhost:${port}/control`); openBrowser(port); return;
  }
  const { createUpdateService } = require('./src/updates/service');
  const updater = createUpdateService({ rootDir: __dirname });
  const result = await updater.checkAtStartup();
  console.log('[ACTUALIZACIONES]', result.message, result.downloadUrl || '');
  const { createApplication } = require('./src/app');
  const application = createApplication({ onStarted: openBrowser, updatesService: updater });
  application.start();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await application.close(); process.exit(0); });
}
start().catch(error => { console.error('[INICIO]', error.message); process.exitCode = 1; });
