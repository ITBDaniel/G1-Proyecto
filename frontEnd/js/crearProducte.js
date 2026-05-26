import { gridProductos , afegirProducte} from "./productes";

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

let producte = {};

authForm.addEventListener("submit", e => { 
    e.preventDefault();
    console.log(inputImatge.value)
    producte = {
        "component": inputComponent.value,
        "categoria": inputCategoria.value,
        "estat": inputEstat.value,
        "descripcio": inputDescripcio.value,
        "imatge": inputImatge.value,
    }
    crearProductes(producte);
    afegirProducte(producte);
})


async function crearProductes(producte) {
    if (producte != null && producte != '') {
        try {
            const response = await fetch('http://localhost:3000/crearProducte', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producte)
            });

            if (!response.ok) {
                throw new Error(`Error en la petció: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            alert('¡Producto creado con éxito! Volviendo a la lista...');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

            return data;
        } catch (error) {
            console.log(error)
        }
    } else {
        const errorMsg = document.createElement('p');
        errorMsg.classList.add('errorMsg');
        errorMsg.textContent = 'Error al crear el producto';
        const sectionErrors = document.getElementById('errorCrearProducte');
        sectionErrors.appendChild(errorMsg);
    }
}
