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
let PIN_GENERADO = null;
let USUARIO_RECUPERACION = null;

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
// GENERAR PIN ÚNICO DE 5 DÍGITOS
// ============================================================
async function generarPinUnico() {
  let pin, existe;
  do {
    pin = String(Math.floor(10000 + Math.random() * 90000));
    existe = await supabaseQuery('usuarios', 'GET', null, `pin=eq.${pin}`);
  } while (existe.length > 0);
  return pin;
}

// ============================================================
// PIN FOCUS - LOGIN
// ============================================================
function pinFocusLogin(el, next) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1 && next <= 5) {
    const n = document.getElementById('login-d' + next);
    if (n) n.focus();
  }
}

// ============================================================
// PIN FOCUS - NUEVO PIN (RECUPERACIÓN)
// ============================================================
function pinFocusNew(el, next) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length === 1 && next <= 5) {
    const n = document.getElementById('newpin' + next);
    if (n) n.focus();
  }
}

// ============================================================
// ENTER EN LOGIN
// ============================================================
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (document.getElementById('screen-portada').classList.contains('active')) {
      if (document.getElementById('form-login').style.display !== 'none') {
        handleLogin();
      }
    }
  }
});

// ============================================================
// LOGIN
// ============================================================
async function handleLogin() {
  let pin = '';
  for (let i = 1; i <= 5; i++) pin += (document.getElementById('login-d' + i)?.value || '');
  const err = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
    err.textContent = '⚠ Ingresa los 5 dígitos de tu PIN.';
    err.classList.add('show');
    return;
  }

  btn.textContent = 'VERIFICANDO...'; btn.disabled = true; err.classList.remove('show');

  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, `pin=eq.${pin}`);
    if (!usuarios.length) throw new Error('PIN incorrecto');
    SESSION = usuarios[0];
    localStorage.setItem('feria_session', JSON.stringify(SESSION));
    iniciarApp();
  } catch(e) {
    err.textContent = '⚠ PIN incorrecto.';
    err.classList.add('show');
    btn.textContent = 'INGRESAR';
    btn.disabled = false;
    for (let i = 1; i <= 5; i++) { const d = document.getElementById('login-d' + i); if (d) d.value = ''; }
    document.getElementById('login-d1')?.focus();
  }
}

// ============================================================
// MOSTRAR REGISTRO
// ============================================================
function mostrarRegistro() {
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-registro').style.display = 'block';
  document.getElementById('form-olvide-pin').style.display = 'none';
  document.getElementById('modal-id-generado').style.display = 'none';
  limpiarFormRegistro();
}

// ============================================================
// MOSTRAR OLVIDÉ MI PIN
// ============================================================
function mostrarOlvidePin() {
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-registro').style.display = 'none';
  document.getElementById('form-olvide-pin').style.display = 'block';
  document.getElementById('modal-id-generado').style.display = 'none';
  document.getElementById('recup-nombre').value = '';
  document.getElementById('recup-apellido').value = '';
  document.getElementById('recup-respuesta').value = '';
  document.getElementById('recup-nuevo-pin-container').style.display = 'none';
  document.getElementById('btn-recup-verificar').style.display = 'block';
  document.getElementById('btn-recup-cambiar').style.display = 'none';
  document.getElementById('recup-error').classList.remove('show');
  USUARIO_RECUPERACION = null;
}

// ============================================================
// VOLVER A LOGIN
// ============================================================
function volverPortada() {
  document.getElementById('form-login').style.display = 'block';
  document.getElementById('form-registro').style.display = 'none';
  document.getElementById('form-olvide-pin').style.display = 'none';
  document.getElementById('modal-id-generado').style.display = 'none';
  document.getElementById('login-error').classList.remove('show');
  for (let i = 1; i <= 5; i++) { const d = document.getElementById('login-d' + i); if (d) d.value = ''; }
}

// ============================================================
// ACTUALIZAR FORM REGISTRO (ROL)
// ============================================================
function actualizarFormRegistro() {
  const rol = document.getElementById('reg-rol').value;
  if (rol === 'estudiante') {
    document.getElementById('reg-campos-estudiante').style.display = 'block';
  } else {
    document.getElementById('reg-campos-estudiante').style.display = 'none';
    document.getElementById('grupo-modulo').style.display = 'none';
  }
}

// ============================================================
// ACTUALIZAR GRADO (MÓDULO/SECCIÓN)
// ============================================================
function actualizarGrado() {
  const grado = document.getElementById('reg-grado').value;
  const grupoModulo = document.getElementById('grupo-modulo');
  const selSeccion = document.getElementById('reg-seccion');
  selSeccion.innerHTML = '<option value="">— Selecciona —</option>';

  if (grado === '3ro') {
    grupoModulo.style.display = 'none';
    selSeccion.innerHTML += '<option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>';
  } else if (['4to', '5to', '6to'].includes(grado)) {
    grupoModulo.style.display = 'block';
    selSeccion.innerHTML += '<option value="A">A</option><option value="B">B</option>';
  } else {
    grupoModulo.style.display = 'none';
  }
}

// ============================================================
// ACTUALIZAR TIPO DE RECUPERACIÓN
// ============================================================
function actualizarTipoRecuperacion() {
  const tipo = document.getElementById('reg-tipo-recuperacion').value;
  const grupo = document.getElementById('grupo-respuesta-recuperacion');
  const label = document.getElementById('label-respuesta');

  if (tipo) {
    grupo.style.display = 'block';
    if (tipo === 'color') label.textContent = '¿Cuál es tu color favorito?';
    else if (tipo === 'animal') label.textContent = '¿Cuál es tu animal favorito?';
    else if (tipo === 'madre') label.textContent = '¿Cuál es el nombre de tu madre?';
  } else {
    grupo.style.display = 'none';
  }
}

// ============================================================
// LIMPIAR FORM REGISTRO
// ============================================================
function limpiarFormRegistro() {
  document.getElementById('reg-nombre').value = '';
  document.getElementById('reg-apellido').value = '';
  document.getElementById('reg-rol').value = '';
  document.getElementById('reg-campos-estudiante').style.display = 'none';
  document.getElementById('reg-grado').value = '';
  document.getElementById('reg-modulo').value = '';
  document.getElementById('reg-seccion').innerHTML = '<option value="">— Selecciona —</option>';
  document.getElementById('reg-tipo-recuperacion').value = '';
  document.getElementById('grupo-respuesta-recuperacion').style.display = 'none';
  document.getElementById('reg-respuesta-recuperacion').value = '';
  document.getElementById('grupo-modulo').style.display = 'none';
  document.getElementById('reg-error').classList.remove('show');
}

// ============================================================
// REGISTRO
// ============================================================
async function handleRegistro() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const rol = document.getElementById('reg-rol').value;
  const tipoRec = document.getElementById('reg-tipo-recuperacion').value;
  const respRec = document.getElementById('reg-respuesta-recuperacion').value.trim();
  const err = document.getElementById('reg-error');

  if (!nombre || !apellido) { err.textContent = '⚠ Completa nombre y apellido.'; err.classList.add('show'); return; }
  if (!rol) { err.textContent = '⚠ Selecciona tu rol.'; err.classList.add('show'); return; }
  if (!tipoRec || !respRec) { err.textContent = '⚠ Selecciona y responde el dato de recuperación.'; err.classList.add('show'); return; }

  let grado = null, modulo = null, seccion = null;
  if (rol === 'estudiante') {
    grado = document.getElementById('reg-grado').value;
    seccion = document.getElementById('reg-seccion').value;
    if (!grado) { err.textContent = '⚠ Selecciona tu grado.'; err.classList.add('show'); return; }
    if (!seccion) { err.textContent = '⚠ Selecciona tu sección.'; err.classList.add('show'); return; }
    if (['4to', '5to', '6to'].includes(grado)) {
      modulo = document.getElementById('reg-modulo').value;
      if (!modulo) { err.textContent = '⚠ Selecciona tu módulo.'; err.classList.add('show'); return; }
    }
  }

  try {
    const pin = await generarPinUnico();
    const body = {
      nombre, apellido, rol, pin,
      tipo_recuperacion: tipoRec,
      respuesta_recuperacion: respRec.toLowerCase().trim()
    };
    if (grado) body.grado = grado;
    if (modulo) body.modulo = modulo;
    if (seccion) body.seccion = seccion;

    await supabaseQuery('usuarios', 'POST', body);
    PIN_GENERADO = pin;
    document.getElementById('id-generado-texto').textContent = pin;
    document.getElementById('form-registro').style.display = 'none';
    document.getElementById('modal-id-generado').style.display = 'block';
    err.classList.remove('show');
  } catch(e) {
    err.textContent = '⚠ Error al registrar. Intenta de nuevo.';
    err.classList.add('show');
  }
}

// ============================================================
// INGRESAR CON PIN GENERADO
// ============================================================
async function ingresarConPinGenerado() {
  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, `pin=eq.${PIN_GENERADO}`);
    if (usuarios.length) {
      SESSION = usuarios[0];
      localStorage.setItem('feria_session', JSON.stringify(SESSION));
      iniciarApp();
    }
  } catch(e) {
    showToast('Error al ingresar', 'error');
  }
}

// ============================================================
// RECUPERAR PIN - VERIFICAR
// ============================================================
async function verificarRecuperacion() {
  const nombre = document.getElementById('recup-nombre').value.trim();
  const apellido = document.getElementById('recup-apellido').value.trim();
  const respuesta = document.getElementById('recup-respuesta').value.trim().toLowerCase();
  const err = document.getElementById('recup-error');

  if (!nombre || !apellido) { err.textContent = '⚠ Ingresa tu nombre y apellido.'; err.classList.add('show'); return; }
  if (!respuesta) { err.textContent = '⚠ Responde la pregunta.'; err.classList.add('show'); return; }

  try {
    const usuarios = await supabaseQuery('usuarios', 'GET', null, `nombre=eq.${nombre}&apellido=eq.${apellido}`);
    if (!usuarios.length) { err.textContent = '⚠ Usuario no encontrado.'; err.classList.add('show'); return; }

    const user = usuarios[0];
    document.getElementById('recup-pregunta').textContent =
      user.tipo_recuperacion === 'color' ? '¿Cuál es tu color favorito?' :
      user.tipo_recuperacion === 'animal' ? '¿Cuál es tu animal favorito?' :
      '¿Cuál es el nombre de tu madre?';

    if (user.respuesta_recuperacion !== respuesta) {
      err.textContent = '⚠ Respuesta incorrecta.';
      err.classList.add('show');
      return;
    }

    USUARIO_RECUPERACION = user;
    document.getElementById('recup-nuevo-pin-container').style.display = 'block';
    document.getElementById('btn-recup-verificar').style.display = 'none';
    document.getElementById('btn-recup-cambiar').style.display = 'block';
    err.classList.remove('show');
  } catch(e) {
    err.textContent = '⚠ Error. Intenta de nuevo.';
    err.classList.add('show');
  }
}

// ============================================================
// RECUPERAR PIN - CAMBIAR
// ============================================================
async function cambiarPin() {
  let nuevoPin = '';
  for (let i = 1; i <= 5; i++) nuevoPin += (document.getElementById('newpin' + i)?.value || '');
  const err = document.getElementById('recup-error');

  if (nuevoPin.length !== 5 || !/^\d{5}$/.test(nuevoPin)) {
    err.textContent = '⚠ Ingresa los 5 dígitos del nuevo PIN.';
    err.classList.add('show');
    return;
  }

  // Verificar que no exista
  const existe = await supabaseQuery('usuarios', 'GET', null, `pin=eq.${nuevoPin}`);
  if (existe.length > 0) {
    err.textContent = '⚠ Ese PIN ya está en uso. Elige otro.';
    err.classList.add('show');
    return;
  }

  try {
    await supabaseQuery('usuarios', 'PATCH', { pin: nuevoPin }, `id=eq.${USUARIO_RECUPERACION.id}`);
    showToast('✅ PIN actualizado correctamente', 'success');
    volverPortada();
  } catch(e) {
    err.textContent = '⚠ Error al actualizar.';
    err.classList.add('show');
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
// FORMULARIO PROYECTO (SOLO ADMIN)
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
      representantes.push({
        nombre: inputs[0].value.trim(),
        curso: inputs[1]?.value.trim() || '',
        contacto: inputs[2]?.value.trim() || ''
      });
    }
  });
  if (!representantes.length) { err.textContent = '⚠ Agrega al menos un representante.'; err.classList.add('show'); return; }

  try {
    const proyRes = await supabaseQuery('proyectos', 'POST', { nombre, descripcion: desc, pin, creado_por: SESSION.id });
    const idProyecto = proyRes[0]?.id;
    for (const rep of representantes) {
      await supabaseQuery('representantes', 'POST', { id_proyecto: idProyecto, nombre: rep.nombre, curso: rep.curso, contacto: rep.contacto });
    }
    showToast('✅ Proyecto registrado', 'success');
    cancelarFormProyecto();
    cargarProyectos();
  } catch(e) {
    err.textContent = '⚠ Error al guardar.';
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
        <div class="curso-badge">#${p.id}</div>
        <div class="curso-name">${p.nombre}</div>
        <div class="proyecto-desc">${p.descripcion || ''}</div>
        <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
        <button class="btn-sm" onclick="abrirEvalDesdeProyecto('${p.id}')" style="margin-left:4px;">▶ VOTAR</button>
      </div>`).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state">ERROR AL CARGAR</div>';
  }
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
  } catch(e) {
    document.getElementById('modal-reps-body').innerHTML = '<div class="empty-state">ERROR</div>';
  }
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

function cerrarEval() { document.getElementById('eval-overlay').style.display = 'none'; EVAL_PROYECTO = null; }

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
    const existentes = await supabaseQuery('votos', 'GET', null, `id_proyecto=eq.${EVAL_PROYECTO.id}&votante_id=eq.${SESSION.id}`);
    if (existentes.length > 0) {
      document.getElementById('eval-content').innerHTML = `
        <div style="text-align:center;padding:3rem;">
          <div style="font-size:3rem;">⚠️</div>
          <div style="font-size:18px;font-weight:700;color:var(--amber);">Ya has votado por este proyecto</div>
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
    await supabaseQuery('votos', 'POST', { id_proyecto: EVAL_PROYECTO.id, votante_id: SESSION.id });
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">✅</div>
        <div style="font-size:20px;font-weight:700;color:var(--green);">¡Voto registrado!</div>
        <button class="btn-primary" onclick="cerrarEval()" style="max-width:300px;margin-top:1rem;">CERRAR</button>
      </div>`;
    showToast('✅ Voto registrado', 'success');
  } catch(e) {
    document.getElementById('eval-content').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">❌</div>
        <div style="font-size:18px;color:var(--red);">Error</div>
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
    container.innerHTML = PROYECTOS_DATA.map(p => `
      <div class="proyecto-card">
        <div class="curso-badge">#${p.id}</div>
        <div class="curso-name">${p.nombre}</div>
        <div class="proyecto-desc">${p.descripcion || ''}</div>
        <button class="btn-sm" onclick="verRepresentantes('${p.id}')">👥 VER REPRESENTANTES</button>
        ${votadosIds.includes(p.id)
          ? '<button class="btn-sm votado" disabled>✓ YA VOTASTE</button>'
          : `<button class="btn-sm success" onclick="abrirEvalDesdeProyecto('${p.id}')">▶ VOTAR</button>`}
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state">ERROR</div>'; }
}

// ============================================================
// RESULTADOS
// ============================================================
async function cargarResultados() {
  const container = document.getElementById('resultados-container');
  if (!container) return;
  container.innerHTML = '<div class="loader">[ CARGANDO... ]</div>';
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    const sonPublicos = pub.length > 0 && pub[0].publico === true;
    if (!sonPublicos && SESSION.rol !== 'administrador') {
      container.innerHTML = `<div class="empty-state"><div style="font-size:3rem;">🔒</div><div style="font-size:18px;font-weight:700;">Resultados no disponibles</div><div style="font-size:12px;color:var(--text-dim);">El administrador aún no ha publicado los resultados.</div></div>`;
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
// ADMIN
// ============================================================
async function cargarAdmin() {
  const estado = document.getElementById('estado-publicacion');
  const btn = document.getElementById('btn-publicar');
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    if (pub.length > 0 && pub[0].publico) {
      estado.innerHTML = '<span style="color:var(--green);">✅ Resultados PÚBLICOS.</span>';
      btn.textContent = '🔒 OCULTAR RESULTADOS';
      btn.onclick = ocultarResultados;
    } else {
      estado.innerHTML = '<span style="color:var(--amber);">⚠ Resultados OCULTOS.</span>';
      btn.textContent = '📢 HACER PÚBLICOS LOS RESULTADOS';
      btn.onclick = publicarResultados;
    }
  } catch(e) { estado.innerHTML = '<span style="color:var(--red);">Error</span>'; }
}

async function publicarResultados() {
  try {
    const pub = await supabaseQuery('resultados_publicos', 'GET', null, 'id=eq.1');
    if (pub.length > 0) await supabaseQuery('resultados_publicos', 'PATCH', { publico: true }, 'id=eq.1');
    else await supabaseQuery('resultados_publicos', 'POST', { id: 1, publico: true });
    showToast('📢 Resultados publicados', 'success'); cargarAdmin();
  } catch(e) { showToast('Error', 'error'); }
}

async function ocultarResultados() {
  try {
    await supabaseQuery('resultados_publicos', 'PATCH', { publico: false }, 'id=eq.1');
    showToast('🔒 Resultados ocultados', 'success'); cargarAdmin();
  } catch(e) { showToast('Error', 'error'); }
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
// VERIFICAR SESIÓN
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
    } catch(e) { localStorage.removeItem('feria_session'); SESSION = null; }
  }
})();
