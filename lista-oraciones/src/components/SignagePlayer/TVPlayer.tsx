import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/app-context';
import { ListTransition } from './ListTransition';
export function TVPlayer({ onClose }: { onClose: () => void }) {
  const { currentWeek } = useAppContext();
  const [output, setOutput] = useState({ key: '', revision: -1, generation: 0 });
  useEffect(() => {
    let stopped = false, socket: WebSocket, timer: ReturnType<typeof setTimeout>;
    let wasProjecting = false, generation = 0;
    function connect() {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?view=output`);
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.type !== 'STATE_UPDATE') return;
        const state = message.state;
        const key = state.phase === 'active' && state.contentType === 'carteleria' ? state.slides[state.currentSlideIndex]?.listKey || '' : '';
        if (key && !wasProjecting) generation++;
        wasProjecting = !!key;
        setOutput({ key, revision: state.revision, generation });
      };
      socket.onclose = () => { if (!stopped) timer = setTimeout(connect, 1500); };
      socket.onerror = () => socket.close();
    }
    connect(); return () => { stopped = true; clearTimeout(timer); socket?.close(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (output.key) Promise.all([document.fonts.load('800 80px Outfit'), document.fonts.load('800 80px Inter'), document.fonts.ready]).then(() => {
      if (!cancelled && window.parent !== window) window.parent.postMessage({ type: 'LIST_OUTPUT_READY', key: output.key, revision: output.revision }, location.origin);
    });
    return () => { cancelled = true; };
  }, [output, currentWeek]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const action = event.key === 'Escape' ? 'CLEAR_PROJECTION' : event.code === 'ArrowRight' ? 'NEXT_SLIDE' : event.code === 'ArrowLeft' ? 'PREV_SLIDE' : '';
      if (!action) return;
      event.preventDefault();
      void fetch('/api/control/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (action === 'CLEAR_PROJECTION') onClose();
    };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, [onClose]);
  return <div id="signage-player" style={{ display: 'block' }}>{output.key && <ListTransition key={output.generation} week={currentWeek} view={output.key} />}</div>;
}
