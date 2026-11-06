import { request } from './api.js';

const create = document.getElementById('createMobileQr');
const revoke = document.getElementById('revokeMobileSessions');
const qr = document.getElementById('mobileQrImage');
const status = document.getElementById('mobileQrStatus');
const sessions = document.getElementById('mobileSessions');
const settings = document.getElementById('settingsDialog');
const hotspotBtn = document.getElementById('openHotspotButton');
let timer;

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function hideCode() {
  clearTimeout(timer);
  if (qr) {
    qr.hidden = true;
    qr.removeAttribute('src');
  }
}

export async function loadSessions() {
  if (!sessions || !status) return;
  try {
    const response = await request('/api/mobile/sessions');
    const devices = await response.json();
    sessions.replaceChildren();
    for (const device of devices) {
      const row = document.createElement('li');
      row.className = 'mobile-session-item';
      
      const info = document.createElement('div');
      info.className = 'mobile-session-info';
      
      const icon = document.createElement('span');
      icon.className = 'mobile-session-icon';
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>';
      
      const name = document.createElement('span');
      name.className = 'mobile-session-name';
      name.textContent = device.label;

      info.append(icon, name);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-secondary btn-disconnect';
      button.textContent = 'Desconectar';
      button.setAttribute('aria-label', 'Desconectar ' + device.label);
      button.addEventListener('click', () => run(async () => {
        await request('/api/mobile/sessions/' + encodeURIComponent(device.id), { method: 'DELETE' });
        status.textContent = 'Dispositivo desconectado.';
        await loadSessions();
      }));

      row.append(info, button);
      sessions.append(row);
    }
    if (!devices.length) {
      const empty = document.createElement('li');
      empty.className = 'mobile-session-empty';
      empty.textContent = 'No hay celulares enlazados actualmente.';
      sessions.append(empty);
    }
  } catch (error) {
    sessions.replaceChildren();
    status.textContent = error.status === 403 ? 'Administra los dispositivos desde la PC.' : error.message;
  }
}

export async function generateQr() {
  await run(async () => {
    const response = await request('/api/mobile/invite', { method: 'POST' });
    const result = await response.json();
    if (!settings?.open) return;
    qr.src = result.qr;
    qr.hidden = false;
    status.innerHTML = 'Apunta la cámara de tu celular al código QR para conectar.';
    timer = setTimeout(() => {
      hideCode();
      status.textContent = 'El código QR venció. Pulsa «Generar QR» para crear uno nuevo.';
    }, Math.max(0, result.expires - Date.now()));
  });
}

window.addEventListener('generate-mobile-qr', () => {
  void loadSessions();
  void generateQr();
});

window.addEventListener('wifi-tab-activated', () => {
  void loadSessions();
  if (qr && qr.hidden) void generateQr();
});

window.addEventListener('mobile-device-joined', (event) => {
  hideCode();
  const device = event.detail;
  const name = device?.label || 'Dispositivo';
  if (status) {
    status.innerHTML = `<span style="color: #4ade80; font-size: 15px; font-weight: 700;">✓ ¡Dispositivo conectado con éxito: «${escapeHtml(name)}»!</span>`;
  }
  void loadSessions();
});

settings?.addEventListener('close', () => { hideCode(); });
document.getElementById('refreshMobileSessions')?.addEventListener('click', loadSessions);

hotspotBtn?.addEventListener('click', async () => {
  try {
    const res = await request('/api/mobile/open-hotspot', { method: 'POST' });
    if (res.ok && status) {
      status.textContent = 'Se abrió la configuración de Zona Wi-Fi móvil en la computadora.';
    }
  } catch {
    if (status) status.textContent = 'No se pudo abrir la configuración del Hotspot.';
  }
});

async function run(action) {
  hideCode();
  if (create) create.disabled = true;
  if (revoke) revoke.disabled = true;
  try { await action(); }
  catch (error) { if (status) status.textContent = error.message; }
  finally {
    if (create) create.disabled = false;
    if (revoke) revoke.disabled = false;
  }
}

create?.addEventListener('click', generateQr);
revoke?.addEventListener('click', () => {
  if (!confirm('¿Desconectar los celulares enlazados a esta cabina?')) return;
  void run(async () => {
    await request('/api/mobile/sessions', { method: 'DELETE' });
    status.textContent = 'Los celulares se desconectaron.';
    await loadSessions();
  });
});
