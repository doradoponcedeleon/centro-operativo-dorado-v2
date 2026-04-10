const $ = (id)=>document.getElementById(id);
const DB_NAME = 'oficina_ideas_db';
const STORE = 'ideas';
const SUPABASE_URL = 'https://yxyzggisvwjjgxydativ.supabase.co';
const SUPABASE_ANON = 'sb_publishable_dnchkTsAhIxINM97-Si6yw_eWeZ9fDI';
const SUPABASE_TABLE = 'cod_data';
const SUPABASE_ID = 'main';
let db = null;
let ideas = [];

function openDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath:'id'});
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

async function load(){
  db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const req = store.getAll();
  return new Promise((res)=>{ req.onsuccess = ()=>{ ideas = req.result || []; res(); }; });
}

function saveIdea(item){
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(item);
  scheduleCloudSync();
}

function deleteIdea(id){
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  scheduleCloudSync();
}

function render(){
  const q = $('q').value.toLowerCase();
  const drawer = $('drawer').value;
  const list = $('list');
  list.innerHTML = '';
  const filtered = ideas.filter(i=>{
    const txt = [i.title, i.text, (i.tags||[]).join(' '), i.drawer].join(' ').toLowerCase();
    return (!q || txt.includes(q)) && (!drawer || i.drawer===drawer);
  });
  if(!filtered.length){ list.innerHTML = '<div class="card">Sin ideas.</div>'; return; }
  filtered.forEach(i=>{
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <strong>${i.title}</strong>
        <span class="small">${i.drawer}</span>
      </div>
      <div>${i.text || ''}</div>
      <div class="small">Etiquetas: ${(i.tags||[]).join(', ') || '—'}</div>
      <div class="row">
        <button class="edit" data-id="${i.id}">Editar</button>
        <button class="del" data-id="${i.id}">Eliminar</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function openDlg(item){
  $('dlg').showModal();
  $('i-id').value = item?.id || '';
  $('i-title').value = item?.title || '';
  $('i-text').value = item?.text || '';
  $('i-drawer').value = item?.drawer || 'captura';
  $('i-tags').value = (item?.tags||[]).join(', ');
  $('dlg-title').textContent = item ? 'Editar idea' : 'Nueva idea';
}

function upsert(){
  const id = $('i-id').value || crypto.randomUUID();
  const item = {
    id,
    title: $('i-title').value.trim(),
    text: $('i-text').value.trim(),
    drawer: $('i-drawer').value,
    tags: $('i-tags').value.split(',').map(s=>s.trim()).filter(Boolean)
  };
  const idx = ideas.findIndex(i=>i.id===id);
  if(idx>=0) ideas[idx]=item; else ideas.push(item);
  saveIdea(item);
  render();
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(ideas, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'oficina-ideas.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(Array.isArray(data)){
        ideas = data;
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.clear();
        ideas.forEach(i=>store.put(i));
        render();
        scheduleCloudSync();
      }else{
        alert('JSON inválido');
      }
    }catch(e){ alert('JSON inválido'); }
  };
  reader.readAsText(file);
}

function bind(){
  $('btn-new').addEventListener('click', ()=>openDlg());
  $('form').addEventListener('submit', (e)=>{ e.preventDefault(); upsert(); $('dlg').close(); });
  $('q').addEventListener('input', render);
  $('drawer').addEventListener('change', render);
  $('list').addEventListener('click', (e)=>{
    const id = e.target.dataset.id;
    if(e.target.classList.contains('edit')) openDlg(ideas.find(i=>i.id===id));
    if(e.target.classList.contains('del')){ deleteIdea(id); ideas = ideas.filter(i=>i.id!==id); render(); }
  });
  $('btn-export').addEventListener('click', exportJSON);
  $('file-import').addEventListener('change', (e)=>{ if(e.target.files[0]) importJSON(e.target.files[0]); });
  $('btn-sync').addEventListener('click', async ()=>{
    $('sync-status').textContent = 'Sincronización: enviando...';
    await syncToCloud();
    $('sync-status').textContent = 'Sincronización: leyendo...';
    await loadFromCloud();
  });
}

// Web Speech API (dictado)
let rec = null;
let recording = false;
function initSpeech(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ $('btn-mic').disabled=true; $('btn-mic').textContent='🎙️ No disponible'; return; }
  rec = new SR();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (e)=>{
    let finalText = '';
    let interim = '';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r = e.results[i];
      if(r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript + ' ';
    }
    if(finalText.trim()){
      $('i-text').value = ( $('i-text').value + ' ' + finalText.trim() ).trim();
    }
    $('live').textContent = `Transcripción en vivo: ${interim.trim() || '—'}`;
  };
  rec.onerror = ()=>{ $('mic-status').textContent='Micrófono con error'; };
  rec.onend = ()=>{
    recording = false;
    $('btn-mic').textContent = '🎙️ Dictar';
    $('mic-status').textContent = 'Micrófono listo';
    $('live').textContent = 'Transcripción en vivo: —';
  };
}

$('btn-mic').addEventListener('click', ()=>{
  if(!rec){ initSpeech(); }
  if(!rec) return;
  if(recording){
    rec.stop();
    return;
  }
  recording = true;
  $('btn-mic').textContent = '⏹️ Detener dictado';
  $('mic-status').textContent = 'Escuchando…';
  rec.start();
  // abre diálogo si no está abierto
  if(!$('dlg').open) openDlg();
});

(function setupTemplates(){
  const templates = {
    desc: "Idea:\\n- Descripción:\\n- Próximo paso:\\n- Recursos:",
    problema: "Problema:\\n- Causa raíz:\\n- Solución propuesta:\\n- Impacto esperado:",
    experimento: "Hipótesis:\\n- Experimento:\\n- Métrica de éxito:\\n- Resultado:",
    pitch: "Pitch:\\n- Para quién:\\n- Qué duele:\\n- Propuesta:"
  };
  $('btn-tpl').addEventListener('click', ()=>{
    const key = $('tpl').value;
    if(!key) return;
    const t = templates[key];
    $('i-text').value = ($('i-text').value + ( $('i-text').value ? "\\n\\n" : "" ) + t).trim();
    if(!$('dlg').open) openDlg();
  });
})();

(async ()=>{
  await load();
  bind();
  initSpeech();
  render();
  loadFromCloud();
})();

async function supaFetch(path, options={}){
  const headers = Object.assign({
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
  }, options.headers || {});
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 6000);
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers, signal: ctrl.signal });
    if(!res.ok) throw new Error('Supabase error');
    return res.status === 204 ? null : res.json();
  } finally {
    clearTimeout(t);
  }
}

async function loadFromCloud(){
  try{
    const rows = await supaFetch(`${SUPABASE_TABLE}?id=eq.${SUPABASE_ID}&select=data`, { method: 'GET' });
    if(rows && rows[0] && rows[0].data && rows[0].data.ideas){
      ideas = rows[0].data.ideas;
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      ideas.forEach(i=>store.put(i));
      render();
      $('sync-status').textContent = 'Sincronización: OK (cargado)';
      return;
    }
    $('sync-status').textContent = 'Sincronización: sin datos';
  }catch(e){
    $('sync-status').textContent = 'Sincronización: error al leer';
  }
}

let syncTimer = null;
function scheduleCloudSync(){
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 800);
}

async function syncToCloud(){
  try{
    let base = { proyectos: [], bitacora: [], ideas: [] };
    try{
      const rows = await supaFetch(`${SUPABASE_TABLE}?id=eq.${SUPABASE_ID}&select=data`, { method: 'GET' });
      if(rows && rows[0] && rows[0].data) base = rows[0].data;
    }catch(e){}
    const payload = {
      id: SUPABASE_ID,
      data: {
        proyectos: base.proyectos || [],
        bitacora: base.bitacora || [],
        ideas
      }
    };
    await supaFetch(`${SUPABASE_TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([payload])
    });
    $('sync-status').textContent = 'Sincronización: OK (enviado)';
  }catch(e){
    $('sync-status').textContent = 'Sincronización: error al enviar';
  }
}
