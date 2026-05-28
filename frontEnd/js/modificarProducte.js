// ==========================================
// CONTROL DE ACCESO Y CONFIGURACIÓN INICIAL
// ==========================================
import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js';

// Guardia de ruta: bloquea el acceso de inmediato si el visitante no ha iniciado sesión
verificarAutenticacion();

// --- REFERENCIAS A ELEMENTOS DEL FORMULARIO (DOM) ---
const inputComponent = document.getElementById('component');
const inputCategoria = document.getElementById('categoria');
const estatLabel = document.getElementById('estatLabel');
const inputEstat = document.getElementById('estat');
const inputDescripcio = document.getElementById('descripcio');
const inputImatge = document.getElementById('imatge');
const inputPrecio = document.getElementById('precio');
const authForm = document.getElementById('authForm');
const sectionErrors = document.getElementById('errorModificarProducte');

// --- VARIABLES DE ESTADO GLOBAL ---
const usuario = getUsuario(); // Datos del usuario en sesión
const esAdmin = usuario?.admin; // Atributo booleano de rol
let productoActual = null; // Almacenará la copia original del producto descargado de la API

// Restricción visual de interfaz: si el usuario no es administrador, oculta la etiqueta y el selector del estado del anuncio
if (!esAdmin) {
    if (estatLabel) estatLabel.style.display = 'none';
    if (inputEstat) inputEstat.style.display = 'none';
}

/**
 * Extrae el identificador único del producto (?id=...) desde los parámetros de la URL actual
 */
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// ==========================================
// PETICIONES REDIRECTAS DE MODIFICACIÓN (API)
// ==========================================

/**
 * Ejecuta el borrado físico del recurso en el backend mediante el método DELETE.
 * Devuelve un booleano indicando el éxito de la operación.
 */
export async function eliminarProductes(id) {
    if (!id) return false;

    try {
        const response = await fetchAutenticado('/productes/' + id, {
            method: 'DELETE'
        });

        if (!response) return false;
        
        if (response.ok) {
            alert('Producto eliminado correctamente');
            return true;
        }

        const data = await response.json();
        alert('Error al eliminar: ' + (data.error || 'desconocido'));
        return false;
    } catch (error) {
        console.log(error);
        alert('Error de red al eliminar producto');
        return false;
    }
}

/**
 * Recopila los datos del formulario, los valida y los envía al servidor mediante una petición PUT.
 */
export async function modificarProductes(id) {
    // Control preventivo en caso de error en el ciclo de carga inicial
    if (!id || !productoActual) {
        mostrarError('Error al cargar el producto');
        return;
    }

    // --- VALIDACIÓN DE CAMPOS ---
    // Verifica de forma estricta que no se envíen cadenas vacías ni espacios en blanco recurrentes
    if (!inputComponent.value.trim() || !inputCategoria.value.trim() || 
        !inputDescripcio.value.trim() || !inputImatge.value.trim() || !inputPrecio.value.toString().trim()) {
        mostrarError('Todos los campos son obligatorios');
        return;
    }

    // Construcción del objeto de transferencia de datos (Payload JSON)
    const datos = {
        component: inputComponent.value.trim(),
        categoria: inputCategoria.value.trim(),
        descripcio: inputDescripcio.value.trim(),
        imatge: inputImatge.value.trim(),
        precio: inputPrecio.value.toString().trim(),
        // Si no es administrador, preserva el estado actual del producto para evitar alteraciones no autorizadas
        estat: esAdmin ? inputEstat.value : productoActual.estat
    };

    try {
        const response = await fetchAutenticado('/productes/' + id, {
            method: 'PUT',
            body: JSON.stringify(datos) // Serializa los datos a string JSON
        });

        if (!response) {
            mostrarError('Error al conectar con el servidor');
            return;
        }

        if (response.ok) {
            const data = await response.json();
            mostrarExito('Producto modificado correctamente. Redirigiendo...');
            
            // Temporizador para simular una transición suave antes de regresar al panel del usuario
            setTimeout(() => {
                window.location.href = '../pages/misProductos.html';
            }, 1500);
        } else {
            const data = await response.json();
            mostrarError(data.error || 'Error desconocido al modificar');
        }
    } catch (error) {
        console.error('Error al modificar producto:', error);
        mostrarError('Error de red al modificar producto');
    }
}

// ==========================================
// COMPONENTES AUXILIARES DE RENDERIZADO (UI)
// ==========================================

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

// --- MANEJADOR DEL EVENTO SUBMIT DEL FORMULARIO ---
if (authForm) {
    authForm.addEventListener('submit', e => {
        e.preventDefault(); // Detiene el comportamiento de recarga por defecto del formulario nativo
        const id = getProductIdFromUrl();
        modificarProductes(id); // Ejecuta el proceso asíncrono de actualización
    });
}

// ==========================================
// FLUJO DE HIDRATACIÓN DEL FORMULARIO
// ==========================================

/**
 * Descarga los datos actuales del producto desde la API e hidrata los inputs correspondientes.
 * Valida de forma estricta que el usuario logueado sea el propietario legítimo o administrador.
 */
async function cargarProductoEnFormulario() {
    const id = getProductIdFromUrl();
    
    // Si no hay un ID válido en la URL, avisa y expulsa al usuario del módulo
    if (!id) {
        mostrarError('No se ha seleccionado un producto');
        setTimeout(() => {
            window.location.href = '../pages/misProductos.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetchAutenticado('/productes/' + id);
        if (!response) {
            mostrarError('Error: No autorizado');
            return;
        }

        // Manejo de códigos de estado HTTP fallidos
        if (!response.ok) {
            if (response.status === 403) {
                mostrarError('No tienes permisos para editar este producto');
            } else {
                mostrarError('Producto no encontrado');
            }
            setTimeout(() => {
                window.location.href = '../pages/misProductos.html';
            }, 2000);
            return;
        }

        const producto = await response.json(); // Parsea los datos del producto

        // --- VALIDACIÓN DE AUTORÍA Y PRIVILEGIOS ---
        const esPropietario = producto.user_id === usuario.id || producto.usuari === usuario.nom;
        
        // Si el usuario no es el dueño ni cuenta con privilegios de administrador, se le deniega el acceso
        if (!esAdmin && !esPropietario) {
            mostrarError('No tienes permisos para editar este producto');
            setTimeout(() => {
                window.location.href = '../pages/misProductos.html';
            }, 2000);
            return;
        }

        // --- HIDRATACIÓN DEL FORMULARIO ---
        productoActual = producto; // Almacena los datos originales como punto de referencia
        inputComponent.value = producto.component;
        inputCategoria.value = producto.categoria;
        inputEstat.value = producto.estat;
        inputDescripcio.value = producto.descripcio;
        inputImatge.value = producto.imatge;
        if (inputPrecio) inputPrecio.value = producto.precio ?? '';
        
    } catch (error) {
        console.error('Error al cargar producto:', error);
        mostrarError('Error al cargar los datos del producto');
    }
}

// Vincula la inicialización del formulario al ciclo de vida DOMContentLoaded
document.addEventListener('DOMContentLoaded', cargarProductoEnFormulario);