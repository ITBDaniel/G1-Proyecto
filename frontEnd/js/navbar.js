// ==========================================
// IMPORTACIONES Y CONSTANTES GLOBALES
// ==========================================
import { logout, getUsuario } from './utils.js'; // Importa las funciones para cerrar sesión y recuperar los datos del usuario actual

const DARK_MODE_KEY = 'modoOscuro'; // Clave empleada para almacenar la preferencia del tema visual en el localStorage

// ==========================================
// GESTIÓN DEL MODO OSCURO (DARK MODE)
// ==========================================

// Comprueba de forma síncrona en el almacenamiento local si el tema oscuro está activo (valor '1')
function isDarkModeEnabled() {
    return localStorage.getItem(DARK_MODE_KEY) === '1';
}

// Sincroniza el estado del modo oscuro aplicando clases en el DOM, actualizando localStorage y modificando el botón
function updateDarkMode(enabled, button) {
    // Añade la clase 'dark-mode' al body si 'enabled' es true; la elimina si es false
    document.body.classList.toggle('dark-mode', enabled);
    // Guarda de manera persistente la elección del usuario ('1' para activo, '0' para inactivo)
    localStorage.setItem(DARK_MODE_KEY, enabled ? '1' : '0');
    
    // Si se pasa la referencia del botón, actualiza dinámicamente su texto y su estado de accesibilidad ARIA
    if (button) {
        button.textContent = enabled ? 'Modo claro' : 'Modo oscuro';
        button.setAttribute('aria-pressed', String(enabled)); // Atributo ARIA para lectores de pantalla
    }
}

// ==========================================
// CONSTRUCCIÓN DINÁMICA DE LA BARRA DE NAVEGACIÓN
// ==========================================

// Genera, configura e inyecta la estructura HTML del menú de navegación adaptándose al rol y sesión del usuario
export function crearNavbar() {
    const usuario = getUsuario(); // Recupera el perfil del usuario (si tiene la sesión iniciada)
    
    // Intenta localizar si ya existe una estructura previa de navegación en el documento actual
    const existingNav = document.querySelector('header#site-header nav#navbar') || document.querySelector('nav#navbar');
    // Si ya existe la reutiliza; en caso contrario, crea un nuevo nodo elemento 'nav' desde cero
    const nav = existingNav || document.createElement('nav');

    nav.id = 'navbar'; // Asigna el identificador único
    nav.className = 'navbar'; // Aplica la clase CSS base para los estilos de maquetación
    nav.innerHTML = ''; // Vacía por completo el contenido interno para evitar duplicados en re-renderizados

    // Contenedor interno estructural para centrar y alinear los elementos de forma organizada
    const navContainer = document.createElement('div');
    navContainer.className = 'navbar-container';

    // Determina la ruta relativa base: si el archivo actual está dentro de la carpeta '/pages/', 
    // añade '../' para retroceder un nivel y poder enlazar correctamente con la raíz del proyecto
    const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
    
    // Creación y composición del bloque izquierdo del menú (Logotipo y enlaces de navegación)
    const navLeft = document.createElement('div');
    navLeft.className = 'nav-left';
    navLeft.innerHTML = `
        <a class="brand" href="${basePath}index.html">Loopware</a>
        <a href="${basePath}index.html">Inicio</a>
        ${usuario ? `<a href="${basePath}pages/afegirProducte.html">Añadir producto</a>` : ''}
        ${usuario ? `<a href="${basePath}pages/editarPerfil.html">Editar perfil</a>` : ''}
        ${usuario ? `<a href="${basePath}pages/misProductos.html">Mis productos</a>` : ''}
        ${usuario?.admin ? `<a href="${basePath}pages/revisarProductos.html">Revisión</a>` : ''}
        <a href="${basePath}pages/sostenibilitat-ods.html">Sostenibilidad</a>
        <a href="${basePath}pages/sostenibilitat-repte.html">Problema y solución</a>
        <a href="${basePath}pages/sostenibilitat-loopware.html">Cómo reutilizamos</a>
        <a href="${basePath}pages/sostenibilitat-practiques.html">Prácticas</a>
    `;

    // --- LÓGICA DE DETECCIÓN DE ENLACE ACTIVO ---
    // Extrae la URL absoluta actual eliminando los parámetros de búsqueda (?) y las anclas internas (#)
    const currentUrl = window.location.href.split('?')[0].split('#')[0];
    // Selecciona todos los enlaces creados en el bloque izquierdo, excluyendo el logotipo principal (.brand)
    const links = navLeft.querySelectorAll('a:not(.brand)');
    
    links.forEach(link => {
        // Valida si la URL absoluta del enlace coincide con la dirección actual del navegador,
        // o si la URL actual termina en '/' (raíz) y el enlace apunta explícitamente a 'index.html'
        if (link.href === currentUrl || (currentUrl.endsWith('/') && link.href.endsWith('index.html'))) {
            link.classList.add('active'); // Añade la clase CSS para resaltar visualmente la pestaña activa
        }
    });

    // Creación y composición del bloque derecho del menú (Sesión de usuario y utilidades)
    const navRight = document.createElement('div');
    navRight.className = 'nav-right';

    if (usuario) {
        // Si hay sesión activa: genera un mensaje de bienvenida mostrando el nombre y si posee rol de administrador
        const userInfo = document.createElement('span');
        userInfo.textContent = `Bienvenido, ${usuario.nom}${usuario.admin ? ' (Admin)' : ''}`;
        
        // Construye el botón de cierre de sesión asignándole su manejador de eventos correspondiente
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-logout';
        logoutBtn.textContent = 'Cerrar sesión';
        logoutBtn.addEventListener('click', logout); // Delega la acción en la función importada 'logout'
        
        navRight.append(userInfo, logoutBtn); // Inyecta ambos nodos en el bloque derecho
    } else {
        // Si no hay sesión: construye un botón de redirección directo hacia el formulario de login
        const loginLink = document.createElement('a');
        loginLink.href = `${basePath}pages/login.html`;
        loginLink.className = 'btn btn-primary';
        loginLink.textContent = 'Iniciar sesión';
        navRight.appendChild(loginLink);
    }

    // --- INTERRUPTOR DE MODO OSCURO (TOGGLE) ---
    const darkModeToggle = document.createElement('button');
    darkModeToggle.className = 'btn btn-toggle';
    darkModeToggle.type = 'button';
    
    const darkModeActive = isDarkModeEnabled(); // Consulta la configuración persistida inicialmente
    darkModeToggle.textContent = darkModeActive ? 'Modo claro' : 'Modo oscuro';
    
    // Atributos de accesibilidad para describir la acción del elemento al árbol de accesibilidad
    darkModeToggle.setAttribute('aria-label', 'Cambiar modo oscuro');
    darkModeToggle.setAttribute('aria-pressed', String(darkModeActive));
    
    // Escuchador para alternar el tema visual de la aplicación web al hacer clic
    darkModeToggle.addEventListener('click', () => {
        // Evalúa si el body carece de la clase 'dark-mode' para determinar el nuevo estado booleano
        const enabled = !document.body.classList.contains('dark-mode');
        updateDarkMode(enabled, darkModeToggle); // Ejecuta la actualización de estilos y persistencia
    });

    navRight.appendChild(darkModeToggle); // Añade el interruptor al bloque derecho
    updateDarkMode(darkModeActive, darkModeToggle); // Sincroniza el estado visual inicial del body al cargar

    // --- ENSAMBLADO FINAL EN EL DOM ---
    navContainer.append(navLeft, navRight); // Introduce los dos bloques principales en el contenedor centrado
    nav.appendChild(navContainer); // Introduce el contenedor dentro del nodo de navegación 'nav'

    // Si la barra de navegación no existía previamente en la página, se encarga de crear el contenedor 'header'
    if (!existingNav) {
        let wrapper = document.querySelector('header#site-header');
        if (!wrapper) {
            // Si no existe la etiqueta 'header#site-header', la crea de manera dinámica
            wrapper = document.createElement('header');
            wrapper.id = 'site-header';
            // Lo inserta como el primer hijo absoluto del cuerpo del documento (al principio del <body>)
            document.body.insertBefore(wrapper, document.body.firstChild);
        }
        wrapper.appendChild(nav); // Añade la barra de navegación configurada dentro del header
    }

    return nav; // Devuelve la barra de navegación completamente construida
}

// Vincula el ciclo de vida DOMContentLoaded para disparar la ejecución automática en cuanto el HTML esté parseado
document.addEventListener('DOMContentLoaded', crearNavbar);