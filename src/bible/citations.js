const CANONICAL_BOOKS = [
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

function findCanonicalBook(input) {
  if (!input) return null;
  const norm = input.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  return CANONICAL_BOOKS.find(b => b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") === norm) || input.trim();
}

function createBibleCitationSlide(rawBook, chapter, verse) {
  const book = findCanonicalBook(rawBook);
  if (!book) return null;

  const chapStr = chapter !== undefined && chapter !== null ? String(chapter).trim() : '';
  const verseStr = verse !== undefined && verse !== null ? String(verse).trim() : '';
  const cvText = chapStr ? (verseStr ? `${chapStr}:${verseStr}` : chapStr) : '';
  const fullRef = cvText ? `${book} ${cvText}` : book;

  return {
    type: 'bible',
    mode: 'citation',
    isTitleOnly: true,
    book: book,
    chapter: chapStr,
    verse: verseStr,
    chapterVerse: cvText,
    reference: fullRef,
    sectionLabel: 'Cita Bíblica',
    badge: '',
    title: book.toUpperCase(),
    subtitle: '',
    lines: [],
    text: cvText,
    slideNum: 1,
    totalSlides: 1
  };
}

module.exports = { CANONICAL_BOOKS, createBibleCitationSlide, findCanonicalBook };
