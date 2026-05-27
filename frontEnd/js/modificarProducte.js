import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js';

// Solo permitimos modificar si el usuario está autenticado
verificarAutenticacion();

const inputComponent = document.getElementById('component');
const inputCategoria = document.getElementById('categoria');
const estatLabel = document.getElementById('estatLabel');
const inputEstat = document.getElementById('estat');
const inputDescripcio = document.getElementById('descripcio');
const inputImatge = document.getElementById('imatge');
const inputPrecio = document.getElementById('precio');
const authForm = document.getElementById('authForm');
const sectionErrors = document.getElementById('errorModificarProducte');

const usuario = getUsuario();
const esAdmin = usuario?.admin;
let productoActual = null;

if (!esAdmin) {
    if (estatLabel) estatLabel.style.display = 'none';
    if (inputEstat) inputEstat.style.display = 'none';
}

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

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

export async function modificarProductes(id) {
    if (!id || !productoActual) {
        mostrarError('Error al cargar el producto');
        return;
    }

    // Validar campos vacíos
    if (!inputComponent.value.trim() || !inputCategoria.value.trim() || 
        !inputDescripcio.value.trim() || !inputImatge.value.trim() || !inputPrecio.value.toString().trim()) {
        mostrarError('Todos los campos son obligatorios');
        return;
    }

    const datos = {
        component: inputComponent.value.trim(),
        categoria: inputCategoria.value.trim(),
        descripcio: inputDescripcio.value.trim(),
        imatge: inputImatge.value.trim(),
        precio: inputPrecio.value.toString().trim(),
        estat: esAdmin ? inputEstat.value : productoActual.estat
    };

    try {
        const response = await fetchAutenticado('/productes/' + id, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });

        if (!response) {
            mostrarError('Error al conectar con el servidor');
            return;
        }

        if (response.ok) {
            const data = await response.json();
            mostrarExito('Producto modificado correctamente. Redirigiendo...');
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

if (authForm) {
    authForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = getProductIdFromUrl();
        modificarProductes(id);
    });
}

async function cargarProductoEnFormulario() {
    const id = getProductIdFromUrl();
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

        const producto = await response.json();

        const esPropietario = producto.user_id === usuario.id || producto.usuari === usuario.nom;
        if (!esAdmin && !esPropietario) {
            mostrarError('No tienes permisos para editar este producto');
            setTimeout(() => {
                window.location.href = '../pages/misProductos.html';
            }, 2000);
            return;
        }

        productoActual = producto;
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

document.addEventListener('DOMContentLoaded', cargarProductoEnFormulario);
