// ==========================================
// IMPORTACIONES Y CONFIGURACIÓN
// ==========================================
import { crearNavbar } from './navbar.js'; // Importa la función encargada de generar e inyectar la barra de navegación dinámicamente

// ==========================================
// LÓGICA DE DETECCIÓN Y RESALTADO DE RUTA
// ==========================================

// Compara la dirección web actual con los hipervínculos del menú para aplicar estilos visuales de pestaña activa
function markActiveLink() {
  const nav = document.querySelector('nav#navbar'); // Busca la existencia física de la barra de navegación en el DOM
  if (!nav) return; // Cláusula de salvaguarda: si no se localiza el menú, aborta la ejecución para prevenir excepciones

  // 1. Obtiene la URL absoluta actual de la barra de direcciones limpia, removiendo parámetros de consulta (?) o anclas (#)
  const currentUrl = window.location.href.split('?')[0].split('#')[0];

  // 2. Selecciona todos los enlaces internos que tengan un atributo href válido, convirtiendo la NodeList en un Array,
  // y excluye explícitamente el logotipo principal de la marca (.brand) para no aplicarle el resaltado
  const links = Array.from(nav.querySelectorAll('a[href]:not(.brand)'));

  // Itera uno a uno sobre la lista de enlaces capturados
  for (const a of links) {
    // La propiedad nativa 'a.href' devuelve siempre la ruta absoluta resuelta por el navegador.
    // Se limpia de la misma manera (removiendo ? y #) para garantizar una comparación equitativa
    const linkUrl = a.href.split('?')[0].split('#')[0];

    // Caso de control especial: determina si el usuario está en la raíz del sitio o en la página principal index
    const isHome = currentUrl.endsWith('/') || currentUrl.endsWith('index.html');
    const linkIsHome = linkUrl.endsWith('index.html'); // Comprueba si el enlace iterado apunta a la página de inicio

    let isActive = false; // Inicializa el indicador lógico de coincidencia de ruta en falso
    
    if (isHome && linkIsHome) {
        isActive = true; // Si ambas condiciones se cumplen, se determina que el enlace correspondiente a "Inicio" está activo
    } else {
        // Para cualquier otro directorio o archivo secundario, realiza una validación directa, estricta y exacta de cadenas
        isActive = (linkUrl === currentUrl);
    }

    // 3. Modifica las clases dinámicas del elemento HTML de acuerdo al resultado lógico de la validación
    if (isActive) {
        a.classList.add('active'); // Inyecta la clase CSS para activar el estilo visual de selección
    } else {
        a.classList.remove('active'); // Remueve la clase asegurando que las pestañas inactivas queden limpias
    }
  }
}

// ==========================================
// CICLO DE VIDA E INICIALIZACIÓN
// ==========================================

// Escucha el evento de inicialización del árbol jerárquico del documento (DOM)
document.addEventListener('DOMContentLoaded', () => {
  // Comprobación preventiva: si el elemento navbar aún no ha sido inyectado de forma estática en el HTML
  if (!document.querySelector('nav#navbar')) {
    crearNavbar(); // Llama de forma síncrona al constructor para fabricar e insertar el menú de navegación
  }
  
  // Utiliza requestAnimationFrame para posponer la ejecución de la función de marcado al siguiente ciclo de renderizado del navegador,
  // garantizando que los nodos e hipervínculos estén completamente procesados y disponibles en el DOM antes de ser evaluados
  requestAnimationFrame(() => markActiveLink());
});