function isSameItem(selected, active) {
  if (!selected || !active) return false;
  if (selected.id != null && active.id != null && String(selected.id) === String(active.id)) return true;
  if (selected.number != null && active.number != null && String(selected.number) === String(active.number)) return true;
  if (selected.title && active.title && selected.title.trim().toLowerCase() === active.title.trim().toLowerCase()) return true;
  return false;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { escapeHtml, isSameItem };
