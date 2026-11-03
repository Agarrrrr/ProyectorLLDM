const dateFormat = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const rangeFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function civilDate(value: string) { return new Date(value + 'T12:00:00Z'); }
export function addDays(value: string, days: number) {
  const date = civilDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function mondayOf(value: string) {
  return addDays(closingSunday(value), -6);
}
export function closingSunday(value: string) {
  return addDays(value, (7 - civilDate(value).getUTCDay()) % 7);
}
export function nextScheduleDate(week: string, last?: string) {
  return last ? closingSunday(addDays(last, 1)) : closingSunday(week);
}
export function formatCalendarDate(value: string) {
  const label = dateFormat.format(civilDate(value));
  return label[0].toUpperCase() + label.slice(1);
}
export function weekRange(value: string) {
  const sunday = closingSunday(value);
  return rangeFormat.format(civilDate(addDays(sunday, -7))) + ' al ' + rangeFormat.format(civilDate(sunday));
}
