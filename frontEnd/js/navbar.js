import { logout, getUsuario } from './utils.js';

const DARK_MODE_KEY = 'modoOscuro';

function isDarkModeEnabled() {
    return localStorage.getItem(DARK_MODE_KEY) === '1';
}

function updateDarkMode(enabled, button) {
    document.body.classList.toggle('dark-mode', enabled);
    localStorage.setItem(DARK_MODE_KEY, enabled ? '1' : '0');
    if (button) {
        button.textContent = enabled ? 'Modo claro' : 'Modo oscuro';
        button.setAttribute('aria-pressed', String(enabled));
    }
}

export function crearNavbar() {
    const usuario = getUsuario();
    const existingNav = document.querySelector('header#site-header nav#navbar') || document.querySelector('nav#navbar');
    const nav = existingNav || document.createElement('nav');

    nav.id = 'navbar';
    nav.className = 'navbar';
    nav.innerHTML = '';

    // NUEVO: Contenedor para aplicar el rediseño centrado
    const navContainer = document.createElement('div');
    navContainer.className = 'navbar-container';

    const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
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

    // NUEVO: Lógica para marcar el enlace activo automáticamente
    // Se compara la URL absoluta de la ventana con la del enlace
    const currentUrl = window.location.href.split('?')[0].split('#')[0]; // Limpiamos parámetros o anclas
    const links = navLeft.querySelectorAll('a:not(.brand)');
    
    links.forEach(link => {
        // Validamos si la ruta actual coincide con la del link
        if (link.href === currentUrl || (currentUrl.endsWith('/') && link.href.endsWith('index.html'))) {
            link.classList.add('active');
        }
    });

    const navRight = document.createElement('div');
    navRight.className = 'nav-right';

    if (usuario) {
        const userInfo = document.createElement('span');
        userInfo.textContent = `Bienvenido, ${usuario.nom}${usuario.admin ? ' (Admin)' : ''}`;
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-logout';
        logoutBtn.textContent = 'Cerrar sesión';
        logoutBtn.addEventListener('click', logout);
        navRight.append(userInfo, logoutBtn);
    } else {
        const loginLink = document.createElement('a');
        loginLink.href = `${basePath}pages/login.html`; // Asegurado con basePath por si acaso
        loginLink.className = 'btn btn-primary';
        loginLink.textContent = 'Iniciar sesión';
        navRight.appendChild(loginLink);
    }

    const darkModeToggle = document.createElement('button');
    darkModeToggle.className = 'btn btn-toggle';
    darkModeToggle.type = 'button';
    const darkModeActive = isDarkModeEnabled();
    darkModeToggle.textContent = darkModeActive ? 'Modo claro' : 'Modo oscuro';
    darkModeToggle.setAttribute('aria-label', 'Cambiar modo oscuro');
    darkModeToggle.setAttribute('aria-pressed', String(darkModeActive));
    darkModeToggle.addEventListener('click', () => {
        const enabled = !document.body.classList.contains('dark-mode');
        updateDarkMode(enabled, darkModeToggle);
    });

    navRight.appendChild(darkModeToggle);
    updateDarkMode(darkModeActive, darkModeToggle);

    // NUEVO: Ensamblar los elementos dentro del navContainer en lugar del nav directamente
    navContainer.append(navLeft, navRight);
    nav.appendChild(navContainer);

    if (!existingNav) {
        let wrapper = document.querySelector('header#site-header');
        if (!wrapper) {
            wrapper = document.createElement('header');
            wrapper.id = 'site-header';
            document.body.insertBefore(wrapper, document.body.firstChild);
        }
        wrapper.appendChild(nav);
    }

    return nav;
}

document.addEventListener('DOMContentLoaded', crearNavbar);