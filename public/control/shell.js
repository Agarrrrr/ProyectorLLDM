
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");
  if (!toast || !toastText) return;
  toastText.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// ==============================================================
// 4. CONTROL DE PESTAÑAS (TABS)
// ==============================================================
const tabItems = document.querySelectorAll('.tab-item');
const tabPanes = document.querySelectorAll('.tab-pane');

tabItems.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.getAttribute('data-tab');
    window.dispatchEvent(new CustomEvent('content-tab-changed', { detail: targetId }));
    tabItems.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tabPanes.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
      targetPane.classList.add('active');
      if (targetId === 'tab-himnario') {
        const hi = document.getElementById('hymnSearchInput');
        if (hi && matchMedia('(hover: hover) and (pointer: fine)').matches) hi.focus();
      } else if (targetId === 'tab-coro') {
        const ci = document.getElementById('choirSearchInput');
        if (ci && matchMedia('(hover: hover) and (pointer: fine)').matches) ci.focus();
      } else if (targetId === 'tab-biblia') {
        const bi = document.getElementById('themeInput');
        if (bi && matchMedia('(hover: hover) and (pointer: fine)').matches) bi.focus();
      } else if (targetId === 'tab-presentacion') {
        const pi = document.getElementById('presentationSearchInput');
        if (pi && matchMedia('(hover: hover) and (pointer: fine)').matches) pi.focus();

      }
    }
  });
});

// ==============================================================
// 5. DATOS Y LÓGICA DE LA BIBLIA (SOLO CITAS PERMITIDAS)
// ==============================================================

export { showToast };

for (const [index, tab] of [...tabItems].entries()) {
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabItems.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabItems.length) % tabItems.length;
    tabItems[next].click();
    tabItems[next].focus();
  });
}
