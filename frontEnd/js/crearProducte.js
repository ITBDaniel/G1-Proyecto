import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js';

verificarAutenticacion();

const inputComponent = document.getElementById('component');
const inputCategoria = document.getElementById('categoria');
const inputDescripcio = document.getElementById('descripcio');
const inputImatge = document.getElementById('imatge');
const inputPrecio = document.getElementById('precio');
const authForm = document.getElementById('authForm');
const sectionErrors = document.getElementById('errorCrearProducte');

authForm.addEventListener('submit', e => {
    e.preventDefault();

    const producte = {
        component: inputComponent.value.trim(),
        categoria: inputCategoria.value.trim(),
        descripcio: inputDescripcio.value.trim(),
        imatge: inputImatge.value.trim(),
        precio: inputPrecio.value.toString().trim(),
        // El estado 'Pendent' se asigna en el servidor
    };

    crearProductes(producte);
});

async function crearProductes(producte) {
    if (!producte) return;

    // Limpiar errores previos
    sectionErrors.innerHTML = '';

    try {
        const usuario = getUsuario();
        if (!usuario || !usuario.nom) {
            throw new Error('Error al obtener datos del usuario');
        }

        producte.usuari = usuario.nom;

        const response = await fetchAutenticado('/crearProducte', {
            method: 'POST',
            body: JSON.stringify(producte)
        });

        if (!response) return;

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error desconocido al crear el producto');
        }

        // Mostrar mensaje de éxito
        sectionErrors.innerHTML = `<p style="color: green; font-weight: bold;">✓ ¡Producto creado con éxito! El administrador revisará tu producto pronto.</p>`;
        
        // Limpiar formulario
        authForm.reset();
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);

        return data;
    } catch (error) {
        console.error('Error al crear producto:', error);
        if (sectionErrors) {
            sectionErrors.innerHTML = `<p class="errorMsg" style="color: red;">✗ ${error.message}</p>`;
        }
    }
}
