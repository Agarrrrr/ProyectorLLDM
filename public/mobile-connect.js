const button = document.getElementById('connect-mobile');
const form = document.getElementById('connect-form');
const nameInput = document.getElementById('device-name');
const status = document.getElementById('connect-status');
const code = location.hash.slice(1);

function detectDeviceLabel() {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) {
    const match = ua.match(/;\s*([^;)]+?)\s+Build/i);
    if (match && match[1]) {
      const clean = match[1].replace(/^[A-Za-z0-9_-]+_/g, '').trim();
      if (clean.length > 0 && clean.length <= 20) return clean;
    }
    return 'Celular Android';
  }
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'PC Windows';
  return 'Celular';
}

if (/^[\w-]{43}$/.test(code)) {
  history.replaceState(null, '', location.pathname);
  status.textContent = 'Comprueba que estás en la misma red Wi-Fi que la PC del templo.';
  form.hidden = false;
  if (!nameInput.value) {
    nameInput.value = detectDeviceLabel();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const label = nameInput.value.trim() || detectDeviceLabel();
    button.disabled = true;
    status.textContent = 'Conectando a la cabina…';
    try {
      const response = await fetch('/api/mobile/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, label })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo conectar.');
      }
      location.replace('/control');
    } catch (error) {
      status.textContent = error.message || 'No se pudo conectar. Escanea un QR nuevo.';
      button.disabled = false;
    }
  });
}
