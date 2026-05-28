// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
const authTitle = document.getElementById('authTitle'); // Título de la tarjeta o contenedor de autenticación
const authForm = document.getElementById('authForm'); // Elemento formulario HTML que agrupa los campos
const toggleAuth = document.getElementById('toggleAuth'); // Enlace o botón para alternar entre iniciar sesión y registrarse
const submitBtn = document.getElementById('submitBtn'); // Botón principal para enviar el formulario
const footerText = document.getElementById('footerText'); // Texto aclaratorio situado en el pie del contenedor
const passwdErrorMsg = document.getElementById('passwdErrorMsg'); // Elemento de texto para mostrar error si las contraseñas no coinciden
const userInput = document.getElementById('userInput'); // Campo de texto para la credencial principal (email o nombre de usuario)
const passwdInput = document.getElementById('passwdInput'); // Campo de texto de tipo password para la contraseña principal
const loginErrorMsg = document.getElementById('loginErrorMsg'); // Elemento de texto para mostrar errores de credenciales devueltos por el servidor

// Campos específicos que se ocultan o muestran dinámicamente según la vista activa
const emailInput = document.getElementById('emailInput'); // Campo de texto específico para ingresar el email en el registro
const emailLabel = document.getElementById('registroEmail'); // Etiqueta (Label) asociada al campo de email
const confirmInput = document.getElementById('passwdConfirmationInput'); // Campo de texto para confirmar la contraseña
const confirmLabel = document.getElementById('registroPasswd'); // Etiqueta (Label) asociada a la confirmación de la contraseña
const nomInput = document.getElementById('userInput'); // Reutilización de la referencia userInput para capturar el nombre completo

// ==========================================
// ESTADO INICIAL Y CONFIGURACIÓN DE LA VISTA
// ==========================================
let isLogin = true; // Variable booleana que controla el estado actual del flujo (true: Login, false: Registro)
renderLoginView(); // Ejecución inicial para asegurar que la interfaz cargue por defecto en modo de inicio de sesión

// Escuchador de eventos para alternar entre el formulario de Login y el de Registro
toggleAuth.addEventListener("click", (e) => {
    e.preventDefault(); // Cancela el comportamiento nativo del enlace o botón para evitar la recarga de página
    isLogin = !isLogin; // Invierte el valor del estado lógico actual

    if (isLogin) {
        renderLoginView(); // Si es verdadero cambia los textos y campos al formato de Login
    } else {
        renderRegisterView(); // Si es falso cambia los textos y campos al formato de Registro
    }
});

// ==========================================
// FUNCIONES DE CONTROL DE INTERFAZ (UI)
// ==========================================

// Modifica la visibilidad y los atributos de validación de los campos que cambian entre pantallas
function toggleVisibility(isLogin) {
    // Si está en modo login oculta los campos usando "none", si está en registro los muestra con "block"
    const displayStyle = isLogin ? "none" : "block";

    // 1. Gestión del campo de email extra
    emailInput.style.display = displayStyle;
    emailLabel.style.display = displayStyle;
    emailInput.required = !isLogin; // Agrega el atributo HTML 'required' solo si no se está iniciando sesión

    // 2. Gestión del campo de confirmación de contraseña
    confirmInput.style.display = displayStyle;
    confirmLabel.style.display = displayStyle;
    confirmInput.required = !isLogin; // Obligatorio únicamente en el proceso de registro

    // 3. Limpieza de alertas visuales
    passwdErrorMsg.style.display = "none"; // Oculta el mensaje de contraseñas no coincidentes
    loginErrorMsg.style.display = "none"; // Oculta el mensaje de credenciales erróneas
}

// Configura las etiquetas de texto de los elementos para el flujo de inicio de sesión
function renderLoginView() {
    authTitle.innerText = "Inicia sesión";
    submitBtn.innerText = "Continuar";
    footerText.innerText = "¿Aún no tienes una cuenta?";
    toggleAuth.innerText = "¡Regístrate!";
    document.getElementById('loginName').innerText = "Email"; // Modifica la etiqueta para indicar la entrada de correo
    toggleVisibility(true); // Envía verdadero para aplicar los estilos de ocultación correspondientes
}

// Configura las etiquetas de texto de los elementos para el flujo de creación de cuentas
function renderRegisterView() {
    authTitle.innerText = "Crea tu cuenta en Loopware";
    submitBtn.innerText = "Registrarse";
    footerText.innerText = "¿Ya tienes cuenta?";
    toggleAuth.innerText = "Inicia sesión";
    document.getElementById('loginName').innerText = "Nombre completo"; // Modifica la etiqueta para indicar entrada de nombre completo
    toggleVisibility(false); // Envía falso para visibilizar los campos adicionales de registro
}

// ==========================================
// MANEJO DEL ENVÍO DEL FORMULARIO
// ==========================================

// Escuchador de eventos asociado al botón de envío de datos del formulario
submitBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Previene el envío por defecto del formulario que recargaría la página web
    
    if (isLogin) {
        // Ejecuta el flujo síncrono simulado de login enviando las credenciales introducidas
        let loginOption = await checkLogin(userInput.value, passwdInput.value);
        if (loginOption) {
            window.location.href = '../index.html'; // Redirecciona a la página principal del sitio si las credenciales son correctas
        } else {
            loginErrorMsg.style.display = "block"; // Visibiliza la advertencia de error si el servidor deniega la entrada
        }
    } else {
        // Flujo de Registro: Verifica del lado del cliente que ambas contraseñas escritas sean idénticas
        if (passwdInput.value !== confirmInput.value) {
            passwdErrorMsg.style.display = "block"; // Muestra la advertencia específica de discrepancia de contraseñas
            return; // Interrumpe la ejecución de la función de forma inmediata sin enviar datos al servidor
        }
        passwdErrorMsg.style.display = "none"; // Asegura ocultar el mensaje si el criterio se cumple
        
        // Petición HTTP asíncrona para registrar el nuevo perfil en la base de datos
        let registerOption = await createUser(userInput.value, emailInput.value, passwdInput.value);
        if (registerOption) {
            isLogin = true; // Restablece el estado lógico de control a modo inicio de sesión
            renderLoginView(); // Redibuja la interfaz visual al modo de login tras el registro exitoso
            // Limpia por completo el contenido residual de todos los cuadros de texto de la pantalla
            userInput.value = '';
            passwdInput.value = '';
            emailInput.value = '';
            confirmInput.value = '';
        } else {
            loginErrorMsg.style.display = "block"; // Muestra el mensaje general de fallo si la API deniega el registro
        }
    }
});

// ==========================================
// COMUNICACIÓN CON LA API (PETICIONES HTTP)
// ==========================================

// Envía las credenciales mediante AJAX/Fetch al backend para autenticar al usuario
async function checkLogin(email, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST', // Método de envío de información segura de alta
            headers: { 'Content-Type': 'application/json' }, // Define que el cuerpo viaja estructurado en JSON estándar
            body: JSON.stringify({ email, contrasenya: password }) // Serializa las variables locales a formato string JSON
        });
        
        const data = await response.json(); // Parsea la respuesta del servidor convirtiéndola de JSON a objeto de JavaScript
        
        // Valida que el estado HTTP devuelto sea exitoso (rango 200-299) y que el backend confirme la operación
        if (response.ok && data.success) {
            // Almacena de forma persistente en el navegador web el token y la información del usuario en strings
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            console.log("Bienvenido " + data.usuario.nom);
            return true; // Retorna confirmación positiva para permitir la redirección de página
        } else {
            console.log("Error al iniciar sesión: " + (data.error || 'desconocido'));
            return false; // Retorna falso para detener la navegación e indicar fallo visual
        }
    } catch (err) {
        console.error("Error de conexión: " + err.message); // Captura fallos de red críticos o falta de servidor
        return false;
    }
}

// Envía los datos capturados para dar de alta una nueva cuenta en la base de datos
async function createUser(nom, email, password) {
    try {
        const response = await fetch('/registre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, contrasenya: password }) // Serializa los tres parámetros obligatorios
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log("Usuario creado correctamente");
            return true; // Confirma el registro exitoso para proceder con el cambio de interfaz
        } else {
            console.log("Error al crear usuario: " + (data.error || 'desconocido'));
            return false; // Notifica un fallo en el registro (ej. email ya en uso o datos inválidos)
        }
    } catch (err) {
        console.error("Error de conexión: " + err.message);
        return false;
    }
}