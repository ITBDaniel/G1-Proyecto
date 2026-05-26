export const gridProductos = document.getElementById("gridProductos");

//Contador para el id del boton de eliminar

//Funciones para el backEnd

async function mostrarProductes(){
    try{
        const response = await fetch('http://localhost:3000/productes');
        const data = await response.json();

        if (data) {
            data.forEach(producto => {
                afegirProducte(producto);
            });
                  
        } else {
            const errorMsg = document.createElement('p');
            errorMsg.classList.add('errorMsg');
            errorMsg.textContent = 'Error al cargar los productos';
            gridProductos.appendChild(errorMsg);
        }
        } catch (error) {
            console.log(error)
        }
} 

//Funciones para el frontEnd


export function afegirProducte(producto){
    const contenedorProducto = document.createElement('article');
    contenedorProducto.innerHTML = `<figure>
        <img src="${producto.imatge}" alt="Imatge del producte">
        <figcaption>${producto.component}</figcaption>
        </figure>`;
        
    gridProductos.appendChild(contenedorProducto);
    contenedorProducto.id = producto.id;
    contenedorProducto.addEventListener("click", () => {
        window.location.href = `pages/producteSeleccionat.html?id=${producto.id}`;
    });  
}

mostrarProductes();


