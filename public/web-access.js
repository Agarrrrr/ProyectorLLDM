const form = document.getElementById('web-access');
const view = document.getElementById('web-view');
const key = document.getElementById('web-key');
const status = document.getElementById('web-status');
const button = form.querySelector('button');
const destination = new URLSearchParams(location.search).get('destino');
if ([...view.options].some(option => option.value === destination)) view.value = destination;

async function enter() {
  button.disabled = true;
  status.textContent = 'Abriendo la vista…';
  try {
    const response = await fetch('/api/web/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.value, destination: view.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo abrir la vista.');
    location.replace(result.destination);
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  void enter();
});
const linkKey = location.hash.slice(1);
if (linkKey) {
  history.replaceState(null, '', location.pathname + location.search);
  key.value = linkKey;
  void enter();
}
