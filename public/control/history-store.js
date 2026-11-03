import { request } from './api.js';
import { showToast } from './shell.js';
let histories = { searchHistory: [], themeHistory: [] };

export function updateSharedHistories(value) {
  if (!value || JSON.stringify(value) === JSON.stringify(histories)) return;
  histories = value;
  window.dispatchEvent(new Event('shared-histories-changed'));
}

export const historyStorage = {
  getItem(name) { return JSON.stringify(histories[name] || []); },
  setItem(name, value) {
    const next = JSON.parse(value), before = histories[name] || [];
    histories = { ...histories, [name]: next };
    request('/api/control/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, add: next.filter(item => !before.includes(item)), remove: before.filter(item => !next.includes(item)) }) }).catch(error => showToast(error.message));
  },
  removeItem(name) {
    histories = { ...histories, [name]: [] };
    request('/api/control/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, clear: true }) }).catch(error => showToast(error.message));
  }
};
