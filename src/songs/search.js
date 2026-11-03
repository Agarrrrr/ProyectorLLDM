function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos y tildes (á->a, é->e, ñ->n, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')   // Convierte puntuación y caracteres especiales en espacios
    .replace(/\s+/g, ' ')           // Unifica espacios múltiples
    .trim();
}

function cleanTitleForSort(str) {
  if (!str) return '';
  return String(str)
    .replace(/^[^a-zA-Z0-9\u00C0-\u017F]+/, '') // Elimina signos iniciales como ¡, ¿, ", ', etc.
    .trim();
}

function compareAlphabetical(a, b) {
  const cleanA = cleanTitleForSort(a);
  const cleanB = cleanTitleForSort(b);
  const comp = cleanA.localeCompare(cleanB, 'es', { sensitivity: 'base' });
  if (comp !== 0) return comp;
  return String(a || '').localeCompare(String(b || ''), 'es');
}

function indexSongForSearch(item) {
  const normTitle = normalizeSearchText(item.title);
  const normCategories = (item.categories || []).map(normalizeSearchText).join(' ');
  const lineTexts = [];
  if (item.sections) {
    for (const sec of item.sections) {
      if (sec.lines) {
        for (const line of sec.lines) {
          lineTexts.push(normalizeSearchText(line));
        }
      }
    }
  }
  return {
    normTitle,
    normCategories,
    lineTexts,
    fullText: `${normTitle} ${normCategories} ${lineTexts.join(' ')}`,
    numStr: item.number ? String(item.number) : ''
  };
}

function prepareDatabase(list) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    item._idx = indexSongForSearch(item);
    item._summary = {
      id: item.id,
      number: item.number,
      title: item.title,
      categories: item.categories,
      totalLines: item.totalLines ?? (item.sections || []).reduce((sum, section) => sum + (section.lines || []).length, 0)
    };
  }
}

function searchSongs(list, query, isFull = false, options = {}) {
  const isAlphabetical = Boolean(options && (options.alphabetical || options.sortBy === 'alphabetical'));
  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    const results = list.map(s => isFull ? s : (s._summary || s));
    if (isAlphabetical) {
      results.sort((a, b) => compareAlphabetical(a.title, b.title));
    }
    return results;
  }

  // Si es un número puro (o prefijo # ej: #15) y no estamos en modo alfabético (ej: coro sin orden numérico)
  if (!isAlphabetical && /^\d+$/.test(normQuery)) {
    const num = parseInt(normQuery, 10);
    const exact = [];
    const starts = [];
    const hasNumInTitle = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const idx = s._idx || indexSongForSearch(s);
      const target = isFull ? s : (s._summary || s);
      if (s.number === num) {
        exact.push(target);
      } else if (idx.numStr && idx.numStr.startsWith(normQuery)) {
        starts.push(target);
      } else if (idx.normTitle && idx.normTitle.includes(normQuery)) {
        hasNumInTitle.push(target);
      }
    }
    return [...exact, ...starts, ...hasNumInTitle];
  }

  const tokens = normQuery.split(' ').filter(Boolean);
  const scored = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const idx = item._idx || indexSongForSearch(item);

    // Verificación ultrarrápida: todos los tokens deben existir en el texto completo pre-indexado
    let allTokensPresent = true;
    for (let t = 0; t < tokens.length; t++) {
      if (!idx.fullText.includes(tokens[t])) {
        allTokensPresent = false;
        break;
      }
    }
    if (!allTokensPresent) continue;

    let score = 0;
    const normTitle = idx.normTitle;

    // Ponderación por coincidencia exacta o de frase en el título
    if (normTitle === normQuery) {
      score += 5000;
    } else if (normTitle.startsWith(normQuery)) {
      score += 2500;
    } else if (normTitle.includes(normQuery)) {
      score += 1500;
    }

    // Coincidencia de tokens individuales en el título
    let titleTokensCount = 0;
    for (let t = 0; t < tokens.length; t++) {
      if (normTitle.includes(tokens[t])) {
        score += 250;
        titleTokensCount++;
      }
    }

    if (titleTokensCount === tokens.length) {
      score += 1000;
    }

    // Coincidencia en categorías / etiquetas
    for (let t = 0; t < tokens.length; t++) {
      if (idx.normCategories.includes(tokens[t])) score += 100;
    }

    // Frase completa en la letra
    if (idx.lineTexts.some(lt => lt.includes(normQuery))) {
      score += 400;
    }

    // Frecuencia de aparición de tokens en los renglones
    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t];
      let matchCount = 0;
      for (let l = 0; l < idx.lineTexts.length; l++) {
        if (idx.lineTexts[l].includes(token)) matchCount++;
      }
      score += Math.min(matchCount * 20, 100);
    }

    scored.push({
      item: isFull ? item : (item._summary || item),
      num: item.number || 9999,
      score
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (isAlphabetical) {
      return compareAlphabetical(a.item.title, b.item.title);
    }
    return a.num - b.num;
  });

  return scored.map(s => s.item);
}

module.exports = { prepareDatabase, searchSongs, cleanTitleForSort, compareAlphabetical };
