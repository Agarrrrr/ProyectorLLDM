const fs = require('node:fs');
const path = require('node:path');

const SLIDE_META = {
  orac5: { title: 'Oraciones 5:00 AM', badge: 'ORACIONES 5:00 AM' },
  orac9: { title: 'Oraciones 9:00 AM', badge: 'ORACIONES 9:00 AM' },
  tarde: { title: 'Oraciones por la Tarde', badge: 'ORACIONES TARDE' },
  mensaje_flores: { title: 'Aviso', badge: 'AVISO' },
  flores: { title: 'Lista de Flores', badge: 'LISTA DE FLORES' },
  ventas: { title: 'Venta de Comida', badge: 'VENTA DE COMIDA' }
};

function normalizeWeek(week) {
  if (!week || typeof week !== 'object') return week;
  const normalized = structuredClone(week);
  if (normalized.oraciones && typeof normalized.oraciones === 'object') {
    if (typeof normalized.oraciones.encargada9AM !== 'string') {
      normalized.oraciones.encargada9AM = '';
    }
    if (!Array.isArray(normalized.oraciones.dom_ini)) {
      normalized.oraciones.dom_ini = ['', '', '', '', '', '', ''];
    } else if (normalized.oraciones.dom_ini.length === 4) {
      const d = normalized.oraciones.dom_ini;
      normalized.oraciones.dom_ini = [d[0], d[1], 'Servicio', d[2], 'P. Doct.', '', d[3]];
    }
    if (Array.isArray(normalized.oraciones.dom) && normalized.oraciones.dom.length === 4) {
      const d = normalized.oraciones.dom;
      normalized.oraciones.dom = [d[0], d[1], 'Servicio', d[2], 'P. Doct.', '', d[3]];
    }
    if (Array.isArray(normalized.oraciones.jue) && normalized.oraciones.jue.length === 4) {
      const d = normalized.oraciones.jue;
      normalized.oraciones.jue = [d[0], d[1], 'Servicio', d[2], 'P. Doct.', '', d[3]];
    }
  }
  if (!normalized.visibleSlides || typeof normalized.visibleSlides !== 'object') {
    normalized.visibleSlides = {
      oraciones5AM: true,
      oraciones9AM: true,
      oracionesTarde: true,
      flores: true,
      ventas: true
    };
  }
  return normalized;
}

function normalizeDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    return { currentWeek: null, customSalesGroups: null, weeks: {}, rotationSeconds: 15 };
  }
  const normalizedWeeks = {};
  if (doc.weeks && typeof doc.weeks === 'object' && !Array.isArray(doc.weeks)) {
    for (const [k, w] of Object.entries(doc.weeks)) {
      normalizedWeeks[k] = normalizeWeek(w);
    }
  }
  return {
    currentWeek: doc.currentWeek ? normalizeWeek(doc.currentWeek) : null,
    customSalesGroups: Array.isArray(doc.customSalesGroups) ? doc.customSalesGroups : null,
    weeks: normalizedWeeks,
    rotationSeconds: Number.isInteger(doc.rotationSeconds) && doc.rotationSeconds >= 1 && doc.rotationSeconds <= 600 ? doc.rotationSeconds : 15
  };
}

function slideKeys(week) {
  if (!week) return [];
  const visible = week.visibleSlides || {};
  const keys = [];
  if (visible.oraciones5AM !== false) keys.push('orac5');
  if (visible.oraciones9AM !== false) keys.push('orac9');
  if (visible.oracionesTarde !== false) keys.push('tarde');
  if (visible.aviso !== false && (week.notice?.text ?? week.floresCustomMessage)?.trim()) keys.push('mensaje_flores');
  for (const [key, rows, perPage] of [['flores', week.flores, 2], ['ventas', week.ventas?.sundays, 3]]) {
    if (visible[key] === false) continue;
    const count = (rows || []).filter(row => row.enabled !== false).length;
    for (let index = 0; index < Math.ceil(count / perPage); index++) {
      const page = index ? `${key}:${index}` : key;
      if (week.visiblePages?.[page] !== false) keys.push(page);
    }
  }
  return keys;
}

const validDayArray = (arr, allowedLengths) =>
  Array.isArray(arr) && allowedLengths.includes(arr.length) && Array.from(arr).every(value => typeof value === 'string');

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validRow(item) {
  return typeof item?.dateStr === 'string' && (item.date === undefined || validDate(item.date)) &&
    (item.enabled === undefined || typeof item.enabled === 'boolean') &&
    (item.dateLocked === undefined || typeof item.dateLocked === 'boolean') &&
    (item.fields === undefined || (Array.isArray(item.fields) && item.fields.every(field =>
      typeof field?.label === 'string' && field.label.length <= 100 && typeof field.value === 'string' && field.value.length <= 1000)));
}

function validSale(item) {
  return validRow(item) && typeof item.groups === 'string' &&
    (item.cycleLabel === undefined || typeof item.cycleLabel === 'string') &&
    (item.shortDateStr === undefined || typeof item.shortDateStr === 'string') &&
    (item.highlight === undefined || typeof item.highlight === 'boolean');
}

function validNotice(notice) {
  return notice === undefined || (notice && typeof notice.text === 'string' && notice.text.length <= 4000 &&
    ['left', 'center', 'right'].includes(notice.align) && ['top', 'middle', 'bottom'].includes(notice.position) &&
    ['compact', 'normal', 'large'].includes(notice.size));
}

const validWeek = week => week && validDate(week.startDate) && validNotice(week.notice) &&
  (week.floresCustomMessage === undefined || typeof week.floresCustomMessage === 'string') &&
  (week.visibleSlides === undefined || (week.visibleSlides && !Array.isArray(week.visibleSlides) &&
    typeof week.visibleSlides === 'object' && Object.values(week.visibleSlides).every(value => typeof value === 'boolean'))) &&
  (week.visiblePages === undefined || (week.visiblePages && !Array.isArray(week.visiblePages) &&
    typeof week.visiblePages === 'object' && Object.entries(week.visiblePages).every(([key, value]) =>
      /^(flores|ventas)(:[1-9]\d*)?$/.test(key) && typeof value === 'boolean'))) &&
  week.oraciones && typeof (week.oraciones.encargada9AM ?? '') === 'string' &&
  (week.oraciones.dom_ini === undefined || validDayArray(week.oraciones.dom_ini, [4, 7])) &&
  ['lun', 'mar', 'mie', 'vie', 'sab'].every(day => validDayArray(week.oraciones[day], [4])) &&
  ['jue', 'dom'].every(day => validDayArray(week.oraciones[day], [4, 7])) &&
  Array.isArray(week.flores) && week.flores.every(item => validRow(item) && typeof item.names === 'string') &&
  week.ventas && Number.isSafeInteger(week.ventas.startingCycleIndex) && week.ventas.startingCycleIndex >= 0 &&
  (week.ventas.sundays == null || (Array.isArray(week.ventas.sundays) && week.ventas.sundays.every(validSale)));

function validateDocument(next) {
  if (!Number.isInteger(next.rotationSeconds) || next.rotationSeconds < 1 || next.rotationSeconds > 600) {
    throw Object.assign(new Error('La duración debe ser un número entero entre 1 y 600 segundos.'), { status: 400 });
  }
  if ((next.currentWeek !== null && !validWeek(next.currentWeek)) ||
      !next.weeks || typeof next.weeks !== 'object' || Array.isArray(next.weeks) ||
      !Object.entries(next.weeks).every(([date, week]) => validDate(date) && validWeek(week)) ||
      (next.customSalesGroups !== null && (!Array.isArray(next.customSalesGroups) || (next.customSalesGroups.length < 1 || next.customSalesGroups.length > 24) || !next.customSalesGroups.every(item => typeof item === 'string')))) {
    throw Object.assign(new Error('Semana no válida.'), { status: 400 });
  }
}

// Atomic field patches merge simultaneous edits to different fields. A stale edit
// to the same field is rejected instead of silently overwriting another operator.
function createListsService({ dataDir, onChange }) {
  const filename = path.join(dataDir, 'lista-oraciones.json');
  let state = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {
    revision: 0, document: { currentWeek: null, customSalesGroups: null, weeks: {}, rotationSeconds: 15 }
  };
  const normalizedInitial = normalizeDocument(state.document);
  if (JSON.stringify(normalizedInitial) !== JSON.stringify(state.document)) {
    state = { revision: state.revision || 1, document: normalizedInitial };
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(filename, JSON.stringify(state, null, 2));
    } catch {}
  }

  function patch(operations) {
    if (!Array.isArray(operations) || !operations.length || operations.length > 500) {
      throw Object.assign(new Error('Cambios de lista no válidos.'), { status: 400 });
    }
    const next = structuredClone(state.document);
    for (const operation of operations) {
      const route = operation.path;
      if (!Array.isArray(route) || route.length < 1 || route.length > 12 ||
          !['currentWeek', 'customSalesGroups', 'weeks', 'rotationSeconds'].includes(route[0]) ||
          route.some(key => typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key))) {
        throw Object.assign(new Error('Campo de lista no válido.'), { status: 400 });
      }
      let parent = next;
      for (const key of route.slice(0, -1)) {
        if (!parent[key] || typeof parent[key] !== 'object') {
          throw Object.assign(new Error('La lista cambió. Revisa los datos antes de volver a editar.'), { status: 409 });
        }
        parent = parent[key];
      }
      const key = route.at(-1);
      if (JSON.stringify(parent[key] ?? null) !== JSON.stringify(operation.before ?? null)) {
        throw Object.assign(new Error('Otro dispositivo cambió este campo. Revisa su valor actualizado.'), { status: 409 });
      }
      if (operation.remove) delete parent[key];
      else parent[key] = operation.value;
    }
    validateDocument(next);
    const normalizedNext = normalizeDocument(next);
    const updated = { revision: state.revision + 1, document: normalizedNext };
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filename + '.tmp', JSON.stringify(updated, null, 2));
    fs.renameSync(filename + '.tmp', filename);
    state = updated;
    onChange(state);
    return state;
  }
  return { getState: () => state, patch };
}

module.exports = { createListsService, slideKeys, SLIDE_META, normalizeWeek, validWeek, validateDocument };
