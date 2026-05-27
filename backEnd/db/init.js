import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../ods.db');
const db = new DatabaseSync(dbPath);

const createUsersTable = `
CREATE TABLE IF NOT EXISTS usuaris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contrasenya TEXT NOT NULL,
    admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

try {
    db.exec(createUsersTable);
    console.log("✓ Tabla 'usuaris' verificada/creada correctamente");
} catch (err) {
    console.error("✗ Error al crear tabla 'usuaris':", err.message);
}

const tableInfoUsuaris = db.prepare("PRAGMA table_info(usuaris)").all();
function hasColumnUsuaris(name) {
    return tableInfoUsuaris.some(column => column.name === name);
}

const tableInfoInventari = db.prepare("PRAGMA table_info(inventari)").all();
function hasColumnInventari(name) {
    return tableInfoInventari.some(column => column.name === name);
}

// Añadir columnas ausentes de forma segura en usuaris
const alters = [];
if (!hasColumnUsuaris('admin')) alters.push("ALTER TABLE usuaris ADD COLUMN admin INTEGER DEFAULT 0");
if (!hasColumnUsuaris('email')) alters.push("ALTER TABLE usuaris ADD COLUMN email TEXT");
if (!hasColumnUsuaris('nom')) alters.push("ALTER TABLE usuaris ADD COLUMN nom TEXT");
if (!hasColumnUsuaris('contrasenya')) alters.push("ALTER TABLE usuaris ADD COLUMN contrasenya TEXT");
if (!hasColumnUsuaris('created_at')) alters.push("ALTER TABLE usuaris ADD COLUMN created_at DATETIME");

for (const sql of alters) {
    try {
        db.exec(sql);
        console.log('✓ Ejecutado:', sql);
    } catch (err) {
        console.warn('✗ No se pudo ejecutar:', sql, '-', err.message);
    }
}

// Comprobar si ya existe un admin
let adminExists = db.prepare("SELECT id FROM usuaris WHERE admin = 1 LIMIT 1").get();
if (!adminExists) {
    const adminEmail = 'admin@loopware.com';
    const adminPassword = bcrypt.hashSync('Admin123!', 10);
    try {
        // Intentar insertar rellenando los campos que existan
        if (hasColumnUsuaris('email') && hasColumnUsuaris('nom') && hasColumnUsuaris('contrasenya')) {
            db.prepare("INSERT INTO usuaris (nom, email, contrasenya, admin) VALUES (?, ?, ?, 1)")
                .run('Administrador', adminEmail, adminPassword);
        } else if (hasColumnUsuaris('username')) {
            db.prepare("INSERT INTO usuaris (username, admin) VALUES (?, 1)").run('admin');
        } else {
            db.prepare("INSERT INTO usuaris (nom, admin) VALUES (?, 1)").run('Administrador');
        }
        console.log("✓ Usuario administrador creado: admin@loopware.com / Admin123!");
    } catch (err) {
        console.error("✗ Error al crear usuario administrador:", err.message);
    }
}

const createProductsTable = `
CREATE TABLE IF NOT EXISTS inventari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component TEXT NOT NULL,
    categoria TEXT NOT NULL,
    estat TEXT DEFAULT 'Pendent',
    descripcio TEXT,
    imatge TEXT,
    precio REAL DEFAULT 0,
    user_id INTEGER,
    usuari TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

// Asegurar que columnas nuevas existan en tablas ya creadas
if (!hasColumnInventari('precio')) {
    try {
        db.exec("ALTER TABLE inventari ADD COLUMN precio REAL DEFAULT 0");
        console.log('✓ Ejecutado: ALTER TABLE inventari ADD COLUMN precio REAL DEFAULT 0');
    } catch (err) {
        console.warn('✗ No se pudo ejecutar: ALTER TABLE inventari ADD COLUMN precio -', err.message);
    }
}

// Añadir user_id si no existe
if (!hasColumnInventari('user_id')) {
    try {
        db.exec("ALTER TABLE inventari ADD COLUMN user_id INTEGER");
        console.log('✓ Ejecutado: ALTER TABLE inventari ADD COLUMN user_id INTEGER');
    } catch (err) {
        console.warn('✗ No se pudo ejecutar: ALTER TABLE inventari ADD COLUMN user_id -', err.message);
    }
}

if (!hasColumnInventari('created_at')) {
    try {
        db.exec("ALTER TABLE inventari ADD COLUMN created_at DATETIME");
        console.log('✓ Ejecutado: ALTER TABLE inventari ADD COLUMN created_at DATETIME');
    } catch (err) {
        console.warn('✗ No se pudo ejecutar: ALTER TABLE inventari ADD COLUMN created_at DATETIME -', err.message);
    }
}


try {
    db.exec(createProductsTable);
    console.log("✓ Tabla 'inventari' verificada/creada correctamente");
} catch (err) {
    console.error("✗ Error al crear tabla 'inventari':", err.message);
}

console.log("Base de datos inicializada correctamente");
