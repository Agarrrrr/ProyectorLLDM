// Recarga sola cada pantalla (cabina, celulares, TV y OBS) cuando el servidor se reinicia o se actualiza.
(() => {
  if (window.top !== window) return; // las vistas previas incrustadas no se recargan por su cuenta
  let known;
  async function check() {
    try {
      const response = await fetch('/api/build', { cache: 'no-store' });
      if (!response.ok) return;
      const { id } = await response.json();
      if (known === undefined) known = id;
      else if (id !== known) location.reload();
    } catch { /* servidor apagado o reiniciando: se reintenta */ }
  }
  check();
  setInterval(check, 4000);
})();
