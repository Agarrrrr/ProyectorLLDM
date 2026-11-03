import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { WeekData } from '../../types';
import { ListCanvas } from './ListCanvas';

export function ListTransition({ week, view }: { week: WeekData; view: string }) {
  const content = JSON.stringify(week);
  // State broadcasts also contain playback and connection changes. Only a visual
  // change gets a new layer; the outgoing layer retains its own week snapshot.
  const incoming = useMemo(() => ({ week: JSON.parse(content) as WeekData, view }), [content, view]);
  const sequence = useRef(0);
  const [layers, setLayers] = useState(() => [{ id: 0, data: incoming }]);
  useLayoutEffect(() => {
    const layer = { id: ++sequence.current, data: incoming };
    setLayers(previous => previous.at(-1)?.data === incoming ? previous : [previous.at(-1)!, layer]);
    const timer = setTimeout(() => setLayers(previous => previous.slice(-1)), 450);
    return () => clearTimeout(timer);
  }, [incoming]);
  return <div className="list-transition" data-current-list-key={view}>
    {layers.map((layer, index) => <div key={layer.id} className={`list-transition-layer ${index === layers.length - 1 ? 'list-transition-incoming' : 'list-transition-previous'}`} aria-hidden={index !== layers.length - 1}>
      <ListCanvas week={layer.data.week} view={layer.data.view} />
    </div>)}
  </div>;
}
