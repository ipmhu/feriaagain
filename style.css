// ============================================================
// CONFIGURACIÓN SUPABASE
// ============================================================
const SUPABASE_URL = 'https://weoomtanpjmepkmmywzq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb29tdGFucGptZXBrbW15d3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTYxODksImV4cCI6MjA5NDM3MjE4OX0.iPtrSqL-MYvdkcJeWDE39oMrOlpqUB0-iUDOcDibkBM';

// ============================================================
// ESTADO GLOBAL
// ============================================================
let SESSION = null;
let PROYECTOS_DATA = [];
let VOTOS_DATA = [];
let EVAL_PROYECTO = null;
let ULTIMO_ID_GENERADO = null;

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
// SUPABASE FETCH (CORREGIDO)
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

  if (method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + 'select=*';
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }

  if (method === 'DELETE') return { success: true };
  if (method === 'PATCH' && !options.headers['Prefer']?.includes('representation')) return { success: true };

  const text = await res.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch(e) { return []; }
}

// ============================================================
// PORTADA - MOSTRAR REGISTRO / LOGIN
// ============================================================
function mostrarRegistro(tipo) {
  document.getElementById('portada-botones').style.display = 'none';
  document.getElementById('form-registro').style.display = 'block';
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('modal-id-generado').style.display = 'none';
  if (tipo === 'docente') {
    document.getElementById('tab-docente').classList.add('active');
    document.getElementById('tab-estudiante').classList.remove('active');
    document.getElementById('reg-docente').classList.add('active');
    document.getElementById('reg-estudiante').classList.remove('active');
  } else {
    document.getElementById('tab-docente').classList.remove('active');
    document.getElementById('tab-estudiante').classList.add('active');
    document.getElementById('reg-docente').classList.remove('active');
    document.getElementById('reg-estudiante').classList.add('active');
  }
}

function cambiarTabRegistro(tipo) {
  if (tipo === 'docente') {
    document.getElementById('tab-docente').classList.add('active');
    document.getElementById('tab-estudiante').classList.remove('active');
    document.getElementById('reg-docente').classList.add('active');
    document.getElementById('reg-estudiante').classList.remove('active');
  } else {
    document.getElementById('tab-docente').classList.remove('active');
    document.getElementById('tab-estudiante').classList.add('active');
    document.getElementById('reg-docente').classList.remove('active');
    document.getElementById('reg-estudiante').classList.add('active');
  }
}

function mostrarLogin() {
  document.getElementById('portada-botones').style.display = 'none';
  document.getElementById('form-registro').style.display = 'none';
  document.getElementById('form-login').style.display = 'block';
  document.getElementById('modal-id-generado').style.display = 'none';
  document.getElementById('login-error').classList.remove('show');
}

function volverPortada() {
  document.getElementById('portada-botones').style.display = 'block';
  document.getElementById('form-registro').style.display = 'none';
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('modal-id-generado').style.display = 'none';
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('reg-error').classList.remove('show');
}

// ============================================================
// ACTUALIZAR FORM ESTUDIANTE (GRADO -> MÓDULO/SECCIÓN)
// ============================================================
function actualizarFormEstudiante() {
  const grado = document.getElementById('reg-est-grado').value;
  const grupoModulo = document.getElementById('grupo-modulo');
  const selModulo = document.getElementById('reg-est-modulo');
  const selSeccion = document.getElementById('reg-est-seccion');

  // Reset
  selModulo.innerHTML = '<option value="">— Selecciona —</option>';
  selSeccion.innerHTML = '<option value="">— Selecciona —</option>';

  if (grado === '3ro') {
    grupoModulo.style.display = 'none';
    selSeccion.innerHTML = '<option value="">— Selecciona —</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>';
  } else if (['4to', '5to', '6to'].includes(grado)) {
    grupoModulo.style.display = 'block';
    for (let i = 1; i <= 12; i++) selModulo.innerHTML += `<option value="M${i}">Módulo ${i}</option>`;
    selSeccion.innerHTML = '<option value="">— Selecciona —</option><option value="A">A</option><option value="B">B</option>';
  } else {
    grupoModulo.style.display = 'none';
  }
}

// ============================================================
// GENERAR ID
// ============================================================
async function generarIdUsuario() {
  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, 'order=id.desc&limit=1');
    if (!usuarios.length) return 'ID001';
    const ultimo = usuarios[0].id;
    const num = parseInt(ultimo.replace('ID', '')) + 1;
    return 'ID' + String(num).padStart(3, '0');
  } catch(e) {
    return 'ID' + String(Math.floor(Math.random() * 900) + 100);
  }
}

// ============================================================
// REGISTRAR DOCENTE
// ============================================================
async function registrarDocente() {
  const nombre = document.getElementById('reg-doc-nombre').value.trim();
  const apellido = document.getElementById('reg-doc-apellido').value.trim();
  const pin = document.getElementById('reg-doc-pin').value.trim();
  const err = document.getElementById('reg-error');

  if (!nombre || !apellido) { err.textContent = '⚠ Completa todos los campos.'; err.classList.add('show'); return; }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { err.textContent = '⚠ El PIN debe ser de 4 dígitos.'; err.classList.add('show'); return; }

  try {
    const id = await generarIdUsuario();
    const body = { id, nombre, apellido, rol: 'docente', pin };
    await supabaseQuery('usuarios', 'POST', body);
    ULTIMO_ID_GENERADO = id;
    document.getElementById('id-generado-texto').textContent = id;
    document.getElementById('form-registro').style.display = 'none';
    document.getElementById('modal-id-generado').style.display = 'block';
    err.classList.remove('show');
  } catch(e) {
    err.textContent = '⚠ Error al registrar. Intenta de nuevo.';
    err.classList.add('show');
  }
}

// ============================================================
// REGISTRAR ESTUDIANTE
// ============================================================
async function registrarEstudiante() {
  const nombre = document.getElementById('reg-est-nombre').value.trim();
  const apellido = document.getElementById('reg-est-apellido').value.trim();
  const grado = document.getElementById('reg-est-grado').value;
  const modulo = document.getElementById('reg-est-modulo').value;
  const seccion = document.getElementById('reg-est-seccion').value;
  const pin = document.getElementById('reg-est-pin').value.trim();
  const err = document.getElementById('reg-error');

  if (!nombre || !apellido) { err.textContent = '⚠ Completa todos los campos.'; err.classList.add('show'); return; }
  if (!grado) { err.textContent = '⚠ Selecciona tu grado.'; err.classList.add('show'); return; }
  if (!seccion) { err.textContent = '⚠ Selecciona tu sección.'; err.classList.add('show'); return; }
  if (['4to', '5to', '6to'].includes(grado) && !modulo) { err.textContent = '⚠ Selecciona tu módulo.'; err.classList.add('show'); return; }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { err.textContent = '⚠ El PIN debe ser de 4 dígitos.'; err.classList.add('show'); return; }

  try {
    const id = await generarIdUsuario();
    const body = { id, nombre, apellido, rol: 'estudiante', grado, seccion, pin };
    if (modulo) body.modulo = modulo;
    await supabaseQuery('usuarios', 'POST', body);
    ULTIMO_ID_GENERADO = id;
    document.getElementById('id-generado-texto').textContent = id;
    document.getElementById('form-registro').style.display = 'none';
    document.getElementById('modal-id-generado').style.display = 'block';
    err.classList.remove('show');
  } catch(e) {
    err.textContent = '⚠ Error al registrar. Intenta de nuevo.';
    err.classList.add('show');
  }
}

// ============================================================
// INGRESAR CON ID GENERADO
// ============================================================
function ingresarConIdGenerado() {
  SESSION = { id: ULTIMO_ID_GENERADO };
  localStorage.setItem('feria_session', JSON.stringify(SESSION));
  iniciarApp();
}

// ============================================================
// LOGIN
// ============================================================
async function handleLogin() {
  const id = document.getElementById('login-id').value.trim().toUpperCase();
  const pin = document.getElementById('login-pin').value.trim();
  const err = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  if (!id || !pin) { err.textContent = '⚠ Completa todos los campos.'; err.classList.add('show'); return; }
  btn.textContent = 'VERIFICANDO...'; btn.disabled = true; err.classList.remove('show');

  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, `id=eq.${id}&pin=eq.${pin}`);
    if (!usuarios.length) throw new Error('Credenciales');
    SESSION = usuarios[0];
    localStorage.setItem('feria_session', JSON.stringify(SESSION));
    iniciarApp();
  } catch(e) {
    err.textContent = '⚠ ID o PIN incorrectos.';
    err.classList.add('show');
    btn.textContent = 'INGRESAR AL SISTEMA';
    btn.disabled = false;
  }
}

// ============================================================
// LOGOUT
// ============================================================
document.getElementById('btn-logout').addEventListener('click', () => {
  if (confirm('¿Cerrar sesión?')) {
    SESSION = null;
    localStorage.removeItem('feria_session');
    document.getElementById('screen-app').classList.remove('active');
    document.getElementById('screen-portada').classList.add('active');
    volverPortada();
  }
});

// ============================================================
// INICIAR APP
// ============================================================
function iniciarApp() {
  document.getElementById('screen-portada').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  configurarMenuResponsive();
  const initials = (SESSION.nombre || '')[0] + ((SESSION.apellido || '')[0] || '');
  document.getElementById('user-avatar').textContent = initials.toUpperCase();
  document.getElementById('user-nombre').textContent = (SESSION.nombre || '') + ' ' + (SESSION.apellido || '');
  document.getElementById('user-rol').textContent = SESSION.rol?.toUpperCase() || '';
  document.getElementById('user-rol').textContent += SESSION.grado ? ' · ' + SESSION.grado.toUpperCase() : '';
  document.getElementById('user-rol').textContent += SESSION.seccion ? ' ' + SESSION.seccion : '';

  // Mostrar menú admin
  if (SESSION.rol === 'administrador') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
  }

  configurarNavegacion();
  cargarProyectos();
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
      if (view === 'admin') cargarAdmin();
    });
  });
}

// ============================================================
// FORMULARIO PROYECTO
// ============================================================
function mostrarFormProyecto() {
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
    <button class="btn-sm danger" onclick="this.parentElement.remove()" style="font-size:16px;padding:4px 8px;">✕</button>`;
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
    const nom = inputs[0]?.value.trim();
    const curso = inputs[1]?.value.trim();
    const contacto = inputs[2]?.value.trim();
    if (nom) representantes.push({ nombre: nom, curso: curso || '', contacto: contacto || '' });
  });

  if (!representantes.length) { err.textContent = '⚠ Agrega al menos un representante.'; err.classList.add('show'); return; }

  try {
    // Guardar proyecto
    const proyBody = { nombre, descripcion: desc, pin, creado_por: SESSION.id };
    const proyRes = await supabaseQuery('proyectos', 'POST', proyBody);
    const idProyecto = proyRes[0]?.id;

    // Guardar representantes
    for (const rep of representantes) {
      await supabaseQuery('representantes', 'POST', { id_proyecto: idProyecto, nombre: rep.nombre, curso: rep.curso, contacto: rep.contacto });
    }

    showToast('✅ Proyecto registrado', 'success');
    cancelarFormProyecto();
    cargarProyectos();
  } catch(e) {
    err.textContent = '⚠ Error al guardar. Intenta de nuevo.';
    err.classList.add('show');
  }
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
        <div class="curso-badge">${p.id}</div>
        <div class="curso-name">${p.nombre}</div>
        <div class="proyecto-desc">${p.descripcion || ''}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:0.5rem;">Creado por: ${p.creado_por || '—'}</div>
        <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
        <button class="btn-sm" onclick="abrirEvalDesdeProyecto('${p.id}')" style="margin-left:4px;">▶ EVALUAR</button>
      </div>`).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state">ERROR AL CARGAR PROYECTOS</div>';
  }
}

// ============================================================
// VER REPRESENTANTES
// ============================================================
async function verRepresentantes(idProyecto) {
  const proyecto = PROYECTOS_DATA.find(p => p.id == idProyecto);
  document.getElementById('modal-reps-title').textContent = 'Representantes — ' + (proyecto?.nombre || idProyecto);
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
  } catch(e) {
    document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">ERROR</div>';
  }
}

function cerrarModalReps() {
  document.getElementById('modal-reps').classList.remove('open');
}

// ============================================================
// EVALUAR (VOTAR)
// ============================================================
let VOTO_ACTUAL = null;

function abrirEvalDesdeProyecto(idProyecto) {
  const proyecto = PROYECTOS_DATA.find(p => p.id == idProyecto);
  if (!proyecto) return;
  EVAL_PROYECTO = proyecto;
  VOTO_ACTUAL = null;
  document.getElementById('eval-proyecto-nombre').textContent = proyecto.nombre;
  document.getElementById('eval-overlay').style.display = 'block';
  renderPinVotacion();
}

function cerrarEval() {
  document.getElementById('eval-overlay').style.display = 'none';
  EVAL_PROYECTO = null;
  VOTO_ACTUAL = null;
}

function renderPinVotacion() {
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:2rem 0;">
      <div style="font-size:18px;font-weight:700;color:var(--text);">PIN del Proyecto</div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:2rem;">Solicita el PIN al equipo del proyecto</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:1.5rem;">
        ${[1,2,3,4].map(i => `<input class="pin-digit" maxlength="1" type="text" inputmode="numeric" id="pin-d${i}" onkeyup="pinFocusNextVoto(this,${i})"/>`).join('')}
      </div>
      <div class="error-msg" id="pin-error-voto" style="display:none;"></div>
      <button class="btn-primary" id="btn-verificar-pin-voto" style="max-width:300px;">VERIFICAR</button>
    </div>`;
  setTimeout(() => document.getElementById('pin-d1')?.focus(), 100);
  document.getElementById('btn-verificar-pin-voto').addEventListener('click', verificarPinVoto);
  document.querySelectorAll('.pin-digit').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') verificarPinVoto(); }));
}

function pinFocusNextVoto(el, idx) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1 && idx < 4) document.getElementById('pin-d' + (idx + 1))?.focus();
}

async function verificarPinVoto() {
  let pin = '';
  for (let i = 1; i <= 4; i++) pin += (document.getElementById('pin-d' + i)?.value || '');
  const err = document.getElementById('pin-error-voto');

  if (pin.length < 4) { err.textContent = '⚠ Ingresa 4 dígitos'; err.style.display = 'block'; return; }

  if (EVAL_PROYECTO.pin === pin) {
    // Verificar si ya votó
    const existentes = await supabaseQuery('votos', 'GET', null, `id_proyecto=eq.${EVAL_PROYECTO.id}&votante_id=eq.${SESSION.id}`);
    if (existentes.length > 0) {
      document.getElementById('eval-content').innerHTML = `
        <div style="text-align:center;padding:3rem;">
          <div style="font-size:3rem;">⚠️</div>
          <div style="font-size:18px;font-weight:700;color:var(--amber);">Ya has votado por este proyecto</div>
          <div style="font-size:12px;color:var(--text-dim);">Solo se permite un voto por proyecto</div>
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
      <div style="font-size:18px;font-weight:700;color:var(--text);">${EVAL_PROYECTO.nombre}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:2rem;">${EVAL_PROYECTO.descripcion || ''}</div>
      <div style="font-size:14px;color:var(--text);margin-bottom:1rem;">¿Confirmas tu VOTO para este proyecto?</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn-sm" onclick="cerrarEval()">CANCELAR</button>
        <button class="btn-primary" onclick="confirmarVoto()" style="max-width:200px;">✓ CONFIRMAR VOTO</button>
      </div>
    </div>`;
}

async function confirmarVoto() {
  document.getElementById('eval-content').innerHTML = `
    <div style="text-align:center;padding:3rem;">
      <div style="width:60px;height:60px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--cyan);margin:0 auto 1.5rem;animation:spin 0.8s linear infinite;"></div>
      <div style="font-size:18px;font-weight:700;color:var(--cyan);">Registrando voto...</div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;

  try {
    await supabaseQuery('votos', 'POST', { id_proyecto: EVAL_PROYECTO.id, votante_id: SESSION.id });
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">✅</div>
        <div style="font-size:20px;font-weight:700;color:var(--green);">¡Voto registrado!</div>
        <button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button>
      </div>`;
    showToast('✅ Voto registrado', 'success');
    setTimeout(() => { cerrarEval(); cargarVotar(); cargarProyectos(); }, 1500);
  } catch(e) {
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">❌</div>
        <div style="font-size:18px;font-weight:700;color:var(--red);">Error al registrar voto</div>
        <button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button>
      </div>`;
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
    VOTOS_DATA = await supabaseQuery('votos', 'GET', null, `votante_id=eq.${SESSION.id}`);
    const votadosIds = VOTOS_DATA.map(v => v.id_proyecto);

    if (!PROYECTOS_DATA.length) { container.innerHTML = '<div class="empty-state">NO HAY PROYECTOS</div>'; return; }

    container.innerHTML = PROYECTOS_DATA.map(p => {
      const yaVoto = votadosIds.includes(p.id);
      return `
        <div class="proyecto-card">
          <div class="curso-badge">${p.id}</div>
          <div class="curso-name">${p.nombre}</div>
          <div class="proyecto-desc">${p.descripcion || ''}</div>
          <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
          ${yaVoto
            ? '<button class="btn-sm votado" disabled>✓ YA VOTASTE</button>'
            : `<button class="btn-sm success" onclick="abrirEvalDesdeProyecto('${p.id}')">▶ VOTAR</button>`}
        </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state">ERROR</div>';
  }
}

// ============================================================
// RESULTADOS
// ============================================================
async function cargarResultados() {
  const container = document.getElementById('resultados-container');
  if (!container) return;
  container.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';

  try {
    // Verificar si los resultados son públicos
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    const sonPublicos = pub.length > 0 && pub[0].publico === true;

    if (!sonPublicos && SESSION.rol !== 'administrador') {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem;">🔒</div>
          <div style="font-size:18px;font-weight:700;color:var(--text);">Resultados no disponibles</div>
          <div style="font-size:12px;color:var(--text-dim);">El administrador aún no ha publicado los resultados.</div>
        </div>`;
      return;
    }

    const [proyectos, votos] = await Promise.all([
      supabaseQuery('proyectos'),
      supabaseQuery('votos')
    ]);

    const conteo = {};
    proyectos.forEach(p => { conteo[p.id] = { nombre: p.nombre, descripcion: p.descripcion, votos: 0 }; });
    votos.forEach(v => { if (conteo[v.id_proyecto]) conteo[v.id_proyecto].votos++; });

    const ranking = Object.values(conteo).sort((a, b) => b.votos - a.votos);
    const maxVotos = ranking.length > 0 ? ranking[0].votos : 1;

    if (!ranking.length) { container.innerHTML = '<div class="empty-state">SIN VOTOS AÚN</div>'; return; }

    container.innerHTML = ranking.map((r, i) => {
      let posClass = '';
      if (i === 0) posClass = 'oro';
      else if (i === 1) posClass = 'plata';
      else if (i === 2) posClass = 'bronce';
      const pct = maxVotos > 0 ? Math.round((r.votos / maxVotos) * 100) : 0;
      return `
        <div class="resultado-card">
          <div class="resultado-pos ${posClass}">#${i + 1}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${r.nombre}</div>
            <div style="font-size:11px;color:var(--text-dim);">${r.descripcion || ''}</div>
            <div class="resultado-barra"><div class="resultado-barra-fill" style="width:${pct}%;"></div></div>
          </div>
          <div style="font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--primary);">${r.votos} 🗳</div>
        </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state">ERROR AL CARGAR RESULTADOS</div>';
  }
}

// ============================================================
// ADMIN
// ============================================================
async function cargarAdmin() {
  const estado = document.getElementById('estado-publicacion');
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    if (pub.length > 0 && pub[0].publico) {
      estado.innerHTML = '<span style="color:var(--green);">✅ Los resultados SON PÚBLICOS actualmente.</span>';
      document.getElementById('btn-publicar').textContent = '🔒 OCULTAR RESULTADOS';
      document.getElementById('btn-publicar').onclick = ocultarResultados;
    } else {
      estado.innerHTML = '<span style="color:var(--amber);">⚠ Los resultados NO son públicos.</span>';
      document.getElementById('btn-publicar').textContent = '📢 HACER PÚBLICOS LOS RESULTADOS';
      document.getElementById('btn-publicar').onclick = publicarResultados;
    }
  } catch(e) {
    estado.innerHTML = '<span style="color:var(--red);">Error al cargar estado</span>';
  }
}

async function publicarResultados() {
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    if (pub.length > 0) {
      await supabaseQuery('resultados_publicos', 'PATCH', { publico: true }, 'id=eq.1');
    } else {
      await supabaseQuery('resultados_publicos', 'POST', { id: 1, publico: true });
    }
    showToast('📢 Resultados publicados', 'success');
    cargarAdmin();
  } catch(e) {
    showToast('Error al publicar', 'error');
  }
}

async function ocultarResultados() {
  try {
    await supabaseQuery('resultados_publicos', 'PATCH', { publico: false }, 'id=eq.1');
    showToast('🔒 Resultados ocultados', 'success');
    cargarAdmin();
  } catch(e) {
    showToast('Error al ocultar', 'error');
  }
}

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
  if (overlay) overlay.onclick = cerrarMenu;
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', cerrarMenu));
}

// ============================================================
// VERIFICAR SESIÓN AL CARGAR
// ============================================================
(function() {
  const saved = localStorage.getItem('feria_session');
  if (saved) {
    try {
      SESSION = JSON.parse(saved);
      document.getElementById('screen-portada').classList.remove('active');
      document.getElementById('screen-app').classList.add('active');
      const initials = (SESSION.nombre || '')[0] + ((SESSION.apellido || '')[0] || '');
      document.getElementById('user-avatar').textContent = initials.toUpperCase();
      document.getElementById('user-nombre').textContent = (SESSION.nombre || '') + ' ' + (SESSION.apellido || '');
      document.getElementById('user-rol').textContent = SESSION.rol?.toUpperCase() || '';
      if (SESSION.rol === 'administrador') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
      }
      configurarNavegacion();
      cargarProyectos();
    } catch(e) {
      localStorage.removeItem('feria_session');
      SESSION = null;
    }
  }
})();
