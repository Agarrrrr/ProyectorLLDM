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

// BOTÓN CANTO CORO -> BANNER ANIMADO EN CÁMARAS OBS (/overlay)
document.getElementById("generateChoirButton").addEventListener("click", () => {
  const rawInput = document.getElementById("customTextInput").value.trim();
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

// BOTÓN CUADRO DRON -> BANNER ANIMADO CENTRADO EN CÁMARAS OBS (/overlay)
document.getElementById("generateDroneButton").addEventListener("click", () => {
  const customLoc = document.getElementById("customTextInput").value.trim();
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

// BOTÓN GENERAR BANNER / AVISO EN CÁMARAS OBS (/overlay)
document.getElementById("broadcastCustomOverlayButton").addEventListener("click", () => {
  const rawText = document.getElementById("customTextInput").value.trim();
  if (!rawText) {
    showToast("Escribe un aviso o texto para el banner de Cámaras OBS");
    return;
  }
  if (/^(?:(?:el\s+)?coro(?:\s+canta)?|canto\s*(?:de|del)?\s*coro|himno\s*(?:de|del)?\s*coro)/i.test(rawText)) {
    document.getElementById("generateChoirButton").click();
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

document.getElementById("customTextInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const val = e.target.value.trim().toLowerCase();
    if (val.includes("coro") || !val) {
      document.getElementById("generateChoirButton").click();
    } else {
      document.getElementById("broadcastCustomOverlayButton").click();
    }
  }
});

document.getElementById("btnHideOverlay").addEventListener("click", () => {
  hideOverlay();
});

document.getElementById("clearCustomButton").addEventListener("click", () => {
  document.getElementById("customTextInput").value = "";
});

// ==============================================================
// 8. LÓGICA DE HIMNARIO LLDM (BÚSQUEDA Y PROYECCIÓN ÁGIL EN MÓVIL)
// ==============================================================
