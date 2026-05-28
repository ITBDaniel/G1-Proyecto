import { crearNavbar } from './navbar.js';

function markActiveLink() {
  const nav = document.querySelector('nav#navbar');
  if (!nav) return;

  // 1. Conseguimos la URL absoluta actual de tu navegador limpia (sin ?ni #)
  const currentUrl = window.location.href.split('?')[0].split('#')[0];

  // 2. Capturamos los enlaces del menú (ignorando el logo)
  const links = Array.from(nav.querySelectorAll('a[href]:not(.brand)'));

  for (const a of links) {
    // a.href (propiedad nativa) siempre nos devuelve la URL absoluta completa y resuelta
    const linkUrl = a.href.split('?')[0].split('#')[0];

    // Caso especial: Si estás en la raíz (ej: "sitio.com/") e "Inicio" apunta a "index.html"
    const isHome = currentUrl.endsWith('/') || currentUrl.endsWith('index.html');
    const linkIsHome = linkUrl.endsWith('index.html');

    let isActive = false;
    if (isHome && linkIsHome) {
        isActive = true;
    } else {
        // Para cualquier otra página, la comparación es directa y exacta
        isActive = (linkUrl === currentUrl);
    }

    // 3. Encendemos o apagamos la clase .active de tu CSS
    if (isActive) {
        a.classList.add('active');
    } else {
        a.classList.remove('active');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('nav#navbar')) {
    crearNavbar();
  }
  requestAnimationFrame(() => markActiveLink());
});