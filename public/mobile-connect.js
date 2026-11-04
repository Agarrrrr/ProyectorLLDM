const button = document.getElementById('connect-mobile');
const form = document.getElementById('connect-form');
const nameInput = document.getElementById('device-name');
const status = document.getElementById('connect-status');
const code = location.hash.slice(1);

if (/^[\w-]{43}$/.test(code)) {
  history.replaceState(null, '', location.pathname);
  status.textContent = 'Comprueba que estás en la misma red que la PC del templo.';
  form.hidden = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const label = nameInput.value.trim();
    if (!label) { status.textContent = 'Escribe un nombre para este dispositivo.'; nameInput.focus(); return; }
    button.disabled = true;
    status.textContent = 'Conectando…';
    try {
      const response = await fetch('/api/mobile/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, label })
      });
      if (!response.ok) throw new Error((await response.json()).error);
      location.replace('/control');
    } catch (error) {
      status.textContent = error.message || 'No se pudo conectar. Escanea un QR nuevo.';
      button.disabled = false;
    }
  });
}
