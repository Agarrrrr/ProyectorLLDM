const fs = require('fs');
const path = require('path');
const { fitSection, paginateSection } = require('../songs/section-layout');

const BOOK_ALIASES = {
  '1corintios': '1 Corintios', '1co': '1 Corintios', '1cor': '1 Corintios', '1racorintios': '1 Corintios', '1radecorintios': '1 Corintios',
  '2corintios': '2 Corintios', '2co': '2 Corintios', '2cor': '2 Corintios', '2dacorintios': '2 Corintios', '2dadecorintios': '2 Corintios',
  '1tesalonicenses': '1 Tesalonicenses', '1ts': '1 Tesalonicenses', '1tes': '1 Tesalonicenses', '1ratessalonicenses': '1 Tesalonicenses',
  '2tesalonicenses': '2 Tesalonicenses', '2ts': '2 Tesalonicenses', '2tes': '2 Tesalonicenses',
  '1timoteo': '1 Timoteo', '1ti': '1 Timoteo', '1tim': '1 Timoteo',
  '2timoteo': '2 Timoteo', '2ti': '2 Timoteo', '2tim': '2 Timoteo',
  '1pedro': '1 Pedro', '1pe': '1 Pedro', '1p': '1 Pedro', '1ped': '1 Pedro',
  '2pedro': '2 Pedro', '2pe': '2 Pedro', '2p': '2 Pedro', '2ped': '2 Pedro',
  '1juan': '1 Juan', '1jn': '1 Juan', '1j': '1 Juan',
  '2juan': '2 Juan', '2jn': '2 Juan', '2j': '2 Juan',
  '3juan': '3 Juan', '3jn': '3 Juan', '3j': '3 Juan',
  '1samuel': '1 Samuel', '1sam': '1 Samuel', '1s': '1 Samuel',
  '2samuel': '2 Samuel', '2sam': '2 Samuel', '2s': '2 Samuel',
  '1reyes': '1 Reyes', '1re': '1 Reyes', '1r': '1 Reyes',
  '2reyes': '2 Reyes', '2re': '2 Reyes', '2r': '2 Reyes',
  '1cronicas': '1 Crónicas', '1cr': '1 Crónicas', '1cro': '1 Crónicas',
  '2cronicas': '2 Crónicas', '2cr': '2 Crónicas', '2cro': '2 Crónicas',
  'cantares': 'Cantares', 'cantardeloscantares': 'Cantares', 'cantar': 'Cantares',
  'salmo': 'Salmos', 'salmos': 'Salmos', 'sal': 'Salmos', 'ps': 'Salmos', 'psalms': 'Salmos',
  'apocalipsis': 'Apocalipsis', 'apoc': 'Apocalipsis', 'ap': 'Apocalipsis', 'revelacion': 'Apocalipsis',
  'genesis': 'Génesis', 'gen': 'Génesis', 'gn': 'Génesis',
  'exodo': 'Éxodo', 'ex': 'Éxodo', 'exo': 'Éxodo',
  'levitico': 'Levítico', 'lev': 'Levítico', 'lv': 'Levítico',
  'numeros': 'Números', 'num': 'Números', 'nm': 'Números',
  'deuteronomio': 'Deuteronomio', 'deut': 'Deuteronomio', 'dt': 'Deuteronomio',
  'josue': 'Josué', 'jos': 'Josué',
  'jueces': 'Jueces', 'jue': 'Jueces', 'jc': 'Jueces',
  'nehemias': 'Nehemías', 'neh': 'Nehemías',
  'proverbios': 'Proverbios', 'prov': 'Proverbios', 'pr': 'Proverbios',
  'eclesiastes': 'Eclesiastés', 'ecl': 'Eclesiastés', 'ec': 'Eclesiastés',
  'isaias': 'Isaías', 'isa': 'Isaías', 'is': 'Isaías',
  'jeremias': 'Jeremías', 'jer': 'Jeremías', 'jr': 'Jeremías',
  'lamentaciones': 'Lamentaciones', 'lam': 'Lamentaciones', 'lm': 'Lamentaciones',
  'ezequiel': 'Ezequiel', 'eze': 'Ezequiel', 'ez': 'Ezequiel',
  'daniel': 'Daniel', 'dan': 'Daniel', 'dn': 'Daniel',
  'mateo': 'Mateo', 'mat': 'Mateo', 'mt': 'Mateo',
  'marcos': 'Marcos', 'mr': 'Marcos', 'mc': 'Marcos',
  'lucas': 'Lucas', 'luc': 'Lucas', 'lc': 'Lucas',
  'juan': 'Juan', 'jn': 'Juan', 'jhn': 'Juan',
  'hechos': 'Hechos', 'hch': 'Hechos', 'act': 'Hechos',
  'romanos': 'Romanos', 'rom': 'Romanos', 'ro': 'Romanos',
  'galatas': 'Gálatas', 'gal': 'Gálatas', 'ga': 'Gálatas',
  'efesios': 'Efesios', 'efe': 'Efesios', 'ef': 'Efesios',
  'filipenses': 'Filipenses', 'fil': 'Filipenses', 'flp': 'Filipenses',
  'colosenses': 'Colosenses', 'col': 'Colosenses', 'cl': 'Colosenses',
  'hebreos': 'Hebreos', 'heb': 'Hebreos', 'hb': 'Hebreos',
  'santiago': 'Santiago', 'sant': 'Santiago', 'stg': 'Santiago', 'tg': 'Santiago'
};

function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function cleanBookInput(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^(?:1ra|1era|primera)\s+(?:de\s+)?/i, '1 ');
  str = str.replace(/^(?:2da|2nda|segunda)\s+(?:de\s+)?/i, '2 ');
  str = str.replace(/^(?:3ra|3era|tercera)\s+(?:de\s+)?/i, '3 ');
  str = str.replace(/^(?:san|s\.)\s+/i, '');
  return str.trim();
}

function splitLongVerse(verseText, maxChars = 280) {
  if (!verseText || verseText.length <= maxChars) return [verseText];
  const chunks = [];
  let remaining = verseText.trim();

  while (remaining.length > maxChars) {
    let splitIdx = -1;
    const searchSlice = remaining.substring(0, maxChars + 30);
    const matches = [...searchSlice.matchAll(/([;.:?!])\s+/g)];
    if (matches.length > 0) {
      for (let i = matches.length - 1; i >= 0; i--) {
        const idx = matches[i].index + matches[i][1].length;
        if (idx <= maxChars + 30 && idx >= 90) {
          splitIdx = idx;
          break;
        }
      }
    }

    if (splitIdx === -1) {
      const commaMatches = [...searchSlice.matchAll(/,\s+/g)];
      for (let i = commaMatches.length - 1; i >= 0; i--) {
        const idx = commaMatches[i].index + 1;
        if (idx <= maxChars + 30 && idx >= 80) {
          splitIdx = idx;
          break;
        }
      }
    }

    if (splitIdx === -1) {
      const lastSpace = searchSlice.lastIndexOf(' ', maxChars);
      splitIdx = lastSpace > 0 ? lastSpace : maxChars;
    }

    const chunk = remaining.substring(0, splitIdx).trim();
    chunks.push(chunk);
    remaining = remaining.substring(splitIdx).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function paginateVerseItems(verseItems, profile = {}) {
  const options = { ...profile, height: 820 };
  const marked = item => `[${item.number}] ${item.text}`;
  const fitPage = group => fitSection(group.map(marked).join(' '), options);
  const pages = [];
  let group = [], layout;

  for (const verse of verseItems) {
    const text = verse.text.trim();
    const fragments = splitLongVerse(text, 280).flatMap(part =>
      fitPage([{ ...verse, text: part }]) ? [part] :
        paginateSection([part], { ...options, width: 1300 }).map(page => page.lines.join(' '))
    );
    for (const [index, fragment] of fragments.entries()) {
      const item = { ...verse, text: fragment, part: fragments.length > 1 ? index + 1 : null, totalParts: fragments.length };
      const combined = [...group, item];
      const combinedLayout = fitPage(combined);
      if (!combinedLayout && group.length) {
        pages.push({ group, layout });
        group = [item];
        layout = fitPage(group);
      } else {
        group = combined;
        layout = combinedLayout;
      }
      if (!layout) throw new Error('El texto supera los límites de tamaño y renglones configurados.');
    }
  }
  if (group.length) pages.push({ group, layout });
  return pages;
}

class BibleService {
  constructor({ dataDir } = {}) {
    this.dataDir = dataDir || path.join(__dirname, '..', '..', 'data');
    this.factoryDir = path.join(__dirname, '..', '..', 'data', 'factory');
    this.versionsCache = new Map();
    this.searchIndexCache = new Map();
    this.manifest = null;
    this.initManifest();
  }

  initManifest() {
    const rootData = path.join(__dirname, '..', '..', 'data');
    const candidates = [
      path.join(this.dataDir, 'biblia', 'manifest.json'),
      path.join(this.dataDir, 'manifest.json'),
      path.join(rootData, 'biblia', 'manifest.json'),
      path.join(this.factoryDir, 'biblia', 'manifest.json')
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          this.manifest = JSON.parse(fs.readFileSync(cand, 'utf8'));
          return;
        } catch (e) {
          // continue
        }
      }
    }
    this.manifest = [
      { id: 'RVR1960', name: 'Reina Valera 1960', isDefault: true, description: 'Versión tradicional de mayor uso' }
    ];
  }

  getManifest() {
    if (!this.manifest) this.initManifest();
    return this.manifest;
  }

  findVersionMeta(versionId) {
    const manifest = this.getManifest();
    const id = (versionId || 'RVR1960').trim().toUpperCase();
    return manifest.find(v => v.id.toUpperCase() === id) || manifest[0];
  }

  getVersion(versionId) {
    const meta = this.findVersionMeta(versionId);
    const id = meta.id;
    if (this.versionsCache.has(id)) {
      return this.versionsCache.get(id);
    }

    const rootData = path.join(__dirname, '..', '..', 'data');
    const candidates = [
      path.join(this.dataDir, 'biblia', `${id}.json`),
      path.join(this.dataDir, `${id}.json`),
      path.join(rootData, 'biblia', `${id}.json`),
      path.join(this.factoryDir, 'biblia', `${id}.json`)
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          const data = JSON.parse(fs.readFileSync(cand, 'utf8'));
          this.versionsCache.set(id, data);
          return data;
        } catch (e) {
          // continue
        }
      }
    }

    throw new Error(`Base de datos de la Biblia ${id} no encontrada.`);
  }

  getLimits(versionId = 'RVR1960') {
    const version = this.getVersion(versionId);
    return version.limits || {};
  }

  buildSearchIndex(versionId = 'RVR1960') {
    const meta = this.findVersionMeta(versionId);
    if (this.searchIndexCache.has(meta.id)) return this.searchIndexCache.get(meta.id);
    const version = this.getVersion(meta.id);
    const index = [];
    const seen = new Set();
    for (const [rawBook, chapters] of Object.entries(version.books || {})) {
      const book = this.findCanonicalBook(rawBook, meta.id) || rawBook;
      for (const [chapter, verses] of Object.entries(chapters || {})) {
        for (const [verse, rawText] of Object.entries(verses || {})) {
          const text = String(rawText || '').trim();
          if (!text) continue;
          const key = `${normalizeString(book)}:${chapter}:${verse}`;
          if (seen.has(key)) continue;
          seen.add(key);
          index.push({ book, chapter, verse, reference: `${book} ${chapter}:${verse}`, text, normalizedText: normalizeString(text) });
        }
      }
    }
    this.searchIndexCache.set(meta.id, index);
    return index;
  }

  searchVerses({ query, versionId = 'RVR1960', limit = 16 } = {}) {
    const normalizedQuery = normalizeString(query);
    const version = this.findVersionMeta(versionId).id;
    if (normalizedQuery.length < 3) return { results: [], total: 0, version, minimumLength: 3 };
    const matches = [];
    for (const entry of this.buildSearchIndex(version)) {
      const position = entry.normalizedText.indexOf(normalizedQuery);
      if (position < 0) continue;
      matches.push({ book: entry.book, chapter: entry.chapter, verse: entry.verse, reference: entry.reference, text: entry.text, relevance: position === 0 ? 0 : position });
    }
    matches.sort((a, b) => a.relevance - b.relevance || a.reference.localeCompare(b.reference, 'es', { numeric: true }));
    const safeLimit = Math.max(1, Math.min(30, Number(limit) || 16));
    return { results: matches.slice(0, safeLimit).map(({ relevance, ...entry }) => entry), total: matches.length, version };
  }

  findCanonicalBook(rawInput, versionId = 'RVR1960') {
    if (!rawInput) return null;
    const version = this.getVersion(versionId);
    const books = Object.keys(version.books || {});
    const cleaned = cleanBookInput(rawInput);
    const norm = normalizeString(cleaned);

    if (BOOK_ALIASES[norm]) {
      const aliasTarget = BOOK_ALIASES[norm];
      const foundInBooks = books.find(b => normalizeString(b) === normalizeString(aliasTarget));
      if (foundInBooks) return foundInBooks;
    }

    const exactMatch = books.find(b => normalizeString(b) === norm);
    if (exactMatch) return exactMatch;

    const startsMatch = books.find(b => normalizeString(b).startsWith(norm));
    if (startsMatch) return startsMatch;

    return rawInput.trim();
  }

  validateCitation({ book, chapter, verse, versionId = 'RVR1960' }) {
    if (!book) {
      return { valid: false, error: 'Por favor introduce un libro bíblico' };
    }

    let version;
    try {
      version = this.getVersion(versionId);
    } catch (e) {
      return { valid: false, error: e.message };
    }

    const canonBook = this.findCanonicalBook(book, versionId);
    const bookLimits = version.limits ? version.limits[canonBook] : null;

    if (!bookLimits) {
      return { valid: false, error: 'El libro introducido no se encuentra en la Biblia.' };
    }

    const chapStr = chapter !== undefined && chapter !== null ? String(chapter).trim() : '';
    if (!chapStr) {
      return { valid: false, error: `Introduce el capítulo de ${canonBook}.` };
    }

    const chapNum = parseInt(chapStr, 10);
    if (isNaN(chapNum) || chapNum < 1 || chapNum > bookLimits.length) {
      return { valid: false, error: `El libro de ${canonBook} solo tiene ${bookLimits.length} capítulos.` };
    }

    const maxVerses = bookLimits[chapNum - 1];
    const verseStr = verse !== undefined && verse !== null ? String(verse).trim() : '';

    let startVerse = 1;
    let endVerse = maxVerses;
    let hasExplicitVerse = false;

    if (verseStr) {
      hasExplicitVerse = true;
      const versePattern = /^\d+(-\d+)?$/;
      if (!versePattern.test(verseStr)) {
        return { valid: false, error: 'Introduce un versículo válido o un rango como 4-7' };
      }

      if (verseStr.includes('-')) {
        const parts = verseStr.split('-').map(Number);
        startVerse = parts[0];
        endVerse = parts[1];
      } else {
        startVerse = endVerse = parseInt(verseStr, 10);
      }

      if (startVerse < 1 || startVerse > maxVerses) {
        return { valid: false, error: `El capítulo ${chapNum} de ${canonBook} solo tiene ${maxVerses} versículos.` };
      }

      if (endVerse > maxVerses) {
        return { valid: false, error: `El capítulo ${chapNum} de ${canonBook} solo tiene ${maxVerses} versículos. Rango inválido.` };
      }

      if (startVerse > endVerse) {
        return { valid: false, error: 'El rango de versículos es inválido.' };
      }
    }

    return {
      valid: true,
      book: canonBook,
      chapter: chapNum,
      startVerse,
      endVerse,
      hasExplicitVerse,
      maxVerses,
      versionId: version.id,
      versionName: version.name
    };
  }

  getVerses({ book, chapter, startVerse, endVerse, versionId = 'RVR1960' }) {
    const version = this.getVersion(versionId);
    const bookData = version.books ? version.books[book] : null;
    if (!bookData) return [];

    const chapData = bookData[String(chapter)];
    if (!chapData) return [];

    const result = [];
    for (let v = startVerse; v <= endVerse; v++) {
      const text = chapData[String(v)];
      if (text) {
        result.push({ number: v, text: text.trim() });
      }
    }
    return result;
  }

  createBibleSlides({ book, chapter, verse, mode = 'citation', versionId = 'RVR1960', profile }) {
    const validation = this.validateCitation({ book, chapter, verse, versionId });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const {
      book: canonBook,
      chapter: chapNum,
      startVerse,
      endVerse,
      hasExplicitVerse,
      versionName
    } = validation;

    const actualVersionId = validation.versionId;
    const chapStr = String(chapNum);
    const verseStr = hasExplicitVerse ? (startVerse === endVerse ? String(startVerse) : `${startVerse}-${endVerse}`) : '';
    const cvText = verseStr ? `${chapStr}:${verseStr}` : chapStr;
    const fullRef = `${canonBook} ${cvText}`;

    // MODO 1: SOLO CITA (FORMATO CLÁSICO DE MAIN.HTML: LIBRO ARRIBA GRANDE, NÚMERO ABAJO GRANDE)
    if (mode === 'citation') {
      const slide = {
        type: 'bible',
        mode: 'citation',
        isTitleOnly: true,
        book: canonBook,
        chapter: chapStr,
        verse: verseStr,
        chapterVerse: cvText,
        reference: fullRef,
        version: actualVersionId,
        versionName: versionName,
        sectionLabel: 'Cita Bíblica',
        badge: actualVersionId,
        title: canonBook.toUpperCase(),
        subtitle: '',
        lines: [],
        text: cvText,
        slideNum: 1,
        totalSlides: 1
      };
      return [slide];
    }

    // MODO 2: CITA Y TEXTO BÍBLICO (PAGINADO POR VERSÍCULOS)
    const verseItems = this.getVerses({
      book: canonBook,
      chapter: chapNum,
      startVerse,
      endVerse,
      versionId: actualVersionId
    });

    if (verseItems.length === 0) {
      throw new Error(`No se encontró texto para ${fullRef} en ${versionName}.`);
    }

    const paginatedGroups = paginateVerseItems(verseItems, profile);
    const totalSlides = paginatedGroups.length;

    const slides = paginatedGroups.map(({ group, layout }, index) => {
      const firstItem = group[0];
      const lastItem = group[group.length - 1];

      const slideVerseRange = firstItem.number === lastItem.number
        ? String(firstItem.number)
        : `${firstItem.number}-${lastItem.number}`;

      const slideCv = `${chapStr}:${slideVerseRange}`;
      const slideTitle = `${canonBook.toUpperCase()} ${slideCv}`;
      const slideRef = `${canonBook} ${slideCv}`;

      // Formato HTML con números de versículo
      const formattedParts = group.map(item => {
        const numLabel = item.part && item.part > 1 ? `${item.number}b` : `${item.number}`;
        return `<span class="bible-verse-num">${numLabel}</span> ${escapeHtml(item.text)}`;
      });
      const formattedText = formattedParts.join(' ');

      // Texto plano
      const plainParts = group.map(item => `[${item.number}] ${item.text}`);
      const plainText = plainParts.join(' ');

      return {
        type: 'bible',
        mode: 'text',
        isTitleOnly: false,
        book: canonBook,
        chapter: chapStr,
        verse: slideVerseRange,
        chapterVerse: slideCv,
        reference: slideRef,
        fullReference: `${slideRef} (${actualVersionId})`,
        version: actualVersionId,
        versionName: versionName,
        sectionLabel: slideRef,
        badge: actualVersionId,
        title: slideTitle,
        subtitle: versionName,
        slideNum: index + 1,
        totalSlides: totalSlides,
        verses: group,
        formattedText: formattedText,
        text: plainText,
        lines: [plainText],
        displayLines: layout.displayLines,
        fontSize: layout.fontSize
      };
    });

    return slides;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createBibleService(options) {
  return new BibleService(options);
}

module.exports = {
  BibleService,
  createBibleService,
  cleanBookInput,
  splitLongVerse,
  paginateVerseItems
};
