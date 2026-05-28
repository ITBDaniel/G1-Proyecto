// ==========================================
// IMPORTACIONES Y CONTROL DE ACCESO
// ==========================================
import { fetchAutenticado, verificarAutenticacion, getUsuario } from './utils.js'; // Importa funciones auxiliares personalizadas para la gestión del estado y peticiones protegidas

verificarAutenticacion(); // Ejecución inmediata para comprobar si existe sesión activa; si no, redirige al login antes de cargar la página

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM (HTML)
// ==========================================
const inputComponent = document.getElementById('component'); // Cuadro de texto para el nombre del componente o producto
const inputCategoria = document.getElementById('categoria'); // Cuadro de texto o selector para la categoría del producto
const inputDescripcio = document.getElementById('descripcio'); // Área de texto para la descripción del artículo
const inputImatge = document.getElementById('imatge'); // Cuadro de texto destinado a la URL de la imagen del producto
const inputPrecio = document.getElementById('precio'); // Campo numérico para capturar el precio de venta
const authForm = document.getElementById('authForm'); // Elemento formulario que envuelve todos los campos anteriores
const sectionErrors = document.getElementById('errorCrearProducte'); // Contenedor (div/section) para renderizar mensajes de éxito o error en la interfaz

// ==========================================
// GESTIÓN DEL EVENTO DE ENVÍO (SUBMIT)
// ==========================================
authForm.addEventListener('submit', e => {
    e.preventDefault(); // Detiene el comportamiento nativo de envío del formulario para procesarlo mediante AJAX sin recargar la página

    // Estructura un objeto local capturando y limpiando los espacios en blanco iniciales/finales de cada entrada
    const producte = {
        component: inputComponent.value.trim(),
        categoria: inputCategoria.value.trim(),
        descripcio: inputDescripcio.value.trim(),
        imatge: inputImatge.value.trim(),
        precio: inputPrecio.value.toString().trim(), // Fuerza la conversión a cadena de texto limpia antes de enviarlo
        // Nota aclaratoria: El campo 'estat' no se envía desde aquí ya que el servidor lo inicializa como 'Pendent' automáticamente
    };

    crearProductes(producte); // Invoca la función asíncrona encargada de la comunicación con la API
});

// ==========================================
// COMUNICACIÓN CON LA API (PETICIÓN POST)
// ==========================================
async function crearProductes(producte) {
    if (!producte) return; // Cláusula de salvaguarda: aborta la ejecución si el objeto recibido está vacío o es inválido

    // Limpia cualquier mensaje residual (de errores o éxitos previos) alojado en el contenedor visual
    sectionErrors.innerHTML = '';

    try {
        // Recupera los datos del usuario actualmente autenticado desde el almacenamiento local
        const usuario = getUsuario();
        // Si no existen datos del usuario o carece de nombre, detiene el flujo lanzando una excepción
        if (!usuario || !usuario.nom) {
            throw new Error('Error al obtener datos del usuario');
        }

        // Sincroniza e inyecta el nombre del autor dentro del objeto del producto antes de transferirlo
        producte.usuari = usuario.nom;

        // Realiza una petición HTTP asíncrona utilizando el envoltorio personalizado que inyecta automáticamente el token JWT en las cabeceras
        const response = await fetchAutenticado('/crearProducte', {
            method: 'POST', // Define el método de creación de recursos de la API
            body: JSON.stringify(producte) // Serializa el objeto del producto a formato de cadena JSON
        });

        if (!response) return; // Detiene el flujo si la petición fue cancelada o falló a nivel de red básica

        const data = await response.json(); // Parsea los datos devueltos por la API de JSON a objeto JavaScript
        
        // Si el estado de la respuesta HTTP no es exitoso (fuera del rango 200-299), lanza un error con el mensaje del backend
        if (!response.ok) {
            throw new Error(data.error || 'Error desconocido al crear el producto');
        }

        // --- FLUJO DE ÉXITO ---
        // Inyecta un mensaje afirmativo estilizado en verde dentro de la interfaz de usuario
        sectionErrors.innerHTML = `<p style="color: green; font-weight: bold;">✓ ¡Producto creado con éxito! El administrador revisará tu producto pronto.</p>`;
        
        // Restablece todos los campos del formulario HTML a sus valores iniciales/vacíos por defecto
        authForm.reset();
        
        // Pausa la ejecución por 2000 milisegundos (2 segundos) para que el usuario pueda leer el mensaje de éxito antes de redirigir
        setTimeout(() => {
            window.location.href = '../index.html'; // Redirecciona la navegación hacia la página principal del sitio
        }, 2000);

        return data; // Devuelve los datos procesados en caso de que otra función requiera encadenar la promesa
    } catch (error) {
        // --- FLUJO DE ERROR ---
        console.error('Error al crear producto:', error); // Registra el error detallado en la consola del navegador para depuración
        // Si el contenedor de mensajes existe, inyecta el error formateado en color rojo para alertar visualmente al usuario
        if (sectionErrors) {
            sectionErrors.innerHTML = `<p class="errorMsg" style="color: red;">✗ ${error.message}</p>`;
        }
    }
}