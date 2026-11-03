import { useAppContext } from '../../context/app-context';
import type { WeekData } from '../../types';

export function NoticeEditor() {
  const { currentWeek, editWeek } = useAppContext();
  const notice = currentWeek.notice ?? { text: currentWeek.floresCustomMessage || '', align: 'center', position: 'middle', size: 'normal' };
  function change(patch: Partial<NonNullable<WeekData['notice']>>) {
    editWeek(week => ({ ...week, notice: { ...notice, ...patch } }));
  }
  return <section className="form-vertical-stack notice-editor" aria-label="Editar aviso">
    <label>Texto del aviso<textarea rows={7} maxLength={4000} value={notice.text} onChange={event => change({ text: event.target.value })} /></label>
    <p className="list-help">Pulsa Enter para separar líneas o párrafos. Usa *palabras* para resaltarlas.</p>
    <div className="notice-options">
      <label>Alineación<select value={notice.align} onChange={event => change({ align: event.target.value as typeof notice.align })}>
        <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
      </select></label>
      <label>Posición<select value={notice.position} onChange={event => change({ position: event.target.value as typeof notice.position })}>
        <option value="top">Arriba</option><option value="middle">Centro</option><option value="bottom">Abajo</option>
      </select></label>
      <label>Tamaño<select value={notice.size} onChange={event => change({ size: event.target.value as typeof notice.size })}>
        <option value="compact">Compacto</option><option value="normal">Normal</option><option value="large">Grande</option>
      </select></label>
    </div>
  </section>;
}
