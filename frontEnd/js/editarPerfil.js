// ==========================================
// IMPORTACIONES Y CONTROL DE ACCESO
// ==========================================
import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js'; // Importa las herramientas para peticiones protegidas, control de sesión y obtención de datos del usuario

verificarAutenticacion(); // Ejecución inmediata para denegar el acceso y redirigir al login si el usuario no ha iniciado sesión

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
const form = document.getElementById('perfilForm'); // Elemento formulario de la interfaz de usuario para modificar el perfil
const sectionErrors = document.getElementById('perfilError'); // Contenedor (div/section) para renderizar las alertas de error o éxito

const inputNom = document.getElementById('nom'); // Cuadro de texto para el nombre del usuario
const inputEmail = document.getElementById('email'); // Cuadro de texto para el correo electrónico del usuario
const inputContrasenya = document.getElementById('contrasenya'); // Cuadro de texto para ingresar la nueva contraseña opcional
const inputContrasenyaConfirm = document.getElementById('contrasenyaConfirm'); // Cuadro de texto para confirmar la nueva contraseña

// Recupera de forma síncrona el objeto con los datos actuales del usuario guardado en el localStorage
const usuario = getUsuario();

// ==========================================
// FUNCIONES AUXILIARES DE INTERFAZ (UI)
// ==========================================

// Inyecta dinámicamente un mensaje de error formateado en color rojo dentro del contenedor visual
function mostrarError(mensaje) {
  if (sectionErrors) {
    sectionErrors.innerHTML = `<p class="errorMsg" style="color: red;">✗ ${mensaje}</p>`;
  }
}

// Inyecta dinámicamente un mensaje de éxito formateado en color verde dentro del contenedor visual
function mostrarExito(mensaje) {
  if (sectionErrors) {
    sectionErrors.innerHTML = `<p style="color: green; font-weight: bold;">✓ ${mensaje}</p>`;
  }
}

// Rellena los campos de texto del formulario con los valores actuales del usuario al cargar la pantalla
function llenarDatos() {
  if (!usuario) return; // Salvaguarda: si no hay datos del usuario, interrumpe la función
  // Asigna el nombre y el email recuperados; si son nulos o indefinidos, asigna una cadena vacía ('') para evitar textos residuales
  if (inputNom) inputNom.value = usuario.nom ?? '';
  if (inputEmail) inputEmail.value = usuario.email ?? '';
}

// Extrae, limpia y agrupa los valores de los dos campos de contraseña en un único objeto de control
function getValidPassword() {
  const pass = inputContrasenya?.value?.trim() || ''; // Lee el valor de la nueva contraseña eliminando espacios
  const confirm = inputContrasenyaConfirm?.value?.trim() || ''; // Lee el valor de la confirmación eliminando espacios
  return { pass, confirm }; // Devuelve un objeto estructurado con ambas cadenas de texto
}

// ==========================================
// PROCESAMIENTO Y ENVÍO DE DATOS (API)
// ==========================================

// Gestiona las validaciones de negocio del lado del cliente y realiza la petición de actualización al servidor
async function guardarPerfil() {
  // Comprobación de seguridad física: si el objeto de sesión local se destruyó, detiene el proceso con un error
  if (!usuario) {
    mostrarError('No hay sesión activa');
    return;
  }

  // Captura y limpia los valores actuales del formulario
  const nom = inputNom.value.trim();
  const email = inputEmail.value.trim();
  const { pass, confirm } = getValidPassword();

  // Validaciones de presencia obligatoria para los campos de perfil
  if (!nom) return mostrarError('El nombre es obligatorio');
  if (!email) return mostrarError('El correo es obligatorio');

  // Validación de formato estructurado mediante expresión regular para el correo electrónico
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(email)) return mostrarError('El correo no es válido');

  // Inicializa el payload básico de datos que sí o sí se enviarán al servidor
  let payload = { nom, email };

  // Lógica condicional: si el usuario ha escrito caracteres en cualquiera de los campos de contraseña
  if (pass || confirm) {
    // Valida que la contraseña propuesta cumpla con la longitud mínima requerida
    if (pass.length < 6) return mostrarError('La contraseña debe tener al menos 6 caracteres');
    // Valida que ambos campos de contraseña ingresados coincidan exactamente carácter por carácter
    if (pass !== confirm) return mostrarError('Las contraseñas no coinciden');
    // Si cumple los filtros, agrega de forma dinámica la propiedad 'contrasenya' al payload final
    payload.contrasenya = pass;
  }

  // Realiza una petición HTTP asíncrona utilizando el envoltorio seguro que inyecta el token Bearer en la cabecera
  const response = await fetchAutenticado('/usuario', {
    method: 'PUT', // Método HTTP estandarizado para la actualización completa o parcial de un recurso existente
    body: JSON.stringify(payload) // Convierte el objeto de datos formateado en una cadena JSON
  });

  // Manejo de fallo si la red no responde o la petición es nula
  if (!response) {
    mostrarError('Error al conectar con el servidor');
    return;
  }

  // --- FLUJO DE RESPUESTA EXITOSA (HTTP 200-299) ---
  if (response.ok) {
    // Parsea los datos con un catch interno para prevenir fallos críticos si el JSON devuelto viniera vacío o corrupto
    const data = await response.json().catch(() => ({}));
    
    // Si la API devuelve un token JWT renovado, sobreescribe el antiguo token en el almacenamiento local
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
    // Si la API devuelve el objeto de usuario modificado, actualiza de forma síncrona el perfil local en el navegador
    if (data?.usuario) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
    }
    
    mostrarExito('Perfil actualizado correctamente'); // Informa visualmente del éxito de la operación
    
    // Pausa el flujo por 1200 milisegundos (1.2 segundos) para permitir la lectura del aviso antes de redirigir la navegación
    setTimeout(() => {
      window.location.href = '../pages/misProductos.html'; // Redirecciona la pantalla a la vista de productos propios del usuario
    }, 1200);
  } else {
    // --- FLUJO DE RESPUESTA ERRÓNEA ---
    const data = await response.json().catch(() => ({}));
    // Extrae e inyecta la causa del error devuelta por el servidor o aplica un mensaje genérico por defecto
    mostrarError(data.error || 'No se pudo actualizar el perfil');
  }
}

// ==========================================
// INICIALIZACIÓN Y VINCULACIÓN DE EVENTOS
// ==========================================

// Vincula el escuchador de eventos al formulario para interceptar el envío de datos
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // Cancela el comportamiento de recarga nativo del HTML
    guardarPerfil(); // Delega el procesamiento en la función asíncrona
  });
}

// Ejecuta el llenado inicial de datos en los campos del formulario con la información guardada localmente
llenarDatos();