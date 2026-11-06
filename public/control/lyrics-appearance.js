import { request } from './api.js';
import { escapeHtml } from './html.js';

const fields = document.getElementById('lyricsAppearanceFields');
const frame = document.getElementById('lyricsAppearancePreview');
const songSelect = document.getElementById('lyricsPreviewSong');
const message = document.getElementById('lyricsPreviewMessage');
const position = document.getElementById('lyricsPreviewPosition');
const navigation = position.parentElement;
let draft, defaults, assets = [], type = 'hymn', slides = [], index = 1, sequence = 0, loadingSongs = 0, timer;
function option(value, label, selected) { return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`; }
function colorField(field, label, value) {
  const hex = (value || '#ffffff').toUpperCase();
  return `<label class="color-picker-label"><span>${escapeHtml(label)}</span><div class="color-picker-wrapper"><input data-lyrics-field="${escapeHtml(field)}" type="color" value="${escapeHtml(value || '#ffffff')}" aria-label="${escapeHtml(label)}"><span class="color-picker-hex">${escapeHtml(hex)}</span></div></label>`;
}
function renderFields() {
  const value = draft.lyrics[type];
  const isBible = type === 'bible';
  document.getElementById('lyricsAssetControls').hidden = isBible;
  navigation.hidden = isBible;
  document.getElementById('lyricsPreviewLabel').textContent = isBible ? 'Formato para previsualizar' : 'Canto para previsualizar';
  fields.innerHTML = `<label>Aplicar a<select id="lyricsAppearanceType">${option('hymn','Himnario',type)}${option('choir','Coro',type)}${option('bible','Biblia',type)}</select></label>`
    + (isBible ? `<fieldset class="lyrics-control-group"><legend>Colores de la Biblia</legend><div class="lyrics-color-fields bible-color-fields">
      ${colorField('color', 'Texto', value.color)}
      ${colorField('indicatorColor', 'Cita y versículos', value.indicatorColor)}
    </div></fieldset>` : `<fieldset class="lyrics-control-group"><legend>Distribución y tamaño</legend><div class="lyrics-sizing-fields">
      <label>Límite de renglones<input data-lyrics-field="maxLines" type="number" min="1" step="1" value="${value.maxLines}"></label>
      <label>Tamaño mínimo<input data-lyrics-field="minFontSize" type="number" min="24" max="400" step="1" value="${value.minFontSize}"></label>
      <label>Tamaño máximo<input data-lyrics-field="fontSize" type="number" min="24" max="400" step="1" value="${value.fontSize}"></label>
      <label>Separación entre renglones<input data-lyrics-field="lineGap" type="number" min="0" max="24" step="1" required value="${value.lineGap}"></label>
    </div></fieldset>
    <label>Fuente<select data-lyrics-field="font">${assets.filter(a=>a.kind==='font').map(a=>option(a.id,a.name,value.font)).join('')}</select></label>
    <fieldset class="lyrics-control-group"><legend>Colores de la letra</legend><div class="lyrics-color-fields">
      ${colorField('color', 'Estrofas', value.color)}
      ${colorField('chorusColor', 'Coro', value.chorusColor)}
      ${colorField('indicatorColor', 'Indicador', value.indicatorColor)}
    </div></fieldset>
    <div class="lyrics-background-fields"><label>Fondo de las letras<select data-lyrics-field="background">${option('original','Fondo original',value.background)}${option('solid','Color liso',value.background)}${assets.filter(a=>a.kind==='image').map(a=>option(a.id,a.name,value.background)).join('')}</select></label>
      ${colorField('backgroundColor', 'Color de fondo', value.backgroundColor)}</div>
    <label class="song-checkbox"><input data-lyrics-field="showVerseNumber" type="checkbox"${value.showVerseNumber?' checked':''}>Mostrar número o nombre de estrofa</label>`)
    + `<label class="song-checkbox"><input data-lyrics-field="textShadow" type="checkbox"${value.textShadow?' checked':''}>Mostrar sombra del texto</label>`;
  fields.querySelector('#lyricsAppearanceType').addEventListener('change', async event => { type=event.target.value; sequence++; renderFields(); await loadSongs(); });
  fields.querySelectorAll('.color-picker-wrapper').forEach(wrapper => {
    wrapper.addEventListener('click', (e) => {
      if (e.target !== wrapper.querySelector('input')) {
        const inp = wrapper.querySelector('input');
        if (inp && inp.showPicker) {
          try { inp.showPicker(); } catch {}
        } else if (inp) {
          inp.click();
        }
      }
    });
  });
  fields.querySelectorAll('[data-lyrics-field]').forEach(input=>input.addEventListener('input',()=>{
    if (input.type === 'color') {
      const hexSpan = input.parentElement?.querySelector('.color-picker-hex');
      if (hexSpan) hexSpan.textContent = input.value.toUpperCase();
    }
    draft.lyrics[type][input.dataset.lyricsField] = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? input.valueAsNumber : input.value;
    clearTimeout(timer); timer=setTimeout(updatePreview,180);
  }));
}
function display() {
  const slide = slides[index];
  if (slide) frame.contentWindow?.postMessage({type:'LYRICS_PREVIEW',slide},location.origin);
  position.textContent = slides.length ? `${index+1} / ${slides.length} · ${slide.sectionLabel || 'Título'}` : 'Sin cuadros';
  document.getElementById('lyricsPreviewPrevious').disabled=index<=0;
  document.getElementById('lyricsPreviewNext').disabled=index>=slides.length-1;
}
async function updatePreview() {
  if (!draft) return;
  const current = ++sequence;
  if (type === 'bible') {
    const citation = { type: 'bible', book: 'Salmos', chapterVerse: '23:1', bibleStyle: draft.lyrics.bible };
    slides = [songSelect.value === 'text'
      ? { ...citation, mode: 'text', reference: 'Salmos 23:1', sectionLabel: 'Cita con texto', displayLines: ['[1] Jehová es mi pastor; nada me faltará.'], fontSize: 76 }
      : { ...citation, sectionLabel: 'Solo cita' }];
    index = 0;
    display();
    message.textContent = 'Ejemplo de Salmos 23:1 en Reina-Valera 1960.';
    return;
  }
  if (!songSelect.value) { slides=[];display();return; }
  message.textContent='Preparando vista previa…';
  try {
    const response=await request('/api/lyrics/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,id:songSelect.value,lyrics:draft.lyrics})});
    const data=await response.json();if(current!==sequence)return;
    slides=data.slides;index=Math.max(0,Math.min(index,slides.length-1));display();
    message.textContent='Los tamaños conservan su proporción en 16:9, desde el minivisor hasta 4K. El límite de renglones es un máximo; si no cabe, se crea otro cuadro.';
  } catch(error) { if(current===sequence)message.textContent=error.message; }
}
async function loadSongs() {
  const loading = ++loadingSongs;
  if (type === 'bible') {
    songSelect.innerHTML = option('text', 'Cita con texto', 'text') + option('citation', 'Solo cita', '');
    await updatePreview();
    return;
  }
  const catalog=type==='hymn'?'himnos':'coro';
  const songs=await(await request(`/api/${catalog}`)).json();
  if (loading !== loadingSongs || !draft) return;
  songSelect.innerHTML=songs.map(song=>option(String(song.id||song.number),`${type==='hymn'?song.number+' · ':''}${song.title}`,'')).join('');
  index=1;await updatePreview();
}
songSelect.addEventListener('change',()=>{index=1;updatePreview();});
document.getElementById('lyricsPreviewPrevious').addEventListener('click',()=>{index=Math.max(0,index-1);display();});
document.getElementById('lyricsPreviewNext').addEventListener('click',()=>{index=Math.min(slides.length-1,index+1);display();});
frame.addEventListener('load',display);
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === 'LYRICS_PREVIEW_ERROR') message.textContent = event.data.error;
});
document.getElementById('resetLyricsAppearance').addEventListener('click',()=>{draft.lyrics[type]=structuredClone(defaults[type]);renderFields();updatePreview();});
for(const [id,kind,key] of [['songFontUpload','font','font'],['songBackgroundUpload','image','background']]){
  document.getElementById(id).addEventListener('change',async event=>{
    const input=event.target,file=input.files[0];if(!file||!draft)return;
    const targetDraft=draft,targetType=type;
    const data=new FormData();data.append('file',file);input.disabled=true;message.textContent='Importando archivo…';
    try {const asset=await(await request('/api/song-assets/'+kind,{method:'POST',body:data})).json();if(draft!==targetDraft)return;assets=await(await request('/api/song-assets')).json();if(draft!==targetDraft)return;targetDraft.lyrics[targetType][key]=asset.id;renderFields();await updatePreview();}
    catch(error){message.textContent=error.message;}finally{input.disabled=false;input.value='';}
  });
}
export async function openLyricsAppearance(settings, original) {
  draft=settings;defaults=original.lyrics;type='hymn';assets=await(await request('/api/song-assets')).json();
  renderFields();frame.src='/pantalla?lyricsPreview=1';await loadSongs();
}
export function closeLyricsAppearance() { draft=null;sequence++;loadingSongs++;clearTimeout(timer);frame.src='about:blank';slides=[]; }
