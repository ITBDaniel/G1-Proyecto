const componentLabel = document.getElementById("componentLabel");
const inputComponent = document.getElementById("component");
const categoriaLabel = document.getElementById("categoriaLabel");
const inputCategoria = document.getElementById("categoria");
const estatLabel = document.getElementById("estatLabel");
const inputEstat = document.getElementById("estat");
const descripcioLabel = document.getElementById("descripcioLabel");
const inputDescripcio = document.getElementById("descripcio");
const imatgeLabel = document.getElementById("imatgeLabel");
const inputImatge = document.getElementById("imatge");
const authForm = document.getElementById("authForm");

const eliminarProducte = document.getElementById('eliminarProducte');

// Obtiene el id del producto de la query string (?id=...)
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

export async function eliminarProductes(id) {
    if (id != null && id != '') {
        try {
            const response = await fetch('http://localhost:3000/productes/' + id, {
                method: 'DELETE'
            });
            if (response.ok) {
                mostrarProductes();
                alert('Producto eliminado correctamente');
            } else {
                const data = await response.json();
                alert('Error al eliminar: ' + (data.error || 'desconocido'));
            }
        } catch (error) {
            console.log(error)
            alert('Error de red al eliminar producto');
        }
    } else {
        const errorMsg = document.createElement('p');
        errorMsg.classList.add('errorMsg');
        errorMsg.textContent = 'Error al cargar el producto';
        const sectionErrors = document.getElementById('errorModificarProducte');
        sectionErrors.appendChild(errorMsg);
    }
}

export async function modificarProductes(id) {
    if (id != null && id != '') {
        // Recoger los valores del formulario
        const datos = {
            component: inputComponent.value,
            categoria: inputCategoria.value,
            estat: inputEstat.value,
            descripcio: inputDescripcio.value,
            imatge: inputImatge.value
        };
        try {
            const response = await fetch('http://localhost:3000/productes/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (response.ok) {
                mostrarProductes();
                alert('Producto modificado correctamente');
            } else {
                const data = await response.json();
                alert('Error al modificar: ' + (data.error || 'desconocido'));
            }
        } catch (error) {
            console.log(error)
            alert('Error de red al modificar producto');
        }
    } else {
        const errorMsg = document.createElement('p');
        errorMsg.classList.add('errorMsg');
        errorMsg.textContent = 'Error al cargar el producto';
        const sectionErrors = document.getElementById('errorModificarProducte');
        sectionErrors.appendChild(errorMsg);
    }
}
if(authForm) {
authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = getProductIdFromUrl();
    modificarProductes(id);
})
}
