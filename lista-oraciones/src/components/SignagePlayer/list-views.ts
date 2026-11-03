import type { WeekData } from '../../types';

export function schedulePages(week: WeekData, key: 'flores' | 'ventas') {
  const rows = key === 'flores' ? week.flores : week.ventas.sundays || [];
  const count = rows.filter(row => row.enabled !== false).length;
  const perPage = key === 'flores' ? 2 : 3;
  return Array.from({ length: Math.ceil(count / perPage) }, (_, index) => index ? `${key}:${index}` : key);
}

export function visibleListKeys(week: WeekData) {
  const vis: Partial<NonNullable<WeekData['visibleSlides']>> = week.visibleSlides || {};
  const keys: string[] = [];
  if (vis.oraciones5AM !== false) keys.push('orac5');
  if (vis.oraciones9AM !== false) keys.push('orac9');
  if (vis.oracionesTarde !== false) keys.push('tarde');
  if (vis.aviso !== false && (week.notice?.text ?? week.floresCustomMessage)?.trim()) keys.push('mensaje_flores');
  for (const kind of ['flores', 'ventas'] as const) {
    if (vis[kind] !== false) keys.push(...schedulePages(week, kind).filter(key => week.visiblePages?.[key] !== false));
  }
  return keys;
}

const titles: Record<string, string> = {
  orac5: 'Oraciones · 5:00 AM', orac9: 'Oraciones · 9:00 AM', tarde: 'Oraciones · tarde',
  mensaje_flores: 'Aviso', flores: 'Lista de flores', ventas: 'Venta de comida'
};
export function listViewTitle(view: string) {
  const [kind, page] = view.split(':');
  return titles[kind] + (page ? ` · Página ${Number(page) + 1}` : '');
}
