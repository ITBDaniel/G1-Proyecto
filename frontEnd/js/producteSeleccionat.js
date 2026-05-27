import { fetchAutenticado, getUsuario, isAutenticado, getValidImageSrc } from './utils.js';

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const id = getProductIdFromUrl();
const usuario = getUsuario();

function getEstatLabel(estado) {
    const labels = {
        'Pendent': 'Pendiente de aprobación',
        'Aprovat': 'Aprobado',
        'Rebutjat': 'Rechazado'
    };
    return labels[estado] || estado;
}

async function mostrarProductoSeleccionado() {
    const contenedor = document.getElementById('producto-detalle');
    if (!id) {
        contenedor.innerHTML = '<p style="color: red;">No se ha seleccionado ningún producto.</p>';
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const response = await fetch('/productes/' + id, { headers });

        if (!response) {
            contenedor.innerHTML = '<p style="color: red;">✗ Error de conexión al cargar el producto.</p>';
            return;
        }
        
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

        const producto = await response.json();
        const badgeClass = producto.estat === 'Aprovat' 
            ? 'badge approved' 
            : producto.estat === 'Rebutjat' 
                ? 'badge rejected' 
                : 'badge pending';

        const esPropietario = usuario?.id === producto.user_id || usuario?.nom === producto.usuari;
        const esAdmin = usuario?.admin;

        let messageBox = '';
        if (!esPropietario && !esAdmin && producto.estat !== 'Aprovat') {
            messageBox = '<div class="alert alert-info" style="background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px;"><strong>Nota:</strong> Este producto aún no ha sido aprobado por un administrador.</div>';
        }

        const imageSrc = getValidImageSrc(producto.imatge);
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
                </div>
            </div>
        `;

        const actions = document.createElement('div');
        actions.className = 'actions-row';

        const actionsLeft = document.createElement('div');
        actionsLeft.className = 'actions-left';

        const actionsRight = document.createElement('div');
        actionsRight.className = 'actions-right';


        const autenticat = isAutenticado();

        if (autenticat && (esPropietario || esAdmin)) {
            // Admin también puede modificar/eliminar
            if (esPropietario || esAdmin) {
                const modificarBtn = document.createElement('button');
                modificarBtn.className = 'btn btn-primary';
                modificarBtn.textContent = 'Modificar';
                modificarBtn.addEventListener('click', () => {
                    window.location.href = `modificarProducte.html?id=${id}`;
                });
                actionsLeft.appendChild(modificarBtn);


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

            if (esAdmin) {

                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-approve';
                approveBtn.textContent = 'Aprobar';
                approveBtn.addEventListener('click', () => cambiarEstado(id, 'Aprovat'));
                actionsRight.appendChild(approveBtn);

                const rejectBtn = document.createElement('button');

                rejectBtn.className = 'btn btn-reject';
                rejectBtn.textContent = 'Rechazar';
                rejectBtn.addEventListener('click', () => cambiarEstado(id, 'Rebutjat'));
                actionsRight.appendChild(rejectBtn);
            }

            actions.appendChild(actionsLeft);
            actions.appendChild(actionsRight);
        }


        if (actions.childElementCount) {
            contenedor.appendChild(actions);
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p style="color: red;">✗ Error de red al cargar el producto.</p>';
    }
}

async function cambiarEstado(id, estado) {
    try {
        const response = await fetchAutenticado('/productes/' + id, {
            method: 'PUT',
            body: JSON.stringify({ estat: estado })
        });

        if (!response) return;
        
        if (response.ok) {
            const estadoLabel = estado === 'Aprovat' ? 'Aprobado' : 'Rechazado';
            alert(`Producto ${estadoLabel} correctamente`);
            window.location.reload();
        } else {
            const data = await response.json();
            alert('No se pudo actualizar el producto: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del producto');
    }
}

mostrarProductoSeleccionado();
