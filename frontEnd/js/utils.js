
const currentOrigin = window?.location?.origin;
const API_URL = currentOrigin && currentOrigin !== 'null' ? currentOrigin : 'http://localhost:3000';
console.log('[utils] API_URL=', API_URL);

const IMAGE_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7a7a7a" font-size="18">Sin imagen</text></svg>`
);

export function getValidImageSrc(value) {
    if (!value || typeof value !== 'string') return IMAGE_PLACEHOLDER;
    const trimmed = value.trim();
    const sanitized = trimmed.replace(/\s+/g, '');

    const dataImagePattern = /^data:image\/[a-zA-Z+]+;base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (dataImagePattern.test(sanitized)) return sanitized;
    if (/^https?:\/\//.test(sanitized)) return sanitized;
    if (/^(?:\.\/|\.\.\/|\/)[^\s]+$/.test(sanitized)) return sanitized;
    return IMAGE_PLACEHOLDER;
}

/**
 * Obtiene el token JWT del localStorage
 */
export function getToken() {
    return localStorage.getItem('token');
}

/**
 * Obtiene los datos del usuario del localStorage
 */
export function getUsuario() {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
}

/**
 * Verifica si el usuario está autenticado
 */
export function isAutenticado() {
    return !!getToken();
}

export function isAdmin() {
    const usuario = getUsuario();
    return !!usuario?.admin;
}

/**
 * Realiza una petición GET autenticada
 */
export async function fetchAutenticado(endpoint, opciones = {}) {
    const token = getToken();

    console.log('[utils] token=', token);
    if (!token) {
        console.warn('No hay token disponible');
        window.location.href = '/pages/login.html';
        return null;
    }
    
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...opciones.headers
    };
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...opciones,
            headers
        });
        
        console.log('[utils] fetchAutenticado', `${API_URL}${endpoint}`, 'status=', response.status);
        console.log('[utils] token-used=', getToken());
        if (response.status >= 400) {
            const txt = await response.text().catch(() => '');
            console.log('[utils] error-body', txt);
        }


        if (response.status === 401) {


            // Token inválido o expirado
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            // En vez de forzar login, volvemos a la home
            window.location.href = '/index.html';
            return null;
        }

        
        return response;
    } catch (err) {
        console.error('Error en petición:', err);
        return null;
    }
}

/**
 * Cierra sesión (logout)
 */
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/index.html';
}


/**
 * Verifica autenticación y redirige si es necesario
 */
export function verificarAutenticacion() {
    if (!isAutenticado()) {
        // si no hay sesión, volvemos a la home
        window.location.href = '/index.html';
    }
}

