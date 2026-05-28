// ==========================================
// IMPORTACIONES Y CONTROL DE ACCESO
// ==========================================
import { fetchAutenticado, verificarAutenticacion, getUsuario, getValidImageSrc } from './utils.js'; // Importa utilidades de sesión, peticiones protegidas y fallback de imágenes
import { initBusqueda } from './busquedaProductos.js'; // Importa el módulo para inicializar el componente de búsqueda dinámica

console.log('[misProductos] init'); // Log de depuración para confirmar la carga inicial del script
verificarAutenticacion(); // Comprueba de forma inmediata si existe sesión activa; si no, redirige a la vista de login

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
const listEl = document.getElementById('mis-productos-list'); // Contenedor principal donde se inyectará la cuadrícula de tarjetas de productos
const emptyEl = document.getElementById('mis-empty'); // Elemento de texto para mostrar mensajes informativos, de error o de inventario vacío

// ==========================================
// RENDERIZADO DINÁMICO DE COMPONENTES (UI)
// ==========================================

// Devuelve los nombres de las clases CSS correspondientes para aplicar estilos de etiqueta según el estado de moderación
function badgeFor(estado) {
    if (estado === 'Aprovat') return 'badge approved'; // Verde para aprobados
    if (estado === 'Rebutjat') return 'badge rejected'; // Rojo para rechazados
    return 'badge pending'; // Amarillo/Naranja por defecto para el estado 'Pendent'
}

// Construye de forma programática el nodo de una tarjeta de producto (article) utilizando la API del DOM
function crearCard(producto) {
    const article = document.createElement('article');
    article.className = 'product-card'; // Asigna la clase base para la maquetación de tarjetas
    const estadoLabel = getEstatLabel(producto.estat); // Obtiene la traducción o etiqueta legible del estado

    // Creación y configuración del elemento imagen
    const img = document.createElement('img');
    img.src = getValidImageSrc(producto.imatge); // Valida e inyecta la URL provista o un marcador de posición (placeholder)
    img.alt = producto.component ? `Imagen de ${producto.component}` : 'Sin imagen';
    
    // Controlador de fallos de carga de imagen: si la URL se rompe (error 404/500), ejecuta este fallback asíncrono
    img.onerror = () => {
        img.onerror = null; // Evita bucles infinitos de error si el propio fallback fallara
        img.src = getValidImageSrc(null); // Fuerza la asignación de la imagen por defecto del sistema
    };

    // Estructura el cuerpo interno de la tarjeta e inserta las variables mediante interpolación de cadenas
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

    // Inserta de forma explícita el nodo de la imagen como el primer hijo interno del artículo (antes del cuerpo del texto)
    article.insertBefore(img, article.firstChild);

    // Selecciona el botón recién inyectado utilizando su atributo de datos personalizado 'data-id'
    const btn = article.querySelector('button[data-id]');
    // Configura un escuchador para redirigir a la vista detallada pasando el ID del producto como parámetro de consulta (query param)
    btn.addEventListener('click', () => {
        window.location.href = `producteSeleccionat.html?id=${producto.id}`;
    });

    return article; // Devuelve el nodo completo listo para ser insertado en la página
}

// Mapea y traduce las cadenas de estado internas de la base de datos a texto plano legible para el usuario final
function getEstatLabel(estado) {
    const labels = {
        'Pendent': 'Pendiente de aprobación',
        'Aprovat': 'Aprobado',
        'Rebutjat': 'Rechazado'
    };
    return labels[estado] || estado; // Si el estado no coincide con ninguna clave, devuelve la cadena original sin alteración
}

// ==========================================
// CARGA Y PROCESAMIENTO DE DATOS (API)
// ==========================================

// Consulta el endpoint de la API correspondiente según el rol del usuario, ordena los datos y los dibuja en pantalla
async function cargarMisProductos() {
    // Restablece e inicializa los contenedores visuales antes de la consulta HTTP para limpiar ejecuciones anteriores
    emptyEl.textContent = '';
    listEl.innerHTML = '';

    // Verificación de redundancia preventiva: si falta el token, detiene el flujo y genera un enlace explícito de inicio de sesión
    if (!localStorage.getItem('token')) {
        emptyEl.innerHTML = 'Inicia sesión para ver tus productos. <a href="/pages/login.html" class="link">Login</a>';
        return;
    }

    // Evalúa si el usuario en sesión actual posee privilegios de administrador
    const esAdmin = getUsuario()?.admin;
    // Condición de enrutamiento: los administradores consultan todo el inventario global; los usuarios regulares solo lo propio
    const endpoint = esAdmin ? '/productes/admin' : '/productes/mios';

    // Inyecta un aviso superior específico si el rol detectado es de administrador
    if (esAdmin) {
        emptyEl.innerHTML = '<p style="color: #333;">Estás viendo todos los productos como administrador. Puedes modificar el estado y el contenido de cada anuncio.</p>';
    }

    // Lanza la petición HTTP asíncrona inyectando de forma transparente el token Bearer en las cabeceras
    const response = await fetchAutenticado(endpoint);

    if (!response) return; // Rompe el flujo si la petición falla en la capa inicial de conexión

    // Manejo de códigos de respuesta erróneos devueltos por el servidor (fuera del rango 200-299)
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        emptyEl.innerHTML = `<p style="color: red;">✗ ${data?.error || 'No se han podido cargar tus productos.'}</p>`;
        return;
    }

    const productos = await response.json(); // Parsea el array de objetos JSON devuelto por el servidor

    // Valida si la respuesta está vacía o carece de elementos para renderizar los placeholders informativos correspondientes
    if (!Array.isArray(productos) || productos.length === 0) {
        if (esAdmin) {
            emptyEl.innerHTML = '<p style="color: #666;">No hay productos registrados en el sistema.</p>';
        } else {
            emptyEl.innerHTML = '<p style="color: #666;">Todavía no has añadido productos. <a href="afegirProducte.html">Crea uno ahora</a></p>';
        }
        return;
    }

    // Algoritmo de ordenación personalizado: Prioriza la visualización de aprobados (0), seguidos de pendientes (1) y rechazados (2)
    const productosOrdenados = productos.sort((a, b) => {
        const ordenEstado = { 'Aprovat': 0, 'Pendent': 1, 'Rebutjat': 2 };
        // Si el estado del registro fuera desconocido dentro del mapa, se le asigna por defecto el valor de peso 3
        return (ordenEstado[a.estat] || 3) - (ordenEstado[b.estat] || 3);
    });
    
    // Itera secuencialmente sobre el listado ordenado, construye las tarjetas y las añade una a una al DOM
    productosOrdenados.forEach(p => listEl.appendChild(crearCard(p)));
}

// ==========================================
// INICIALIZACIÓN DE COMPONENTES SECUNDARIOS
// ==========================================

// Ejecuta de forma secuencial la carga de datos de productos e inicializa el cuadro de búsqueda inmediatamente después
cargarMisProductos().then(() => {
    // Inicializa la funcionalidad de filtrado en tiempo real conectando el campo de entrada de datos con las tarjetas creadas
    initBusqueda({
        listEl, // Elemento contenedor que almacena las tarjetas hijas de productos
        inputMountParent: listEl.parentElement, // Elemento padre donde se inyectará de forma física el cuadro de texto del buscador
        placeholder: 'Buscar en mis productos…' // Texto informativo alternativo insertado como placeholder
    });
});