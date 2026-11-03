import { addDays, closingSunday, mondayOf, formatCalendarDate, weekRange } from '../calendar';
import type { WeekData } from '../types';

export const DEFAULT_SALES_GROUPS = [''];

export const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const formatDate = (date: Date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

export const formatHumanDateRange = (value: string) => weekRange(value);

export const generateEmptyWeek = (mondayDateStr: string, customSalesGroups: string[] = DEFAULT_SALES_GROUPS): WeekData => {
  mondayDateStr = mondayOf(mondayDateStr);
  const sunday = (index: number) => addDays(closingSunday(mondayDateStr), 7 * index);
  const eventDate = (index: number) => ({ date: sunday(index), dateStr: formatCalendarDate(sunday(index)) });

  const sundays = Array.from({ length: 5 }, (_, i) => {
    const gIdx = i % customSalesGroups.length;
    return {
      ...eventDate(i),
      shortDateStr: sunday(i),
      cycleLabel: `Dom ${gIdx + 1}`,
      groups: customSalesGroups[gIdx] ?? '',
      highlight: i === 0,
      enabled: true
    };
  });

  return {
    startDate: mondayDateStr,
    oraciones: {
      encargada9AM: "",
      dom_ini: ["", "", "", "", "", "", ""],
      lun: ["", "", "", ""],
      mar: ["", "", "", ""],
      mie: ["", "", "", ""],
      jue: ["", "", "", "", "", "", ""],
      vie: ["", "", "", ""],
      sab: ["", "", "", ""],
      dom: ["", "", "", "", "", "", ""]
    },
    flores: [
      { ...eventDate(0), names: "", enabled: true },
      { ...eventDate(1), names: "", enabled: true },
      { ...eventDate(2), names: "", enabled: true }
    ],
    ventas: {
      startingCycleIndex: 0,
      sundays
    },
    visibleSlides: {
      oraciones5AM: true,
      oraciones9AM: true,
      oracionesTarde: true,
      flores: true,
      ventas: true
    }
  };
};

export const normalizeWeekData = (week: WeekData): WeekData => {
  const normalized = structuredClone(week);
  if (normalized.oraciones) {
    if (!normalized.oraciones.dom_ini) {
      normalized.oraciones.dom_ini = ["", "", "", "", "", "", ""];
    } else if (normalized.oraciones.dom_ini.length === 4) {
      const d = normalized.oraciones.dom_ini;
      normalized.oraciones.dom_ini = [d[0], d[1], "Servicio", d[2], "P. Doct.", "", d[3]];
    }
    if (normalized.oraciones.dom && normalized.oraciones.dom.length === 4) {
      const d = normalized.oraciones.dom;
      normalized.oraciones.dom = [d[0], d[1], "Servicio", d[2], "P. Doct.", "", d[3]];
    }
    if (normalized.oraciones.jue && normalized.oraciones.jue.length === 4) {
      const d = normalized.oraciones.jue;
      normalized.oraciones.jue = [d[0], d[1], "Servicio", d[2], "P. Doct.", "", d[3]];
    }
  }
  const firstSunday = closingSunday(week.startDate);
  const dayMonth = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  function normalizeEvent<T extends { date?: string; dateStr: string; dateLocked?: boolean; shortDateStr?: string }>(row: T, index: number): T {
    const withDate = (date: string) => ({
      ...row, date, dateStr: formatCalendarDate(date),
      ...(row.shortDateStr === undefined ? {} : { shortDateStr: date })
    });
    if (row.date) {
      if (row.dateLocked) return withDate(row.date);
      const sunday = closingSunday(row.date);
      const previous = addDays(sunday, -7);
      const nearest = Date.parse(sunday) - Date.parse(row.date) > 3 * 86400000 ? previous : sunday;
      return withDate(nearest);
    }
    // Older installations generated these labels from the selected date plus six days.
    const date = addDays(firstSunday, index * 7);
    const label = row.dateStr.trim().toLowerCase().replace(/^domingo,/, 'domingo');
    const candidates = [date, addDays(date, 1), addDays(week.startDate, 6 + index * 7)];
    if (!candidates.some(value => {
      const day = 'domingo ' + dayMonth.format(new Date(value + 'T12:00:00Z'));
      return label === day || label === day + ' de ' + value.slice(0, 4);
    })) return row;
    return withDate(date);
  }
  normalized.flores = normalized.flores.map(normalizeEvent);
  if (normalized.ventas.sundays) normalized.ventas.sundays = normalized.ventas.sundays.map(normalizeEvent);
  if (!normalized.visibleSlides) {
    normalized.visibleSlides = {
      oraciones5AM: true,
      oraciones9AM: true,
      oracionesTarde: true,
      flores: true,
      ventas: true
    };
  }
  return normalized;
};
