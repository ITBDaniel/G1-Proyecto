import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js';

verificarAutenticacion();

const form = document.getElementById('perfilForm');
const sectionErrors = document.getElementById('perfilError');

const inputNom = document.getElementById('nom');
const inputEmail = document.getElementById('email');
const inputContrasenya = document.getElementById('contrasenya');
const inputContrasenyaConfirm = document.getElementById('contrasenyaConfirm');

const usuario = getUsuario();

function mostrarError(mensaje) {
  if (sectionErrors) {
    sectionErrors.innerHTML = `<p class="errorMsg" style="color: red;">✗ ${mensaje}</p>`;
  }
}

function mostrarExito(mensaje) {
  if (sectionErrors) {
    sectionErrors.innerHTML = `<p style="color: green; font-weight: bold;">✓ ${mensaje}</p>`;
  }
}

function llenarDatos() {
  if (!usuario) return;
  if (inputNom) inputNom.value = usuario.nom ?? '';
  if (inputEmail) inputEmail.value = usuario.email ?? '';
}

function getValidPassword() {
  const pass = inputContrasenya?.value?.trim() || '';
  const confirm = inputContrasenyaConfirm?.value?.trim() || '';
  return { pass, confirm };
}

async function guardarPerfil() {
  if (!usuario) {
    mostrarError('No hay sesión activa');
    return;
  }

  const nom = inputNom.value.trim();
  const email = inputEmail.value.trim();
  const { pass, confirm } = getValidPassword();

  if (!nom) return mostrarError('El nombre es obligatorio');
  if (!email) return mostrarError('El correo es obligatorio');

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(email)) return mostrarError('El correo no es válido');

  let payload = { nom, email };

  if (pass || confirm) {
    if (pass.length < 6) return mostrarError('La contraseña debe tener al menos 6 caracteres');
    if (pass !== confirm) return mostrarError('Las contraseñas no coinciden');
    payload.contrasenya = pass;
  }

  const response = await fetchAutenticado('/usuario', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  if (!response) {
    mostrarError('Error al conectar con el servidor');
    return;
  }

  if (response.ok) {
    const data = await response.json().catch(() => ({}));
    // Actualizamos localStorage con lo devuelto por el backend si existe
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
    if (data?.usuario) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
    }
    mostrarExito('Perfil actualizado correctamente');
    setTimeout(() => {
      window.location.href = '../pages/misProductos.html';
    }, 1200);
  } else {
    const data = await response.json().catch(() => ({}));
    mostrarError(data.error || 'No se pudo actualizar el perfil');
  }
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    guardarPerfil();
  });
}

llenarDatos();

