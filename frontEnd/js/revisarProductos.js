// ==========================================
// IMPORTACIONES Y CONTROL DE ACCESO
// ==========================================
import { fetchAutenticado, getValidImageSrc, verificarAutenticacion, getUsuario } from './utils.js'; // Importa las utilidades de sesión, peticiones protegidas e imágenes
import { initBusqueda } from './busquedaProductos.js'; // Importa el componente para inyectar el filtrado reactivo en tiempo real

// Bloquea el acceso de inmediato redirigiendo al login si no se detecta una sesión válida activa
verificarAutenticacion();

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
const revisionList = document.getElementById('revision-list'); // Contenedor (div/section) donde se listarán las tarjetas de los productos en revisión
const reviewEmpty = document.getElementById('review-empty'); // Contenedor secundario para inyectar notificaciones de éxito o error de la cola

// ==========================================
// CONSUMO DE API Y ENRUTADO DE SEGURIDAD
// ==========================================

// Descarga la cola de productos pendientes de revisión y valida de manera estricta que el usuario tenga rol de administrador
async function obtenerPendientes() {
    const usuario = getUsuario(); // Obtiene síncronamente el objeto de usuario en sesión

    // Bloqueo de seguridad del lado del cliente: si el usuario no es administrador, aborta y redirige a la página principal
    if (!usuario?.admin) {
        window.location.href = '/index.html';
        return;
    }

    // Consulta el endpoint protegido que retorna los anuncios con estado 'Pendent'
    const response = await fetchAutenticado('/productes/revisio');
    if (!response) {
        reviewEmpty.innerHTML = '<p style="color: red;">✗ Error al conectar con el servidor.</p>';
        return;
    }

    // Control de códigos de respuesta HTTP fallidos
    if (!response.ok) {
        reviewEmpty.innerHTML = '<p style="color: red;">✗ No se han podido cargar los productos pendientes.</p>';
        return;
    }

    const productos = await response.json(); // Parsea la lista de productos pendientes a un Array de JavaScript
    
    // Si la cola de revisión está vacía, renderiza un mensaje amigable de felicitación
    if (!productos.length) {
        reviewEmpty.innerHTML = '<p style="color: green;">✓ No hay productos pendientes de aprobación. ¡Buen trabajo!</p>';
        return;
    }

    // Itera sobre el set de datos pendientes y delega la construcción física de cada tarjeta en el DOM
    productos.forEach(producto => crearTarjeta(producto));
}

// ==========================================
// COMPONENTES AUXILIARES DE RENDERIZADO (UI)
// ==========================================

// Construye de forma programática el contenedor de la tarjeta (article) y le asocia los escuchadores de moderación
function crearTarjeta(producto) {
    const card = document.createElement('article');
    card.className = 'product-card';
    
    const imageSrc = getValidImageSrc(producto.imatge); // Valida la URL de la imagen o asigna el fallback genérico
    
    // Maqueta la tarjeta inyectando las propiedades del objeto mediante template literals
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

    revisionList.appendChild(card); // Añade la tarjeta a la lista de revisión física

    // Localiza de forma interna los botones de acción específicos de esta tarjeta recién creada
    const approveButton = card.querySelector('.btn-approve');
    const rejectButton = card.querySelector('.btn-reject');

    // Asigna los escuchadores de clics delegando la moderación asíncrona mediante callbacks con parámetros fijos
    approveButton.addEventListener('click', () => revisarProducto(producto.id, 'Aprovat', card));
    rejectButton.addEventListener('click', () => revisarProducto(producto.id, 'Rebutjat', card));
}

// ==========================================
// ACCIONES DE MODERACIÓN (PUT) Y ANIMACIONES
// ==========================================

// Envía la decisión del administrador al backend y ejecuta la remoción visual animada del elemento de la interfaz
async function revisarProducto(id, estado, cardElement) {
    const estadoLabel = estado === 'Aprovat' ? 'Aprobado' : 'Rechazado';
    
    // Solicita confirmación nativa al usuario antes de proceder con el cambio irreversible en la base de datos
    if (!confirm(`¿Estás seguro de que quieres marcar este producto como ${estadoLabel}?`)) {
        return;
    }

    try {
        // Envía una petición PUT para actualizar parcialmente el estado de moderación del anuncio
        const response = await fetchAutenticado(`/productes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ estat: estado }) // Transmite el payload serializado en JSON
        });

        if (!response) {
            alert('Error al conectar con el servidor');
            return;
        }

        // --- FLUJO DE ACTUALIZACIÓN EXITOSO ---
        if (response.ok) {
            // Aplica estilos en línea inmediatos para crear un efecto visual de desactivación o tachado
            cardElement.style.opacity = '0.5';
            cardElement.style.textDecoration = 'line-through';
            
            // Retrasa la eliminación física del nodo para dar tiempo a que el administrador perciba la animación
            setTimeout(() => {
                cardElement.remove(); // Elimina el elemento HTML por completo del árbol DOM
                
                // Evaluación del estado de la cola: si ya no quedan hijos (tarjetas), limpia el contenedor y muestra mensaje
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

// ==========================================
// INICIALIZACIÓN DE COMPONENTES SECUNDARIOS
// ==========================================

// Llama en primer término a la descarga de datos asíncronos y acopla el motor de búsqueda en tiempo real al finalizar
obtenerPendientes().then(() => {
    // Inicializa el plugin de filtrado de texto emparejándolo con la lista de tarjetas inyectadas
    initBusqueda({
        listEl: revisionList, // Elemento raíz que contiene la lista de artículos hijos a filtrar
        inputMountParent: revisionList.parentElement, // Elemento del DOM donde se inyectará físicamente el input buscador
        placeholder: 'Buscar en revisión…' // Texto de sugerencia o guía que se mostrará en el cuadro de texto
    });
});