function preventShortWidowsForMeasure(text) {
  if (!text) return '';
  let clean = String(text).trim();
  clean = clean.replace(/(^|[ \t])([a-zA-ZáéíóúÁÉÍÓÚñÑ]{1,2})[ \t]+(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,})/gi, '$1$2\u00A0');
  clean = clean.replace(/[ \t]+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\.,;:!?\(\)\-]{1,4})$/, '\u00A0$1');
  return clean;
}

function measureCharWidthPx(ch, fontSize) {
  if (ch === ' ' || ch === '\u00A0') return fontSize * 0.29 + 0.5;
  if ('iljtf1.,;:!¡?¿/\'"()-I'.includes(ch)) return fontSize * 0.34 + 0.5;
  if ('mw'.includes(ch)) return fontSize * 0.82 + 0.5;
  if ('MWGOQCDHNU'.includes(ch)) return fontSize * 0.76 + 0.5;
  if (ch >= 'A' && ch <= 'Z' || 'ÁÉÍÓÚÑ'.includes(ch)) return fontSize * 0.66 + 0.5;
  return fontSize * 0.56 + 0.5;
}

function measureTokenWidthPx(token, fontSize) {
  let w = 0;
  for (let i = 0; i < token.length; i++) {
    w += measureCharWidthPx(token[i], fontSize);
  }
  return w;
}

// Calcula cuántas líneas visuales reales ocupa un renglón al renderizarse en el lienzo de 1780px a escala 1.5x (156px)
function estimateVisualLines(lineText, maxWidthPx = 1720, fontSize = 156) {
  if (!lineText || !String(lineText).trim()) return 1;
  const prepared = preventShortWidowsForMeasure(lineText);
  const tokens = prepared.split(/[ \t]+/).filter(Boolean);
  if (tokens.length === 0) return 1;

  const spaceW = fontSize * 0.29 + 0.5;
  let visualLines = 1;
  let currentW = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tokenW = measureTokenWidthPx(tokens[i], fontSize);
    if (currentW === 0) {
      currentW = tokenW;
    } else if (currentW + spaceW + tokenW <= maxWidthPx) {
      currentW += spaceW + tokenW;
    } else {
      visualLines++;
      currentW = tokenW;
    }
  }
  return visualLines;
}

// Si una sola línea de entrada es excesivamente larga (> 2 líneas visuales reales),
// dividirla por puntuación o mitad natural para que nunca desborde una diapositiva
function normalizeLongInputLines(lines, maxPerLine = 2) {
  const result = [];
  for (const rawLine of (lines || [])) {
    const line = String(rawLine || '').trim();
    if (!line) continue;
    if (estimateVisualLines(line, 1720, 156) <= maxPerLine) {
      result.push(line);
      continue;
    }
    // Intentar partir cerca de la mitad en signo de puntuación (; , . : //)
    const words = line.split(/\s+/);
    const mid = Math.floor(words.length / 2);
    let splitIdx = -1;
    for (let offset = 0; offset <= Math.floor(words.length / 3); offset++) {
      for (const candidate of [mid + offset, mid - offset]) {
        if (candidate > 1 && candidate < words.length - 1) {
          if (/[,;:\.\/]$/.test(words[candidate - 1])) {
            splitIdx = candidate;
            break;
          }
        }
      }
      if (splitIdx !== -1) break;
    }
    if (splitIdx === -1) splitIdx = mid;
    const partA = words.slice(0, splitIdx).join(' ').trim();
    const partB = words.slice(splitIdx).join(' ').trim();
    if (partA && partB) result.push(...normalizeLongInputLines([partA, partB], maxPerLine));
    else result.push(line);
  }
  return result;
}

function splitIntoSlides(rawLines, maxVisualLines = 4) {
  maxVisualLines = Math.max(1, Math.min(12, Math.trunc(Number(maxVisualLines)) || 4));
  const lines = normalizeLongInputLines(rawLines, Math.min(2, maxVisualLines));
  if (!lines || lines.length === 0) return [[]];

  const lineCosts = lines.map(l => estimateVisualLines(l, 1720, 156));
  const totalVisual = lineCosts.reduce((acc, v) => acc + v, 0);

  if (totalVisual <= maxVisualLines) {
    return [lines];
  }

  // Partición óptima equilibrada donde NINGUNA diapositiva supera maxVisualLines (4 líneas reales renderizadas)
  const n = lines.length;
  // dp[i] = { slides: número mínimo de diapositivas desde i..n, penalty: varianza de equilibrio, next: índice de corte }
  const dp = new Array(n + 1).fill(null);
  dp[n] = { slides: 0, penalty: 0, next: n };

  const targetVisualPerSlide = totalVisual / Math.ceil(totalVisual / maxVisualLines);

  for (let i = n - 1; i >= 0; i--) {
    let sumVisual = 0;
    let best = null;

    for (let j = i; j < n; j++) {
      sumVisual += lineCosts[j];
      if (sumVisual > maxVisualLines && j > i) break;

      const rem = dp[j + 1];
      if (!rem) continue;

      const diff = sumVisual - targetVisualPerSlide;
      const candidateSlides = 1 + rem.slides;
      const candidatePenalty = (diff * diff) + rem.penalty;

      if (
        !best ||
        candidateSlides < best.slides ||
        (candidateSlides === best.slides && candidatePenalty < best.penalty)
      ) {
        best = {
          slides: candidateSlides,
          penalty: candidatePenalty,
          next: j + 1
        };
      }
    }
    dp[i] = best;
  }

  const chunks = [];
  let idx = 0;
  while (idx < n && dp[idx]) {
    const nextIdx = dp[idx].next;
    chunks.push(lines.slice(idx, nextIdx));
    idx = nextIdx;
  }

  return chunks.length > 0 ? chunks : [lines];
}


module.exports = { splitIntoSlides, estimateVisualLines, preventShortWidowsForMeasure };
