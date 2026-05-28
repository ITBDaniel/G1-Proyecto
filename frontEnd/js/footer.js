// ==========================================
// CONSTRUCCIÓN DINÁMICA DEL FOOTER (LOOPWARE)
// ==========================================

export function crearFooter() {
    // Evita duplicados comprobando si ya existe el footer en la página
    if (document.querySelector('footer.loopware-footer')) return;

    const footer = document.createElement('footer');
    footer.className = 'loopware-footer';

    // Reutilizamos la lógica exacta de tu navbar para calcular rutas relativas perfectas
    const basePath = window.location.pathname.includes('/pages/') ? '../' : '';

    footer.innerHTML = `
      <div class="footer-container">
        
        <div class="footer-col brand-col">
          <div class="footer-logo">Loopware</div>
          <p class="footer-tagline">Dándole una segunda vida a la tecnología. Menos residuos, más rendimiento.</p>
          <div class="sustainability-badge">
            🌱 Reaprovechamiento tecnológico
          </div>
        </div>
    
        <div class="footer-col">
          <h3>Plataforma</h3>
          <ul>
            <li><a href="${basePath}index.html">Inicio</a></li>
            <li><a href="${basePath}pages/sostenibilitat-ods.html">Sostenibilidad</a></li>
            <li><a href="${basePath}pages/sostenibilitat-repte.html">Problema y solución</a></li>
          </ul>
        </div>
    
        <div class="footer-col">
          <h3>Procesos Tech</h3>
          <ul>
            <li><a href="${basePath}pages/sostenibilitat-loopware.html">Cómo reutilizamos</a></li>
            <li><a href="${basePath}pages/sostenibilitat-practiques.html">Prácticas</a></li>
          </ul>
        </div>
    
        <div class="footer-col">
          <h3>Legal</h3>
          <ul>
            <li><a href="#privacidad">Política de Privacidad</a></li>
            <li><a href="#terminos">Términos del Servicio</a></li>
            <li><a href="#cookies">Cookies</a></li>
          </ul>
        </div>
    
      </div>
    
      <div class="footer-bottom">
        <p>&copy; 2026 Loopware. Hecho con 💙 para el planeta.</p>
      </div>
    `;

    // Inserta el footer al final del body (justo antes de cerrarse la etiqueta </body>)
    document.body.appendChild(footer);
}

// Inicializa automáticamente cuando el HTML esté listo
document.addEventListener('DOMContentLoaded', crearFooter);