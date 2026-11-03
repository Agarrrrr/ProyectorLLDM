let settings = null;
let revision = -1;
export function acceptSettings(value, incomingRevision = 0) {
  if (!value || incomingRevision < revision) return;
  const changed = incomingRevision !== revision;
  settings = value; revision = incomingRevision;
  document.documentElement.dataset.quickLyricsEditor = String(value.operator?.showLyricsEditor === true);
  if (changed) window.dispatchEvent(new CustomEvent('settings-changed', { detail: settings }));
}
export const getSettings = () => settings;
export function keyFromEvent(event) {
  const code = event.code || ({ ' ': 'Space' }[event.key] || event.key);
  if (!code || /^(Control|Shift|Alt|Meta)/.test(code)) return '';
  return [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta', code].filter(Boolean).join('+');
}
export function keyLabel(key) {
  return key.replace(/Key([A-Z])/g, '$1').replace(/Digit([0-9])/g, '$1').replace('Space', 'Espacio').replace('ArrowRight', '→').replace('ArrowLeft', '←').replace('ArrowDown', '↓').replace('ArrowUp', '↑').replace('Meta', 'Windows');
}
export function keyboardAction(event) {
  const key = keyFromEvent(event);
  return Object.entries(settings?.keyboard || {}).find(([, keys]) => keys.includes(key))?.[0];
}
