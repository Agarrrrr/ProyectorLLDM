const textFieldSelector = 'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="number"], input[type="url"]';

export function clearEscapeFields(container, focusedOnly = false) {
  if (!container) return false;
  const fields = focusedOnly
    ? [document.activeElement].filter(field => container.contains(field) && field.matches(textFieldSelector))
    : [...container.querySelectorAll(textFieldSelector)];
  let cleared = false;
  for (const field of fields) {
    if (field.disabled || field.readOnly || !field.getClientRects().length || !field.value.length) continue;
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    cleared = true;
  }
  return cleared;
}
