const selections = new Map();
export function setSelection(type, item) { selections.set(type, item); }
export function getSelection(type) { return selections.get(type) || null; }
