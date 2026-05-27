import express from "express";
import bodyParser from "body-parser";
import cors from "cors"
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from 'path';
import { fileURLToPath } from 'url';
import db from "./db/dbConnection.js"


const PORT = 3000;
const JWT_SECRET = "tu_clave_secreta_muy_segura_123"; // Cambiar por variable de entorno en producción
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Middleware para verificar JWT
function verificarToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: "Token no proporcionado" });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Token inválido o expirado" });
    }
}

// (Server will be started at the end after routes and static middleware)

app.get("/usuaris", verificarToken, (req, res) => {
    try {
        const stmt = db.prepare("SELECT id, nom, email FROM usuaris");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

function validarPerfil(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) errors.push('nom');
    if (!data.email || typeof data.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errors.push('email');

    // contrasenya es opcional
    if (data.contrasenya !== undefined && data.contrasenya !== null && data.contrasenya !== '') {
        if (typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) {
            errors.push('contrasenya (mínimo 6 caracteres)');
        }
    }

    return errors;
}

app.put('/usuario', verificarToken, async (req, res) => {
    try {
        const usuarioToken = req.usuario;
        const usuarioId = usuarioToken?.id;
        if (!usuarioId) {
            return res.status(400).json({ success: false, error: 'Usuario no identificado' });
        }

        const errors = validarPerfil(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: 'Faltan o son incorrectos los campos: ' + errors.join(', ') });
        }

        const { nom, email, contrasenya } = req.body;

        // Comprobar unicidad de email si cambia
        const emailExisting = db.prepare('SELECT id FROM usuaris WHERE email = ? AND id != ?').get(email, usuarioId);
        if (emailExisting) {
            return res.status(400).json({ success: false, error: 'El email ya está registrado' });
        }

        let hashedPassword = null;
        if (contrasenya !== undefined && contrasenya !== null && contrasenya !== '') {
            hashedPassword = await bcrypt.hash(contrasenya, 10);
        }

        if (hashedPassword) {
            db.prepare('UPDATE usuaris SET nom = ?, email = ?, contrasenya = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), hashedPassword, usuarioId);
        } else {
            db.prepare('UPDATE usuaris SET nom = ?, email = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), usuarioId);
        }

        // Mantener el nombre de usuario en los productos del usuario actualizado
        try {
            db.prepare('UPDATE inventari SET usuari = ? WHERE user_id = ?').run(nom.trim(), usuarioId);
            db.prepare('UPDATE inventari SET usuari = ? WHERE user_id IS NULL AND usuari = ?')
                .run(nom.trim(), usuarioToken.nom);
        } catch (err) {
            console.warn('No se pudo sincronizar el nombre de usuario en productos:', err.message);
        }

        const updated = db.prepare('SELECT id, nom, email, admin FROM usuaris WHERE id = ?').get(usuarioId);

        const token = jwt.sign(
            { id: updated.id, email: updated.email, nom: updated.nom, admin: updated.admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({ success: true, token, usuario: { id: updated?.id, nom: updated?.nom, email: updated?.email, admin: !!updated?.admin } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


function validarUsuari(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string') errors.push('nom');
    if (!data.email || typeof data.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errors.push('email');
    if (!data.contrasenya || typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) errors.push('contrasenya');
    return errors;
}

app.post("/registre", async (req, res) => {
    const errors = validarUsuari(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
    }
    
    try {
        // Verificar si el email ya existe
        const checkStmt = db.prepare("SELECT id FROM usuaris WHERE email = ?");
        const existing = checkStmt.get(req.body.email);
        if (existing) {
            return res.status(400).json({ success: false, error: "El email ya está registrado" });
        }
        
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(req.body.contrasenya, 10);
        
        // Insertar nuevo usuario
        // La BD exigeix username NOT NULL, així que el definim
        // (usem email com a username per mantenir unicitat i simplicitat)
        const stmt = db.prepare("INSERT INTO usuaris (username, nom, email, contrasenya) VALUES (?, ?, ?, ?)");
        const info = stmt.run(req.body.email, req.body.nom, req.body.email, hashedPassword);

        
        res.json({ success: true, message: "Usuario registrado correctamente", id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/login", async (req, res) => {
    try {
        if (!req.body.email || !req.body.contrasenya) {
            return res.status(400).json({ success: false, error: "Email y contraseña son requeridos" });
        }
        
        // Buscar usuario por email
        const stmt = db.prepare("SELECT id, nom, email, contrasenya, admin FROM usuaris WHERE email = ?");
        const usuario = stmt.get(req.body.email);
        
        if (!usuario) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(req.body.contrasenya, usuario.contrasenya);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        // Generar JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nom: usuario.nom, admin: usuario.admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            message: "Login exitoso",
            token: token,
            usuario: { id: usuario.id, nom: usuario.nom, email: usuario.email, admin: !!usuario.admin }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/productes", (req, res) => {
    try {
        // Solo mostrar productos aprobados (públicos)
        const stmt = db.prepare("SELECT * FROM inventari WHERE estat = 'Aprovat' ORDER BY created_at DESC");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/productes/admin", verificarToken, (req, res) => {
    if (!req.usuario.admin) {
        return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    try {
        const stmt = db.prepare("SELECT * FROM inventari");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/productes/revisio", verificarToken, (req, res) => {
    if (!req.usuario.admin) {
        return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    try {
        const stmt = db.prepare("SELECT * FROM inventari WHERE estat = 'Pendent'");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Mis productos (visible para el usuario autenticado)
app.get('/productes/mios', verificarToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM inventari WHERE user_id = ? ORDER BY id DESC');
        let data = stmt.all(req.usuario.id);

        // Fallback para productos antiguos sin user_id
        if (!Array.isArray(data) || data.length === 0) {
            const stmtFallback = db.prepare('SELECT * FROM inventari WHERE usuari = ? ORDER BY id DESC');
            data = stmtFallback.all(req.usuario.nom);
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


app.get('/productes/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM inventari WHERE id = ?');
        const data = stmt.get(req.params.id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }

        // Intentar obtener usuario desde token si se proporciona
        let usuario = null;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                usuario = jwt.verify(token, JWT_SECRET);
            } catch (e) {
                usuario = null;
            }
        }

        // Si el producto está aprobado, es público (accesible para todos)
        if (data.estat === 'Aprovat') {
            return res.json(data);
        }

        // Si no está aprobado, solo puede verlo el propietario o un admin autenticado
        const isOwner = usuario && (data.user_id === usuario.id || data.usuari === usuario.nom);
        if (usuario && (usuario.admin || isOwner)) {
            return res.json(data);
        }

        // Si no cumple ninguna condición, denegar acceso
        return res.status(403).json({ success: false, error: 'No tienes permiso para ver este producto' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

function validarProducte(data) {
    const errors = [];
    const estadosValidos = ['Pendent', 'Aprovat', 'Rebutjat'];

    if (!data.component || typeof data.component !== 'string' || data.component.trim().length === 0) errors.push('component');
    if (!data.categoria || typeof data.categoria !== 'string' || data.categoria.trim().length === 0) errors.push('categoria');
    if (!data.descripcio || typeof data.descripcio !== 'string' || data.descripcio.trim().length === 0) errors.push('descripcio');
    if (!data.imatge || typeof data.imatge !== 'string' || data.imatge.trim().length === 0) errors.push('imatge');
    if (!data.usuari || typeof data.usuari !== 'string' || data.usuari.trim().length === 0) errors.push('usuari');

    // Validar precio con formato: hasta 2 decimales (ej 300 o 300.00) y >= 0
    const precioStr = data.precio === null || data.precio === undefined ? '' : String(data.precio).trim();
    const precioRegex = /^(?:\d+)(?:\.(?:\d{1,2}))?$/;
    if (!precioRegex.test(precioStr)) {
        errors.push('precio (formato inválido, máximo 2 decimales)');
    } else {
        const precioNum = Number(precioStr);
        if (Number.isNaN(precioNum) || precioNum < 0) {
            errors.push('precio (debe ser un número >= 0)');
        }
    }

    // Validar estado solo si se proporciona
    if (data.estat && !estadosValidos.includes(data.estat)) {
        errors.push('estat (valores válidos: Pendent, Aprovat, Rebutjat)');
    }

    return errors;
}

app.post("/crearProducte", verificarToken, (req, res) => {
    // Asegurar que el estado siempre sea 'Pendent' para nuevos productos
    const datosProducte = {
        ...req.body,
        estat: 'Pendent'
    };
    
    const errors = validarProducte(datosProducte);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
    }
    
    try {
        const stmt = db.prepare("INSERT INTO inventari (component, categoria, estat, descripcio, imatge, precio, user_id, usuari, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const info = stmt.run(
            datosProducte.component.trim(),
            datosProducte.categoria.trim(),
            datosProducte.estat,
            datosProducte.descripcio.trim(),
            datosProducte.imatge.trim(),
            Number(String(datosProducte.precio).trim()),
            req.usuario.id,
            datosProducte.usuari.trim(),
            new Date().toISOString()
        );
        res.json({ success: true, id: info.lastInsertRowid, message: "Producto creado correctamente. Espera a que un administrador lo apruebe." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put("/productes/:id", verificarToken, (req, res) => {
    const id = req.params.id;
    try {
        const producto = db.prepare("SELECT * FROM inventari WHERE id = ?").get(id);
        if (!producto) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }

        const isOwner = producto.user_id === req.usuario.id || producto.usuari === req.usuario.nom;
        const isAdmin = req.usuario.admin;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "No tienes permiso para modificar este producto" });
        }

        const actualizado = {
            component: req.body.component?.trim() || producto.component,
            categoria: req.body.categoria?.trim() || producto.categoria,
            descripcio: req.body.descripcio?.trim() || producto.descripcio,
            imatge: req.body.imatge?.trim() || producto.imatge,
            precio: req.body.precio ?? producto.precio,
            estat: producto.estat
        };

        // Solo admins pueden cambiar el estado
        if (isAdmin && req.body.estat && typeof req.body.estat === 'string') {
            const estadosValidos = ['Pendent', 'Aprovat', 'Rebutjat'];
            if (estadosValidos.includes(req.body.estat)) {
                actualizado.estat = req.body.estat;
            }
        }

        const errors = validarProducte({ ...actualizado, usuari: producto.usuari });
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
        }

        const stmt = db.prepare("UPDATE inventari SET component = ?, categoria = ?, estat = ?, descripcio = ?, imatge = ?, precio = ? WHERE id = ?");
        const info = stmt.run(actualizado.component, actualizado.categoria, actualizado.estat, actualizado.descripcio, actualizado.imatge, Number(String(actualizado.precio).trim()), id);
        if (info.changes === 0) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }
        res.json({ success: true, message: "Producto actualizado correctamente" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete("/productes/:id", verificarToken, (req, res) => {
    const id = req.params.id;
    try {
        const producto = db.prepare("SELECT * FROM inventari WHERE id = ?").get(id);
        if (!producto) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }

        const isOwner = producto.user_id === req.usuario.id || producto.usuari === req.usuario.nom;
        const isAdmin = req.usuario.admin;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "No tienes permiso para eliminar este producto" });
        }

        const stmt = db.prepare("DELETE FROM inventari WHERE id = ?");
        const info = stmt.run(id);
        if (info.changes === 0) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Serve static frontend and fallback to index.html
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.resolve(__dirname, '../frontEnd');
app.use(express.static(staticPath));
// Fallback: servir index.html para rutas que no sean la API
app.use((req, res, next) => {
    const apiPrefixes = ['/productes', '/usuaris', '/login', '/registre', '/crearProducte'];
    if (apiPrefixes.some(p => req.path.startsWith(p))) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log('Server listening on port ' + PORT);
});


