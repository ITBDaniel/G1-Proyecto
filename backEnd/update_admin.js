// ==========================================
// CONFIGURACIÓN E IMPORTACIÓN DE MÓDULOS
// ==========================================
import path from 'path'; // Módulo nativo de Node.js para manejar y normalizar rutas de archivos y directorios
import { fileURLToPath } from 'url'; // Función para convertir URLs de archivos (import.meta.url) en rutas del sistema de archivos
import { DatabaseSync } from 'node:sqlite'; // API síncrona nativa de Node.js para interactuar con bases de datos SQLite

// Obtiene la ruta del directorio contenedor del archivo actual utilizando el estándar ES Modules (ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resuelve la ruta absoluta apuntando al archivo de la base de datos situado en el directorio superior ('../ods.db')
const dbPath = path.resolve(__dirname, '../ods.db');
// Abre la conexión con la base de datos SQLite de forma síncrona utilizando la ruta calculada
const db = new DatabaseSync(dbPath);

// Cadena de texto que representa una contraseña ya encriptada (hash) generada previamente con bcrypt
const hash = '$2b$10$op8746fl.FfTtcaKZqU7o.Z9bFoJxfXiDZsgnpidsUKI.4mvSO6EO';

// ==========================================
// EJECUCIÓN DE CONSULTAS Y ACTUALIZACIÓN
// ==========================================
try {
    // Prepara una sentencia SQL de actualización para modificar los datos del usuario con identificador único igual a 1
    // Los símbolos '?' actúan como marcadores de posición para inyectar parámetros de forma segura y evitar inyección SQL
    const stmt = db.prepare('UPDATE usuaris SET contrasenya = ?, admin = 1, email = ?, nom = ? WHERE id = 1');
    
    // Ejecuta la sentencia de actualización pasando los valores reales que sustituirán a los marcadores '?' en orden
    const info = stmt.run(hash, 'admin@loopware.com', 'Administrador');
    // Muestra por consola la cantidad de filas que fueron modificadas en la base de datos tras la ejecución
    console.log('Updated rows:', info.changes);
    
    // Prepara una nueva sentencia SQL de selección para consultar y verificar los campos del usuario que se acaba de modificar
    const row = db.prepare('SELECT id, username, email, nom, contrasenya, admin FROM usuaris WHERE id = 1').get();
    // Muestra por consola el objeto que representa la fila obtenida de la base de datos
    console.log(row);
} catch (err) {
    // Captura y muestra por consola cualquier fallo o error que ocurra durante la conexión o ejecución de las sentencias SQL
    console.error('Error updating admin:', err.message);
}