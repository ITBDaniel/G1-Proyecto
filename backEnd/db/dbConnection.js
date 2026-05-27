import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import "./init.js"; // Inicializar base de datos

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../ods.db');
const db = new DatabaseSync(dbPath);

export default db;