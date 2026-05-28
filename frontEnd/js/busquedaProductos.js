// ==========================================
// FUNCIÓN AUXILIAR DE LIMPIEZA DE TEXTO
// ==========================================

// Transforma una cadena de texto para facilitar comparaciones de búsqueda ignorando mayúsculas, acentos y espacios adicionales
function normalizar(str) {
  return (str ?? '') // Si la entrada es null o undefined, utiliza una cadena vacía para evitar errores
    .toString() // Fuerza la conversión del valor de entrada a un tipo de dato string
    .toLowerCase() // Convierte todo el texto a letras minúsculas
    .normalize('NFD') // Descompone los caracteres acentuados en sus componentes base y diacríticos separados (Ej: "é" se convierte en "e" + "´")
    .replace(/\p{Diacritic}/gu, '') // Utiliza una expresión regular con soporte Unicode para buscar y eliminar todos los diacríticos (acentos, tildes, diéresis)
    .trim(); // Elimina los espacios en blanco sobrantes al principio y al final de la cadena de texto
}

// ==========================================
// COMPONENTE DINÁMICO DE BÚSQUEDA Y FILTRADO
// ==========================================

// Inicializa e inyecta de forma dinámica un buscador interactivo conectado a una lista de elementos del DOM
export function initBusqueda({ listEl, inputMountParent, placeholder = 'Buscar…' }) {
  // Cláusula de salvaguarda: si el elemento contenedor de la lista no existe en el DOM, interrumpe la ejecución inmediatamente
  if (!listEl) return;

  // Define el nodo padre donde se montará el buscador; usa el contenedor personalizado o, por defecto, el padre directo de la lista
  const parent = inputMountParent ?? listEl.parentElement;

  // Crea un elemento contenedor (div) para agrupar y aplicar estilos estructurados al cuadro de búsqueda
  const wrapper = document.createElement('div');
  wrapper.className = 'search-wrapper'; // Asigna una clase CSS para la maquetación del contenedor

  // Crea el elemento de entrada de datos (input) propiamente dicho
  const input = document.createElement('input');
  input.type = 'search'; // Define el tipo como 'search' para aprovechar características nativas (como el botón para limpiar texto)
  input.className = 'search-input'; // Asigna una clase CSS para aplicar los estilos visuales del diseño
  // Establece el texto de sugerencia interno inyectando un icono visual de lupa
  input.placeholder = `🔎 ${placeholder}`;

  // Introduce el nodo del input dentro del contenedor wrapper recién creado
  wrapper.appendChild(input);

  // Inserta el contenedor del buscador en la jerarquía del DOM, posicionándolo exactamente antes del elemento de la lista
  if (parent) parent.insertBefore(wrapper, listEl);

  // ==========================================
  // LÓGICA DE FILTRADO EN TIEMPO REAL
  // ==========================================

  // Analiza el contenido del buscador y oculta o muestra los elementos del catálogo según la coincidencia
  function aplicarFiltro() {
    // Obtiene y procesa el término de búsqueda actual ingresado por el usuario usando la función de normalización
    const q = normalizar(input.value);

    // Obtiene todos los nodos hijos directos de la lista y los convierte en un Array de JS 
    // para filtrarlos y quedarse únicamente con los elementos que tengan la clase 'product-card'
    const cards = Array.from(listEl.children).filter(el => el.classList.contains('product-card'));

    let visibleCount = 0; // Contador local para realizar el seguimiento de cuántos productos siguen visibles
    
    // Itera uno a uno sobre el listado de tarjetas de producto filtradas
    for (const card of cards) {
      // Busca el primer encabezado (h3 o h2) dentro de la tarjeta actual y normaliza su contenido de texto interno
      const titulo = normalizar(card.querySelector('h3, h2')?.textContent);
      // El producto es visible si el término de búsqueda está vacío OR si el título normalizado contiene la cadena buscada (q)
      const visible = q.length === 0 || titulo.includes(q);

      // Si es visible remueve la propiedad display modificada (vuelve al flujo CSS normal), si no, lo oculta por completo con 'none'
      card.style.display = visible ? '' : 'none';
      // Si la tarjeta cumple con el criterio de visibilidad, incrementa el contador de control
      if (visible) visibleCount++;
    }

    // ==========================================
    // GESTIÓN DEL MENSAJE DE RESULTADOS VACÍOS
    // ==========================================
    
    // Intenta buscar si ya existe previamente inyectado en el DOM un mensaje de aviso por búsqueda vacía
    const existing = parent?.querySelector('.search-empty');
    
    // Condición: Si no se encontraron coincidencias visibles y el usuario efectivamente ha escrito algo en el buscador
    if (visibleCount === 0 && q.length > 0) {
      // Si el mensaje de aviso no existe en el DOM, procede a construirlo e insertarlo dinámicamente
      if (!existing) {
        const empty = document.createElement('div');
        empty.className = 'search-empty'; // Asigna la clase de estilos correspondientes
        empty.textContent = 'No hay resultados para tu búsqueda.'; // Define el mensaje de texto de advertencia
        // Inserta el aviso de forma ordenada justo antes de la lista de productos
        parent?.insertBefore(empty, listEl);
      }
    } else {
      // Si hay elementos visibles o el buscador se limpia, elimina el mensaje de error del DOM si existiera
      existing?.remove();
    }
  }

  // Vincula el evento nativo 'input' para ejecutar la función de filtrado inmediatamente cada vez que el usuario escribe o borra un carácter
  input.addEventListener('input', aplicarFiltro);
  // Ejecuta una pasada inicial automática de la función para sincronizar el estado visual por primera vez
  aplicarFiltro();
}