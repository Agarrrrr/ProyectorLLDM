import { formatCalendarDate } from '../../calendar';
import type { ListField } from '../../types';

export function ScheduleFields({ date, dateStr, fields = [], onChange }: {
  date?: string;
  dateStr: string;
  fields?: ListField[];
  onChange: (patch: { date?: string; dateStr?: string; dateLocked?: boolean; fields?: ListField[] }) => void;
}) {
  return <>
    <label>Cambiar fecha<input type="date" value={date || ''} onChange={event => {
      const value = event.target.value;
      if (value) onChange({ date: value, dateStr: formatCalendarDate(value), dateLocked: true });
    }} /></label>
    {!date && dateStr && <p className="list-help">Fecha guardada: {dateStr}</p>}
    <details className="schedule-extra"><summary>Información adicional{fields.length ? ` · ${fields.length}` : ''}</summary>
    {fields.map((field, index) => <div className="schedule-field" key={index}>
      <label>Etiqueta<input value={field.label} maxLength={100} onChange={event => onChange({ fields: fields.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></label>
      <label>Detalle<textarea value={field.value} rows={2} maxLength={1000} onChange={event => onChange({ fields: fields.map((item, i) => i === index ? { ...item, value: event.target.value } : item) })} /></label>
      <button type="button" className="btn-danger" onClick={() => onChange({ fields: fields.filter((_, i) => i !== index) })}>Eliminar detalle</button>
    </div>)}
    <button type="button" onClick={() => onChange({ fields: [...fields, { label: '', value: '' }] })}>Agregar detalle</button>
    </details>
  </>;
}
