// ==========================================
// IMPORTACIONES Y CONFIGURACIÓN
// ==========================================
import { getValidImageSrc } from './utils.js'; // Importa la utilidad para validar URLs de imágenes y asignar placeholders
import { initBusqueda } from './busquedaProductos.js'; // Importa el componente encargado de inyectar el filtrado reactivo en tiempo real

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
export const gridProductos = document.getElementById('gridProductos'); // Contenedor (div/section) estilo rejilla donde se listará el catálogo público

// ==========================================
// CONSUMO DE API Y LOGICA DE CARGA (GET)
// ==========================================

// Consulta el endpoint público de la API para obtener el listado de componentes electrónicos/productos aprobados
async function mostrarProductes(){
    try {
        // Realiza una petición GET clásica usando el origen dinámico de la ventana web actual
        const response = await fetch(`${window.location.origin}/productes`);
        
        // Control preventivo: rompe la ejecución si el objeto de respuesta no se genera
        if (!response) {
            mostrarError('Error al conectar con el servidor');
            return;
        }
        
        // Manejo de errores de estados HTTP (fuera del rango exitoso 200-299)
        if (!response.ok) {
            mostrarError('Error al cargar los productos');
            return;
        }
        
        const data = await response.json(); // Parsea la matriz de productos de JSON a estructura nativa de JavaScript

        // Valida que los datos recibidos existan y correspondan efectivamente a una lista (Array)
        if (data && Array.isArray(data)) {
            if (data.length === 0) {
                // Si la base de datos no tiene registros, renderiza un placeholder informativo en pantalla
                mostrarMensaje('No hay productos disponibles aún. ¡Sé el primero en añadir uno!');
            } else {
                // Itera sobre el set de datos y delega la construcción física de cada tarjeta
                data.forEach(producto => afegirProducte(producto));
            }
        } else {
            mostrarError('Error al procesar los productos');
        }
    } catch (error) {
        console.error('Error al cargar productos:', error); // Reporta el trazo del error en la consola para depuración técnica
        mostrarError('Error al cargar los productos'); // Avisa de forma amigable al usuario en la interfaz
    }
}

// ==========================================
// COMPONENTES AUXILIARES DE RENDERIZADO (UI)
// ==========================================

// Crea e inyecta dinámicamente una alerta de error formateada en color rojo en la cuadrícula principal
function mostrarError(mensaje) {
    const errorMsg = document.createElement('p');
    errorMsg.classList.add('errorMsg');
    errorMsg.style.color = 'red';
    errorMsg.textContent = '✗ ' + mensaje;
    gridProductos.appendChild(errorMsg);
}

// Crea e inyecta un texto informativo/neutral (placeholder) cuando el catálogo carece de registros
function mostrarMensaje(mensaje) {
    const infoMsg = document.createElement('p');
    infoMsg.classList.add('infoMsg');
    infoMsg.style.color = '#666';
    infoMsg.style.fontSize = '16px';
    infoMsg.textContent = mensaje;
    gridProductos.appendChild(infoMsg);
}

// Construye de forma programática cada tarjeta de producto (article) e intercepta sus acciones de navegación
export function afegirProducte(producto){
    // Evaluación condicional anidada (operador ternario) para determinar las clases CSS del estado del anuncio
    const badgeClass = producto.estat === 'Aprovat'
        ? 'badge approved' // Verde
        : producto.estat === 'Rebutjat'
            ? 'badge rejected' // Rojo
            : 'badge pending'; // Amarillo/Naranja (Pendent)

    // Instancia el nodo contenedor semántico para la tarjeta del producto
    const contenedorProducto = document.createElement('article');
    contenedorProducto.className = 'product-card';

    // Construcción y blindaje del nodo de la imagen del artículo
    const img = document.createElement('img');
    img.src = getValidImageSrc(producto.imatge); // Descarga la URL provista o asigna un recurso por defecto
    img.alt = producto.component ? `Imagen de ${producto.component}` : 'Sin imagen';
    
    // Fallback asíncrono para URLs rotas: si la imagen de origen da error 404, se sobreescribe con un marcador genérico
    img.onerror = () => {
        img.onerror = null; // Cortocircuita el evento para impedir bucles infinitos de recarga
        img.src = getValidImageSrc(null); // Fuerza la asignación del placeholder local del sistema
    };

    // Estructura y maqueta el interior de la tarjeta insertando las propiedades del objeto mediante template literals
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
    
    // Inserta de forma explícita la etiqueta <img> al principio de la estructura del <article>
    contenedorProducto.insertBefore(img, contenedorProducto.firstChild);
    // Agrega la tarjeta completamente ensamblada al contenedor general en el DOM
    gridProductos.appendChild(contenedorProducto);

    // --- GESTIÓN DE EVENTOS DE NAVEGACIÓN (DELEGACIÓN INTERNA) ---
    // Agrega un escuchador de clics a la tarjeta, pero restringe la navegación únicamente si el usuario pulsa el botón
    contenedorProducto.addEventListener("click", (e) => {
        const target = e.target;
        // Comprueba si el elemento clicado es el botón o se encuentra contenido dentro de uno (seguridad estructural)
        const button = target?.closest?.('button');
        if (!button) return; // Si el clic se realizó fuera del botón "Ver detalles", ignora la acción

        // Redirige a la vista de detalle del producto pasando su identificador único (ID) por la URL
        window.location.href = `pages/producteSeleccionat.html?id=${producto.id}`;
    });
}

// ==========================================
// INICIALIZACIÓN DE COMPONENTES SECUNDARIOS
// ==========================================

// Ejecuta en primera instancia la llamada asíncrona de renderizado y monta el buscador reactivo al finalizar la promesa
mostrarProductes().then(() => {
    // Vincula el sistema de filtrado conectando el cuadro de búsqueda con las propiedades internas de las tarjetas creadas
    initBusqueda({
        listEl: gridProductos, // Elemento raíz que contiene la lista de artículos hijos a filtrar
        inputMountParent: gridProductos.parentElement, // Elemento del DOM donde se inyectará físicamente el nodo del input
        placeholder: 'Buscar en productos…' // Texto de guía que se mostrará dentro del cuadro de búsqueda
    });
});