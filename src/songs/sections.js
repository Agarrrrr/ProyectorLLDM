function expandSongSections(sections) {
  if (!sections || sections.length <= 1) return sections || [];
  const hasChorus = sections.some(s => s.type === 'chorus' || /^coro\b/i.test(String(s.label || '').trim()));
  if (!hasChorus) return sections;

  const primaryChorus = sections.find(s => s.type === 'chorus' || /^coro\b/i.test(String(s.label || '').trim()));
  let lastSeenChorus = null;
  const result = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const isChorus = sec.type === 'chorus' || /^coro\b/i.test(String(sec.label || '').trim());
    if (isChorus) {
      lastSeenChorus = sec;
      result.push(sec);
    } else {
      result.push(sec);
      const nextSec = sections[i + 1];
      const nextIsChorus = nextSec && (nextSec.type === 'chorus' || /^coro\b/i.test(String(nextSec.label || '').trim()));
      if (!nextIsChorus) {
        const chorusToInsert = lastSeenChorus || primaryChorus;
        if (chorusToInsert) {
          result.push({
            type: 'chorus',
            label: 'Coro',
            lines: [...chorusToInsert.lines]
          });
        }
      }
    }
  }
  return result;
}


function normalizeChoirSection(section) {
  const label = String(section.label || '').trim();
  const name = label.toLowerCase();
  let type = section.type || 'verse';
  if (/\brespuestas?\b|^variantes de tenor y bajo$|^voces inferiores en el coro$/.test(name) || type === 'response') type = 'response';
  else if (type === 'final' || /^(?:final|finale|coda|cierre|solo final|final común|campanas y coda|coro final)$/.test(name)) type = 'final';
  else if (/^final (?:de la|del coro)\b/.test(name)) type = 'part';
  else if (type === 'coro' || /^(?:(?:primer|segundo|tercer) )?coro\b|^refrán$|^segunda casilla del coro$/.test(name)) type = 'chorus';
  else if (type === 'estrofa') type = 'verse';
  return { ...section, type, label };
}

function choirSections(sections) {
  const result = [];
  let finished = false;
  for (const source of sections || []) {
    const section = normalizeChoirSection(source);
    if (section.type === 'response') continue;
    if (finished && section.type !== 'final') break;
    result.push(section);
    if (section.type === 'final') finished = true;
  }
  return result;
}

module.exports = { expandSongSections, choirSections, normalizeChoirSection };
