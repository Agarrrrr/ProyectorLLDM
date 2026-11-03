const profile = {
  maxLines: 6, minFontSize: 156, fontSize: 207, font: 'montserrat', color: '#ffffff',
  chorusColor: '#ffffff', indicatorColor: '#d4af37', showVerseNumber: false,
  background: 'original', backgroundColor: '#101f38'
};
const lyricsDefaults = { hymn: { ...profile }, choir: { ...profile } };
function validateLyrics(input = lyricsDefaults) {
  if (!input || Object.keys(input).length !== 2 || !input.hymn || !input.choir) throw new Error('Ajustes de letras incompletos.');
  const output = {};
  for (const type of ['hymn', 'choir']) {
    const value = input[type];
    if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !Object.hasOwn(profile, key)) ||
        Object.keys(profile).some(key => !Object.hasOwn(value, key)) ||
        !Number.isSafeInteger(value.maxLines) || value.maxLines < 1 ||
        !Number.isInteger(value.minFontSize) || value.minFontSize < 24 || value.minFontSize > 400 ||
        !Number.isInteger(value.fontSize) || value.fontSize < value.minFontSize || value.fontSize > 400 ||
        typeof value.showVerseNumber !== 'boolean' ||
        !['color', 'chorusColor', 'indicatorColor', 'backgroundColor'].every(key => /^#[a-f0-9]{6}$/i.test(value[key])) ||
        !/^(montserrat|inter|outfit|playfair|font-[a-f0-9]{24})$/.test(value.font) ||
        !/^(original|solid|preset-(navy|burgundy|emerald|slate)|image-[a-f0-9]{24})$/.test(value.background)) throw new Error('Escribe un número entero positivo de renglones y tamaños entre 24 y 400. El mínimo no puede superar al máximo.');
    output[type] = { ...value };
  }
  return output;
}
module.exports = { lyricsDefaults, validateLyrics };
