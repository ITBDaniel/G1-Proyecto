import { fetchAutenticado, verificarAutenticacion, getUsuario, getValidImageSrc } from './utils.js';
import { initBusqueda } from './busquedaProductos.js';

console.log('[misProductos] init');
verificarAutenticacion();

const listEl = document.getElementById('mis-productos-list');
const emptyEl = document.getElementById('mis-empty');

function badgeFor(estado) {
    if (estado === 'Aprovat') return 'badge approved';
    if (estado === 'Rebutjat') return 'badge rejected';
    return 'badge pending'; // Pendent
}

function crearCard(producto) {
    const article = document.createElement('article');
    article.className = 'product-card';
    const estadoLabel = getEstatLabel(producto.estat);

    const img = document.createElement('img');
    img.src = getValidImageSrc(producto.imatge);
    img.alt = producto.component ? `Imagen de ${producto.component}` : 'Sin imagen';
    img.onerror = () => {
        img.onerror = null;
        img.src = getValidImageSrc(null);
    };

    article.innerHTML = `
        <div class="product-card-body">
            <h3>${producto.component}</h3>
            <p class="product-price"><strong>Precio: ${producto.precio ?? '—'} €</strong></p>
            <p><strong>Estado:</strong> <span class="${badgeFor(producto.estat)}">${getEstatLabel(producto.estat)}</span></p>
        </div>
        <div class="product-actions">
            <button class="btn btn-primary" type="button" data-id="${producto.id}">Ver / Editar</button>
        </div>
    `;

    article.insertBefore(img, article.firstChild);

    const btn = article.querySelector('button[data-id]');
    btn.addEventListener('click', () => {
        window.location.href = `producteSeleccionat.html?id=${producto.id}`;
    });

    return article;
}

function getEstatLabel(estado) {
    const labels = {
        'Pendent': 'Pendiente de aprobación',
        'Aprovat': 'Aprobado',
        'Rebutjat': 'Rechazado'
    };
    return labels[estado] || estado;
}

async function cargarMisProductos() {
    emptyEl.textContent = '';
    listEl.innerHTML = '';

    // Si no hay token, mostramos mensaje (sin redirección) y guía para logearse
    if (!localStorage.getItem('token')) {
        emptyEl.innerHTML = 'Inicia sesión para ver tus productos. <a href="/pages/login.html" class="link">Login</a>';
        return;
    }

    const esAdmin = getUsuario()?.admin;
    const endpoint = esAdmin ? '/productes/admin' : '/productes/mios';

    if (esAdmin) {
        emptyEl.innerHTML = '<p style="color: #333;">Estás viendo todos los productos como administrador. Puedes modificar el estado y el contenido de cada anuncio.</p>';
    }

    const response = await fetchAutenticado(endpoint);

    if (!response) return;

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        emptyEl.innerHTML = `<p style="color: red;">✗ ${data?.error || 'No se han podido cargar tus productos.'}</p>`;
        return;
    }

    const productos = await response.json();

    if (!Array.isArray(productos) || productos.length === 0) {
        if (esAdmin) {
            emptyEl.innerHTML = '<p style="color: #666;">No hay productos registrados en el sistema.</p>';
        } else {
            emptyEl.innerHTML = '<p style="color: #666;">Todavía no has añadido productos. <a href="afegirProducte.html">Crea uno ahora</a></p>';
        }
        return;
    }

    // Mostrar TODO lo creado por el usuario, independientemente del estado
    // Ordenar por estado primero (Aprovat, Pendent, Rebutjat) luego por ID
    const productosOrdenados = productos.sort((a, b) => {
        const ordenEstado = { 'Aprovat': 0, 'Pendent': 1, 'Rebutjat': 2 };
        return (ordenEstado[a.estat] || 3) - (ordenEstado[b.estat] || 3);
    });
    
    productosOrdenados.forEach(p => listEl.appendChild(crearCard(p)));
}

cargarMisProductos().then(() => {
    // Búsqueda local en cards
    initBusqueda({
        listEl,
        inputMountParent: listEl.parentElement,
        placeholder: 'Buscar en mis productos…'
    });
});
