import type { WeekData } from '../../types';
import { renderOraciones5AM, renderOraciones9AM, renderOracionesTarde } from './slides';
import { NoticeSlide, ScheduleSlide } from './CustomSlides';

export function ListCanvas({ week, view }: { week: WeekData; view: string }) {
  const [kind, page] = view.split(':');
  const render = { orac5: renderOraciones5AM, orac9: renderOraciones9AM, tarde: renderOracionesTarde }[kind];
  return <div className="list-output" data-list-key={view}>
    {kind === 'mensaje_flores' && <NoticeSlide week={week} />}
    {(kind === 'flores' || kind === 'ventas') && <ScheduleSlide week={week} kind={kind} page={Number(page) || 0} />}
    {render?.(week)}
  </div>;
}
