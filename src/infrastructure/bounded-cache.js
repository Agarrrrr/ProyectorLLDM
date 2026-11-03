function createBoundedCache({ maxEntries = 256, maxBytes = 4 * 1024 * 1024 } = {}) {
  const entries = new Map();
  let bytes = 0, hits = 0, misses = 0;
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) { misses++; return undefined; }
      entries.delete(key); entries.set(key, entry); hits++;
      return entry.value;
    },
    set(key, value) {
      const size = Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(value));
      if (entries.has(key)) { bytes -= entries.get(key).size; entries.delete(key); }
      if (size > maxBytes) return;
      while (entries.size && (entries.size >= maxEntries || bytes + size > maxBytes)) {
        const oldest = entries.keys().next().value;
        bytes -= entries.get(oldest).size; entries.delete(oldest);
      }
      entries.set(key, { value, size }); bytes += size;
    },
    stats: () => ({ entries: entries.size, bytes, hits, misses })
  };
}
module.exports = { createBoundedCache };
