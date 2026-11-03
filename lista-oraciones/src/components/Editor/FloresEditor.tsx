import { useAppContext } from '../../context/app-context';
import { formatCalendarDate, nextScheduleDate } from '../../calendar';
import type { FloresItem } from '../../types';
import { ScheduleFields } from './ScheduleFields';

export function FloresEditor() {
  const { currentWeek, editWeek } = useAppContext();
  function change(index: number, patch: Partial<FloresItem>) {
    editWeek(week => ({ ...week, flores: week.flores.map((row, i) => i === index ? { ...row, ...patch } : row) }));
  }
  function add() {
    editWeek(week => {
      const date = nextScheduleDate(week.startDate, week.flores.at(-1)?.date);
      return { ...week, flores: [...week.flores, { date, dateStr: formatCalendarDate(date), names: '', enabled: true }] };
    });
  }
  return <section className="form-vertical-stack" aria-label="Editar flores">
    <button type="button" onClick={add}>Programar entrega de flores</button>
    {currentWeek.flores.map((row, index) => <div className="stack-item-card schedule-entry" key={index}>
      <h4 className="schedule-date">{row.dateStr || 'Entrega de flores'}</h4>
      <label className="list-help"><input type="checkbox" checked={row.enabled !== false} onChange={() => change(index, { enabled: row.enabled === false })} /> Incluir en la lista</label>
      <label>Responsables<textarea value={row.names} rows={3} onChange={event => change(index, { names: event.target.value })} /></label>
      <ScheduleFields {...row} onChange={patch => change(index, patch)} />
    </div>)}
  </section>;
}
