import { historyStorage } from './history-store.js';
import { broadcastToOverlay } from './transmission.js';
import { showToast } from './shell.js';
import { request } from './api.js';

const books = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
  "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel",
  "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras",
  "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
  "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
  "Ezequiel", "Daniel", "Oseas", "Joel", "Amós",
  "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc",
  "Sofonías", "Hageo", "Zacarías", "Malaquías",
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos",
  "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios",
  "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo",
  "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago",
  "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan",
  "Judas", "Apocalipsis", "Salmo"
];

const specialBooks = [
  "Carta Apostólica",
  "Presentación Apostólica"
];

function isSpecialBook(bookName) {
  if (!bookName) return false;
  const normalized = bookName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("carta") || normalized.includes("presentacion");
}

function getCanonicalSpecialBook(bookName) {
  const normalized = (bookName || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("presentacion")) return "Presentación Apostólica";
  if (normalized.includes("carta")) return "Carta Apostólica";
  return bookName;
}

function updateInputPlaceholders() {
  const bookInput = document.getElementById("searchBook").value;
  const chapterInput = document.getElementById("chapter");
  const verseInput = document.getElementById("verse");

  if (isSpecialBook(bookInput)) {
    chapterInput.placeholder = "Fecha (ej: 14 de Agosto)";
    verseInput.placeholder = "Locación (opcional)";
    chapterInput.setAttribute("inputmode", "text");
  } else {
    chapterInput.placeholder = "Capítulo";
    verseInput.placeholder = "Versículo (ej: 4-7)";
    chapterInput.setAttribute("inputmode", "numeric");
  }
}

function isBiblicalText(entry) {
  if (!entry || typeof entry !== 'string') return false;
  const trimmed = entry.trim();
  if (/^(?:carta|presentaci|coro|dron|el coro)\b/i.test(trimmed)) return false;
  const match = trimmed.match(/^(\d?\s?[A-Za-zÁÉÍÓÚáéíóúñ]+(?:\sde\s[A-Za-zÁÉÍÓÚáéíóúñ]*)?)(?:\s+(\d+)(?::(\d+(?:-\d+)?))?)?$/);
  if (!match) return false;
  const bookCandidate = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return books.some(b => b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bookCandidate);
}

// HISTORIAL BÍBLICO (CON BORRADO INDIVIDUAL Y GENERAL)
function loadHistory() {
  let history = JSON.parse(historyStorage.getItem("searchHistory")) || [];
  const cleanHistory = history.filter(isBiblicalText);
  if (cleanHistory.length !== history.length) {
    history = cleanHistory;
    historyStorage.setItem("searchHistory", JSON.stringify(history));
  }

  const historySection = document.getElementById("history");
  historySection.innerHTML = "";

  history.forEach((item, idx) => {
    const li = document.createElement("li");

    const spanText = document.createElement("span");
    spanText.className = "history-item-text";
    spanText.textContent = item;

    const btnRemove = document.createElement("button");
    btnRemove.className = "history-item-remove";
    btnRemove.type = "button";
    btnRemove.title = "Eliminar esta cita del historial";
    btnRemove.textContent = "×";
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSearchHistoryItem(idx);
    });

    li.appendChild(spanText);
    li.appendChild(btnRemove);

    li.addEventListener("click", () => {
      const match = item.match(/^(\d?\s?[A-Za-zÁÉÍÓÚáéíóúñ]+(?:\sde\s[A-Za-zÁÉÍÓÚáéíóúñ]*)?)\s+(\d+)(?::(\d+(-\d+)?))?$/);
      if (match) {
        document.getElementById("searchBook").value = match[1].trim();
        document.getElementById("chapter").value = match[2];
        document.getElementById("verse").value = match[3] || "";
      } else {
        document.getElementById("searchBook").value = item;
        document.getElementById("chapter").value = "";
        document.getElementById("verse").value = "";
      }
      window.dispatchEvent(new Event("capture-shared-drafts"));
      updateInputPlaceholders();
    });
    historySection.appendChild(li);
  });
}

function removeSearchHistoryItem(index) {
  let history = (JSON.parse(historyStorage.getItem("searchHistory")) || []).filter(isBiblicalText);
  if (index >= 0 && index < history.length) {
    const removed = history.splice(index, 1)[0];
    historyStorage.setItem("searchHistory", JSON.stringify(history));
    loadHistory();
    showToast(`Cita eliminada del historial: ${removed}`);
  }
}

function addSearchToHistory(entry) {
  if (!isBiblicalText(entry)) return;
  let history = JSON.parse(historyStorage.getItem("searchHistory")) || [];
  history = history.filter(isBiblicalText);
  if (!history.includes(entry)) {
    history.push(entry);
    historyStorage.setItem("searchHistory", JSON.stringify(history));
  }
  loadHistory();
}

document.getElementById("clearHistoryButton").addEventListener("click", () => {
  historyStorage.removeItem("searchHistory");
  loadHistory();
  showToast("Historial bíblico limpiado");
});

// HISTORIAL DE TEMAS (CON BORRADO INDIVIDUAL Y GENERAL)
function loadThemeHistory() {
  const themeHistory = JSON.parse(historyStorage.getItem("themeHistory")) || [];
  const themeHistorySection = document.getElementById("themeHistory");
  themeHistorySection.innerHTML = "";

  themeHistory.forEach((item, idx) => {
    const li = document.createElement("li");

    const spanText = document.createElement("span");
    spanText.className = "history-item-text";
    spanText.textContent = item;

    const btnRemove = document.createElement("button");
    btnRemove.className = "history-item-remove";
    btnRemove.type = "button";
    btnRemove.title = "Eliminar este tema del historial";
    btnRemove.textContent = "×";
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeThemeHistoryItem(idx);
    });

    li.appendChild(spanText);
    li.appendChild(btnRemove);

    li.addEventListener("click", () => {
      document.getElementById("themeInput").value = item;
      window.dispatchEvent(new Event("capture-shared-drafts"));
    });
    themeHistorySection.appendChild(li);
  });
}

function removeThemeHistoryItem(index) {
  let themeHistory = JSON.parse(historyStorage.getItem("themeHistory")) || [];
  if (index >= 0 && index < themeHistory.length) {
    const removed = themeHistory.splice(index, 1)[0];
    historyStorage.setItem("themeHistory", JSON.stringify(themeHistory));
    loadThemeHistory();
    showToast(`Tema eliminado del historial: ${removed}`);
  }
}

function addThemeToHistory(theme) {
  let themeHistory = JSON.parse(historyStorage.getItem("themeHistory")) || [];
  if (!themeHistory.includes(theme)) {
    themeHistory.push(theme);
    if (themeHistory.length > 8) themeHistory = themeHistory.slice(themeHistory.length - 8);
    historyStorage.setItem("themeHistory", JSON.stringify(themeHistory));
  }
  loadThemeHistory();
}

document.getElementById("clearThemeHistoryButton").addEventListener("click", () => {
  historyStorage.removeItem("themeHistory");
  loadThemeHistory();
  showToast("Historial de temas limpiado");
});

// SUGERENCIAS AUTOCOMPLETE
const searchBookInput = document.getElementById("searchBook");
const suggestionsDiv = document.getElementById("suggestions");

searchBookInput.addEventListener("input", function () {
  updateInputPlaceholders();
  const cleanNorm = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const normInput = cleanNorm(this.value);

  if (normInput === "") {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.classList.remove("show");
    return;
  }

  const history = (JSON.parse(historyStorage.getItem("searchHistory")) || []).filter(isBiblicalText);
  const historySuggestions = history.filter(item => cleanNorm(item).includes(normInput));

  const bookSuggestions = books.filter(book => cleanNorm(book).includes(normInput)).sort((a, b) => {
    const aNorm = cleanNorm(a);
    const bNorm = cleanNorm(b);
    if (aNorm.startsWith(normInput) && !bNorm.startsWith(normInput)) return -1;
    if (!aNorm.startsWith(normInput) && bNorm.startsWith(normInput)) return 1;
    return a.localeCompare(b);
  });

  const specialSuggestions = specialBooks.filter(item => cleanNorm(item).includes(normInput));

  const hasDateOrExtra = (str) => {
    if (!str || typeof str !== 'string') return true;
    if (/\b\d{1,2}\s+de\s+[a-záéíóúñ]+|\b(19\d\d|20\d\d)\b|\s+[-–—]\s+|\b\d{1,2}\/\d{1,2}\b/i.test(str)) return true;
    if (isSpecialBook(str)) {
      const norm = cleanNorm(str);
      return norm !== "cartaapostolica" && norm !== "presentacionapostolica";
    }
    return false;
  };

  const suggestions = Array.from(new Set([...bookSuggestions, ...specialSuggestions, ...historySuggestions]))
    .filter(item => !hasDateOrExtra(item));

  suggestionsDiv.innerHTML = "";

  suggestions.forEach(suggestion => {
    const div = document.createElement("div");
    div.textContent = suggestion;
    div.addEventListener("click", () => {
      if (isSpecialBook(suggestion)) {
        document.getElementById("searchBook").value = getCanonicalSpecialBook(suggestion);
        document.getElementById("chapter").value = "";
        document.getElementById("verse").value = "";
      } else {
        const match = suggestion.match(/^(\d?\s?[A-Za-zÁÉÍÓÚáéíóúñ]+(?:\sde\s[A-Za-zÁÉÍÓÚáéíóúñ]*)?)\s+(\d+)(?::(\d+(-\d+)?))?$/);
        if (match) {
          document.getElementById("searchBook").value = match[1].trim();
          document.getElementById("chapter").value = match[2];
          document.getElementById("verse").value = match[3] || "";
        } else {
          document.getElementById("searchBook").value = suggestion;
          document.getElementById("chapter").value = "";
          document.getElementById("verse").value = "";
        }
      }
      window.dispatchEvent(new Event("capture-shared-drafts"));
      updateInputPlaceholders();
      suggestionsDiv.classList.remove("show");
      document.getElementById("chapter").focus();
    });
    suggestionsDiv.appendChild(div);
  });

  if (suggestions.length > 0) {
    suggestionsDiv.classList.add("show");
  } else {
    suggestionsDiv.classList.remove("show");
  }
});

document.addEventListener("click", (e) => {
  if (!searchBookInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
    suggestionsDiv.classList.remove("show");
  }
});

// ==============================================================
// 6. ACCIONES DE GENERACIÓN DE CITAS BÍBLICAS (SOLO CITA PERMITIDA)
// ==============================================================
function findCanonicalBookLocal(input) {
  if (!input) return "";
  const norm = input.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  return books.find(b => b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") === norm) || input.trim();
}

async function proyectarBiblia() {
  const rawBook = document.getElementById("searchBook").value.trim();
  const chapter = document.getElementById("chapter").value.trim();
  const verse = document.getElementById("verse").value.trim();
  const versePattern = /^\d+(-\d+)?$/;

  if (!rawBook) {
    showToast("Por favor introduce un libro bíblico");
    return;
  }

  document.activeElement.blur();

  // Caso especial: Carta o Presentación Apostólica (SOLO EN PANTALLA)
  if (isSpecialBook(rawBook)) {
    const canonical = getCanonicalSpecialBook(rawBook);
    const fullText = `${canonical}${chapter ? ' - ' + chapter : ''}${verse ? ' - ' + verse : ''}`;
    await request('/api/project/special', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: canonical, date: chapter, location: verse })
    });
    showToast(`Proyectando en Pantalla: ${canonical}`);
    return;
  }

  const book = findCanonicalBookLocal(rawBook);

  // Caso Salmo sin capítulo ni versículo
  if (book === "Salmo" && !chapter) {
    addSearchToHistory(book);
    await request('/api/project/bible', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, chapter: "", verse: "" })
    });
    showToast(`Cita en Pantalla: ${book}`);
    return;
  }

  // Validar existencia de libro y límites de capítulos y versículos (bibleLimits de bibleData.js)
  if (typeof bibleLimits !== 'undefined') {
    if (!bibleLimits[book]) {
      showToast("El libro introducido no se encuentra en la Biblia.");
      return;
    }

    const bookLimits = bibleLimits[book];
    if (!chapter) {
      showToast(`Introduce el capítulo de ${book}.`);
      return;
    }

    const chapNum = parseInt(chapter, 10);
    if (isNaN(chapNum) || chapNum < 1 || chapNum > bookLimits.length) {
      showToast(`El libro de ${book} solo tiene ${bookLimits.length} capítulos.`);
      return;
    }

    if (verse) {
      if (!versePattern.test(verse)) {
        showToast("Introduce un versículo válido o un rango como 4-7");
        return;
      }

      const maxVerses = bookLimits[chapNum - 1];
      let startVerse, endVerse;
      if (verse.includes("-")) {
        [startVerse, endVerse] = verse.split("-").map(Number);
      } else {
        startVerse = endVerse = parseInt(verse, 10);
      }

      if (startVerse < 1 || startVerse > maxVerses) {
        showToast(`El capítulo ${chapNum} de ${book} solo tiene ${maxVerses} versículos.`);
        return;
      }

      if (endVerse > maxVerses) {
        showToast(`El capítulo ${chapNum} de ${book} solo tiene ${maxVerses} versículos. Rango inválido.`);
        return;
      }

      if (startVerse > endVerse) {
        showToast("El rango de versículos es inválido.");
        return;
      }
    }
  } else if (verse && !versePattern.test(verse)) {
    showToast("Introduce un versículo válido o un rango como 4-7");
    return;
  }

  const obsString = `${book} ${chapter}${verse ? ':' + verse : ''}`;
  addSearchToHistory(obsString);

  try {
    const res = await request('/api/project/bible', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book,
        chapter,
        verse
      })
    });

    if (res.ok) {
      showToast(`Cita en Pantalla: ${obsString}`);
    } else {
      showToast("Error al proyectar la cita bíblica.");
    }
  } catch (err) {
    showToast("Error de conexión al proyectar cita");
  }
}

document.getElementById("generateButton").addEventListener("click", () => proyectarBiblia());

document.getElementById("clearSearchButton").addEventListener("click", () => {
  for (const id of ["searchBook", "chapter", "verse"]) {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  if (suggestionsDiv) {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.classList.remove("show");
  }
  updateInputPlaceholders();
  showToast("Campos de búsqueda limpiados");
});

document.getElementById("broadcastBibleOverlayButton").addEventListener("click", () => {
  const rawBook = document.getElementById("searchBook").value.trim();
  const chapter = document.getElementById("chapter").value.trim();
  const verse = document.getElementById("verse").value.trim();
  if (!rawBook) {
    showToast("Escribe un libro primero");
    return;
  }
  if (isSpecialBook(rawBook)) {
    const canonical = getCanonicalSpecialBook(rawBook);
    const fullText = `${canonical}${chapter ? ' - ' + chapter : ''}${verse ? ' - ' + verse : ''}`;
    broadcastToOverlay({
      type: 'special',
      book: canonical,
      date: chapter,
      location: verse,
      fullText: fullText
    });
    showToast(`Banner en Cámaras OBS: ${fullText}`);
    return;
  }
  const book = findCanonicalBookLocal(rawBook);
  const cv = verse ? `${chapter}:${verse}` : chapter;
  const fullText = cv ? `${book} ${cv}` : book;
  if (isBiblicalText(fullText)) {
    addSearchToHistory(fullText);
  }
  broadcastToOverlay({
    type: 'bible',
    book: book,
    chapterVerse: cv,
    fullText: fullText
  });
  showToast(`Banner en Cámaras OBS: ${fullText}`);
});

const searchBookEl = document.getElementById("searchBook");
const chapterEl = document.getElementById("chapter");
const verseEl = document.getElementById("verse");

if (searchBookEl) {
  searchBookEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const rawVal = searchBookEl.value.trim();
      if (!rawVal) {
        showToast("Escribe un libro primero");
        return;
      }

      // Si el usuario introdujo una cita completa directa (ej: "Salmos 23:1" o "Juan 3:16")
      const fullMatch = rawVal.match(/^(\d?\s?[A-Za-zÁÉÍÓÚáéíóúñ]+(?:\sde\s[A-Za-zÁÉÍÓÚáéíóúñ]*)?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/);
      if (fullMatch) {
        searchBookEl.value = fullMatch[1].trim();
        chapterEl.value = fullMatch[2];
        verseEl.value = fullMatch[3] || "";
        window.dispatchEvent(new Event("capture-shared-drafts"));
      updateInputPlaceholders();
        suggestionsDiv.classList.remove("show");
        suggestionsDiv.innerHTML = "";
        if (verseEl.value) {
          proyectarBiblia();
        } else {
          verseEl.focus();
          verseEl.select();
        }
        return;
      }

      // Si hay sugerencias activas, tomar la primera sugerencia
      const firstSug = suggestionsDiv.querySelector("div");
      if (suggestionsDiv.classList.contains("show") && firstSug && firstSug.textContent) {
        const sugText = firstSug.textContent.trim();
        const sugMatch = sugText.match(/^(\d?\s?[A-Za-zÁÉÍÓÚáéíóúñ]+(?:\sde\s[A-Za-zÁÉÍÓÚáéíóúñ]*)?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/);
        if (sugMatch) {
          searchBookEl.value = sugMatch[1].trim();
          chapterEl.value = sugMatch[2];
          verseEl.value = sugMatch[3] || "";
        } else {
          searchBookEl.value = sugText;
        }
      } else {
        // Resolver libro canónico (ej: "salmos" -> "Salmos", "juan" -> "Juan", "1 co" -> "1 Corintios")
        const cleanNorm = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const normVal = cleanNorm(rawVal);
        let matched = books.find(b => cleanNorm(b) === normVal);
        if (!matched) matched = books.find(b => cleanNorm(b).startsWith(normVal));
        if (!matched) matched = books.find(b => cleanNorm(b).includes(normVal));
        if (matched) {
          searchBookEl.value = matched;
        }
      }

      suggestionsDiv.classList.remove("show");
      suggestionsDiv.innerHTML = "";
      window.dispatchEvent(new Event("capture-shared-drafts"));
      updateInputPlaceholders();

      // 1er Enter: Cambia al cuadro de capítulo
      chapterEl.focus();
      chapterEl.select();
    }
  });
}

if (chapterEl) {
  chapterEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // 2do Enter: Cambia al cuadro de versículo
      verseEl.focus();
      verseEl.select();
    }
  });
}

if (verseEl) {
  verseEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // 3er Enter: Se muestra en pantalla
      proyectarBiblia();
    }
  });
}

// ==============================================================
// 7. ACCIONES DE TEMAS, CORO, DRON Y AVISOS (CÁMARAS OBS)
// ==============================================================

export { addThemeToHistory, loadHistory, loadThemeHistory, suggestionsDiv, updateInputPlaceholders };

document.addEventListener('focusin', event => {
  if (event.target !== searchBookInput && !suggestionsDiv.contains(event.target)) suggestionsDiv.classList.remove('show');
});

window.addEventListener('shared-histories-changed', () => { loadHistory(); loadThemeHistory(); });
