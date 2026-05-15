// ============================================================
// CONFIGURACIÓN SUPABASE
// ============================================================
const SUPABASE_URL = 'https://weoomtanpjmepkmmywzq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb29tdGFucGptZXBrbW15d3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTYxODksImV4cCI6MjA5NDM3MjE4OX0.iPtrSqL-MYvdkcJeWDE39oMrOlpqUB0-iUDOcDibkBM';

// ============================================================
// ESTADO GLOBAL
// ============================================================
let SESSION = null;
let CURSOS_DATA = [];
let EVAL_CURSO = null;
let EVAL_STEP = 0;
let EVAL_RESPUESTAS = {};
let EDICION_VALS = {};

const CRITERIOS = [
  { id: 'criterio1', nombre: 'Dominio del Tema', desc: 'Evalúa el nivel de conocimiento técnico.', opciones: [
    { nivel: 'EXCELENTE', clase: 'exc', pts: 10, cond: 'Dominio completo, responden con precisión.' },
    { nivel: 'BUENO', clase: 'bue', pts: 7, cond: 'Buen conocimiento con pequeñas dudas.' },
    { nivel: 'REGULAR', clase: 'reg', pts: 5, cond: 'Conocimiento básico; dificultades.' },
    { nivel: 'DEBE MEJORAR', clase: 'mej', pts: 2, cond: 'Conocimiento muy limitado.' }
  ]},
  { id: 'criterio2', nombre: 'Innovación y Creatividad', desc: 'Evalúa originalidad.', opciones: [
    { nivel: 'EXCELENTE', clase: 'exc', pts: 10, cond: 'Solución altamente innovadora.' },
    { nivel: 'BUENO', clase: 'bue', pts: 7, cond: 'Propuesta creativa con elementos nuevos.' },
    { nivel: 'REGULAR', clase: 'reg', pts: 5, cond: 'Funcional con creatividad limitada.' },
    { nivel: 'DEBE MEJORAR', clase: 'mej', pts: 2, cond: 'Escasa innovación.' }
  ]},
  { id: 'criterio3', nombre: 'Presentación', desc: 'Evalúa claridad expositiva.', opciones: [
    { nivel: 'EXCELENTE', clase: 'exc', pts: 10, cond: 'Estructurada, clara y dinámica.' },
    { nivel: 'BUENO', clase: 'bue', pts: 7, cond: 'Buena presentación, pequeños nervios.' },
    { nivel: 'REGULAR', clase: 'reg', pts: 5, cond: 'Aceptable con problemas de organización.' },
    { nivel: 'DEBE MEJORAR', clase: 'mej', pts: 2, cond: 'Desorganizada.' }
  ]},
  { id: 'criterio4', nombre: 'Impacto', desc: 'Evalúa si resuelve un problema real.', opciones: [
    { nivel: 'EXCELENTE', clase: 'exc', pts: 10, cond: 'Impacto significativo, aplicable.' },
    { nivel: 'BUENO', clase: 'bue', pts: 7, cond: 'Impacto positivo con ajustes menores.' },
    { nivel: 'REGULAR', clase: 'reg', pts: 5, cond: 'Impacto limitado.' },
    { nivel: 'DEBE MEJORAR', clase: 'mej', pts: 2, cond: 'No queda claro el problema.' }
  ]}
];

// ============================================================
// ELEMENTOS HTML
// ============================================================
const screenLogin = document.getElementById('screen-login');
const screenApp = document.getElementById('screen-app');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const loginError = document.getElementById('login-error');
const userAvatar = document.getElementById('user-avatar');
const userNombre = document.getElementById('user-nombre');
const userRol = document.getElementById('user-rol');
const toast = document.getElementById('toast');

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg, tipo = '') {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast ' + tipo + ' show';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast ' + tipo; }, 3000);
}

// ============================================================
// SUPABASE FETCH
// ============================================================
async function supabaseQuery(table, method = 'GET', body = null, filters = '') {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const options = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (filters) url += `?${filters}`;
  if (body && (method === 'POST' || method === 'PATCH')) options.body = JSON.stringify(body);
  if (method === 'GET' || (method === 'POST' && options.headers['Prefer'] === 'return=representation')) url += url.includes('?') ? '&select=*' : '?select=*';
  const res = await fetch(url, options);
  if (!res.ok) { const err = await res.text(); throw new Error(`${res.status}: ${err}`); }
  if (method === 'DELETE' || method === 'PATCH') return { success: true };
  const text = await res.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch(e) { return text; }
}

// ============================================================
// LOGIN
// ============================================================
if (btnLogin) btnLogin.addEventListener('click', handleLogin);
document.addEventListener('keydown', e => { if (e.key === 'Enter' && screenLogin && screenLogin.classList.contains('active')) handleLogin(); });

async function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!user || !pass) { loginError.textContent = '⚠ Completa los campos.'; loginError.classList.add('show'); return; }
  btnLogin.textContent = 'VERIFICANDO...'; btnLogin.disabled = true; loginError.classList.remove('show');
  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, `username=eq.${user}&password=eq.${pass}`);
    if (!usuarios.length) throw new Error('Credenciales');
    SESSION = { username: usuarios[0].username, nombre: usuarios[0].nombre, rol: usuarios[0].rol };
    localStorage.setItem('feria_session', JSON.stringify(SESSION));
    iniciarApp();
  } catch(e) { loginError.textContent = '⚠ Usuario o contraseña incorrectos.'; loginError.classList.add('show'); btnLogin.textContent = 'INGRESAR AL SISTEMA'; btnLogin.disabled = false; }
}

// ============================================================
// LOGOUT
// ============================================================
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    SESSION = null; localStorage.removeItem('feria_session');
    screenLogin.classList.add('active'); screenApp.classList.remove('active');
    btnLogin.textContent = 'INGRESAR AL SISTEMA'; btnLogin.disabled = false;
    document.getElementById('login-user').value = ''; document.getElementById('login-pass').value = '';
  });
}

// ============================================================
// INICIAR APP
// ============================================================
function iniciarApp() {
  screenLogin.classList.remove('active'); screenApp.classList.add('active');
  configurarMenuResponsive();
  const initials = SESSION.nombre.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
  userAvatar.textContent = initials; userNombre.textContent = SESSION.nombre; userRol.textContent = SESSION.rol;
  cargarCursos(); configurarNavegacion(); configurarBotones();
}

function configurarBotones() {
  document.getElementById('btn-actualizar-totales')?.addEventListener('click', cargarTotales);
  document.getElementById('btn-cancelar-eval')?.addEventListener('click', cerrarEval);
  document.getElementById('btn-cerrar-modal-reps')?.addEventListener('click', cerrarModalReps);
  document.getElementById('modal-reps')?.addEventListener('click', function(e) { if (e.target === this) cerrarModalReps(); });
  document.getElementById('btn-actualizar-empate')?.addEventListener('click', cargarEmpate);
  llenarSelectEdicion();
}

function llenarSelectEdicion() {
  const sel = document.getElementById('edicion-select'); if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  CURSOS_DATA.forEach(c => { const o = document.createElement('option'); o.value = c.id_curso; o.textContent = c.nombre_curso; sel.appendChild(o); });
  sel.onchange = function() { if (this.value) cargarEdicion(this.value); else document.getElementById('edicion-form-container').innerHTML = ''; };
}

function configurarNavegacion() {
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', function() {
    const view = this.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active'); this.classList.add('active');
    if (view === 'rubrica') cargarRubrica();
    if (view === 'totales') cargarTotales();
    if (view === 'evaluar') cargarEvaluar();
    if (view === 'empate') cargarEmpate();
    if (view === 'cursos') cargarCursos();
    if (view === 'edicion') { llenarSelectEdicion(); document.getElementById('edicion-form-container').innerHTML = ''; document.getElementById('edicion-select').value = ''; }
  }));
}

// ============================================================
// CURSOS
// ============================================================
async function cargarCursos() {
  const c = document.getElementById('cursos-container'); if (!c) return;
  c.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try { CURSOS_DATA = await supabaseQuery('cursos'); renderCursos(c); } catch(e) { c.innerHTML = '<div class="empty-state">ERROR</div>'; }
}
function renderCursos(c) {
  if (!CURSOS_DATA.length) { c.innerHTML = '<div class="empty-state">SIN CURSOS</div>'; return; }
  c.innerHTML = CURSOS_DATA.map(r => `<div class="curso-card"><div class="curso-badge">${r.id_curso}</div><div class="curso-name">${r.nombre_curso}</div><div class="proyecto-label">Proyecto</div><div class="proyecto-name">${r.proyecto}</div><div class="proyecto-desc">${r.descripcion||''}</div><button class="btn-sm btn-reps" data-id="${r.id_curso}" data-nombre="${r.nombre_curso.replace(/'/g,"\\'")}">VER REPRESENTANTES</button></div>`).join('');
  document.querySelectorAll('.btn-reps').forEach(b => b.addEventListener('click', () => verRepresentantes(b.dataset.id, b.dataset.nombre)));
}
async function verRepresentantes(id, nombre) {
  document.getElementById('modal-reps-title').textContent = 'Representantes — ' + nombre;
  document.getElementById('modal-reps-body').innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  document.getElementById('modal-reps').classList.add('open');
  try {
    const reps = await supabaseQuery('representantes', 'GET', null, `id_curso=eq.${id}`);
    if (!reps.length) { document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">SIN REPRESENTANTES</div>'; return; }
    document.getElementById('modal-reps-body').innerHTML = reps.map(r => {
      const av = r.foto_url ? `<img class="rep-avatar" src="${r.foto_url}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="rep-avatar-placeholder" style="display:none">${r.nombre[0]}</div>` : `<div class="rep-avatar-placeholder">${r.nombre[0]}</div>`;
      return `<div class="rep-card">${av}<div class="rep-name">${r.nombre}</div><div class="rep-age">${r.edad||''}a</div><div class="rep-rol-badge">${r.rol||''}</div><div class="rep-contact">📱${r.contacto||''}</div></div>`;
    }).join('');
  } catch(e) { document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">ERROR</div>'; }
}
function cerrarModalReps() { document.getElementById('modal-reps').classList.remove('open'); }
window.cerrarModalReps = cerrarModalReps;

// ============================================================
// RÚBRICA
// ============================================================
function cargarRubrica() {
  document.getElementById('rubrica-content').innerHTML = `<div style="margin-bottom:2rem;"><div style="font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--cyan);text-transform:uppercase;">Criterios de Evaluación</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:1rem;">TOTAL: 40 PTS</div><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr><th style="background:var(--bg2);border:1px solid var(--border2);padding:10px;color:var(--cyan);">Criterio</th><th style="background:var(--bg2);border:1px solid var(--border2);padding:10px;color:var(--green);">Excelente (10)</th><th style="background:var(--bg2);border:1px solid var(--border2);padding:10px;color:var(--cyan);">Bueno (7)</th><th style="background:var(--bg2);border:1px solid var(--border2);padding:10px;color:var(--amber);">Regular (5)</th><th style="background:var(--bg2);border:1px solid var(--border2);padding:10px;color:var(--red);">Mejorar (2)</th></tr></thead><tbody>${CRITERIOS.map(c => `<tr><td style="border:1px solid var(--border);padding:10px;font-weight:700;">${c.nombre}</td>${c.opciones.map(o => `<td style="border:1px solid var(--border);padding:10px;color:var(--text-dim);font-size:11px;">${o.cond}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// ============================================================
// TOTALES
// ============================================================
async function cargarTotales() {
  const c = document.getElementById('totales-container'); if (!c) return;
  c.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    const [evals, usuarios] = await Promise.all([supabaseQuery('evaluaciones'), supabaseQuery('usuarios')]);
    const tj = usuarios.filter(u => u.rol && u.rol.toLowerCase().includes('jurado')).length;
    const res = {}; CURSOS_DATA.forEach(r => { res[r.id_curso] = { id_curso: r.id_curso, nombre_curso: r.nombre_curso, proyecto: r.proyecto, suma: 0, evals: new Set() }; });
    evals.forEach(e => { if (res[e.id_curso]) { res[e.id_curso].suma += e.total||0; res[e.id_curso].evals.add(e.username); } });
    const data = Object.values(res).map(r => ({ ...r, evaluados: r.evals.size, faltan: Math.max(0,tj-r.evals.size), promedio: r.evals.size>0?(r.suma/r.evals.size).toFixed(1):0, pct: tj>0?Math.round((r.evals.size/tj)*100):0 })).sort((a,b)=>b.promedio-a.promedio);
    if (!data.length) { c.innerHTML = '<div class="empty-state">SIN EVALUACIONES</div>'; return; }
    c.innerHTML = data.map((r,i) => `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius2);padding:1.25rem;"><div style="font-family:var(--font-head);font-size:13px;font-weight:700;">#${i+1} ${r.nombre_curso}</div><div style="font-size:10px;color:var(--cyan);">${r.proyecto}</div><div style="font-size:32px;font-weight:700;color:var(--cyan);">${r.promedio}<span style="font-size:14px;color:var(--text-dim);">/40</span></div><div style="display:flex;gap:1rem;font-size:10px;color:var(--text-dim);"><div>✓<strong style="color:var(--green);">${r.evaluados}</strong></div><div>◌<strong style="color:var(--amber);">${r.faltan}</strong></div></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${r.pct}%;background:${r.pct>=100?'var(--green)':r.pct>=50?'var(--cyan)':'var(--amber)'};"></div></div><div style="font-size:9px;color:var(--text-faint);text-align:right;">${r.pct}%</div></div>`).join('');
  } catch(e) { c.innerHTML = '<div class="empty-state">ERROR</div>'; }
}

// ============================================================
// EVALUAR
// ============================================================
async function cargarEvaluar() {
  const c = document.getElementById('evaluar-container'); if (!c) return;
  c.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  const evals = await supabaseQuery('evaluaciones', 'GET', null, `username=eq.${SESSION.username}`);
  const map = {}; evals.forEach(e => map[e.id_curso] = e);
  c.innerHTML = CURSOS_DATA.map(r => {
    const ev = map[r.id_curso];
    const s = ev ? `<span style="display:inline-block;border-radius:3px;padding:3px 10px;font-size:9px;background:rgba(0,255,157,0.08);border:1px solid rgba(0,255,157,0.25);color:var(--green);">✓ ${ev.editado==='SI'?'EDITADO':'EVALUADO'} · ${ev.total}/40</span>` : `<span style="display:inline-block;border-radius:3px;padding:3px 10px;font-size:9px;background:rgba(255,183,0,0.08);border:1px solid rgba(255,183,0,0.25);color:var(--amber);">◌ PENDIENTE</span>`;
    return `<div class="curso-card"><div class="curso-name">${r.nombre_curso}</div><div style="font-size:10px;color:var(--cyan);">${r.proyecto}</div><div class="proyecto-desc">${r.descripcion||''}</div>${s}<button class="btn-primary btn-eval" data-id="${r.id_curso}" style="margin-top:0.5rem;font-size:13px;padding:9px;">${ev?'↺ RE-EVALUAR':'▷ EVALUAR'}</button></div>`;
  }).join('');
  document.querySelectorAll('.btn-eval').forEach(b => b.addEventListener('click', function() { abrirEval(this.dataset.id); }));
}

function abrirEval(id) {
  const curso = CURSOS_DATA.find(c => c.id_curso == id); if (!curso) return;
  EVAL_CURSO = curso; EVAL_STEP = -1; EVAL_RESPUESTAS = {};
  document.getElementById('eval-curso-nombre').textContent = curso.nombre_curso;
  document.getElementById('eval-curso-proyecto').textContent = '/ ' + curso.proyecto;
  document.getElementById('eval-overlay').style.display = 'block';
  renderPinScreen();
}
function cerrarEval() { document.getElementById('eval-overlay').style.display = 'none'; EVAL_CURSO = null; EVAL_STEP = 0; EVAL_RESPUESTAS = {}; }

function renderPinScreen() {
  document.getElementById('eval-content').innerHTML = `<div style="text-align:center;padding:2rem 0;"><div style="font-size:18px;font-weight:700;color:var(--text);">PIN del Curso</div><div style="font-size:10px;color:var(--text-dim);margin-bottom:2rem;">Solicita el PIN al curso</div><div style="display:flex;gap:10px;justify-content:center;margin-bottom:1.5rem;">${[1,2,3,4,5,6].map(i => `<input class="pin-digit" maxlength="1" type="text" inputmode="numeric" id="pin-d${i}" style="width:50px;height:60px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--cyan);font-size:24px;font-weight:700;text-align:center;" onkeyup="window.pinFocusNext(this,${i})"/>`).join('')}</div><div class="error-msg" id="pin-error" style="display:none;"></div><button class="btn-primary" id="btn-verificar-pin" style="max-width:300px;">VERIFICAR</button></div>`;
  setTimeout(() => document.getElementById('pin-d1')?.focus(), 100);
  document.getElementById('btn-verificar-pin').addEventListener('click', verificarPin);
  document.querySelectorAll('.pin-digit').forEach(i => i.addEventListener('keydown', e => { if (e.key==='Enter') verificarPin(); }));
}
window.pinFocusNext = function(el, idx) { el.value = el.value.replace(/[^0-9]/g,''); if (el.value.length===1&&idx<6) document.getElementById('pin-d'+(idx+1))?.focus(); };

function verificarPin() {
  let pin = ''; for (let i=1;i<=6;i++) pin += (document.getElementById('pin-d'+i)?.value||'');
  const err = document.getElementById('pin-error');
  if (pin.length<6) { err.textContent='⚠ Ingresa 6 dígitos'; err.style.display='block'; return; }
  if (EVAL_CURSO.pin === pin) { EVAL_STEP=0; renderEvalStep(); }
  else { err.textContent='⚠ PIN incorrecto'; err.style.display='block'; for (let i=1;i<=6;i++) { const d=document.getElementById('pin-d'+i); if(d)d.value=''; } document.getElementById('pin-d1')?.focus(); }
}

function renderEvalStep() {
  const c = CRITERIOS[EVAL_STEP]; const sel = EVAL_RESPUESTAS[c.id];
  const steps = CRITERIOS.map((_,i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i<EVAL_STEP?'var(--green)':i===EVAL_STEP?'var(--cyan)':'var(--border)'};${i===EVAL_STEP?'box-shadow:0 0 8px var(--cyan);':''}"></div>`).join('');
  document.getElementById('eval-content').innerHTML = `<div style="display:flex;gap:8px;margin-bottom:2rem;">${steps}</div><div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--radius2);padding:1.5rem;margin-bottom:1.5rem;"><div style="font-size:9px;color:var(--cyan);letter-spacing:3px;">CRITERIO ${EVAL_STEP+1}/4</div><div style="font-size:18px;font-weight:700;color:var(--text);">${c.nombre}</div><div style="font-size:12px;color:var(--text-dim);">${c.desc}</div><div style="margin-top:1rem;" id="ops">${c.opciones.map(o => `<div class="opcion-item ${sel===o.pts?'selected':''}" data-pts="${o.pts}"><div style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;">${sel===o.pts?'<div style="width:8px;height:8px;border-radius:50%;background:var(--cyan);"></div>':''}</div><div><div style="font-weight:700;">${o.nivel}</div><div style="font-size:11px;color:var(--text-dim);">${o.cond}</div><span style="font-size:10px;background:rgba(0,200,255,0.1);color:var(--cyan);padding:2px 8px;border-radius:3px;">${o.pts} pts</span></div></div>`).join('')}</div></div><div style="display:flex;gap:10px;">${EVAL_STEP>0?'<button class="btn-sm" id="btn-ant">← ANTERIOR</button>':''}<button class="btn-primary" id="btn-sig" ${!sel?'disabled':''}>${EVAL_STEP===3?'VER RESUMEN →':'SIGUIENTE →'}</button></div>`;
  document.querySelectorAll('#ops .opcion-item').forEach(i => i.addEventListener('click', function() { document.querySelectorAll('#ops .opcion-item').forEach(e=>e.classList.remove('selected')); this.classList.add('selected'); EVAL_RESPUESTAS[c.id]=parseInt(this.dataset.pts); document.getElementById('btn-sig').disabled=false; }));
  document.getElementById('btn-sig').addEventListener('click', () => { if (EVAL_STEP<3) { EVAL_STEP++; renderEvalStep(); } else renderResumen(); });
  document.getElementById('btn-ant')?.addEventListener('click', () => { EVAL_STEP--; renderEvalStep(); });
}

function renderResumen() {
  const total = CRITERIOS.reduce((s,c) => s+(EVAL_RESPUESTAS[c.id]||0), 0);
  document.getElementById('eval-content').innerHTML = `<div style="text-align:center;background:var(--card);border:1px solid var(--border2);border-radius:var(--radius2);padding:2rem;"><div style="font-size:64px;font-weight:700;color:var(--cyan);">${total}</div><div style="font-size:11px;color:var(--text-dim);">/40 PUNTOS</div>${CRITERIOS.map(c => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${c.nombre}</span><span style="font-weight:700;">${EVAL_RESPUESTAS[c.id]||0}/10</span></div>`).join('')}</div><div style="display:flex;gap:10px;margin-top:1rem;"><button class="btn-sm" id="btn-rev">← REVISAR</button><button class="btn-primary" id="btn-conf">✓ CONFIRMAR</button></div>`;
  document.getElementById('btn-rev').addEventListener('click', () => { EVAL_STEP=3; renderEvalStep(); });
  document.getElementById('btn-conf').addEventListener('click', confirmarEnvio);
}

async function confirmarEnvio() {
  document.getElementById('eval-content').innerHTML = `<div style="text-align:center;padding:3rem;"><div style="width:60px;height:60px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--cyan);margin:0 auto 1.5rem;animation:spin 0.8s linear infinite;"></div><div style="font-size:18px;font-weight:700;color:var(--cyan);">Publicando calificación</div><div style="font-size:10px;color:var(--text-dim);">Por favor espera...</div></div><style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
  document.getElementById('btn-cancelar-eval').style.pointerEvents = 'none';
  document.getElementById('btn-cancelar-eval').style.opacity = '0.5';
  await guardarEvaluacion();
}

async function guardarEvaluacion() {
  try {
    const total = EVAL_RESPUESTAS.criterio1 + EVAL_RESPUESTAS.criterio2 + EVAL_RESPUESTAS.criterio3 + EVAL_RESPUESTAS.criterio4;
    const body = { username: SESSION.username, id_curso: EVAL_CURSO.id_curso, criterio1: EVAL_RESPUESTAS.criterio1||0, criterio2: EVAL_RESPUESTAS.criterio2||0, criterio3: EVAL_RESPUESTAS.criterio3||0, criterio4: EVAL_RESPUESTAS.criterio4||0, total, editado: 'NO' };
    let existentes = [];
    try { existentes = await supabaseQuery('evaluaciones', 'GET', null, `username=eq.${SESSION.username}&id_curso=eq.${EVAL_CURSO.id_curso}`); } catch(e) {}
    if (existentes.length > 0) { body.editado = 'SI'; await supabaseQuery('evaluaciones', 'PATCH', body, `username=eq.${SESSION.username}&id_curso=eq.${EVAL_CURSO.id_curso}`); }
    else { await supabaseQuery('evaluaciones', 'POST', body); }
    document.getElementById('eval-content').innerHTML = `<div style="text-align:center;padding:3rem;"><div style="font-size:3rem;">✅</div><div style="font-size:20px;font-weight:700;color:var(--green);">¡Calificación publicada!</div><div style="font-size:36px;font-weight:700;color:var(--cyan);">${total}/40</div></div>`;
    showToast('✅ Guardado ('+total+'/40)', 'success');
    setTimeout(() => { cerrarEval(); cargarEvaluar(); }, 1500);
  } catch(e) {
    document.getElementById('eval-content').innerHTML = `<div style="text-align:center;padding:3rem;"><div style="font-size:3rem;">❌</div><div style="font-size:18px;font-weight:700;color:var(--red);">Error</div><div style="font-size:10px;color:var(--text-dim);">Reintentando en 2s...</div></div>`;
    setTimeout(async () => {
      document.getElementById('eval-content').innerHTML = `<div style="text-align:center;padding:3rem;"><div style="width:60px;height:60px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--cyan);margin:0 auto 1.5rem;animation:spin 0.8s linear infinite;"></div><div style="font-size:18px;font-weight:700;color:var(--cyan);">Reintentando...</div></div><style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
      await guardarEvaluacion();
    }, 2000);
  }
}

// ============================================================
// EDICIÓN
// ============================================================
async function cargarEdicion(id) {
  const c = document.getElementById('edicion-form-container'); c.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    const evals = await supabaseQuery('evaluaciones', 'GET', null, `username=eq.${SESSION.username}&id_curso=eq.${id}`);
    if (!evals.length) { c.innerHTML = '<div class="empty-state">NO HAS EVALUADO</div>'; return; }
    const ev = evals[0]; EDICION_VALS = { criterio1: ev.criterio1, criterio2: ev.criterio2, criterio3: ev.criterio3, criterio4: ev.criterio4 };
    c.innerHTML = `<div style="color:${ev.editado==='SI'?'var(--cyan)':'var(--green)'};">${ev.editado==='SI'?'✎ EDITADO':'✓ ORIGINAL'} · ${ev.total}/40</div>${CRITERIOS.map((cr,i) => `<div style="margin:1rem 0;"><div style="font-weight:700;">${cr.nombre} <span style="color:var(--cyan);">(${ev['criterio'+(i+1)]} pts)</span></div><div class="ed-ops">${cr.opciones.map(o => `<div class="opcion-item ${ev['criterio'+(i+1)]===o.pts?'selected':''}" data-crit="criterio${i+1}" data-pts="${o.pts}"><div style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;">${ev['criterio'+(i+1)]===o.pts?'<div style="width:8px;height:8px;border-radius:50%;background:var(--cyan);"></div>':''}</div><div><div style="font-weight:700;">${o.nivel}</div><div style="font-size:11px;color:var(--text-dim);">${o.cond}</div></div></div>`).join('')}</div></div>`).join('')}<button class="btn-primary" id="btn-guardar-ed">✎ GUARDAR</button>`;
    document.querySelectorAll('.ed-ops .opcion-item').forEach(i => i.addEventListener('click', function() { const p=this.parentElement; p.querySelectorAll('.opcion-item').forEach(e=>e.classList.remove('selected')); this.classList.add('selected'); EDICION_VALS[this.dataset.crit]=parseInt(this.dataset.pts); }));
    document.getElementById('btn-guardar-ed').addEventListener('click', () => guardarEdicion(id));
  } catch(e) { c.innerHTML = '<div class="empty-state">ERROR</div>'; }
}
async function guardarEdicion(id) {
  try {
    const total = EDICION_VALS.criterio1+EDICION_VALS.criterio2+EDICION_VALS.criterio3+EDICION_VALS.criterio4;
    await supabaseQuery('evaluaciones', 'PATCH', { ...EDICION_VALS, total, editado: 'SI' }, `username=eq.${SESSION.username}&id_curso=eq.${id}`);
    showToast('Actualizado ('+total+'/40)', 'success'); cargarEdicion(id); cargarEvaluar();
  } catch(e) { showToast('Error', 'error'); }
}

// ============================================================
// DESEMPATE
// ============================================================
async function cargarEmpate() {
  const c = document.getElementById('empate-container'); if (!c) return;
  c.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    const [evals, usuarios] = await Promise.all([supabaseQuery('evaluaciones'), supabaseQuery('usuarios')]);
    const tj = usuarios.filter(u => u.rol && u.rol.toLowerCase().includes('jurado')).length;
    const res = {}; CURSOS_DATA.forEach(r => { res[r.id_curso] = { id_curso: r.id_curso, nombre_curso: r.nombre_curso, proyecto: r.proyecto, suma: 0, evals: new Set() }; });
    evals.forEach(e => { if (res[e.id_curso]) { res[e.id_curso].suma += e.total||0; res[e.id_curso].evals.add(e.username); } });
    const data = Object.values(res).map(r => ({ ...r, evaluados: r.evals.size, promedio: r.evals.size>0?parseFloat((r.suma/r.evals.size).toFixed(1)):0 })).sort((a,b)=>b.promedio-a.promedio);
    const pendientes = data.filter(r => r.evaluados < tj);
    if (pendientes.length) { c.innerHTML = `<div class="empty-state"><div style="font-size:2rem;">⏳</div><div style="font-size:18px;color:var(--amber);">EVALUACIONES PENDIENTES</div><div>${pendientes.length} curso(s) sin completar</div></div>`; return; }
    const maxProm = data[0].promedio;
    const empatados = data.filter(r => r.promedio === maxProm);
    if (empatados.length < 2) { c.innerHTML = `<div style="text-align:center;padding:3rem;"><div style="font-size:2.5rem;">🏆</div><div style="font-size:22px;color:var(--green);">SIN EMPATES</div><div class="empate-card"><div style="font-size:18px;color:var(--amber);">#1 ${data[0].nombre_curso}</div><div style="font-size:36px;color:var(--cyan);">${data[0].promedio}/40</div></div></div>`; return; }
    c.innerHTML = `<div style="text-align:center;padding:2rem;"><div style="font-size:2rem;">⚡</div><div style="font-size:22px;color:var(--amber);">EMPATE DETECTADO</div>${empatados.map(r => `<div class="empate-card"><div style="font-weight:700;">${r.nombre_curso}</div><div style="color:var(--cyan);">${r.promedio}/40</div></div>`).join('')}<p style="color:var(--text-dim);">Desempate manual por el jurado</p></div>`;
  } catch(e) { c.innerHTML = '<div class="empty-state">ERROR</div>'; }
}

// ============================================================
// VERIFICAR SESIÓN
// ============================================================
(function() {
  const saved = localStorage.getItem('feria_session');
  if (saved) {
    try {
      SESSION = JSON.parse(saved);
      screenLogin.classList.remove('active'); screenApp.classList.add('active');
      const initials = SESSION.nombre.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
      userAvatar.textContent = initials; userNombre.textContent = SESSION.nombre; userRol.textContent = SESSION.rol;
      cargarCursos(); configurarNavegacion(); configurarBotones();
    } catch(e) { localStorage.removeItem('feria_session'); SESSION = null; }
  }
})();

// ============================================================
// MENÚ RESPONSIVE
// ============================================================
function toggleMenu() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('hamburger-btn');
  
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  btn.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
}

function cerrarMenu() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('hamburger-btn');
  
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  btn.textContent = '☰';
}

function configurarMenuResponsive() {
  const overlay = document.getElementById('sidebar-overlay');
  
  if (overlay) {
    overlay.onclick = cerrarMenu;
  }
  
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', cerrarMenu);
  });
}

// Hacer función global
window.toggleMenu = toggleMenu;
window.cerrarMenu = cerrarMenu;