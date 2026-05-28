// ==========================================
// IMPORTACIONES Y CONFIGURACIÓN INICIAL
// ==========================================
import { fetchAutenticado, getUsuario, isAutenticado, getValidImageSrc, getToken } from './utils.js'; // Importa las utilidades de sesión, peticiones, imágenes y tokens

// Extrae el parámetro único 'id' incrustado en la cadena de consulta (Query Parameters) de la barra de direcciones URL
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Inicialización de variables de estado global para el script
const id = getProductIdFromUrl(); // Almacena el identificador del producto seleccionado
const usuario = getUsuario(); // Obtiene síncronamente el objeto de usuario en sesión (si existe)

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
// RENDERIZADO DETALLADO DEL RECURSO (UI)
// ==========================================

// Descarga la información completa del producto, valida permisos de contacto/edición y dibuja la vista de detalle
async function mostrarProductoSeleccionado() {
    const contenedor = document.getElementById('producto-detalle'); // Contenedor HTML principal de la ficha
    
    // Cláusula de salvaguarda: si no hay un ID válido en la URL, detiene el flujo con un mensaje de error
    if (!id) {
        contenedor.innerHTML = '<p style="color: red;">No se ha seleccionado ningún producto.</p>';
        return;
    }

    try {
        // --- CONFIGURACIÓN DE CABECERAS Y PETICIÓN GET ---
        const token = localStorage.getItem('token');
        // Si el usuario está logueado, inyecta manualmente el token Bearer para poder visualizar productos en estado 'Pendent' o 'Rebutjat'
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const response = await fetch('/productes/' + id, { headers });

        if (!response) {
            contenedor.innerHTML = '<p style="color: red;">✗ Error de conexión al cargar el producto.</p>';
            return;
        }
        
        // Control de códigos de respuesta fallidos (HTTP Status) devueltos por la API
        if (!response.ok) {
            if (response.status === 404) {
                contenedor.innerHTML = '<p style="color: red;">✗ Producto no encontrado.</p>';
            } else if (response.status === 403) {
                contenedor.innerHTML = '<p style="color: red;">✗ No tienes permisos para ver este producto.</p>';
            } else {
                contenedor.innerHTML = `<p style="color: red;">✗ Error al cargar el producto. Código: ${response.status}</p>`;
            }
            return;
        }

        const producto = await response.json(); // Parsea la respuesta del producto a objeto JavaScript

        // Asigna dinámicamente las clases de la etiqueta CSS según el estado de moderación
        const badgeClass = producto.estat === 'Aprovat' 
            ? 'badge approved' 
            : producto.estat === 'Rebutjat' 
                ? 'badge rejected' 
                : 'badge pending';

        // Evaluaciones lógicas de propiedad y rol para la gestión de permisos en la interfaz
        const esPropietario = usuario?.id === producto.user_id || usuario?.nom === producto.usuari;
        const esAdmin = usuario?.admin;

        // Si el producto está pendiente de revisión y el visitante es un tercero, añade un banner informativo
        let messageBox = '';
        if (!esPropietario && !esAdmin && producto.estat !== 'Aprovat') {
            messageBox = '<div class="alert alert-info" style="background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px;"><strong>Nota:</strong> Este producto aún no ha sido aprobado por un administrador.</div>';
        }

        const imageSrc = getValidImageSrc(producto.imatge); // Obtiene la URL limpia de la imagen o el fallback de error

        // --- LÓGICA ASÍNCRONA PARA EL CORREO DE CONTACTO ---
        let contactoHtml = '';
        if (!producto.user_id) {
            // Mitigación de errores: previene la ruptura de la interfaz si el anuncio carece de un ID de creador válido
            contactoHtml = '<p><strong>Contacto:</strong> No disponible (autor desconocido)</p>';
        } else {
            try {
                // Restricción de negocio: los usuarios no autenticados no pueden ver datos confidenciales de contacto
                if (!getToken()) {
                    contactoHtml = '<p><strong>Contacto:</strong> No disponible (sin sesión)</p>';
                } else {
                    // Consulta el endpoint protegido para recuperar de forma aislada el email del vendedor
                    const resEmail = await fetchAutenticado(`/usuaris/${producto.user_id}/email`);
                    if (resEmail && resEmail.ok) {
                        const dataEmail = await resEmail.json();
                        if (dataEmail?.email) {
                            contactoHtml = `<p><strong>Contacto:</strong> ${dataEmail.email}</p>`;
                        } else {
                            contactoHtml = '<p><strong>Contacto:</strong> No disponible</p>';
                        }
                    } else {
                        contactoHtml = '<p><strong>Contacto:</strong> No disponible</p>';
                    }
                }
            } catch (e) {
                console.warn('No se pudo obtener email de contacto', e); // Registra una advertencia sin interrumpir la experiencia
                contactoHtml = '<p><strong>Contacto:</strong> No disponible</p>';
            }
        }

        // Inyecta el bloque principal de la tarjeta estructurada con los datos del producto
        contenedor.innerHTML = `
            ${messageBox}
            <div class="card">
                <img src="${imageSrc}" alt="Imatge del producte" onerror="this.src='${getValidImageSrc(null)}'">
                <div class="card-body">
                    <h2>${producto.component}</h2>
                    <p><strong>Categoría:</strong> ${producto.categoria}</p>
                    <p><strong>Descripción:</strong> ${producto.descripcio}</p>
                    <p><strong>Precio:</strong> ${producto.precio ?? '—'} €</p>
                    <p><strong>Usuario:</strong> ${producto.usuari}</p>
                    <p><strong>Estado:</strong> <span class="${badgeClass}">${getEstatLabel(producto.estat)}</span></p>
                    <p style="color: #666; font-size: 0.9em;"><strong>Creado:</strong> ${new Date(producto.created_at).toLocaleDateString('es-ES')}</p>
                    ${contactoHtml}
                </div>
            </div>
        `;

        // --- CONSTRUCCIÓN DINÁMICA DE LA BOTONERA DE ACCIONES ---
        const actions = document.createElement('div');
        actions.className = 'actions-row';

        const actionsLeft = document.createElement('div');
        actionsLeft.className = 'actions-left';

        const actionsRight = document.createElement('div');
        actionsRight.className = 'actions-right';

        const autenticat = isAutenticado(); // Comprueba si el cliente tiene una sesión válida

        // Si está autenticado y se cumplen las condiciones de rol o autoría, fabrica los controles
        if (autenticat && (esPropietario || esAdmin)) {
            
            // Sub-bloque para el dueño del producto o el administrador: Modificación y Eliminación
            if (esPropietario || esAdmin) {
                // Botón de redirección al formulario de edición
                const modificarBtn = document.createElement('button');
                modificarBtn.className = 'btn btn-primary';
                modificarBtn.textContent = 'Modificar';
                modificarBtn.addEventListener('click', () => {
                    window.location.href = `modificarProducte.html?id=${id}`;
                });
                actionsLeft.appendChild(modificarBtn);

                // Botón de borrado físico directo con confirmación nativa en ventana
                const eliminarBtn = document.createElement('button');
                eliminarBtn.className = 'btn btn-reject';
                eliminarBtn.textContent = 'Eliminar';
                eliminarBtn.addEventListener('click', async () => {
                    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

                    const response = await fetchAutenticado('/productes/' + id, {
                        method: 'DELETE'
                    });

                    if (!response) return;
                    if (response.ok) {
                        alert('Producto eliminado correctamente');
                        window.location.href = '../pages/misProductos.html';
                    } else {
                        const data = await response.json();
                        alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
                    }
                });
                actionsLeft.appendChild(eliminarBtn);
            }

            // Sub-bloque exclusivo para el rol de administrador: Herramientas de moderación rápida (Aprobar/Rechazar)
            if (esAdmin) {
                // Botón para validar y publicar el anuncio
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-approve';
                approveBtn.textContent = 'Aprobar';
                approveBtn.addEventListener('click', () => cambiarEstado(id, 'Aprovat'));
                actionsRight.appendChild(approveBtn);

                // Botón para denegar el anuncio
                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-reject';
                rejectBtn.textContent = 'Rechazar';
                rejectBtn.addEventListener('click', () => cambiarEstado(id, 'Rebutjat'));
                actionsRight.appendChild(rejectBtn);
            }

            // Ensambla los sub-bloques izquierdo y derecho dentro de la fila de acciones
            actions.appendChild(actionsLeft);
            actions.appendChild(actionsRight);
        }

        // Si se añadió al menos un botón a la estructura, acopla la botonera al final del contenedor principal
        if (actions.childElementCount) {
            contenedor.appendChild(actions);
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p style="color: red;">✗ Error de red al cargar el producto.</p>';
    }
}

// ==========================================
// CONTROL DE ACCIONES DE MODERACIÓN (PUT)
// ==========================================

// Realiza una actualización parcial asíncrona sobre el estado de un artículo y refresca la vista actual
async function cambiarEstado(id, estado) {
    try {
        const response = await fetchAutenticado('/productes/' + id, {
            method: 'PUT', // Envía la actualización parcial al endpoint del recurso
            body: JSON.stringify({ estat: estado }) // Transmite el nuevo estado serializado en formato JSON
        });

        if (!response) return;
        
        // Si la base de datos se actualizó correctamente, notifica y fuerza la recarga de la pantalla
        if (response.ok) {
            const estadoLabel = estado === 'Aprovat' ? 'Aprobado' : 'Rechazado';
            alert(`Producto ${estadoLabel} correctamente`);
            window.location.reload(); // Recarga la página para visualizar las etiquetas y botones actualizados
        } else {
            const data = await response.json();
            alert('No se pudo actualizar el producto: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del producto');
    }
}

// Ejecución inmediata automática al cargar el script para renderizar la interfaz
mostrarProductoSeleccionado();