import { request } from './api.js';

const get = id => document.getElementById(id);
const fileInput = get('backupFile');
const inspect = get('backupInspect');
const restore = get('backupRestore');
const cancel = get('backupCancel');
const status = get('backupStatus');
const choices = get('backupSectionChoices');
const sectionLabels = {
  settings: 'Ajustes, fuentes y fondos',
  hymn: 'Himnario',
  choir: 'Coro',
  lists: 'Listas e historial',
  presentations: 'Presentaciones'
};
let preview;
const pendingMessage = 'Restauración preparada. Cierra y vuelve a iniciar Proyector en la PC cuando termines de usar la cabina.';

function showPending(pending) {
  cancel.hidden = !pending;
  fileInput.disabled = inspect.disabled = pending;
  if (pending) status.textContent = pendingMessage;
}

get('backupPanel').addEventListener('toggle', async event => {
  if (!event.currentTarget.open) return;
  try {
    const result = await (await request('/api/backup/status')).json();
    if (!inspect.disabled || !cancel.hidden) showPending(result.pending);
  } catch (error) {
    status.textContent = error.message;
    get('backupDownload').disabled = inspect.disabled = fileInput.disabled = true;
  }
});

cancel.addEventListener('click', async () => {
  cancel.disabled = true;
  try {
    await request('/api/backup/restore', { method: 'DELETE' });
    showPending(false);
    status.textContent = 'Restauración cancelada.';
  } catch (error) { status.textContent = error.message; }
  finally { cancel.disabled = false; }
});

function clearPreview() {
  preview = null;
  choices.replaceChildren();
  get('backupSections').hidden = true;
  restore.hidden = true;
}

fileInput.addEventListener('change', clearPreview);
get('backupDownload').addEventListener('click', () => {
  window.location.assign('/api/backup?presentations=' + (get('backupPresentations').checked ? '1' : '0'));
});

inspect.addEventListener('click', async () => {
  clearPreview();
  const file = fileInput.files[0];
  if (!file || file.size > 256 * 1024 * 1024) {
    status.textContent = 'Elige un ZIP de hasta 256 MiB.';
    return;
  }
  inspect.disabled = fileInput.disabled = true;
  status.textContent = 'Revisando el respaldo…';
  try {
    const response = await request('/api/backup/inspect', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file
    });
    preview = await response.json();
    for (const section of preview.sections) {
      const label = document.createElement('label');
      label.className = 'backup-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = section;
      input.checked = true;
      label.append(input, sectionLabels[section]);
      choices.append(label);
    }
    get('backupSections').hidden = false;
    restore.hidden = false;
    status.textContent = 'Elige qué secciones quieres recuperar.';
  } catch (error) { status.textContent = error.message; }
  finally { inspect.disabled = fileInput.disabled = false; }
});

restore.addEventListener('click', async () => {
  const sections = [...choices.querySelectorAll('input:checked')].map(input => input.value);
  if (!sections.length) { status.textContent = 'Selecciona al menos una sección.'; return; }
  if (!confirm('¿Reemplazar los datos de las secciones elegidas al reiniciar Proyector? Se conservará una copia de los datos anteriores.')) return;
  restore.disabled = inspect.disabled = fileInput.disabled = true;
  try {
    await request('/api/backup/restore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: preview.token, sections })
    });
    clearPreview();
    fileInput.value = '';
    showPending(true);
  } catch (error) { status.textContent = error.message; }
  finally { restore.disabled = false; inspect.disabled = fileInput.disabled = !cancel.hidden; }
});
