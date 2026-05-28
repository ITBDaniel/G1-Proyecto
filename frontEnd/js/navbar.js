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
    const existingNav = document.querySelector('header nav') || document.querySelector('nav');
    const nav = existingNav || document.createElement('nav');
    nav.id = 'navbar';
    nav.className = 'navbar';
    nav.innerHTML = '';

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
    `;

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
        loginLink.href = '/pages/login.html';
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

    nav.append(navLeft, navRight);

    if (!existingNav) {
        const header = document.querySelector('header') || document.body;
        if (header.tagName.toLowerCase() === 'body') {
            const wrapper = document.createElement('header');
            wrapper.appendChild(nav);
            document.body.insertBefore(wrapper, document.body.firstChild);
        } else {
            header.appendChild(nav);
        }
    }

    return nav;
}

document.addEventListener('DOMContentLoaded', crearNavbar);
