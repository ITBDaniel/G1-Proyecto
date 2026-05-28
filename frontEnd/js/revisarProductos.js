import { fetchAutenticado, getValidImageSrc } from './utils.js';

import { initBusqueda } from './busquedaProductos.js';

import { verificarAutenticacion, getUsuario } from './utils.js';

verificarAutenticacion();



const revisionList = document.getElementById('revision-list');
const reviewEmpty = document.getElementById('review-empty');

async function obtenerPendientes() {



    const usuario = getUsuario();

    if (!usuario?.admin) {

        window.location.href = '/index.html';
        return;
    }

    const response = await fetchAutenticado('/productes/revisio');
    if (!response) {
        reviewEmpty.innerHTML = '<p style="color: red;">✗ Error al conectar con el servidor.</p>';
        return;
    }

    if (!response.ok) {
        reviewEmpty.innerHTML = '<p style="color: red;">✗ No se han podido cargar los productos pendientes.</p>';
        return;
    }

    const productos = await response.json();
    if (!productos.length) {
        reviewEmpty.innerHTML = '<p style="color: green;">✓ No hay productos pendientes de aprobación. ¡Buen trabajo!</p>';
        return;
    }

    productos.forEach(producto => crearTarjeta(producto));
}

function crearTarjeta(producto) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const imageSrc = getValidImageSrc(producto.imatge);
    card.innerHTML = `
        <img src="${imageSrc}" alt="${producto.component}" onerror="this.src='${getValidImageSrc(null)}'">
        <div class="product-card-body">
            <h3>${producto.component}</h3>
            <p class="category">${producto.categoria}</p>
            <p>${producto.descripcio}</p>
            <p><strong>Usuario:</strong> ${producto.usuari}</p>
            <p><strong>Creado:</strong> ${new Date(producto.created_at).toLocaleDateString('es-ES')}</p>
            <p><strong>Estado:</strong> <span class="badge pending">Pendiente de aprobación</span></p>
        </div>
        <div class="product-actions">
            <button class="btn btn-approve" data-id="${producto.id}">Aprobar</button>
            <button class="btn btn-reject" data-id="${producto.id}">Rechazar</button>
        </div>
    `;

    revisionList.appendChild(card);

    const approveButton = card.querySelector('.btn-approve');
    const rejectButton = card.querySelector('.btn-reject');

    approveButton.addEventListener('click', () => revisarProducto(producto.id, 'Aprovat', card));
    rejectButton.addEventListener('click', () => revisarProducto(producto.id, 'Rebutjat', card));
}

async function revisarProducto(id, estado, cardElement) {
    const estadoLabel = estado === 'Aprovat' ? 'Aprobado' : 'Rechazado';
    
    if (!confirm(`¿Estás seguro de que quieres marcar este producto como ${estadoLabel}?`)) {
        return;
    }

    try {
        const response = await fetchAutenticado(`/productes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ estat: estado })
        });

        if (!response) {
            alert('Error al conectar con el servidor');
            return;
        }

        if (response.ok) {
            // Animar la eliminación de la tarjeta
            cardElement.style.opacity = '0.5';
            cardElement.style.textDecoration = 'line-through';
            setTimeout(() => {
                cardElement.remove();
                
                // Si no hay más productos, mostrar mensaje
                if (revisionList.children.length === 0) {
                    revisionList.innerHTML = '';
                    reviewEmpty.innerHTML = '<p style="color: green;">✓ No hay más productos pendientes. ¡Excelente!</p>';
                }
            }, 500);
        } else {
            const data = await response.json();
            alert('No se pudo actualizar el producto: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al revisar producto:', error);
        alert('Error de red al revisar el producto');
    }
}

obtenerPendientes().then(() => {
    // Búsqueda local en cards (revisión)
    initBusqueda({
        listEl: revisionList,
        inputMountParent: revisionList.parentElement,
        placeholder: 'Buscar en revisión…'
    });
});
