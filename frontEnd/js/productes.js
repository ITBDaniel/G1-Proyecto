import { getValidImageSrc } from './utils.js';
import { initBusqueda } from './busquedaProductos.js';

export const gridProductos = document.getElementById('gridProductos');


// Mostrar productos públicos (no requiere autenticación)
async function mostrarProductes(){
    try{
        const response = await fetch(`${window.location.origin}/productes`);
        if (!response) {
            mostrarError('Error al conectar con el servidor');
            return;
        }
        
        if (!response.ok) {
            mostrarError('Error al cargar los productos');
            return;
        }
        
        const data = await response.json();

        if (data && Array.isArray(data)) {
            if (data.length === 0) {
                mostrarMensaje('No hay productos disponibles aún. ¡Sé el primero en añadir uno!');
            } else {
                data.forEach(producto => afegirProducte(producto));
            }
        } else {
            mostrarError('Error al procesar los productos');
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarError('Error al cargar los productos');
    }
}

function mostrarError(mensaje) {
    const errorMsg = document.createElement('p');
    errorMsg.classList.add('errorMsg');
    errorMsg.style.color = 'red';
    errorMsg.textContent = '✗ ' + mensaje;
    gridProductos.appendChild(errorMsg);
}

function mostrarMensaje(mensaje) {
    const infoMsg = document.createElement('p');
    infoMsg.classList.add('infoMsg');
    infoMsg.style.color = '#666';
    infoMsg.style.fontSize = '16px';
    infoMsg.textContent = mensaje;
    gridProductos.appendChild(infoMsg);
}

export function afegirProducte(producto){
    const badgeClass = producto.estat === 'Aprovat'
        ? 'badge approved'
        : producto.estat === 'Rebutjat'
            ? 'badge rejected'
            : 'badge pending';

    const contenedorProducto = document.createElement('article');
    contenedorProducto.className = 'product-card';

    const img = document.createElement('img');
    img.src = getValidImageSrc(producto.imatge);
    img.alt = producto.component ? `Imagen de ${producto.component}` : 'Sin imagen';
    img.onerror = () => {
        img.onerror = null;
        img.src = getValidImageSrc(null);
    };

    contenedorProducto.innerHTML = `
        <div class="product-card-body">
            <h3>${producto.component}</h3>
            <p class="product-price"><strong>Precio: ${producto.precio ?? '—'} €</strong></p>
            <p><strong>Estado:</strong> <span class="${badgeClass}">${producto.estat}</span></p>
        </div>
        <div class="product-actions">
            <button class="btn btn-primary" type="button">Ver detalles</button>
        </div>
    `;
    contenedorProducto.insertBefore(img, contenedorProducto.firstChild);
    gridProductos.appendChild(contenedorProducto);

    contenedorProducto.addEventListener("click", (e) => {
        const target = e.target;
        const button = target?.closest?.('button');
        if (!button) return;

        window.location.href = `pages/producteSeleccionat.html?id=${producto.id}`;
    });
}

mostrarProductes().then(() => {
    // Búsqueda local en cards (inicio / portal)
    initBusqueda({
        listEl: gridProductos,
        inputMountParent: gridProductos.parentElement,
        placeholder: 'Buscar en productos…'
    });
});





