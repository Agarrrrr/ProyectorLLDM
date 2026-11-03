const crypto = require('node:crypto');
const { prepareDatabase } = require('./search');
const { text } = require('express');
const { normalizeChoirSection, choirSections } = require('./sections');

function cleanSong(body, catalog, { allowUnnumbered = false } = {}) {
  const title = String(body.title || '').trim();
  const number = catalog === 'himnos' && !(allowUnnumbered && body.number == null) ? Number(body.number) : null;
  if (!title || title.length > 200 || (catalog === 'himnos' && !(allowUnnumbered && number === null) &&
      (!Number.isSafeInteger(number) || number < 1 || number > 99999))) throw new Error('Escribe un título y un número de himno válido.');
  if (!Array.isArray(body.sections) || !body.sections.length || body.sections.length > 150) throw new Error('Agrega al menos una sección de letra.');
  const sections = body.sections.map((section, i) => ({
    type: ['verse', 'chorus', 'part', 'canto', 'final', 'response', 'bridge'].includes(section.type) ? section.type : 'verse',
    label: String(section.label || `Estrofa ${i+1}`).trim().slice(0,100),
    lines: Array.isArray(section.lines) ? section.lines.map(line => String(line).trim()).filter(Boolean) : []
  }));
  if (sections.some(section => !section.lines.length || section.lines.length > 300 || section.lines.some(line => line.length > 3000))) throw new Error('Cada sección necesita letra; revisa la longitud de los renglones.');
  return { id: 'custom_' + crypto.randomUUID(), number, title, sections, totalLines: sections.reduce((sum, section) => sum + section.lines.length, 0) };
}

function installSongManagement({ app, catalogs, projectionState, broadcastState, songCompiler }) {
  const confirmations = new Map();
  const isChoir = catalog => ['coro','choir'].includes(catalog);
  const listFor = catalog => isChoir(catalog) ? catalogs.coro : catalogs.himnario;
  const find = (catalog, id) => listFor(catalog).find(song => String(song.id) === id || String(song.number) === id);
  const digest = song => crypto.createHash('sha256').update(JSON.stringify(song)).digest('hex');
  function publish(catalog, next, afterSave = () => {}, options) {
    const list = listFor(catalog);
    catalogs.saveCatalogToDisk(catalog, next, options);
    list.splice(0,list.length,...next); prepareDatabase(list);
    afterSave();
    projectionState.catalogRevision = (projectionState.catalogRevision || 0) + 1;
    broadcastState();
  }
  app.get('/api/library/:catalog/export', (req, res) => {
    const { catalog } = req.params;
    if (!['choir', 'himnos'].includes(catalog)) return res.sendStatus(404);
    res.attachment(isChoir(catalog) ? 'coro_lldm.json' : 'himnario_lldm.json').json(listFor(catalog));
  });
  app.post('/api/library/:catalog/import', text({ type: 'application/octet-stream', limit: '8mb', inflate: false }), (req, res) => {
    const { catalog } = req.params;
    if (!['choir', 'himnos'].includes(catalog)) return res.sendStatus(404);
    const choir = isChoir(catalog);
    const list = listFor(catalog);
    try {
      const replace = req.query.mode === 'replace';
      const entries = JSON.parse(String(req.body || '').replace(/^\uFEFF/, ''));
      if (!Array.isArray(entries) || !entries.length) throw new Error('El archivo debe contener al menos un canto.');
      if (entries.length + (replace ? 0 : list.length) > 3000) throw new Error('El catálogo puede contener hasta 3000 cantos.');
      const used = new Set(replace ? [] : list.map(song => String(song.id)));
      const numbers = new Set(replace ? [] : list.map(song => song.number));
      const imported = entries.map((entry, index) => {
        try {
          if (typeof entry?.title !== 'string' || !Array.isArray(entry.sections) || entry.sections.some(section =>
            !Array.isArray(section?.lines) || section.lines.some(line => typeof line !== 'string'))) throw new Error('Se requieren title y sections con líneas de texto.');
          const sections = choir ? entry.sections.map(normalizeChoirSection) : entry.sections;
          const song = cleanSong({ ...entry, sections }, choir ? 'coro' : 'himnos', { allowUnnumbered: true });
          if (choir && Number.isSafeInteger(entry.number) && entry.number > 0) song.number = entry.number;
          if (Array.isArray(entry.categories)) song.categories = entry.categories.filter(value => typeof value === 'string');
          if (entry.id !== undefined) {
            const id = String(entry.id);
            if (!id.trim() || id.length > 200 || /[\x00-\x1f\x7f]/.test(id) || !['string', 'number'].includes(typeof entry.id)) throw new Error('Identificador inválido.');
            song.id = entry.id;
          }
          if (used.has(String(song.id))) throw new Error('Identificador repetido: ' + song.id);
          if (choir && !choirSections(song.sections).length) throw new Error('El canto necesita al menos una sección que se pueda proyectar.');
          if (!choir && song.number !== null && numbers.has(song.number)) throw new Error('Número de himno repetido: ' + song.number);
          numbers.add(song.number);
          used.add(String(song.id));
          return song;
        } catch (error) { throw new Error(`Canto ${index + 1}. ${error.message}`); }
      });
      publish(catalog, replace ? imported : [...list, ...imported], () => {
        if (replace) projectionState.workspace.selections[choir ? 'choir' : 'hymn'] = null;
      }, { requireBackup: true });
      res.status(201).json({ imported: imported.length, total: list.length });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });
  app.post('/api/library/:catalog', (req,res) => {
    try {
      const song = cleanSong(req.body, isChoir(req.params.catalog) ? 'coro' : 'himnos');
      const list = listFor(req.params.catalog);
      if (song.number && list.some(value => value.number === song.number)) return res.status(409).json({ error:'Ese número ya existe en el himnario.' });
      const slides = songCompiler.compile(isChoir(req.params.catalog) ? 'choir' : 'hymn',song);
      publish(req.params.catalog,[...list,song]); res.status(201).json({success:true,song,slides});
    } catch(error) { res.status(400).json({error:error.message}); }
  });
  app.post('/api/library/:catalog/:id/delete-check', (req,res) => {
    const song=find(req.params.catalog,req.params.id);
    if(!song) return res.status(404).json({error:'El canto ya no está en este catálogo.'});
    for(const [key,value] of confirmations) if(value.expires<Date.now()) confirmations.delete(key);
    const {step,token}=req.body;
    if(step===1){
      if(confirmations.size>=200) return res.status(429).json({error:'Hay demasiadas solicitudes pendientes. Espera unos minutos.'});
      const token=crypto.randomUUID(); confirmations.set(token,{catalog:req.params.catalog,id:req.params.id,digest:digest(song),step:1,expires:Date.now()+120000});
      return res.json({token,step:1});
    }
    const entry=confirmations.get(token);
    if(step!==2 || !entry || entry.step!==1 || entry.catalog!==req.params.catalog || entry.id!==req.params.id || entry.digest!==digest(song)) return res.status(409).json({error:'La confirmación venció o el canto cambió. Vuelve a empezar.'});
    entry.step=2; res.json({token,step:2});
  });
  app.delete('/api/library/:catalog/:id', (req,res) => {
    const song=find(req.params.catalog,req.params.id), entry=confirmations.get(req.body.token);
    if(!song || !entry || entry.expires<Date.now() || entry.step!==2 || entry.catalog!==req.params.catalog || entry.id!==req.params.id || entry.digest!==digest(song) || req.body.confirmation!==song.title) return res.status(409).json({error:'Completa las tres confirmaciones del canto actual.'});
    try {
      const type=isChoir(req.params.catalog)?'choir':'hymn';
      const selected=projectionState.workspace.selections[type];
      publish(req.params.catalog,listFor(req.params.catalog).filter(value=>value!==song), () => {
        if(selected?.item.id===song.id) projectionState.workspace.selections[type]=null;
      });
      confirmations.delete(req.body.token);res.json({success:true});
    } catch(error){res.status(500).json({error:'No se pudo guardar la eliminación. '+error.message});}
  });
  app.post('/api/lyrics/preview', (req,res) => {
    try {
      const { validateLyrics }=require('./appearance');
      const type=req.body.type==='choir'?'choir':'hymn';
      const settings={...projectionState.settings,lyrics:validateLyrics(req.body.lyrics)};
      const song=find(type==='choir'?'coro':'himnos',String(req.body.id));
      if(!song) return res.status(404).json({error:'Selecciona un canto disponible para la vista previa.'});
      res.json({slides:songCompiler.compile(type,song,settings)});
    }catch(error){res.status(400).json({error:error.message});}
  });
}
module.exports={installSongManagement};
