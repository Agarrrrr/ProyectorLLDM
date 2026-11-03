import { addDays, mondayOf, formatCalendarDate } from '../../calendar';
import React from 'react';
import { useAppContext } from '../../context/app-context';
import type { OracionesData } from '../../types';

const DAYS_CONFIG: { key: keyof OracionesData; label: string; dual: boolean }[] = [
  { key: 'dom_ini', label: 'Domingo Inicial', dual: true },
  { key: 'lun', label: 'Lunes', dual: false },
  { key: 'mar', label: 'Martes', dual: false },
  { key: 'mie', label: 'Miércoles', dual: false },
  { key: 'jue', label: 'Jueves', dual: true },
  { key: 'vie', label: 'Viernes', dual: false },
  { key: 'sab', label: 'Sábado', dual: false },
  { key: 'dom', label: 'Domingo', dual: true },
];

export const OracionesEditor: React.FC = () => {
  const { currentWeek, updateOraciones, updateEncargada9AM } = useAppContext();

  const getSubDate = (key: keyof OracionesData) => {
    if (!currentWeek.startDate) return '';
    const offsets: Record<string, number> = {
      dom_ini: -1,
      lun: 0,
      mar: 1,
      mie: 2,
      jue: 3,
      vie: 4,
      sab: 5,
      dom: 6
    };
    return formatCalendarDate(addDays(mondayOf(currentWeek.startDate), offsets[key] ?? 0));
  };

  return (
    <div id="sec-oraciones" className="form-section-container active">
      <div className="encargada-banner" style={{ marginBottom: '1.25rem', background: 'rgba(223, 187, 106, 0.08)', padding: '1rem 1.2rem', borderRadius: '10px', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <label htmlFor="oraciones-encargada" style={{ fontWeight: 800, color: 'var(--admin-gold)', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          Encargada de Oración de 9:00 AM:
        </label>
        <input
          type="text"
          id="oraciones-encargada"
          value={currentWeek.oraciones.encargada9AM || ''}
          onChange={(e) => updateEncargada9AM(e.target.value)}
          placeholder="Ej. Hna. María González (Dejar en blanco si no aplica)"
          style={{ flex: 1, minWidth: '220px', maxWidth: '460px', padding: '0.6rem 0.85rem', borderRadius: '7px', border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--admin-text)', outline: 'none' }}
        />
      </div>

      <div className="form-row-grid">
        {DAYS_CONFIG.map(({ key, label, dual }) => {
          const defaultArr = dual ? ["", "", "", "", "", "", ""] : ["", "", "", ""];
          const rawData = currentWeek.oraciones[key];
          const dayData = Array.isArray(rawData) ? rawData : defaultArr;
          const isSunday = key === 'dom_ini' || key === 'dom';
          const fields: [number, string, string?][] = [];
          if (key !== 'dom_ini') fields.push([0, '5:00 AM']);
          if (!isSunday) fields.push([1, '9:00 AM']);
          if (dual) fields.push([3, 'Servicio', 'Servicio'], [5, 'P. Doct.', 'P. Doct.'], [6, 'Consagración']);
          else fields.push([2, 'Tarde · 7:00 PM'], [3, 'Consagración']);

          return (
            <div className="form-day-card" key={key} style={{ borderColor: isSunday ? 'var(--admin-gold)' : undefined, backgroundColor: isSunday ? 'rgba(223, 187, 106, 0.05)' : 'var(--admin-bg)' }}>
              <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.3rem 0.4rem 0.3rem' }}>
                <span>{label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontWeight: 700, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{getSubDate(key)}</span>
              </h4>
              <div className="form-subgroup">
                {fields.map(([index, fieldLabel, marker]) => (
                  <label className="prayer-field" key={index}>
                    <span>{fieldLabel}</span>
                    <input
                      type="text"
                      value={dayData[index] || ''}
                      onChange={event => {
                        if (marker && dayData[index - 1] !== marker) updateOraciones(key, index - 1, marker);
                        updateOraciones(key, index, event.target.value);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
