import { useState } from 'react';

export function WeekTransfer() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function importWeek() {
    if (!file || file.size > 2 * 1024 * 1024) {
      setStatus('Elige un JSON de hasta 2 MiB.');
      return;
    }
    setBusy(true);
    setStatus('Revisando la semana…');
    const send = (query = '') => fetch('/api/lists/week/import' + query, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file
    });
    try {
      let response = await send();
      let result = await response.json();
      if (response.status === 409) {
        if (!confirm(`¿Reemplazar la semana guardada del ${result.date}?`)) {
          setStatus('Se conservó la semana guardada.');
          return;
        }
        response = await send('?replace=' + encodeURIComponent(result.revision));
        result = await response.json();
      }
      setStatus(response.ok ? 'Semana importada. Ábrela en Semanas guardadas.' : result.error || 'No se pudo importar la semana.');
    } catch {
      setStatus('No se pudo importar la semana. Comprueba la conexión y vuelve a intentarlo.');
    } finally {
      setBusy(false);
    }
  }

  return <details>
    <summary>Importar o exportar una semana</summary>
    <p className="list-help">El JSON permite seguir editando la lista en otro equipo. La importación se guarda en el historial.</p>
    <div className="list-week-actions week-transfer-actions">
      <button type="button" onClick={() => location.assign('/api/lists/week/export')}>Descargar semana actual</button>
      <label>Semana en JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <button type="button" disabled={busy || !file} onClick={() => void importWeek()}>Importar al historial</button>
    </div>
    <p role="status" className="list-help">{status}</p>
  </details>;
}
