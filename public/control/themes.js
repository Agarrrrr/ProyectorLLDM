import { getSettings } from './settings-state.js';
import { broadcastToOverlay, hideOverlay } from './transmission.js';
import { showToast } from './shell.js';
import { addThemeToHistory } from './bible.js';
import { request } from './api.js';

function formatThemeText(rawThemeText) {
  let capitalizeNext = true;
  return rawThemeText.split(/\s+/).map((word) => {
    let processedWord = word.toLowerCase();
    if (processedWord.length > 3 || capitalizeNext) {
      processedWord = processedWord.charAt(0).toUpperCase() + processedWord.slice(1);
    }
    capitalizeNext = processedWord.endsWith(':') || processedWord === ':';
    return processedWord;
  }).join(' ');
}

document.getElementById("generateThemeButton").addEventListener("click", async () => {
  const rawVal = document.getElementById("themeInput").value.trim();
  if (!rawVal) {
    showToast("Escribe un tema de doctrina");
    return;
  }
  document.activeElement.blur();
  const val = formatThemeText(rawVal);
  document.getElementById("themeInput").value = val;
  addThemeToHistory(val);

  await request('/api/project/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: val })
  });
  showToast(`Tema Proyectado en Pantalla: ${val}`);
});

document.getElementById("broadcastThemeOverlayButton").addEventListener("click", () => {
  const rawVal = document.getElementById("themeInput").value.trim();
  if (!rawVal) {
    showToast("Escribe un tema de doctrina");
    return;
  }
  const val = formatThemeText(rawVal);
  document.getElementById("themeInput").value = val;
  addThemeToHistory(val);
  broadcastToOverlay({ type: 'theme', theme: val, fullText: val });
  showToast(`Banner en Cámaras OBS: ${val}`);
});

document.getElementById("themeInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("generateThemeButton").click();
  }
});

document.getElementById("clearThemeButton").addEventListener("click", () => {
  const el = document.getElementById("themeInput");
  if (el) {
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

// ==============================================================
// CENTRO DE TRANSMISIÓN OBS: MÓDULOS DE BANNERS Y ESTADO EN VIVO
// ==============================================================

// MÓDULO 2: CANTO DEL CORO
const choirInput = document.getElementById("choirCustomInput");
document.getElementById("generateChoirButton")?.addEventListener("click", () => {
  const rawInput = (choirInput?.value || document.getElementById("customTextInput")?.value || "").trim();
  let songTitle = rawInput.replace(/^(?:(?:el\s+)?coro(?:\s+canta)?|canto\s*(?:de|del)?\s*coro|himno\s*(?:de|del)?\s*coro)\s*[:-]?\s*/i, '').trim();
  if (/^[a-z]/i.test(songTitle)) {
    songTitle = songTitle.charAt(0).toUpperCase() + songTitle.slice(1);
  }
  const hasTitle = Boolean(songTitle);
  const mainTitle = hasTitle ? songTitle : "El Coro Canta";
  const headerTag = "CORO DE LA IGLESIA";
  const obsText = hasTitle ? `Coro: ${mainTitle}` : "El Coro Canta";

  const payload = {
    type: 'custom',
    tag: headerTag,
    text: mainTitle,
    fullText: obsText
  };
  broadcastToOverlay(payload);
  showToast(`Banner en Cámaras OBS: ${obsText}`);
});

if (choirInput) {
  choirInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("generateChoirButton")?.click();
    }
  });
}

// MÓDULO 3: UBICACIÓN Y DRON (TOMAS AÉREAS)
const droneInput = document.getElementById("droneCustomInput");
document.getElementById("generateDroneButton")?.addEventListener("click", () => {
  const customLoc = (droneInput?.value || document.getElementById("customTextInput")?.value || "").trim();
  const church = getSettings()?.church;
  const locationText = customLoc || church?.city || '';
  const headerTag = [church?.name, church?.address].filter(Boolean).join(' • ');

  const payload = {
    type: 'drone',
    location: locationText,
    tag: headerTag,
    fullText: `Dron: ${locationText}`
  };
  broadcastToOverlay(payload);
  showToast(`Banner en Cámaras OBS: Dron - ${locationText}`);
});

if (droneInput) {
  droneInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("generateDroneButton")?.click();
    }
  });
}

// MÓDULO 4: AVISO O TITULAR ESPECIAL
document.getElementById("broadcastCustomOverlayButton")?.addEventListener("click", () => {
  const rawText = (document.getElementById("customTextInput")?.value || "").trim();
  if (!rawText) {
    showToast("Escribe un aviso o texto para el banner de Cámaras OBS");
    return;
  }
  let formattedText = rawText;
  if (/^[a-z]/i.test(formattedText)) {
    formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
  }
  broadcastToOverlay({
    type: 'custom',
    text: formattedText,
    fullText: formattedText
  });
  showToast(`Banner en Cámaras OBS: ${formattedText}`);
});

document.getElementById("customTextInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("broadcastCustomOverlayButton")?.click();
  }
});

// ACCIÓN RÁPIDA: OCULTAR GRÁFICOS
document.getElementById("btnHideOverlay")?.addEventListener("click", () => {
  hideOverlay();
});

// INDICADOR DINÁMICO DE ESTADO EN EL AIRE
window.addEventListener('overlay-active', (event) => {
  const badge = document.getElementById('obsLiveStatusBadge');
  const badgeText = document.getElementById('obsLiveStatusText');
  if (badge && badgeText) {
    badge.classList.remove('idle');
    badge.classList.add('active');
    const p = event.detail || {};
    let desc = p.fullText || p.text || p.minister || p.location || p.theme || 'Banner activo';
    if (desc.length > 32) desc = desc.slice(0, 30) + '…';
    badgeText.textContent = `EN EL AIRE: ${desc}`;
  }
});

window.addEventListener('overlay-hidden', () => {
  const badge = document.getElementById('obsLiveStatusBadge');
  const badgeText = document.getElementById('obsLiveStatusText');
  if (badge && badgeText) {
    badge.classList.remove('active');
    badge.classList.add('idle');
    badgeText.textContent = 'EN REPOSO (Solo Logo)';
  }
});

// COPIAR ENLACES DE SALIDA AL PORTAPAPELES
document.querySelectorAll('.btn-copy-url').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = btn.dataset.copyTarget;
    if (!target) return;
    const fullUrl = window.location.origin + target;
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast(`Enlace copiado: ${target}`);
    } catch {
      prompt('Copia esta URL:', fullUrl);
    }
  });
});

// ==============================================================
// BANNER INFERIOR DE MINISTRO Y UBICACIÓN (OBS) CON PERSISTENCIA
// ==============================================================
const ministerInputEl = document.getElementById("ministerInput");
const generateMinisterBtn = document.getElementById("generateMinisterButton");

function persistMinisterName(val) {
  try { localStorage.setItem("lldm_minister_name", val); } catch {}
  request('/api/control/drafts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ministerInput: val })
  }).catch(() => {});
}

if (ministerInputEl) {
  try {
    const localSaved = localStorage.getItem("lldm_minister_name");
    if (localSaved && !ministerInputEl.value) ministerInputEl.value = localSaved;
  } catch {}

  let saveTimer = null;
  ministerInputEl.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistMinisterName(ministerInputEl.value.trim()), 250);
  });
  ministerInputEl.addEventListener("change", () => {
    clearTimeout(saveTimer);
    persistMinisterName(ministerInputEl.value.trim());
  });
  ministerInputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      generateMinisterBtn?.click();
    }
  });
}

if (generateMinisterBtn) {
  generateMinisterBtn.addEventListener("click", () => {
    const ministerName = (ministerInputEl?.value || "").trim();
    if (!ministerName) {
      showToast("Escribe el rango y nombre del ministro (ej: P.E. ELIAS DÍAZ)");
      ministerInputEl?.focus();
      return;
    }
    persistMinisterName(ministerName);
    const church = getSettings()?.church;
    const locationText = church?.city || church?.address || '';
    broadcastToOverlay({
      type: 'minister',
      minister: ministerName,
      location: locationText,
      fullText: [ministerName, locationText].filter(Boolean).join(' - ')
    });
    showToast(`Banner de Ministro en OBS: ${ministerName}`);
  });
}

// ==============================================================
// 8. LÓGICA DE HIMNARIO LLDM (BÚSQUEDA Y PROYECCIÓN ÁGIL EN MÓVIL)
// ==============================================================
