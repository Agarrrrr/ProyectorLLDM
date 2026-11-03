import { useEffect, useRef, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/app-context';
import { formatHumanDateRange } from './context/week-data';
import { closingSunday } from './calendar';
import { schedulePages } from './components/SignagePlayer/list-views';
import { OracionesEditor } from './components/Editor/OracionesEditor';
import { FloresEditor } from './components/Editor/FloresEditor';
import { NoticeEditor } from './components/Editor/NoticeEditor';
import { WeekTransfer } from './components/Editor/WeekTransfer';
import { VentasEditor } from './components/Editor/VentasEditor';
import { TVPlayer } from './components/SignagePlayer/TVPlayer';
import { ListPreview, PreviewOutput } from './components/Preview/ListPreview';
import './index.css';
import './workspace.css';

const visibility = [ ['oraciones5AM', 'Oraciones 5:00 AM'], ['oraciones9AM', 'Oraciones 9:00 AM'], ['oracionesTarde', 'Oraciones de la tarde'], ['aviso', 'Aviso'], ['flores', 'Flores'], ['ventas', 'Venta de comida'] ] as const;
function MainApp() {
  const { currentWeek, savedWeeks, syncError, setStartDate, saveCurrentWeek, loadWeek, deleteWeek, resetToBlankWeek, toggleSlideVisibility, editWeek } = useAppContext();
  const params = new URLSearchParams(location.search), embedded = params.get('embed') === '1';
  const [tab, setTab] = useState('oraciones');
  const [notice, setNotice] = useState('');
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!embedded || !container.current) return;
    const notify = () => window.parent.postMessage({ type: 'CARTELERIA_EMBED_HEIGHT', height: Math.max(520, container.current?.scrollHeight || 0) }, location.origin);
    const observer = new ResizeObserver(notify); observer.observe(container.current); notify(); return () => observer.disconnect();
  }, [embedded]);
  if (params.get('tv') === '1') return <TVPlayer onClose={() => {}} />;
  if (params.get('preview') === '1') return <PreviewOutput />;
  return <div ref={container} className={embedded ? 'embed-root lists-app' : 'standalone-root lists-app'}>
    {!embedded && <header className="lists-heading"><img src="/logo_lldm_oficial.svg" alt="La Luz del Mundo" /><div><p>La Luz del Mundo</p><h1>Lista de oraciones</h1></div><a href="/control">Ir a cabina</a></header>}
    {syncError && <p className="sync-error" role="alert">{syncError}</p>}
    <section className="list-week-bar" aria-label="Semana de trabajo">
      <label>Domingo de cierre<input type="date" value={closingSunday(currentWeek.startDate)} onChange={event => { if (event.target.value) setStartDate(event.target.value); }} /></label>
      <strong>{formatHumanDateRange(currentWeek.startDate)}</strong>
      <div className="list-week-actions"><button type="button" onClick={() => { saveCurrentWeek(); setNotice('Semana guardada'); }}>Guardar esta semana</button><button type="button" onClick={() => { if (confirm('¿Crear una semana en blanco? La semana actual puede guardarse con Guardar esta semana.')) resetToBlankWeek(); }}>Nueva semana</button></div>
      {notice && <span role="status" className="list-help">{notice}</span>}
    </section>
    <div className="lists-layout">
      <section className="list-editor-panel">
        <nav className="list-sections-tabs" aria-label="Editar listas">{[['oraciones', 'Oraciones'], ['aviso', 'Aviso'], ['flores', 'Flores'], ['ventas', 'Ventas']].map(([id, label]) => <button type="button" key={id} className={`section-tab ${tab === id ? 'active' : ''}`} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
        {tab === 'oraciones' && <OracionesEditor />}{tab === 'aviso' && <NoticeEditor />}{tab === 'flores' && <FloresEditor />}{tab === 'ventas' && <VentasEditor />}
      </section>
      <ListPreview />
    </div>
    <div className="list-secondary-options">
      <WeekTransfer />
      <details><summary>Incluir en TV</summary>
        <div className="list-visibility">{visibility.map(([key, label]) => <div key={key}>
          <label><input type="checkbox" checked={currentWeek.visibleSlides?.[key] !== false} onChange={() => toggleSlideVisibility(key)} />{label}</label>
          {(key === 'flores' || key === 'ventas') && schedulePages(currentWeek, key).map((page, index, pages) =>
            (pages.length > 1 || currentWeek.visiblePages?.[page] === false) && <label className="list-page-choice" key={page}>
              <input type="checkbox" aria-label={`${label}, página ${index + 1}`} disabled={currentWeek.visibleSlides?.[key] === false} checked={currentWeek.visiblePages?.[page] !== false}
                onChange={() => editWeek(week => ({ ...week, visiblePages: { ...week.visiblePages, [page]: week.visiblePages?.[page] === false } }))} />
              Página {index + 1}
            </label>)}
        </div>)}</div>
      </details>
      <details><summary>Semanas guardadas · {Object.keys(savedWeeks).length}</summary><ul className="list-archives">{Object.keys(savedWeeks).sort().reverse().map(date => <li key={date}><button type="button" onClick={() => loadWeek(date)}>{formatHumanDateRange(date)}</button><button type="button" onClick={() => location.assign('/api/lists/week/export?date=' + encodeURIComponent(date))}>Descargar JSON</button><button type="button" className="btn-danger" aria-label={`Eliminar semana ${date}`} onClick={() => { if (confirm(`¿Eliminar la semana ${date} del historial?`)) deleteWeek(date); }}>Eliminar</button></li>)}{!Object.keys(savedWeeks).length && <li>No hay semanas guardadas.</li>}</ul></details>
    </div>
  </div>;
}
export default function App() { return <AppProvider><MainApp /></AppProvider>; }
