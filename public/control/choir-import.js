import { request } from './api.js';

const input = document.getElementById('choirImportFile');
const mode = document.getElementById('choirImportMode');
const button = document.getElementById('choirImportButton');
const status = document.getElementById('choirImportStatus');
const catalog = document.getElementById('catalogTransferType');
document.getElementById('catalogExportButton').addEventListener('click', () => {
  window.location.assign('/api/library/' + catalog.value + '/export');
});

button.addEventListener('click', async () => {
  const file = input.files[0];
  if (!file) { status.textContent = 'Elige un archivo JSON.'; return; }
  if (file.size > 8 * 1024 * 1024) { status.textContent = 'El archivo puede pesar hasta 8 MB.'; return; }
  const replace = mode.value === 'replace';
  if (replace && !confirm('¿Reemplazar el catálogo seleccionado con este archivo? Se guardará un respaldo del catálogo anterior.')) return;
  button.disabled = true;
  status.textContent = 'Validando el catálogo…';
  try {
    const response = await request('/api/library/' + catalog.value + '/import?mode=' + (replace ? 'replace' : 'append'), {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file
    });
    const result = await response.json();
    status.textContent = `Cantos importados: ${result.imported}. Total del catálogo: ${result.total}.`;
    input.value = '';
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
