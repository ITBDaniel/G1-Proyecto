import { eliminarProductes, modificarProductes } from "./modificarProducte.js";

// Obtiene el id del producto de la query string (?id=...)
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const id = getProductIdFromUrl();

async function mostrarProductoSeleccionado() {
    const contenedor = document.getElementById('producto-detalle');
    if (!id) {
        contenedor.innerHTML = '<p>No se ha seleccionado ningún producto.</p>';
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/productes/' + id);
        if (!response.ok) {
            if (response.status === 404) {
                contenedor.innerHTML = '<p>Producto no encontrado.</p>';
            } else {
                contenedor.innerHTML = '<p>Error al cargar el producto. Código: ' + response.status + '</p>';
            }
            return;
        }
        const producto = await response.json();
        contenedor.innerHTML = `
            <h2>${producto.component}</h2>
            <p><b>Categoría:</b> ${producto.categoria}</p>
            <p><b>Estado:</b> ${producto.estat}</p>
            <p><b>Descripción:</b> ${producto.descripcio}</p>
            <p><b>Usuario:</b> ${producto.usuari}</p>
            <img src="../img/${producto.imatge}" alt="Imatge del producte" style="max-width:300px;">
        `;
        const btns = document.createElement('article');
        btns.innerHTML = `
            <button id="modificarBtn">Modificar</button>
            <button id="eliminarBtn">Eliminar</button>
        `;
        contenedor.appendChild(btns);
        const modificarBtn = document.getElementById('modificarBtn');
        const eliminarBtn = document.getElementById('eliminarBtn');
        modificarBtn.addEventListener("click", () => {
            window.location.href = `modificarProducte.html?id=${id}`;
            //modificarProductes(id);
        });

        eliminarBtn.addEventListener("click", () => {
            eliminarProductes(id);
        });
    } catch (error) {
        contenedor.innerHTML = '<p>Error de red al cargar el producto.</p>';
    }
}

mostrarProductoSeleccionado();