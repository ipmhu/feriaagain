// ============================================================
// CONFIGURACIÓN SUPABASE
// ============================================================
const SUPABASE_URL = 'https://weoomtanpjmepkmmywzq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb29tdGFucGptZXBrbW15d3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTYxODksImV4cCI6MjA5NDM3MjE4OX0.iPtrSqL-MYvdkcJeWDE39oMrOlpqUB0-iUDOcDibkBM';

// ============================================================
// ESTADO GLOBAL
// ============================================================
let PROYECTOS_DATA = [];
let MODO_ADMIN = false;
let EVAL_PROYECTO = null;

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg, tipo = '') {
  const toast = document.getElementById('toast');
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
      'Prefer': 'return=representation'
    }
  };
  if (filters) url += `?${filters}`;
  if (body && (method === 'POST' || method === 'PATCH')) options.body = JSON.stringify(body);
  if (method === 'GET') url += (url.includes('?') ? '&' : '?') + 'select=*';
  const res = await fetch(url, options);
  if (!res.ok) { const err = await res.text(); throw new Error(`${res.status}: ${err}`); }
  if (method === 'DELETE') return { success: true };
  const text = await res.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch(e) { return []; }
}

// ============================================================
// MODO ADMIN - SOLICITAR PIN
// ============================================================
function solicitarPinAdmin() {
  if (MODO_ADMIN) {
    // Si ya está activo, lo desactiva directamente
    desactivarModoAdmin();
    return;
  }
  
  document.getElementById('eval-overlay').style.display = 'block';
  document.getElementById('eval-proyecto-nombre').textContent = 'PIN DE ADMINISTRADOR';
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:2rem 0;">
      <div style="font-size:18px;font-weight:700;">PIN de Administrador</div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:2rem;">Ingresa el PIN para activar el modo administrador</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:1.5rem;">
        ${[1,2,3,4].map(i => `<input class="pin-digit" maxlength="1" type="password" inputmode="numeric" id="admin-pin-d${i}" onkeyup="pinFocusAdmin(this,${i})"/>`).join('')}
      </div>
      <div class="error-msg" id="admin-pin-error" style="display:none;"></div>
      <button class="btn-primary" id="btn-verificar-admin-pin" style="max-width:300px;">VERIFICAR</button>
    </div>`;
  setTimeout(() => document.getElementById('admin-pin-d1')?.focus(), 100);
  document.getElementById('btn-verificar-admin-pin').addEventListener('click', verificarPinAdmin);
  document.querySelectorAll('#admin-pin-d1, #admin-pin-d2, #admin-pin-d3, #admin-pin-d4').forEach(i => {
    i.addEventListener('keydown', e => { if (e.key === 'Enter') verificarPinAdmin(); });
  });
}

function pinFocusAdmin(el, idx) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1 && idx < 4) document.getElementById('admin-pin-d' + (idx + 1))?.focus();
}

async function verificarPinAdmin() {
  let pin = '';
  for (let i = 1; i <= 4; i++) pin += (document.getElementById('admin-pin-d' + i)?.value || '');
  const err = document.getElementById('admin-pin-error');

  if (pin.length < 4) { err.textContent = '⚠ Ingresa 4 dígitos'; err.style.display = 'block'; return; }

  try {
    const admins = await supabaseQuery('admin_pins', 'GET', null, `pin=eq.${pin}`);
    if (admins.length > 0) {
      activarModoAdmin();
      document.getElementById('eval-overlay').style.display = 'none';
      showToast('🔓 Modo administrador activado', 'success');
    } else {
      err.textContent = '⚠ PIN incorrecto'; err.style.display = 'block';
      for (let i = 1; i <= 4; i++) { const d = document.getElementById('admin-pin-d' + i); if (d) d.value = ''; }
      document.getElementById('admin-pin-d1')?.focus();
    }
  } catch(e) {
    err.textContent = '⚠ Error al verificar'; err.style.display = 'block';
  }
}

function activarModoAdmin() {
  MODO_ADMIN = true;
  const btn = document.getElementById('btn-modo-admin');
  btn.textContent = '⚙ MODO ADMIN (ACTIVO)';
  btn.classList.add('activo');
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
  document.getElementById('btn-publicar-resultados').style.display = 'inline-block';
  cargarResultados();
}

function desactivarModoAdmin() {
  MODO_ADMIN = false;
  const btn = document.getElementById('btn-modo-admin');
  btn.textContent = '⚙ MODO ADMIN';
  btn.classList.remove('activo');
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  document.getElementById('btn-publicar-resultados').style.display = 'none';
  showToast('🔒 Modo administrador desactivado', 'success');
  cargarResultados();
}

// ============================================================
// NAVEGACIÓN
// ============================================================
function configurarNavegacion() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const view = this.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const vista = document.getElementById('view-' + view);
      if (vista) vista.classList.add('active');
      this.classList.add('active');
      if (view === 'proyectos') cargarProyectos();
      if (view === 'votar') cargarVotar();
      if (view === 'resultados') cargarResultados();
    });
  });
}

// ============================================================
// FORMULARIO PROYECTO (SOLO ADMIN)
// ============================================================
function mostrarFormProyecto() {
  if (!MODO_ADMIN) { showToast('⚠ Activa el modo administrador primero', 'error'); return; }
  document.getElementById('form-proyecto').style.display = 'block';
  document.getElementById('proy-nombre').value = '';
  document.getElementById('proy-desc').value = '';
  document.getElementById('proy-pin').value = '';
  document.getElementById('reps-container').innerHTML = `
    <div class="rep-row">
      <input type="text" class="rep-nombre" placeholder="Nombre completo"/>
      <input type="text" class="rep-curso" placeholder="Curso/Grado"/>
      <input type="text" class="rep-contacto" placeholder="Contacto"/>
    </div>`;
  document.getElementById('proy-error').classList.remove('show');
}

function cancelarFormProyecto() {
  document.getElementById('form-proyecto').style.display = 'none';
}

function agregarFilaRep() {
  const container = document.getElementById('reps-container');
  const fila = document.createElement('div');
  fila.className = 'rep-row';
  fila.innerHTML = `
    <input type="text" class="rep-nombre" placeholder="Nombre completo"/>
    <input type="text" class="rep-curso" placeholder="Curso/Grado"/>
    <input type="text" class="rep-contacto" placeholder="Contacto"/>
    <button class="btn-sm" onclick="this.parentElement.remove()" style="font-size:16px;padding:4px 8px;color:var(--red);">✕</button>`;
  container.appendChild(fila);
}

async function guardarProyecto() {
  const nombre = document.getElementById('proy-nombre').value.trim();
  const desc = document.getElementById('proy-desc').value.trim();
  const pin = document.getElementById('proy-pin').value.trim();
  const err = document.getElementById('proy-error');

  if (!nombre) { err.textContent = '⚠ Pon nombre al proyecto.'; err.classList.add('show'); return; }
  if (!desc) { err.textContent = '⚠ Describe el proyecto.'; err.classList.add('show'); return; }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { err.textContent = '⚠ El PIN debe ser de 4 dígitos.'; err.classList.add('show'); return; }

  const repRows = document.querySelectorAll('#reps-container .rep-row');
  const representantes = [];
  repRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[0]?.value.trim()) {
      representantes.push({ nombre: inputs[0].value.trim(), curso: inputs[1]?.value.trim() || '', contacto: inputs[2]?.value.trim() || '' });
    }
  });
  if (!representantes.length) { err.textContent = '⚠ Agrega al menos un representante.'; err.classList.add('show'); return; }

  try {
    const proyRes = await supabaseQuery('proyectos', 'POST', { nombre, descripcion: desc, pin });
    const idProyecto = proyRes[0]?.id;
    for (const rep of representantes) {
      await supabaseQuery('representantes', 'POST', { id_proyecto: idProyecto, nombre: rep.nombre, curso: rep.curso, contacto: rep.contacto });
    }
    showToast('✅ Proyecto registrado', 'success');
    cancelarFormProyecto();
    cargarProyectos();
  } catch(e) { err.textContent = '⚠ Error al guardar.'; err.classList.add('show'); }
}

// ============================================================
// CARGAR PROYECTOS
// ============================================================
async function cargarProyectos() {
  const container = document.getElementById('proyectos-container');
  if (!container) return;
  container.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    PROYECTOS_DATA = await supabaseQuery('proyectos');
    if (!PROYECTOS_DATA.length) { container.innerHTML = '<div class="empty-state">AÚN NO HAY PROYECTOS REGISTRADOS</div>'; return; }
    container.innerHTML = PROYECTOS_DATA.map(p => `
      <div class="proyecto-card">
        <div class="curso-badge">#${p.id}</div>
        <div class="curso-name">${p.nombre}</div>
        <div class="proyecto-desc">${p.descripcion || ''}</div>
        <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
        <button class="btn-sm" onclick="abrirEvalDesdeProyecto('${p.id}')" style="margin-left:4px;">▶ VOTAR</button>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state">ERROR AL CARGAR</div>'; }
}

// ============================================================
// VER REPRESENTANTES
// ============================================================
async function verRepresentantes(idProyecto) {
  const proyecto = PROYECTOS_DATA.find(p => p.id == idProyecto);
  document.getElementById('modal-reps-title').textContent = 'Representantes — ' + (proyecto?.nombre || '');
  document.getElementById('modal-reps-body').innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  document.getElementById('modal-reps').classList.add('open');
  try {
    const reps = await supabaseQuery('representantes', 'GET', null, `id_proyecto=eq.${idProyecto}`);
    if (!reps.length) { document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">SIN REPRESENTANTES</div>'; return; }
    document.getElementById('modal-reps-body').innerHTML = reps.map(r => `
      <div class="rep-card">
        <div class="rep-avatar-placeholder">${r.nombre[0]}</div>
        <div class="rep-name">${r.nombre}</div>
        <div class="rep-curso">${r.curso || '—'}</div>
        <div class="rep-contact">📱 ${r.contacto || '—'}</div>
      </div>`).join('');
  } catch(e) { document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">ERROR</div>'; }
}

function cerrarModalReps() { document.getElementById('modal-reps').classList.remove('open'); }

// ============================================================
// VOTAR
// ============================================================
function abrirEvalDesdeProyecto(idProyecto) {
  const proyecto = PROYECTOS_DATA.find(p => p.id == idProyecto);
  if (!proyecto) return;
  EVAL_PROYECTO = proyecto;
  document.getElementById('eval-proyecto-nombre').textContent = proyecto.nombre;
  document.getElementById('eval-overlay').style.display = 'block';
  renderPinVotacion();
}

function cerrarEval() {
  document.getElementById('eval-overlay').style.display = 'none';
  EVAL_PROYECTO = null;
}

function renderPinVotacion() {
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:2rem 0;">
      <div style="font-size:18px;font-weight:700;">PIN del Proyecto</div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:2rem;">Solicita el PIN al equipo</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:1.5rem;">
        ${[1,2,3,4].map(i => `<input class="pin-digit" maxlength="1" type="password" inputmode="numeric" id="pin-d${i}" onkeyup="pinFocusVoto(this,${i})"/>`).join('')}
      </div>
      <div class="error-msg" id="pin-error-voto" style="display:none;"></div>
      <button class="btn-primary" id="btn-verificar-pin-voto" style="max-width:300px;">VERIFICAR</button>
    </div>`;
  setTimeout(() => document.getElementById('pin-d1')?.focus(), 100);
  document.getElementById('btn-verificar-pin-voto').addEventListener('click', verificarPinVoto);
  document.querySelectorAll('#pin-d1, #pin-d2, #pin-d3, #pin-d4').forEach(i => {
    i.addEventListener('keydown', e => { if (e.key === 'Enter') verificarPinVoto(); });
  });
}

function pinFocusVoto(el, idx) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1 && idx < 4) document.getElementById('pin-d' + (idx + 1))?.focus();
}

async function verificarPinVoto() {
  let pin = '';
  for (let i = 1; i <= 4; i++) pin += (document.getElementById('pin-d' + i)?.value || '');
  const err = document.getElementById('pin-error-voto');
  if (pin.length < 4) { err.textContent = '⚠ Ingresa 4 dígitos'; err.style.display = 'block'; return; }

  if (EVAL_PROYECTO.pin === pin) {
    const existentes = await supabaseQuery('votos', 'GET', null, `id_proyecto=eq.${EVAL_PROYECTO.id}`);
    const yaVoto = existentes.length > 0;
    if (yaVoto) {
      document.getElementById('eval-content').innerHTML = `
        <div style="text-align:center;padding:3rem;">
          <div style="font-size:3rem;">⚠️</div>
          <div style="font-size:18px;font-weight:700;color:var(--amber);">Ya se ha votado por este proyecto</div>
          <button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button>
        </div>`;
      return;
    }
    renderConfirmarVoto();
  } else {
    err.textContent = '⚠ PIN incorrecto'; err.style.display = 'block';
    for (let i = 1; i <= 4; i++) { const d = document.getElementById('pin-d' + i); if (d) d.value = ''; }
    document.getElementById('pin-d1')?.focus();
  }
}

function renderConfirmarVoto() {
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:3rem;">
      <div style="font-size:18px;font-weight:700;">${EVAL_PROYECTO.nombre}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:2rem;">${EVAL_PROYECTO.descripcion || ''}</div>
      <div style="font-size:14px;margin-bottom:1rem;">¿Confirmas tu VOTO?</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn-sm" onclick="cerrarEval()">CANCELAR</button>
        <button class="btn-primary" onclick="confirmarVoto()" style="max-width:200px;">✓ CONFIRMAR</button>
      </div>
    </div>`;
}

async function confirmarVoto() {
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:3rem;">
      <div style="width:60px;height:60px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--cyan);margin:0 auto 1.5rem;animation:spin 0.8s linear infinite;"></div>
      <div style="font-size:18px;font-weight:700;color:var(--cyan);">Registrando voto...</div>
    </div><style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
  try {
    await supabaseQuery('votos', 'POST', { id_proyecto: EVAL_PROYECTO.id });
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">✅</div>
        <div style="font-size:20px;font-weight:700;color:var(--green);">¡Voto registrado!</div>
        <button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button>
      </div>`;
    showToast('✅ Voto registrado', 'success');
  } catch(e) {
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;"><div style="font-size:3rem;">❌</div><div style="font-size:18px;color:var(--red);">Error</div><button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button></div>`;
  }
}

// ============================================================
// VISTA VOTAR
// ============================================================
async function cargarVotar() {
  const container = document.getElementById('votar-container');
  if (!container) return;
  container.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    PROYECTOS_DATA = await supabaseQuery('proyectos');
    if (!PROYECTOS_DATA.length) { container.innerHTML = '<div class="empty-state">NO HAY PROYECTOS</div>'; return; }
    container.innerHTML = PROYECTOS_DATA.map(p => `
      <div class="proyecto-card">
        <div class="curso-badge">#${p.id}</div>
        <div class="curso-name">${p.nombre}</div>
        <div class="proyecto-desc">${p.descripcion || ''}</div>
        <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
        <button class="btn-sm success" onclick="abrirEvalDesdeProyecto('${p.id}')">▶ VOTAR</button>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state">ERROR</div>'; }
}

// ============================================================
// RESULTADOS
// ============================================================
async function toggleResultados() {
  if (!MODO_ADMIN) return;
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    const btn = document.getElementById('btn-publicar-resultados');
    if (pub.length > 0 && pub[0].publico) {
      await supabaseQuery('resultados_publicos', 'PATCH', { publico: false }, 'id=eq.1');
      showToast('🔒 Resultados ocultados', 'success');
      btn.textContent = '📢 PUBLICAR RESULTADOS';
    } else {
      if (pub.length > 0) await supabaseQuery('resultados_publicos', 'PATCH', { publico: true }, 'id=eq.1');
      else await supabaseQuery('resultados_publicos', 'POST', { id: 1, publico: true });
      showToast('📢 Resultados publicados', 'success');
      btn.textContent = '🔒 OCULTAR RESULTADOS';
    }
    cargarResultados();
  } catch(e) { showToast('Error', 'error'); }
}

async function cargarResultados() {
  const container = document.getElementById('resultados-container');
  if (!container) return;
  container.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    const sonPublicos = pub.length > 0 && pub[0].publico === true;

    const btn = document.getElementById('btn-publicar-resultados');
    if (btn) {
      btn.textContent = sonPublicos ? '🔒 OCULTAR RESULTADOS' : '📢 PUBLICAR RESULTADOS';
    }

    if (!sonPublicos && !MODO_ADMIN) {
      container.innerHTML = `<div class="empty-state"><div style="font-size:3rem;">🔒</div><div style="font-size:18px;font-weight:700;">Resultados no disponibles</div><div style="font-size:12px;color:var(--text-dim);">Los resultados serán publicados próximamente.</div></div>`;
      return;
    }

    const [proyectos, votos] = await Promise.all([supabaseQuery('proyectos'), supabaseQuery('votos')]);
    const conteo = {};
    proyectos.forEach(p => { conteo[p.id] = { nombre: p.nombre, descripcion: p.descripcion, votos: 0 }; });
    votos.forEach(v => { if (conteo[v.id_proyecto]) conteo[v.id_proyecto].votos++; });
    const ranking = Object.values(conteo).sort((a, b) => b.votos - a.votos);
    const maxVotos = ranking.length > 0 ? ranking[0].votos : 1;
    if (!ranking.length) { container.innerHTML = '<div class="empty-state">SIN VOTOS AÚN</div>'; return; }
    container.innerHTML = ranking.map((r, i) => {
      let posClass = i === 0 ? 'oro' : i === 1 ? 'plata' : i === 2 ? 'bronce' : '';
      return `
        <div class="resultado-card">
          <div class="resultado-pos ${posClass}">#${i + 1}</div>
          <div style="flex:1;"><div style="font-weight:700;">${r.nombre}</div><div style="font-size:11px;color:var(--text-dim);">${r.descripcion || ''}</div><div class="resultado-barra"><div class="resultado-barra-fill" style="width:${maxVotos>0?Math.round((r.votos/maxVotos)*100):0}%;"></div></div></div>
          <div style="font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--primary);">${r.votos} 🗳</div>
        </div>`;
    }).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state">ERROR</div>'; }
}

// ============================================================
// MENÚ RESPONSIVE
// ============================================================
function toggleMenu() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('hamburger-btn');
  sidebar.classList.toggle('open'); overlay.classList.toggle('show');
  btn.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
}
function cerrarMenu() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  document.getElementById('hamburger-btn').textContent = '☰';
}
function configurarMenuResponsive() {
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.onclick = cerrarMenu;
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', cerrarMenu));
}

// ============================================================
// INICIAR
// ============================================================
(function() {
  configurarNavegacion();
  cargarProyectos();
  configurarMenuResponsive();
})();
