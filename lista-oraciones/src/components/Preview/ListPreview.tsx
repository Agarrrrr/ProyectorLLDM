import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/app-context';
import { ListCanvas } from '../SignagePlayer/ListCanvas';
import { listViewTitle, visibleListKeys } from '../SignagePlayer/list-views';
import { prepareImageDocuments, renderImage } from '../../images/render';
import type { ImageDocument } from '../../images/layout';

export function PreviewOutput() {
  const { currentWeek } = useAppContext();
  const view = new URLSearchParams(location.search).get('slide') || 'orac5';
  return <ListCanvas week={currentWeek} view={view} />;
}

export function ListPreview() {
  const { currentWeek } = useAppContext();
  const [mode, setMode] = useState<'tv' | 'image'>('tv');
  const [selectedView, setSelectedView] = useState('orac5');
  const [images, setImages] = useState<ImageDocument[]>([]);
  const [selectedImage, setSelectedImage] = useState('oraciones');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => { const changed = () => setSettingsVersion(version => version + 1); window.addEventListener('list-settings-changed', changed); return () => window.removeEventListener('list-settings-changed', changed); }, []);
  const allowed = visibleListKeys(currentWeek);
  const view = allowed.includes(selectedView) ? selectedView : allowed[0] || '';
  const image = images.find(item => item.id === selectedImage) || images[0];
  useEffect(() => {
    if (mode !== 'image') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try { const docs = await prepareImageDocuments(currentWeek); if (!cancelled) { setImages(docs); setError(''); } }
      catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo preparar la imagen.'); }
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mode, currentWeek, settingsVersion]);
  useEffect(() => {
    if (!image || mode !== 'image') return;
    let cancelled = false;
    renderImage(image).then(canvas => { if (!cancelled) setImageUrl(canvas.toDataURL('image/png')); }).catch(cause => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; };
  }, [image, mode]);
  async function project() {
    try {
      const response = await fetch('/api/project/carteleria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listKey: view, loop: false }) });
      if (!response.ok) throw new Error((await response.json()).error); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo proyectar.'); }
  }
  async function download(all: boolean) {
    setBusy(true);
    try {
      const exporter = await import('../../utils/exporter');
      if (all) await exporter.downloadListsZip(currentWeek);
      else { const latest = await prepareImageDocuments(currentWeek); const selected = latest.find(item => item.id === image?.id) || latest[0]; if (selected) await exporter.downloadImage(selected, currentWeek.startDate); }
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descargar.'); }
    finally { setBusy(false); }
  }
  return <section className="list-preview-panel" aria-label="Vista previa de las listas">
    <h2>Vista previa</h2>
    <div className="preview-modes" role="group" aria-label="Tipo de vista previa">
      <button type="button" aria-pressed={mode === 'tv'} onClick={() => setMode('tv')}>Para TV</button>
      <button type="button" aria-pressed={mode === 'image'} onClick={() => setMode('image')}>Descargar listas completas</button>
    </div>
    {mode === 'tv' ? <>
      <label className="preview-selector">Vista a preparar<select aria-label="Vista a preparar" value={view} onChange={event => setSelectedView(event.target.value)}>
        {allowed.map(key => <option key={key} value={key}>{listViewTitle(key)}</option>)}
      </select></label>
      {view ? <div className="list-tv-preview"><iframe src={`/carteleria?preview=1&slide=${view}`} title="Vista previa preparada para TV" tabIndex={-1} /></div> : <p className="list-help">Activa una lista en «Incluir en TV».</p>}
      <button type="button" className="action-btn btn-gold" disabled={!view} onClick={project}>Enviar esta vista a TV</button>
    </> : <>
      <label className="preview-selector">Imagen<select aria-label="Imagen a previsualizar" value={image?.id || ''} onChange={event => setSelectedImage(event.target.value)}>
        {images.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {imageUrl && <img className="list-image-preview" src={imageUrl} alt={image?.title || 'Imagen de la lista completa'} />}
      <p className="list-help">La imagen se ajusta al contenido. Se descarga en PNG de alta resolución.</p>
      <div className="image-download-actions"><button type="button" className="btn-gold" disabled={busy || !image} onClick={() => download(false)}>{busy ? 'Generando…' : 'Descargar imagen'}</button><button type="button" disabled={busy || !images.length} onClick={() => download(true)}>Descargar todas (ZIP)</button></div>
    </>}
    {error && <p className="sync-error" role="alert">{error}</p>}
  </section>;
}
