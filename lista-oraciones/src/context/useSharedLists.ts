import { useCallback, useEffect, useRef, useState } from 'react';
import type { WeekData } from '../types';

export interface ListsDocument {
  currentWeek: WeekData | null;
  customSalesGroups: string[] | null;
  weeks: Record<string, WeekData>;
  rotationSeconds: number;
}
type Snapshot = { revision: number; document: ListsDocument };
type Operation = { path: string[]; before: unknown; value?: unknown; remove?: boolean };
const empty: ListsDocument = { currentWeek: null, customSalesGroups: null, weeks: {}, rotationSeconds: 15 };

function diff(before: unknown, after: unknown, path: string[] = []): Operation[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' &&
      Array.isArray(before) === Array.isArray(after)) {
    // Changing array structure is one operation; field edits retain their index.
    if (!Array.isArray(before) || before.length === (after as unknown[]).length) {
      const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
      return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(key => diff(a[key], b[key], [...path, key]));
    }
  }
  return [{ path, before: before ?? null, ...(after === undefined ? { remove: true } : { value: after }) }];
}

export function useSharedLists() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const current = useRef<ListsDocument>(empty);
  const base = useRef<Snapshot | null>(null);
  const pending = useRef<Operation[][]>([]);
  const sending = useRef(false);

  const accept = useCallback((incoming: Snapshot) => {
    if (!incoming.document || (base.current && incoming.revision < base.current.revision)) return;
    base.current = incoming;
    if (!pending.current.length) {
      current.current = incoming.document;
      setSnapshot(incoming);
    }
  }, []);
  async function flush() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (pending.current.length) {
        const response = await fetch('/api/lists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations: pending.current[0] }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron guardar los cambios.');
        pending.current.shift();
        accept(result);
      }
      if (base.current) accept(base.current);
      setError('');
    } catch (cause) {
      pending.current = [];
      setError(cause instanceof Error ? cause.message : 'Sin conexión.');
      try { accept(await (await fetch('/api/lists')).json()); } catch { /* Reconnect reloads the authoritative copy. */ }
    } finally { sending.current = false; }
  }
  function update(change: (document: ListsDocument) => ListsDocument) {
    const next = change(current.current);
    const operations = diff(current.current, next);
    if (!operations.length) return;
    current.current = next;
    setSnapshot({ revision: base.current?.revision ?? 0, document: next });
    pending.current.push(operations);
    void flush();
  }
  const initialize = useCallback(async (currentWeek: WeekData, customSalesGroups: string[]) => {
    try {
      const response = await fetch('/api/lists/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentWeek, customSalesGroups }) });
      if (!response.ok) throw new Error('No se pudo preparar la primera semana.');
      accept(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sin conexión.'); }
  }, [accept]);
  useEffect(() => {
    let stopped = false, socket: WebSocket, timer: ReturnType<typeof setTimeout>;
    let settingsRevision = -1;
    function connect() {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?view=output`);
      socket.onopen = async () => {
        try {
          const response = await fetch('/api/lists');
          if (!response.ok) throw new Error('No se pudo cargar la lista.');
          const result = await response.json();
          if (!stopped) { accept(result); setConnected(true); }
        } catch { if (!stopped) setError('No se pudo cargar la lista.'); socket.close(); }
      };
      socket.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.type === 'LISTS_UPDATE') accept(data);
        if (data.type === 'STATE_UPDATE' && data.state.settingsRevision !== settingsRevision) {
          settingsRevision = data.state.settingsRevision;
          window.dispatchEvent(new Event('list-settings-changed'));
        }
      };
      socket.onclose = () => { if (!stopped) { setConnected(false); timer = setTimeout(connect, 1500); } };
      socket.onerror = () => socket.close();
    }
    connect();
    return () => { stopped = true; clearTimeout(timer); socket?.close(); };
  }, [accept]);
  return { document: snapshot?.document ?? empty, ready: !!snapshot, connected, error, update, initialize };
}
