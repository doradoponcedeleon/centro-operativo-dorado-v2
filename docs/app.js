const $ = (id)=>document.getElementById(id);
const views = {
  dashboard: $('view-dashboard'),
  proyectos: $('view-proyectos'),
  bitacora: $('view-bitacora'),
  modulos: $('view-modulos'),
  importexport: $('view-importexport')
};

const state = {
  proyectos: [],
  bitacora: []
};

const STORAGE_KEY = 'cod-data-v1';
let MODULES = [
  {id:'oficina-ideas', name:'Oficina de Ideas'},
  {id:'mama-salud', name:'Mamá Salud'},
  {id:'abc-de-vicky', name:'ABC de Vicky'},
  {id:'audio-sagrado', name:'Audio Sagrado'},
  {id:'kits-fisica', name:'Kits Física'},
  {id:'maker-lab', name:'Maker Lab'}
];
const MODULES_KEY = 'cod-module-paths-v1';
const MODULES_LIST_KEY = 'cod-module-list-v1';
const MODULES_URL_KEY = 'cod-module-url-v1';
const MODULES_LOCAL_URL_KEY = 'cod-module-local-url-v1';

const SUPABASE_URL = 'https://yxyzggisvwjjgxydativ.supabase.co';
const SUPABASE_ANON = 'sb_publishable_dnchkTsAhIxINM97-Si6yw_eWeZ9fDI';
const SUPABASE_TABLE = 'cod_data';
const SUPABASE_ID = 'main';
const IDEAS_DB = 'oficina_ideas_db';
const IDEAS_STORE = 'ideas';

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const data = JSON.parse(raw);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
    }
  }catch(e){
    $('sync-status').textContent = 'Sincronización: error al leer';
  }
}

function loadFromLocalStoragePreferV1(){
  try{
    const raw = localStorage.getItem('cod-data-v1') || localStorage.getItem('cod_data-v1') || localStorage.getItem(STORAGE_KEY);
    if(raw){
      const data = JSON.parse(raw);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      return true;
    }
  }catch(e){
    $('sync-status').textContent = 'Sincronización: error al leer';
  }
  return false;
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleCloudSync();
}

function setView(name){
  Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden', k!==name));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
}

function renderDashboard(){
  const total = state.proyectos.length;
  const activos = state.proyectos.filter(p=>p.estado==='activo').length;
  const pausados = state.proyectos.filter(p=>p.estado==='pausado').length;
  const completos = state.proyectos.filter(p=>p.estado==='completo').length;
  $('kpi-total').textContent = total;
  $('kpi-activos').textContent = activos;
  $('kpi-pausados').textContent = pausados;
  $('kpi-completos').textContent = completos;

  const list = $('dash-next');
  list.innerHTML='';
  const nexts = state.proyectos.filter(p=>p.next).slice(0,6);
  if(!nexts.length){ list.innerHTML = '<li class="small">Sin próximos pasos.</li>'; return; }
  nexts.forEach(p=>{
    const li = document.createElement('li');
    li.textContent = `${p.nombre} — ${p.next}`;
    list.appendChild(li);
  });
}

function renderProyectos(){
  const q = $('q').value.toLowerCase();
  const f = $('f-estado').value;
  const list = $('list-proyectos');
  list.innerHTML = '';

  const filtered = state.proyectos.filter(p=>{
    const text = [p.nombre, p.estado, (p.tags||[]).join(' '), p.notas||''].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (!f || p.estado===f);
  });

  if(!filtered.length){
    list.innerHTML = '<div class="small">No hay proyectos.</div>';
    return;
  }

  filtered.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <strong>${p.nombre}</strong>
        <span class="small">${p.estado}</span>
      </div>
      <div class="small">Etiquetas: ${(p.tags||[]).join(', ') || '—'}</div>
      <div class="small">Próximo: ${p.next || '—'}</div>
      <div class="small">Ruta local: ${p.path || '—'}</div>
      <div class="small">URL: ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.url}</a>` : '—'}</div>
      <div class="row">
        <button data-id="${p.id}" class="edit">Editar</button>
        <button data-id="${p.id}" class="del">Eliminar</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderBitacora(){
  const list = $('bit-list');
  list.innerHTML = '';
  const items = state.bitacora.slice().reverse();
  if(!items.length){ list.innerHTML = '<div class="small">Sin registros.</div>'; return; }
  items.forEach(b=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<div class="small">${new Date(b.ts).toLocaleString()}</div><div>${b.text}</div>`;
    list.appendChild(div);
  });
}

function openDialog(p){
  $('dlg').showModal();
  $('p-id').value = p?.id || '';
  $('p-nombre').value = p?.nombre || '';
  $('p-estado').value = p?.estado || 'activo';
  $('p-tags').value = (p?.tags||[]).join(', ');
  $('p-next').value = p?.next || '';
  $('p-notas').value = p?.notas || '';
  $('p-path').value = p?.path || '';
  $('p-url').value = p?.url || '';
  $('p-url-local').value = p?.url_local || '';
  $('dlg-title').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
}

function upsertProject(){
  const id = $('p-id').value || crypto.randomUUID();
  const data = {
    id,
    nombre: $('p-nombre').value.trim(),
    estado: $('p-estado').value,
    tags: $('p-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    next: $('p-next').value.trim(),
    notas: $('p-notas').value.trim(),
    path: $('p-path').value.trim(),
    url: $('p-url').value.trim(),
    url_local: $('p-url-local').value.trim()
  };
  const idx = state.proyectos.findIndex(p=>p.id===id);
  if(idx>=0) state.proyectos[idx]=data; else state.proyectos.push(data);
  save();
  renderProyectos();
  renderDashboard();
}

function deleteProject(id){
  state.proyectos = state.proyectos.filter(p=>p.id!==id);
  save();
  renderProyectos();
  renderDashboard();
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'centro-operativo-dorado.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
      alert('Importación lista.');
      scheduleCloudSync();
    }catch(e){ alert('JSON inválido.'); }
  };
  reader.readAsText(file);
}

function openIdeasDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(IDEAS_DB, 1);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(IDEAS_STORE)) db.createObjectStore(IDEAS_STORE, {keyPath:'id'});
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

async function readIdeas(){
  try{
    const db = await openIdeasDB();
    const tx = db.transaction(IDEAS_STORE, 'readonly');
    const store = tx.objectStore(IDEAS_STORE);
    const req = store.getAll();
    return await new Promise((res)=>{ req.onsuccess = ()=>res(req.result || []); });
  }catch(e){ return []; }
}

async function writeIdeas(list){
  const db = await openIdeasDB();
  const tx = db.transaction(IDEAS_STORE, 'readwrite');
  const store = tx.objectStore(IDEAS_STORE);
  store.clear();
  (list||[]).forEach(i=>store.put(i));
}

async function exportAll(){
  const ideas = await readIdeas();
  const payload = {
    proyectos: state.proyectos,
    bitacora: state.bitacora,
    ideas
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'centro-operativo-dorado-todo.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAll(file){
  const reader = new FileReader();
  reader.onload = async () => {
    try{
      const data = JSON.parse(reader.result);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      await writeIdeas(data.ideas || []);
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
      alert('Importación total lista.');
      scheduleCloudSync();
    }catch(e){ alert('JSON inválido.'); }
  };
  reader.readAsText(file);
}

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
    if(!res.ok){
      const text = await res.text().catch(()=> '');
      console.error('Supabase error:', res.status, text);
      throw new Error(`Supabase error ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  } finally {
    clearTimeout(t);
  }
}

async function loadFromCloud(){
  try{
    $('sync-status').textContent = 'Sincronización: leyendo...';
    const rows = await supaFetch(`${SUPABASE_TABLE}?id=eq.${SUPABASE_ID}&select=data`, { method: 'GET' });
    if(rows && rows[0] && rows[0].data){
      const data = rows[0].data;
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      await writeIdeas(data.ideas || []);
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
      $('sync-status').textContent = 'Sincronización: OK (cargado)';
      return;
    }
    $('sync-status').textContent = 'Sincronización: sin datos';
  }catch(e){
    console.error('Error loadFromCloud:', e);
    $('sync-status').textContent = 'Sincronización: error al leer';
  }
}

async function cargarDatosIniciales(){
  // 1) LocalStorage (clave solicitada)
  loadFromLocalStoragePreferV1();
  renderDashboard();
  renderProyectos();
  renderBitacora();
  renderModulePaths();

  // 2) Supabase (si hay datos, sobrescribe con lo más actualizado)
  await loadFromCloud();
}

let syncTimer = null;
function scheduleCloudSync(){
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 800);
}

async function syncToCloud(){
  try{
    $('sync-status').textContent = 'Sincronización: enviando...';
    const ideas = await readIdeas();
    const payload = {
      id: SUPABASE_ID,
      data: {
        proyectos: state.proyectos,
        bitacora: state.bitacora,
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
    console.error('Error syncToCloud:', e);
    $('sync-status').textContent = 'Sincronización: error al enviar';
  }
}


async function loadFromPath(path){
  try{
    $('sync-status').textContent = 'Sincronización: leyendo ruta...';
    const url = `http://127.0.0.1:8091/load?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('No se pudo leer la ruta');
    const data = await res.json();
    state.proyectos = data.proyectos || [];
    state.bitacora = data.bitacora || [];
    await writeIdeas(data.ideas || []);
    save();
    renderDashboard();
    renderProyectos();
    renderBitacora();
    $('sync-status').textContent = 'Sincronización: OK (ruta cargada)';
  }catch(e){
    $('sync-status').textContent = 'Sincronización: error al leer ruta';
  }
}




function loadModuleUrls(){
  try{ return JSON.parse(localStorage.getItem(MODULES_URL_KEY) || '{}'); }catch(e){ return {}; }
}
function saveModuleUrls(map){
  localStorage.setItem(MODULES_URL_KEY, JSON.stringify(map));
}
function loadModuleLocalUrls(){
  try{ return JSON.parse(localStorage.getItem(MODULES_LOCAL_URL_KEY) || '{}'); }catch(e){ return {}; }
}
function saveModuleLocalUrls(map){
  localStorage.setItem(MODULES_LOCAL_URL_KEY, JSON.stringify(map));
}

function loadModuleList(){
  try{ return JSON.parse(localStorage.getItem(MODULES_LIST_KEY) || '[]'); }catch(e){ return []; }
}
function saveModuleList(list){
  localStorage.setItem(MODULES_LIST_KEY, JSON.stringify(list));
}

function loadModulePaths(){
  try{ return JSON.parse(localStorage.getItem(MODULES_KEY) || '{}'); }catch(e){ return {}; }
}
function saveModulePaths(map){
  localStorage.setItem(MODULES_KEY, JSON.stringify(map));
}
function renderModulePaths(){
  const host = $('module-paths');
  if(!host) return;
  const map = loadModulePaths();
  const urls = loadModuleUrls();
  const localUrls = loadModuleLocalUrls();
  host.innerHTML = '';
  const allModules = MODULES.concat(loadModuleList());
  allModules.forEach(m=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div style="min-width:180px;font-weight:700">${m.name}</div>
      <input data-mid="${m.id}" value="${map[m.id]||''}" placeholder="/data/data/..." style="flex:1"/>
      <input data-uid="${m.id}" value="${urls[m.id]||''}" placeholder="https://..." style="flex:1"/>
      <input data-lid="${m.id}" value="${localUrls[m.id]||''}" placeholder="http://127.0.0.1:8000/..." style="flex:1"/>
      <button data-save="${m.id}">Guardar</button>
      <a class="openlink" href="${(urls[m.id]||"#")}" target="_blank" rel="noopener">Abrir URL</a>
      <a class="openlink" href="${(localUrls[m.id]||"#")}" target="_blank" rel="noopener">Abrir Local</a>
    `;
    host.appendChild(row);
  });
  host.addEventListener('click', (e)=>{
    const id = e.target.getAttribute('data-save');
    if(!id) return;
    const input = host.querySelector(`input[data-mid="${id}"]`);
    const inputUrl = host.querySelector(`input[data-uid="${id}"]`);
    const inputLocal = host.querySelector(`input[data-lid="${id}"]`);
    const map = loadModulePaths();
    const urls = loadModuleUrls();
    const localUrls = loadModuleLocalUrls();
    map[id] = input.value.trim();
    urls[id] = inputUrl.value.trim();
    localUrls[id] = inputLocal.value.trim();
    saveModulePaths(map);
    saveModuleUrls(urls);
    saveModuleLocalUrls(localUrls);
  });
}

function bind(){
  document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click', ()=>setView(b.dataset.view)));
  $('btn-new').addEventListener('click', ()=>openDialog());
  $('form-proyecto').addEventListener('submit', (e)=>{ e.preventDefault(); upsertProject(); $('dlg').close(); });
  $('list-proyectos').addEventListener('click', (e)=>{
    const id = e.target.dataset.id;
    if(e.target.classList.contains('edit')){
      openDialog(state.proyectos.find(p=>p.id===id));
    }
    if(e.target.classList.contains('del')) deleteProject(id);
  });
  $('q').addEventListener('input', renderProyectos);
  $('f-estado').addEventListener('change', renderProyectos);

  $('bit-add').addEventListener('click', ()=>{
    const text = $('bit-text').value.trim();
    if(!text) return;
    state.bitacora.push({ts: Date.now(), text});
    $('bit-text').value='';
    save();
    renderBitacora();
  });

  $('btn-export').addEventListener('click', exportJSON);
  $('file-import').addEventListener('change', (e)=>{ if(e.target.files[0]) importJSON(e.target.files[0]); });
  $('btn-export-all').addEventListener('click', exportAll);
  $('file-import-all').addEventListener('change', (e)=>{ if(e.target.files[0]) importAll(e.target.files[0]); });
  $('btn-load-path').addEventListener('click', ()=>{
    const p = $('path-input').value.trim();
    if(p) loadFromPath(p);
  });
  $('btn-sync').addEventListener('click', async ()=>{
    await syncToCloud();
    await loadFromCloud();
  });

  $('btn-add-module').addEventListener('click', ()=>{
    const name = $('new-module-name').value.trim();
    const path = $('new-module-path').value.trim();
    if(!name) return;
    const id = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
    const list = loadModuleList();
    if(!list.some(m=>m.id===id)) list.push({id, name});
    saveModuleList(list);
    const map = loadModulePaths();
    map[id] = path;
    saveModulePaths(map);
    $('new-module-name').value='';
    $('new-module-path').value='';
    renderModulePaths();
  });
}

bind();
setView('dashboard');
cargarDatosIniciales();
