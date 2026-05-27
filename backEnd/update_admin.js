import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../ods.db');
const db = new DatabaseSync(dbPath);

const hash = '$2b$10$op8746fl.FfTtcaKZqU7o.Z9bFoJxfXiDZsgnpidsUKI.4mvSO6EO';

try {
    const stmt = db.prepare('UPDATE usuaris SET contrasenya = ?, admin = 1, email = ?, nom = ? WHERE id = 1');
    const info = stmt.run(hash, 'admin@loopware.com', 'Administrador');
    console.log('Updated rows:', info.changes);
    const row = db.prepare('SELECT id, username, email, nom, contrasenya, admin FROM usuaris WHERE id = 1').get();
    console.log(row);
} catch (err) {
    console.error('Error updating admin:', err.message);
}
