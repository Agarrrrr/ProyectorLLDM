import { addDays, mondayOf, weekRange } from '../calendar';
import type { WeekData } from '../types';
export type Rect = { kind: 'rect'; x: number; y: number; width: number; height: number; fill: string; stroke?: string; radius?: number };
export type Text = { kind: 'text'; x: number; y: number; width: number; lines: string[]; size: number; lineHeight: number; color: string; weight: number; align: CanvasTextAlign; family?: string; tracking?: number };
export type Logo = { kind: 'logo'; asset?: 'church' | 'centenary'; x: number; y: number; width: number; height: number };
export type ImageDocument = { id: string; title: string; width: number; height: number; commands: (Rect | Text | Logo)[] };
type Cell = { text: string; fill?: string; size?: number; parts?: { text: string; size: number; color?: string; weight?: number }[] };
const NAVY = '#0b172e', GOLD = '#d6bd69', INK = '#15273c', BORDER = '#d9ceb7';
const WIDTH = 1024, PAD = 28, MAX_BODY = 1300;
const measure = document.createElement('canvas').getContext('2d')!;
function wrap(value: string, width: number, size: number, weight = 700): string[] {
  measure.font = `${weight} ${size}px Montserrat`;
  return String(value || '').split('\n').flatMap(paragraph => {
    const lines: string[] = []; let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (measure.measureText(word).width > width) throw new Error(`Revisa la separación de «${word.slice(0, 30)}»: es demasiado largo para la imagen.`);
      const next = line ? `${line} ${word}` : word;
      if (line && measure.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line); return lines.length ? lines : [''];
  });
}
function text(x: number, y: number, width: number, lines: string[], size: number, color = INK, weight = 700, align: CanvasTextAlign = 'center'): Text {
  return { kind: 'text', x, y, width, lines, size, lineHeight: Math.ceil(size * 1.4), color, weight, align };
}
function tableDocuments(id: string, title: string, week: WeekData, widths: number[], labels: string[], rows: Cell[][], colony: string, note = '', captions: Record<number, string> = {}): ImageDocument[] {
  const location = colony.replace(/^col\.?\s+/i, 'Colonia ');
  const identity = ['LA LUZ DEL MUNDO', location.toUpperCase()].filter(Boolean).join(' · ');
  const identityLines = wrap(identity, 548, 12);
  const extra = Math.max(0, identityLines.length - 1) * 17;
  const dateLines = wrap(weekRange(week.startDate).toUpperCase(), 292, 13, 800);
  const pillHeight = Math.max(30, dateLines.length * 19 + 10);
  const headerHeight = Math.max(80 + extra, pillHeight + 28);
  const pillTop = (headerHeight - pillHeight) / 2;
  const noteLines = note ? wrap(note, WIDTH - PAD * 2 - 8, 14) : [];
  const noteHeight = noteLines.length ? noteLines.length * 20 + 8 : 0;
  const columnCaptions = widths.map((width, column) => captions[column] ? wrap(captions[column], width - 20, 12) : []);
  const columnHeaderHeight = Math.max(44, ...columnCaptions.filter(lines => lines.length).map(lines => 27 + lines.length * 17 + 14));
  const measured = rows.map(cells => {
    const layouts = cells.map((cell, index) => {
      const parts = cell.parts || [{ text: cell.text, size: cell.size || 21, color: INK, weight: 700 }];
      const runs = parts.map(part => ({ ...part, lines: wrap(part.text, widths[index] - 18, part.size, part.weight || 700), lineHeight: Math.ceil(part.size * 1.22) }));
      return { ...cell, runs, height: runs.reduce((sum, run) => sum + run.lines.length * run.lineHeight, 0) };
    });
    return { cells: layouts, height: Math.max(40, ...layouts.map(cell => cell.height + 12)) };
  });
  const chunks = measured.flatMap(row => {
    if (row.height <= MAX_BODY) return [row];
    const pending = row.cells.map(cell => cell.runs.map(run => ({ ...run, lines: [...run.lines] })));
    const parts: typeof measured = [];
    while (pending.some(runs => runs.length)) {
      const cells = row.cells.map((cell, column) => {
        const runs: typeof cell.runs = [];
        let height = 0;
        while (pending[column].length) {
          const run = pending[column][0];
          const count = Math.floor((MAX_BODY - 12 - height) / run.lineHeight);
          if (count < 1) break;
          const lines = run.lines.splice(0, count);
          runs.push({ ...run, lines });
          height += lines.length * run.lineHeight;
          if (!run.lines.length) pending[column].shift();
        }
        return { ...cell, runs, height };
      });
      parts.push({ cells, height: Math.max(40, ...cells.map(cell => cell.height + 12)) });
    }
    return parts;
  });
  const pages: typeof measured[] = []; let page: typeof measured = [], used = 0;
  for (const row of chunks) {
    if (page.length && used + row.height > MAX_BODY) { pages.push(page); page = []; used = 0; }
    page.push(row); used += row.height;
  }
  if (page.length) pages.push(page);
  return pages.map((items, index) => {
    const tableTop = headerHeight + 14 + noteHeight;
    const footerTop = tableTop + columnHeaderHeight + items.reduce((sum, row) => sum + row.height, 0) + 12;
    const height = footerTop + 81;
    const commands: ImageDocument['commands'] = [
      { kind: 'rect', x: 0, y: 0, width: WIDTH, height, fill: '#a88c47' },
      { kind: 'rect', x: 8, y: 8, width: WIDTH - 16, height: height - 16, fill: '#fffdf8' },
      { kind: 'rect', x: 8, y: 8, width: WIDTH - 16, height: headerHeight - 8, fill: NAVY },
      { kind: 'logo', x: 22, y: 16, width: 48, height: 48 },
      { ...text(90, 16, 548, identityLines, 12, GOLD, 700, 'left'), tracking: .6 },
      { ...text(90, 35 + extra, 548, [title.toUpperCase()], 26, '#ffffff', 700, 'left'), family: 'Outfit', tracking: .3 },
      { kind: 'rect', x: 680, y: pillTop, width: 316, height: pillHeight, fill: '$gold', radius: pillHeight / 2 },
      text(692, pillTop + (pillHeight - dateLines.length * 19) / 2, 292, dateLines, 13, '#ffffff', 800),
      { kind: 'rect', x: 8, y: headerHeight, width: WIDTH - 16, height: 3, fill: '#b49236' }
    ];
    if (noteLines.length) commands.push(text(PAD + 4, headerHeight + 10, WIDTH - PAD * 2 - 8, noteLines, 14, INK, 600, 'left'));
    let y = tableTop, x = PAD;
    widths.forEach((width, column) => {
      commands.push({ kind: 'rect', x, y, width, height: columnHeaderHeight, fill: NAVY, stroke: '#ad985d' });
      commands.push(text(x + 10, y + (columnCaptions[column].length ? 7 : (columnHeaderHeight - 27) / 2), width - 20, [labels[column]], 19, GOLD, 800));
      if (columnCaptions[column].length) commands.push({ ...text(x + 10, y + 35, width - 20, columnCaptions[column], 12, '#ffffff', 700), lineHeight: 17 });
      x += width;
    });
    y += columnHeaderHeight;
    items.forEach((row, rowIndex) => {
      x = PAD;
      row.cells.forEach((cell, column) => {
        const width = widths[column];
        commands.push({ kind: 'rect', x, y, width, height: row.height, fill: cell.fill || (rowIndex % 2 ? '#f8f7f1' : '#ffffff'), stroke: BORDER });
        let runY = y + (row.height - cell.height) / 2;
        for (const run of cell.runs) {
          commands.push({ ...text(x + 9, runY, width - 18, run.lines, run.size, run.color || INK, run.weight || 700), lineHeight: run.lineHeight });
          runY += run.lines.length * run.lineHeight;
        }
        x += width;
      });
      y += row.height;
    });
    commands.push(
      { kind: 'rect', x: 8, y: footerTop, width: WIDTH - 16, height: 3, fill: '#b49236' },
      { kind: 'rect', x: 8, y: footerTop + 3, width: WIDTH - 16, height: 70, fill: NAVY },
      { kind: 'logo', asset: 'centenary', x: WIDTH - 102, y: footerTop + 10, width: 62, height: 57 },
      { ...text(PAD, footerTop + 26, WIDTH - 168, ['100 AÑOS DE ESPERANZA Y SALVACIÓN'], 13, GOLD, 600), tracking: 1 }
    );
    return { id: `${id}${pages.length > 1 ? '-' + (index + 1) : ''}`, title: title + (pages.length > 1 ? ` · ${index + 1}/${pages.length}` : ''), width: WIDTH, height, commands };
  });
}
export function buildImageDocuments(week: WeekData, colony = ''): ImageDocument[] {
  const days = [['dom_ini', 'Domingo', true], ['lun', 'Lunes', false], ['mar', 'Martes', false], ['mie', 'Miércoles', false], ['jue', 'Jueves', true], ['vie', 'Viernes', false], ['sab', 'Sábado', false], ['dom', 'Domingo', true]] as const;
  const active = days.filter(([key, , dual]) => (dual ? [0, 1, 3, 5, 6] : [0, 1, 2, 3]).some(i => !!week.oraciones[key]?.[i]?.trim()));
  const rows: Cell[][] = (active.length ? active : days).map(([key, label, dual]) => {
    const cells = week.oraciones[key] || [];
    const dayLabel = ({ Domingo: 'Dom', Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue', Viernes: 'Vie', Sábado: 'Sáb' })[label];
    const parts = dual ? [
      ...(cells[3]?.trim() ? [{ text: (cells[2] || 'Servicio').toUpperCase(), size: 12, color: '#a98b2f', weight: 800 }, { text: cells[3], size: 21, weight: 800 }] : []),
      ...(cells[5]?.trim() ? [{ text: (cells[4] || 'P. Doct.').toUpperCase(), size: 12, color: '#a98b2f', weight: 800 }, { text: cells[5], size: 21, weight: 800 }] : [])
    ] : undefined;
    const date = addDays(mondayOf(week.startDate), days.findIndex(([day]) => day === key) - 1);
    const shortDate = date.slice(5).split('-').reverse().join('/');
    return [{ text: dayLabel + '\n' + shortDate, fill: '#eee9dd', size: 21 }, { text: cells[0] || '' }, { text: cells[1] || '' }, { text: dual ? '' : cells[2] || '', parts }, { text: cells[dual ? 6 : 3] || '' }];
  });
  const result = tableDocuments('oraciones', 'Lista de oraciones', week, [116, 213, 213, 213, 213], ['Día', '5:00 AM', '9:00 AM', '7:00 PM', 'Consagración'], rows, colony, '', week.oraciones.encargada9AM ? { 2: `Enc: ${week.oraciones.encargada9AM}` } : {});
  function details(primary: string, fields: { label: string; value: string }[] = []) {
    return [primary, ...fields.filter(field => field.value.trim()).map(field => [field.label, field.value].filter(Boolean).join(' · '))].filter(Boolean).join('\n');
  }
  const flowers = week.flores.filter(item => item.enabled !== false);
  if (flowers.length) result.push(...tableDocuments('flores', 'Lista de flores', week, [280, 688], ['Fecha', 'Responsables'], flowers.map(item => [{ text: item.dateStr, fill: '#eee7d7', size: 21 }, { text: details(item.names, item.fields), size: 24 }]), colony));
  const sales = week.ventas.sundays?.filter(item => item.enabled !== false) || [];
  if (sales.length) result.push(...tableDocuments('ventas', 'Venta de comida', week, [280, 688], ['Fecha', 'Grupos responsables'], sales.map(item => [{ text: item.dateStr, fill: '#eee7d7', size: 21 }, { text: details(item.groups, item.fields), size: 24 }]), colony));
  return result;
}
