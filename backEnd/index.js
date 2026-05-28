import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from 'path';
import { fileURLToPath } from 'url';
import db from "./db/dbConnection.js";

const PORT = 3000;
const JWT_SECRET = "tu_clave_secreta_muy_segura_123"; 
const app = express();

app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. MIDDLEWARE PARA VERIFICAR EL TOKEN JWT
// ==========================================
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ success: false, error: "Token no proporcionado" });
    }
    
    // Separamos la palabra "Bearer" del token real
    const token = authHeader.split(' ')[1]; 
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded; // Guardamos los datos del usuario descodificados en la petición
        next(); // Damos paso a la función del endpoint
    } catch (err) {
        return res.status(401).json({ success: false, error: "Token inválido o expirado" });
    }
}

// ==========================================
// 2. FUNCIONES DE VALIDACIÓN CON REGEX
// ==========================================
function validarPerfil(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) errors.push('nom');
    
    // Regex de Email
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) errors.push('email');

    if (data.contrasenya !== undefined && data.contrasenya !== null && data.contrasenya !== '') {
        if (typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) {
            errors.push('contrasenya (mínimo 6 caracteres)');
        }
    }
    return errors;
}

function validarUsuari(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string') errors.push('nom');
    
    // Regex de Email
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) errors.push('email');
    
    if (!data.contrasenya || typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) errors.push('contrasenya');
    return errors;
}

function validarProducte(data) {
    const errors = [];
    if (!data.component || typeof data.component !== 'string' || data.component.trim().length === 0) errors.push('component');
    if (!data.categoria || typeof data.categoria !== 'string' || data.categoria.trim().length === 0) errors.push('categoria');
    if (!data.descripcio || typeof data.descripcio !== 'string' || data.descripcio.trim().length === 0) errors.push('descripcio');
    if (!data.imatge || typeof data.imatge !== 'string' || data.imatge.trim().length === 0) errors.push('imatge');
    if (!data.usuari || typeof data.usuari !== 'string' || data.usuari.trim().length === 0) errors.push('usuari');

    // Regex de Precio (Máximo 2 decimales y >= 0)
    const precioStr = data.precio === null || data.precio === undefined ? '' : String(data.precio).trim();
    const precioRegex = /^(?:\d+)(?:\.(?:\d{1,2}))?$/;
    
    if (!precioRegex.test(precioStr)) {
        errors.push('precio (formato inválido, máximo 2 decimales)');
    } else {
        const precioNum = Number(precioStr);
        if (isNaN(precioNum) || precioNum < 0) {
            errors.push('precio (debe ser un número >= 0)');
        }
    }
    return errors;
}

// ==========================================
// 3. ENDPOINTS DE USUARIOS, REGISTRE I LOGIN
// ==========================================
app.get("/usuaris", verificarToken, (req, res) => {
    try {
        const stmt = db.prepare("SELECT id, nom, email FROM usuaris");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/registre", async (req, res) => {
    const errors = validarUsuari(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Campos incorrectos: " + errors.join(', ') });
    }
    
    try {
        const checkStmt = db.prepare("SELECT id FROM usuaris WHERE email = ?");
        const existing = checkStmt.get(req.body.email);
        if (existing) {
            return res.status(400).json({ success: false, error: "El email ya está registrado" });
        }
        
        const hashedPassword = await bcrypt.hash(req.body.contrasenya, 10);
        
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
            return res.status(400).json({ success: false, error: "Email y contraseña requeridos" });
        }
        
        const stmt = db.prepare("SELECT id, nom, email, contrasenya, admin FROM usuaris WHERE email = ?");
        const usuario = stmt.get(req.body.email);
        
        if (!usuario) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        const passwordMatch = await bcrypt.compare(req.body.contrasenya, usuario.contrasenya);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nom: usuario.nom, admin: usuario.admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            message: "Login exitoso",
            token: token,
            usuario: { id: usuario.id, nom: usuario.nom, email: usuario.email, admin: usuario.admin === 1 }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/usuario', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const errors = validarPerfil(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: 'Campos incorrectos: ' + errors.join(', ') });
        }

        const nom = req.body.nom;
        const email = req.body.email;
        const contrasenya = req.body.contrasenya;

        const emailExisting = db.prepare('SELECT id FROM usuaris WHERE email = ? AND id != ?').get(email, usuarioId);
        if (emailExisting) {
            return res.status(400).json({ success: false, error: 'El email ya está registrado' });
        }

        if (contrasenya && contrasenya.trim() !== '') {
            const hashedPassword = await bcrypt.hash(contrasenya, 10);
            db.prepare('UPDATE usuaris SET nom = ?, email = ?, contrasenya = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), hashedPassword, usuarioId);
        } else {
            db.prepare('UPDATE usuaris SET nom = ?, email = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), usuarioId);
        }

        // Sincronizar el nombre del usuario en la tabla inventari
        db.prepare('UPDATE inventari SET usuari = ? WHERE user_id = ?').run(nom.trim(), usuarioId);

        const updated = db.prepare('SELECT id, nom, email, admin FROM usuaris WHERE id = ?').get(usuarioId);

        const token = jwt.sign(
            { id: updated.id, email: updated.email, nom: updated.nom, admin: updated.admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({ success: true, token, usuario: { id: updated.id, nom: updated.nom, email: updated.email, admin: updated.admin === 1 } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 4. ENDPOINTS DEL CRUD DE PRODUCTOS (ECONOMÍA CIRCULAR)
// ==========================================
app.get("/productes", (req, res) => {
    try {
        // Solo mostramos los productos aprobados públicamente
        const stmt = db.prepare("SELECT * FROM inventari WHERE estat = 'Aprovat' ORDER BY id DESC");
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

app.get('/productes/mios', verificarToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM inventari WHERE user_id = ? ORDER BY id DESC');
        const data = stmt.all(req.usuario.id);
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
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Obtener email del autor del producto (para contacto)
app.get('/usuaris/:id/email', verificarToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT email FROM usuaris WHERE id = ?');
        const data = stmt.get(req.params.id);

        if (!data) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        return res.json({ success: true, email: data.email });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/crearProducte", verificarToken, (req, res) => {
    const datosProducte = {
        component: req.body.component,
        categoria: req.body.categoria,
        descripcio: req.body.descripcio,
        imatge: req.body.imatge,
        precio: req.body.precio,
        usuari: req.usuario.nom,
        estat: 'Pendent' // Todo producto nuevo entra en revisión por defecto
    };
    
    const errors = validarProducte(datosProducte);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Campos incorrectos: " + errors.join(', ') });
    }
    
    try {
        const stmt = db.prepare("INSERT INTO inventari (component, categoria, estat, descripcio, imatge, precio, user_id, usuari, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const info = stmt.run(
            datosProducte.component.trim(),
            datosProducte.categoria.trim(),
            datosProducte.estat,
            datosProducte.descripcio.trim(),
            datosProducte.imatge.trim(),
            Number(datosProducte.precio),
            req.usuario.id,
            datosProducte.usuari,
            new Date().toISOString()
        );
        res.json({ success: true, id: info.lastInsertRowid, message: "Producto creado correctamente en estado pendiente." });
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

        const isOwner = producto.user_id === req.usuario.id;
        const isAdmin = req.usuario.admin;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "No tienes permiso para modificar este producto" });
        }

        const component = req.body.component || producto.component;
        const categoria = req.body.categoria || producto.categoria;
        const descripcio = req.body.descripcio || producto.descripcio;
        const imatge = req.body.imatge || producto.imatge;
        const precio = req.body.precio !== undefined ? req.body.precio : producto.precio;
        let estat = producto.estat;

        // Solo los administradores pueden alterar el estado de aprobación
        if (isAdmin && req.body.estat) {
            estat = req.body.estat;
        }

        const stmt = db.prepare("UPDATE inventari SET component = ?, categoria = ?, estat = ?, descripcio = ?, imatge = ?, precio = ? WHERE id = ?");
        stmt.run(component, categoria, estat, descripcio, imatge, Number(precio), id);
        
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

        const isOwner = producto.user_id === req.usuario.id;
        const isAdmin = req.usuario.admin;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "No tienes permiso para eliminar este producto" });
        }

        const stmt = db.prepare("DELETE FROM inventari WHERE id = ?");
        stmt.run(id);
        res.json({ success: true, message: "Producto eliminado" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. SERVIR EL FRONTEND Y ENRUTAMIENTO ESTÁTICO
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.resolve(__dirname, '../frontEnd');

app.use(express.static(staticPath));

// Redirección clásica para peticiones de páginas que no correspondan a la API
app.use((req, res, next) => {
    const apiPrefixes = ['/productes', '/usuaris', '/login', '/registre', '/crearProducte'];
    for (let i = 0; i < apiPrefixes.length; i++) {
        if (req.path.startsWith(apiPrefixes[i])) return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log('Servidor corriendo en el puerto ' + PORT);
});