// Configuracion de intervalos aleatorios (entre 15 y 30 minutos)
const MIN_MINUTES = 15;
const MAX_MINUTES = 30;

const stage = document.getElementById('stage');
let timerId = null;

// Disparar la animacion del destello
function triggerDestello() {
  if (document.documentElement.dataset.animateLogo === 'false') return;
  stage.classList.remove('trigger-gleam');
  void stage.offsetWidth; // Forzar reflow en el navegador
  stage.classList.add('trigger-gleam');

  setTimeout(() => {
    stage.classList.remove('trigger-gleam');
  }, 3000);
}

window.addEventListener('graphics-changed', ({ detail }) => {
  if (detail.animateLogo === false) stage.classList.remove('trigger-gleam');
});

// Programar el siguiente destello aleatorio entre 15 y 30 minutos
function scheduleNextDestello() {
  const randomMinutes = Math.random() * (MAX_MINUTES - MIN_MINUTES) + MIN_MINUTES;
  const delayMs = randomMinutes * 60 * 1000;

  console.log(`[Fondo Pantallas] Proximo destello en ${randomMinutes.toFixed(1)} minutos (${Math.round(delayMs / 1000)}s)`);

  if (timerId) clearTimeout(timerId);
  timerId = setTimeout(() => {
    triggerDestello();
    scheduleNextDestello();
  }, delayMs);
}

// Destello inicial de confirmacion a los 4 segundos tras cargar
setTimeout(() => {
  triggerDestello();
  scheduleNextDestello();
}, 4000);

// Atajo de teclado discreto: Barra espaciadora para pruebas internas sin ensuciar la pantalla en OBS
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerDestello();
  }
});
