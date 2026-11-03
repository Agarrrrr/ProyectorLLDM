import { formatCalendarDate, nextScheduleDate } from '../../calendar';
import type { VentasSunday } from '../../types';
import { ScheduleFields } from './ScheduleFields';
import { useState } from 'react';
import { useAppContext } from '../../context/app-context';
export function VentasEditor() {
  const { currentWeek, setVentasCycle, editWeek, customSalesGroups, updateCustomSalesGroups } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [groups, setGroups] = useState([...customSalesGroups]);
  const [error, setError] = useState('');
  function saveGroups() {
    if (groups.some(group => !group.trim())) { setError('Escribe al menos un grupo en cada turno.'); return; }
    updateCustomSalesGroups(groups.map(group => group.trim())); setEditing(false); setError('');
  }
  function change(index: number, patch: Partial<VentasSunday>) {
    editWeek(week => ({ ...week, ventas: { ...week.ventas, sundays: week.ventas.sundays?.map((row, i) => i === index ? { ...row, ...patch } : row) } }));
  }
  function add() {
    editWeek(week => {
      const rows = week.ventas.sundays || [];
      const date = nextScheduleDate(week.startDate, rows.at(-1)?.date);
      const cycle = (week.ventas.startingCycleIndex + rows.length) % customSalesGroups.length;
      return { ...week, ventas: { ...week.ventas, sundays: [...rows, {
        date, dateStr: formatCalendarDate(date), shortDateStr: date, cycleLabel: `Turno ${cycle + 1}`, groups: customSalesGroups[cycle], highlight: false, enabled: true
      }] } };
    });
  }
  return <div id="sec-ventas" className="form-section-container active">
    <details className="sales-base-groups" open={editing} onToggle={event => {
      const open = event.currentTarget.open;
      if (open && !editing) { setGroups([...customSalesGroups]); setError(''); }
      setEditing(open);
    }}>
      <summary>Configurar grupos base · {customSalesGroups.length} turnos</summary>
      <p className="list-help" style={{ marginTop: 12 }}>Cada turno corresponde a una fecha del ciclo. Escribe en líneas distintas los grupos que sirven juntos. Al guardar se actualizarán los grupos de las fechas existentes.</p>
      <div className="sales-group-fields">{groups.map((group, index) => <div className="sales-group-field" key={index}>
        <label>Turno {index + 1}<textarea aria-label={`Grupos del turno ${index + 1}`} rows={2} value={group} onChange={event => setGroups(groups.map((value, i) => i === index ? event.target.value : value))} /></label>
        <button type="button" className="btn-danger" disabled={groups.length <= 1} aria-label={`Eliminar turno ${index + 1}`} onClick={() => setGroups(groups.filter((_, i) => i !== index))}>Eliminar</button>
      </div>)}</div>
      {error && <p role="alert" className="sync-error">{error}</p>}
      <div className="sales-group-actions"><button type="button" disabled={groups.length >= 24} onClick={() => setGroups([...groups, ''])}>Añadir turno</button><button type="button" className="btn-gold" onClick={saveGroups}>Guardar grupos base</button><button type="button" onClick={() => setEditing(false)}>Cancelar</button></div>
    </details>
    <label className="sales-cycle">Turno de la primera venta<select aria-label="Turno inicial de ventas" value={currentWeek.ventas.startingCycleIndex} onChange={event => setVentasCycle(Number(event.target.value))}>
      {customSalesGroups.map((group, index) => <option key={index} value={index}>Turno {index + 1} · {group.split('\n').join(', ')}</option>)}
    </select></label>
    <div className="form-vertical-stack">
      <button type="button" onClick={add}>Programar venta</button>
      {currentWeek.ventas.sundays?.map((row, index) => <div className="stack-item-card schedule-entry" key={index}>
        <h4 className="schedule-date">{row.dateStr} · {row.cycleLabel}</h4>
        <label className="list-help"><input type="checkbox" checked={row.enabled !== false} onChange={() => change(index, { enabled: row.enabled === false })} /> Incluir en la lista</label>
        <label>Grupos responsables<textarea value={row.groups} rows={3} onChange={event => change(index, { groups: event.target.value })} /></label>
        <ScheduleFields {...row} onChange={patch => change(index, patch)} />
      </div>)}
    </div>
  </div>;
}
