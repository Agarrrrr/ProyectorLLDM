const WebSocket = require('ws');

function cleanWireValue(key, value) {
  return key === '_idx' || key === '_summary' ? undefined : value;
}

function outputSnapshot(state) {
  return {
    revision: state.revision, phase: state.phase, contentType: state.contentType,
    currentSlideIndex: state.currentSlideIndex, displayPayload: state.displayPayload,
    settings: state.settings, settingsRevision: state.settingsRevision,
    slides: state.contentType === 'carteleria' ? state.slides.map(slide => ({ listKey: slide.listKey })) : []
  };
}

function createStateStream({ wss, getState }) {
  const pending = new WeakMap();
  const sending = new WeakSet();
  const totals = { snapshots: 0, bytes: 0, coalesced: 0 };
  function send(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 1024 * 1024) { ws.close(1013, 'Conexión demasiado lenta'); return; }
    if (sending.has(ws)) { pending.set(ws, payload); totals.coalesced++; return; }
    sending.add(ws);
    totals.bytes += Buffer.byteLength(payload);
    ws.send(payload, error => {
      sending.delete(ws);
      if (error) { pending.delete(ws); return; }
      const next = pending.get(ws);
      pending.delete(ws);
      if (next) send(ws, next);
    });
  }
  function serialize(outputOnly) {
    const state = getState();
    return JSON.stringify({ type: 'STATE_UPDATE', state: outputOnly ? outputSnapshot(state) : state }, cleanWireValue);
  }
  return {
    initial(ws) { send(ws, serialize(ws.outputOnly)); },
    broadcast() {
      totals.snapshots++;
      let full, output;
      for (const ws of wss.clients) {
        if (ws.readyState !== WebSocket.OPEN) continue;
        if (ws.outputOnly) { output ??= serialize(true); send(ws, output); }
        else { full ??= serialize(false); send(ws, full); }
      }
    },
    stats: () => ({ ...totals })
  };
}
module.exports = { createStateStream, outputSnapshot, cleanWireValue };
