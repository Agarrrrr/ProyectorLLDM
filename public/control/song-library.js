import { request } from './api.js';
import { escapeHtml } from './html.js';
import { openLyricsEditor, openNewLyricsEditor } from './lyrics-editor.js';
import { searchHymns } from './hymn.js';
import { searchChoir } from './choir.js';
import { showToast } from './shell.js';
const manager=document.getElementById('libraryManager'),catalog=document.getElementById('libraryCatalog'),search=document.getElementById('librarySearch'),results=document.getElementById('libraryResults');
const dialog=document.getElementById('songDeleteDialog'),confirmButton=document.getElementById('songDeleteConfirm'),input=document.getElementById('songDeleteInput');
let active=null,requestId=0,delay;
function leaveSettings(){document.getElementById('settingsDialog').close();}
async function load(){
  const seq=++requestId;
  try{
    const list=await(await request(`/api/${catalog.value}?q=${encodeURIComponent(search.value)}`)).json();if(seq!==requestId)return;
    results.replaceChildren();
    for(const song of list){
      const row=document.createElement('div');row.className='library-row';
      row.innerHTML=`<span>${escapeHtml(catalog.value==='himnos'?'#'+song.number+' · '+song.title:song.title)}</span><div><button type="button" data-edit>Editar canto</button><button type="button" class="song-delete" data-delete>Eliminar</button></div>`;
      row.querySelector('[data-edit]').addEventListener('click',()=>{leaveSettings();openLyricsEditor(catalog.value,song);});
      row.querySelector('[data-delete]').addEventListener('click',()=>{active={song,catalog:catalog.value,step:1};renderDelete();dialog.showModal();});results.append(row);
    }
    if(!list.length)results.textContent='No hay cantos que coincidan.';
  }catch(error){showToast(error.message);}
}
function renderDelete(){
  document.getElementById('songDeleteStep').textContent=`Confirmación ${active.step} de 3`;
  document.getElementById('songDeleteDescription').textContent=active.step===1?`Vas a quitar «${active.song.title}» del ${active.catalog==='himnos'?'Himnario':'Coro'}. ¿Continuar?`:active.step===2?'Se eliminará del catálogo compartido de esta instalación. Si está en las TV, su imagen actual se conservará hasta que envíes otro contenido. ¿Confirmas?':`Para finalizar, escribe exactamente: ${active.song.title}`;
  document.getElementById('songDeleteLabel').hidden=active.step!==3;input.value='';
  confirmButton.textContent=active.step===3?'Eliminar definitivamente':'Confirmar y continuar';document.getElementById('songDeleteError').textContent='';
}
confirmButton.addEventListener('click',async()=>{
  if(!active)return;confirmButton.disabled=true;
  try{
    const url=`/api/library/${active.catalog}/${encodeURIComponent(active.song.id||active.song.number)}`;
    if(active.step<3){const result=await(await request(url+'/delete-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({step:active.step,token:active.token})})).json();active.token=result.token;active.step++;renderDelete();if(active.step===3)input.focus();}
    else{await request(url,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:active.token,confirmation:input.value})});dialog.close();showToast('Canto eliminado del catálogo');await refreshLibrary();}
  }catch(error){document.getElementById('songDeleteError').textContent=error.message;}
  finally{confirmButton.disabled=false;}
});
document.getElementById('songDeleteCancel').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{active=null;});
document.getElementById('libraryAdd').addEventListener('click',()=>{leaveSettings();openNewLyricsEditor(catalog.value);});
manager.addEventListener('toggle',()=>{if(manager.open)load();});catalog.addEventListener('change',load);search.addEventListener('input',()=>{clearTimeout(delay);delay=setTimeout(load,180);});
async function refreshLibrary(){await Promise.all([searchHymns(document.getElementById('hymnSearchInput').value),searchChoir(document.getElementById('choirSearchInput').value)]);if(manager.open)await load();}
window.addEventListener('song-catalog-changed',refreshLibrary);
export function resetLibrary(){manager.open=false;manager.closest('.settings-advanced').open=false;}
