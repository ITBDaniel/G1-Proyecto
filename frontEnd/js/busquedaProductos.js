

function normalizar(str) {
  return (str ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export function initBusqueda({ listEl, inputMountParent, placeholder = 'Buscar…' }) {
  if (!listEl) return;

  const parent = inputMountParent ?? listEl.parentElement;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-wrapper';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  // Placeholder con lupa dentro del input
  input.placeholder = `🔎 ${placeholder}`;

  wrapper.appendChild(input);

  if (parent) parent.insertBefore(wrapper, listEl);

  function aplicarFiltro() {
    const q = normalizar(input.value);

    // cards visibles/filtrables
    const cards = Array.from(listEl.children).filter(el => el.classList.contains('product-card'));

    let visibleCount = 0;
    for (const card of cards) {
      const titulo = normalizar(card.querySelector('h3, h2')?.textContent);
      const visible = q.length === 0 || titulo.includes(q);

      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    }

    // Mostrar/ocultar mensaje de resultados vacíos
    const existing = parent?.querySelector('.search-empty');
    if (visibleCount === 0 && q.length > 0) {
      if (!existing) {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = 'No hay resultados para tu búsqueda.';
        parent?.insertBefore(empty, listEl);
      }
    } else {
      existing?.remove();
    }
  }

  input.addEventListener('input', aplicarFiltro);
  aplicarFiltro();
}

