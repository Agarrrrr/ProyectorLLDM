const profile = {
  maxLines: 6, minFontSize: 156, fontSize: 207, font: 'montserrat', color: '#ffffff',
  chorusColor: '#ffffff', indicatorColor: '#d4af37', showVerseNumber: false,
  background: 'original', backgroundColor: '#101f38',
  lineGap: 3, textShadow: true
};
const bible = { color: '#ffffff', indicatorColor: '#cc9900', textShadow: true };
const lyricsDefaults = { hymn: { ...profile }, choir: { ...profile }, bible };
const isColor = value => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value);
function validateLyrics(input = lyricsDefaults) {
  if (!input || Object.keys(input).some(key => !Object.hasOwn(lyricsDefaults, key)) || !input.hymn || !input.choir) throw new Error('Ajustes de letras incompletos.');
  const output = {};
  for (const type of ['hymn', 'choir']) {
    const value = input[type];
    if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !Object.hasOwn(profile, key)) ||
        Object.keys(profile).some(key => !['lineGap', 'textShadow'].includes(key) && !Object.hasOwn(value, key)) ||
        !Number.isSafeInteger(value.maxLines) || value.maxLines < 1 ||
        !Number.isInteger(value.minFontSize) || value.minFontSize < 24 || value.minFontSize > 400 ||
        !Number.isInteger(value.fontSize) || value.fontSize < value.minFontSize || value.fontSize > 400 ||
        typeof value.showVerseNumber !== 'boolean' ||
        !['color', 'chorusColor', 'indicatorColor', 'backgroundColor'].every(key => isColor(value[key])) ||
        !/^(montserrat|inter|outfit|playfair|font-[a-f0-9]{24})$/.test(value.font) ||
        !/^(original|solid|preset-(navy|burgundy|emerald|slate)|image-[a-f0-9]{24})$/.test(value.background)) throw new Error('Escribe un número entero positivo de renglones y tamaños entre 24 y 400. El mínimo no puede superar al máximo.');
    const normalized = { lineGap: profile.lineGap, textShadow: profile.textShadow, ...value };
    if (!Number.isInteger(normalized.lineGap) || normalized.lineGap < 0 || normalized.lineGap > 24) throw new Error('La separación entre renglones debe ser un entero de 0 a 24.');
    if (typeof normalized.textShadow !== 'boolean') throw new Error('La sombra del texto debe estar activada o desactivada.');
    output[type] = normalized;
  }
  const bibleStyle = input.bible === undefined ? bible : input.bible;
  if (!bibleStyle || Object.keys(bibleStyle).some(key => !Object.hasOwn(bible, key)) ||
      !isColor(bibleStyle.color) || !isColor(bibleStyle.indicatorColor) || typeof bibleStyle.textShadow !== 'boolean') throw new Error('Ajustes de Biblia no válidos.');
  output.bible = { ...bibleStyle };
  return output;
}
module.exports = { lyricsDefaults, validateLyrics };
