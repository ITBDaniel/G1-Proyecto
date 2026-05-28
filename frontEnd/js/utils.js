// ==========================================
// CONFIGURACIÓN DE URL BASE Y CONSTANTES
// ==========================================
const currentOrigin = window?.location?.origin; // Captura el dominio raíz actual desde el que se sirve la aplicación
// Si el origen existe y es válido, lo usa como base; de lo contrario (entorno de pruebas aislado), apunta a localhost:3000
const API_URL = currentOrigin && currentOrigin !== 'null' ? currentOrigin : 'http://localhost:3000';

// Marcador de posición vectorial (SVG en línea de base Base64/URI) usado cuando un producto no tiene imagen asignada
const IMAGE_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7a7a7a" font-size="18">Sin imagen</text></svg>`
);

// ==========================================
// VALIDACIÓN Y SANEAMIENTO DE IMÁGENES
// ==========================================

/**
 * Valida la estructura del string recibido para asegurar que sea una ruta de imagen legítima.
 * Soporta Base64, URLs absolutas (http/https) y rutas relativas del sistema.
 */
export function getValidImageSrc(value) {
    if (!value || typeof value !== 'string') return IMAGE_PLACEHOLDER; // Filtro inicial para valores vacíos o tipos incorrectos
    const trimmed = value.trim();
    const sanitized = trimmed.replace(/\s+/g, ''); // Remueve todos los espacios en blanco dentro de la cadena

    // Expresión regular para validar strings con formato de imagen embebida en Base64 (Data URI)
    const dataImagePattern = /^data:image\/[a-zA-Z+]+;base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (dataImagePattern.test(sanitized)) return sanitized;
    
    // Expresión regular para validar hipervínculos web HTTP o HTTPS estándar
    if (/^https?:\/\//.test(sanitized)) return sanitized;
    
    // Expresión regular para validar rutas locales o relativas del proyecto (./ , ../ o /)
    if (/^(?:\.\/|\.\.\/|\/)[^\s]+$/.test(sanitized)) return sanitized;
    
    return IMAGE_PLACEHOLDER; // Retorna el fallback si no superó ninguna de las tres estructuras permitidas
}

// ==========================================
// GESTIÓN DE SESIÓN Y LOCALSTORAGE
// ==========================================

/**
 * Obtiene el token de autenticación JWT almacenado en el navegador.
 */
export function getToken() {
    return localStorage.getItem('token');
}

/**
 * Recupera y deserializa el objeto con el perfil del usuario activo en la sesión.
 */
export function getUsuario() {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null; // Convierte de string JSON a objeto puro de JavaScript
}

/**
 * Evalúa si existe una sesión activa mediante la conversión a booleano de la presencia del token.
 */
export function isAutenticado() {
    return !!getToken(); // El operador de doble negación fuerza el casteo directo a tipo true o false
}

/**
 * Evalúa los privilegios del usuario para determinar si posee el rol de administrador.
 */
export function isAdmin() {
    const usuario = getUsuario();
    return !!usuario?.admin; // Valida de forma segura el campo admin usando encadenamiento opcional
}

// ==========================================
// CLIENTE HTTP DE RED PROTEGIDO (FETCH)
// ==========================================

/**
 * Envoltorio (Wrapper) sobre el fetch nativo que inyecta automáticamente las cabeceras JWT de autorización.
 * Si el token no se encuentra, desvía el flujo del navegador directamente hacia la pantalla de login.
 */
export async function fetchAutenticado(endpoint, opciones = {}) {
    const token = getToken();

    // Bloqueo preventivo local: impide lanzar peticiones al backend si el cliente carece de token
    if (!token) {
        console.warn('No hay token disponible');
        window.location.href = '/pages/login.html'; // Desvío forzado al formulario de acceso
        return null;
    }
    
    // Configuración y fusión de cabeceras HTTP necesarias para el backend
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Formato estándar portador (Bearer Token)
        ...opciones.headers // Permite acoplar cabeceras adicionales personalizadas pasadas por parámetro
    };
    
    try {
        // Despacha la petición de red asíncrona concatenando la URL base global con el endpoint específico
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...opciones,
            headers
        });
        
        // Bloque de depuración técnica: lee el búfer de texto si el código de respuesta es un error del servidor
        if (response.status >= 400) {
            const txt = await response.text().catch(() => ''); // Captura el error en bruto de forma segura sin romper el flujo
        }

        // --- CONTROL EXPLICITO DE EXPIRACIÓN / REVOCACIÓN (HTTP 401) ---
        if (response.status === 401) {
            // El token fue rechazado por el backend por ser inválido, estar corrupto o haber expirado
            localStorage.removeItem('token'); // Limpia las credenciales obsoletas del almacenamiento local
            localStorage.removeItem('usuario');
            
            window.location.href = '/index.html'; // Redirige al portal de inicio para restablecer el estado público
            return null;
        }
        
        return response; // Retorna el flujo del objeto Response para que sea procesado por la función llamadora
    } catch (err) {
        console.error('Error en petición:', err); // Registra caídas del servidor o fallos de conexión por la consola
        return null;
    }
}

// ==========================================
// FLUJOS DE AUTORIZACIÓN Y CIERRE DE SESIÓN
// ==========================================

/**
 * Destruye de forma definitiva los datos de la sesión actual del almacenamiento local y redirige a la home.
 */
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/index.html';
}

/**
 * Guardia de ruta visual (Route Guard) para páginas privadas. Redirige a la Home si el usuario intenta
 * acceder de forma manual mediante la barra de direcciones sin tener una sesión válida iniciada.
 */
export function verificarAutenticacion() {
    if (!isAutenticado()) {
        window.location.href = '/index.html'; // Desvío de seguridad inmediato
    }
}