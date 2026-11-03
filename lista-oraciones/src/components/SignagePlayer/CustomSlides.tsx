import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { WeekData } from '../../types';

function FitCopy({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = frame.current!, copy = content.current!;
    function fit() {
      const scale = Math.min(1, box.clientHeight / Math.max(1, copy.offsetHeight));
      copy.style.setProperty('--copy-scale', String(scale));
      copy.style.marginBottom = (scale - 1) * copy.offsetHeight + 'px';
    }
    const observer = new ResizeObserver(fit);
    observer.observe(box); observer.observe(copy); fit();
    return () => observer.disconnect();
  }, []);
  return <div className="output-fit" ref={frame}><div className="output-fit-copy" ref={content}>{children}</div></div>;
}

function ListHeading({ children }: { children: string }) {
  return <header className="custom-list-heading"><h1>{children}</h1></header>;
}

export function NoticeSlide({ week }: { week: WeekData }) {
  const notice = week.notice ?? { text: week.floresCustomMessage || '', align: 'center', position: 'middle', size: 'normal' };
  return <section className="notice-slide" data-position={notice.position} data-size={notice.size} data-align={notice.align}>
    <ListHeading>Aviso</ListHeading>
    <div className="notice-slide-body" style={{ textAlign: notice.align }}>
      <FitCopy>
        {notice.text.split(/(\*[^*\n]+\*)/g).map((part, index) => index % 2 ? <strong key={index}>{part.slice(1, -1)}</strong> : part)}
      </FitCopy>
    </div>
  </section>;
}

export function ScheduleSlide({ week, kind, page }: { week: WeekData; kind: 'flores' | 'ventas'; page: number }) {
  const flowers = kind === 'flores';
  const rows = (flowers ? week.flores : week.ventas.sundays || []).filter(row => row.enabled !== false);
  const pageSize = flowers ? 2 : 3;
  return <section className="schedule-slide">
    <ListHeading>{flowers ? 'Lista de flores' : 'Venta de comida'}</ListHeading>
    <div className="schedule-slide-rows">
      {rows.slice(page * pageSize, (page + 1) * pageSize).map((row, index) => <article key={index}>
        <FitCopy>
          <h2>{row.dateStr}</h2>
          <p>{'names' in row ? row.names : row.groups}</p>
          {row.fields?.filter(field => field.value.trim()).map((field, i) => <p key={i} className="schedule-slide-detail">
            {field.label && <strong>{field.label} </strong>}{field.value}
          </p>)}
        </FitCopy>
      </article>)}
    </div>
  </section>;
}
