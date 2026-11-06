import { request } from './api.js';

const create = document.getElementById('createMobileQr');
const revoke = document.getElementById('revokeMobileSessions');
const qr = document.getElementById('mobileQrImage');
const status = document.getElementById('mobileQrStatus');
const sessions = document.getElementById('mobileSessions');
const panel = create.closest('details');
const settings = document.getElementById('settingsDialog');
let timer;

function hideCode() {
  clearTimeout(timer);
  qr.hidden = true;
  qr.removeAttribute('src');
}
async function loadSessions() {
  try {
    const response = await request('/api/mobile/sessions');
    const devices = await response.json();
    sessions.replaceChildren();
    for (const device of devices) {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = device.label;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Desconectar';
      button.setAttribute('aria-label', 'Desconectar ' + device.label);
      button.addEventListener('click', () => run(async () => {
        await request('/api/mobile/sessions/' + encodeURIComponent(device.id), { method: 'DELETE' });
        status.textContent = 'Dispositivo desconectado.';
        await loadSessions();
      }));
      row.append(name, button);
      sessions.append(row);
    }
    if (!devices.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No hay dispositivos enlazados.';
      sessions.append(empty);
    }
  } catch (error) {
    sessions.replaceChildren();
    status.textContent = error.status === 403 ? 'Administra los dispositivos desde la PC.' : error.message;
  }
}
panel.addEventListener('toggle', () => {
  if (panel.open) void loadSessions();
  else hideCode();
});
settings.addEventListener('close', () => { panel.open = false; hideCode(); });
document.getElementById('refreshMobileSessions').addEventListener('click', loadSessions);
async function run(action) {
  hideCode();
  create.disabled = revoke.disabled = true;
  try { await action(); }
  catch (error) { status.textContent = error.message; }
  finally { create.disabled = revoke.disabled = false; }
}

create.addEventListener('click', () => run(async () => {
  const response = await request('/api/mobile/invite', { method: 'POST' });
  const result = await response.json();
  if (!settings.open || !panel.open) return;
  qr.src = result.qr;
  qr.hidden = false;
  status.textContent = 'Escanea el código desde el celular.';
  timer = setTimeout(() => {
    hideCode();
    status.textContent = 'El QR venció. Genera otro para conectar un dispositivo.';
  }, Math.max(0, result.expires - Date.now()));
}));
revoke.addEventListener('click', () => {
  if (!confirm('¿Desconectar los celulares enlazados a esta cabina?')) return;
  void run(async () => {
    await request('/api/mobile/sessions', { method: 'DELETE' });
    status.textContent = 'Los celulares se desconectaron.';
    await loadSessions();
  });
});
