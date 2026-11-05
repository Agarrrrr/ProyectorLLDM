const path = require('node:path');
const fs = require('node:fs');
const { createApplication } = require('./src/app');

const { PROYECTOR_PUBLIC_ORIGIN, PROYECTOR_OPERATOR_KEY, PROYECTOR_OUTPUT_KEY, PROYECTOR_STORAGE } = process.env;
if (!PROYECTOR_PUBLIC_ORIGIN || !PROYECTOR_STORAGE || !path.isAbsolute(PROYECTOR_STORAGE)) {
  throw new Error('Configura PROYECTOR_PUBLIC_ORIGIN y una ruta absoluta en PROYECTOR_STORAGE.');
}
const dataDir = path.join(PROYECTOR_STORAGE, 'data');
const uploadsDir = path.join(PROYECTOR_STORAGE, 'presentations');
const factoryDir = path.join(dataDir, 'factory');
fs.mkdirSync(factoryDir, { recursive: true });
for (const catalog of ['himnario_lldm.json', 'coro_lldm.json']) {
  try {
    fs.copyFileSync(path.join(__dirname, 'data', 'factory', catalog), path.join(factoryDir, catalog), fs.constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
const application = createApplication({
  dataDir,
  uploadsDir,
  watchFiles: false,
  obs: false,
  host: process.env.PROYECTOR_BIND || '127.0.0.1',
  hosted: { origin: PROYECTOR_PUBLIC_ORIGIN, operatorKey: PROYECTOR_OPERATOR_KEY, outputKey: PROYECTOR_OUTPUT_KEY }
});
application.start();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await application.close(); process.exit(0); });
}
