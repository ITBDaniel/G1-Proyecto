// ==========================================
// CONFIGURACIÓN E IMPORTACIÓN DE MÓDULOS
// ==========================================
import express from "express"; // Framework web para crear la API y gestionar las rutas
import bodyParser from "body-parser"; // Middleware para parsear el cuerpo de las peticiones HTTP (JSON)
import cors from "cors"; // Middleware para permitir peticiones desde diferentes dominios (Cross-Origin Resource Sharing)
import jwt from "jsonwebtoken"; // Librería para generar y verificar tokens de autenticación (JSON Web Tokens)
import bcrypt from "bcryptjs"; // Librería para encriptar y comparar contraseñas de forma segura
import path from 'path'; // Módulo nativo de Node.js para manejar y transformar rutas de archivos
import { fileURLToPath } from 'url'; // Función de Node.js para convertir URLs de archivos en rutas del sistema operativo
import db from "./db/dbConnection.js"; // Conexión local a la base de datos (presumiblemente SQLite)

const PORT = 3000; // Puerto donde se ejecutará el servidor
const JWT_SECRET = "tu_clave_secreta_muy_segura_123"; // Clave secreta para firmar y validar los tokens JWT
const app = express(); // Inicialización de la aplicación Express

app.use(cors()); // Habilita CORS en la aplicación para evitar bloqueos del navegador
app.use(bodyParser.json()); // Configura el servidor para aceptar datos en formato JSON en el cuerpo de las peticiones

// ==========================================
// 1. MIDDLEWARE PARA VERIFICAR EL TOKEN JWT
// ==========================================
function verificarToken(req, res, next) {
    // Intenta obtener la cabecera 'authorization' de la petición HTTP
    const authHeader = req.headers['authorization']; 
    
    // Si la cabecera no existe, bloquea el acceso con un código 401 (No autorizado)
    if (!authHeader) {
        return res.status(401).json({ success: false, error: "Token no proporcionado" });
    }
    
    // Las cabeceras JWT suelen tener el formato "Bearer [TOKEN]". 
    // split(' ')[1] separa la cadena por el espacio y se queda únicamente con la parte del token.
    const token = authHeader.split(' ')[1]; 
    
    try {
        // Verifica que el token sea auténtico y no haya expirado usando la clave secreta
        const decoded = jwt.verify(token, JWT_SECRET);
        // Guarda los datos del usuario (id, email, etc.) dentro del objeto 'req' para que estén disponibles en el endpoint
        req.usuario = decoded; 
        next(); // Permite que la petición continúe hacia la función del endpoint
    } catch (err) {
        // Si el token es falso, ha sido modificado o expiró, devuelve un error 401
        return res.status(401).json({ success: false, error: "Token inválido o expirado" });
    }
}

// ==========================================
// 2. FUNCIONES DE VALIDACIÓN CON REGEX (EXPRESIONES REGULARES)
// ==========================================

// Valida los datos recibidos al intentar actualizar el perfil de usuario
function validarPerfil(data) {
    const errors = [];
    // Verifica que el nombre exista, sea un texto y no esté vacío
    if (!data.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) errors.push('nom');
    
    // Expresión regular estándar para verificar si una cadena tiene formato de correo electrónico válido
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) errors.push('email');

    // La contraseña en el perfil es opcional (solo se valida si se envía una nueva)
    if (data.contrasenya !== undefined && data.contrasenya !== null && data.contrasenya !== '') {
        // Si se envió una contraseña, esta debe tener al menos 6 caracteres
        if (typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) {
            errors.push('contrasenya (mínimo 6 caracteres)');
        }
    }
    return errors; // Devuelve un array con los nombres de los campos que fallaron
}

// Valida los datos obligatorios al registrar un nuevo usuario
function validarUsuari(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string') errors.push('nom');
    
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) errors.push('email');
    
    // En el registro la contraseña sí es obligatoria y debe tener un mínimo de 6 caracteres
    if (!data.contrasenya || typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) errors.push('contrasenya');
    return errors;
}

// Valida las propiedades de un producto antes de guardarlo en el inventario
function validarProducte(data) {
    const errors = [];
    // Validaciones de cadenas de texto obligatorias que no deben estar vacías
    if (!data.component || typeof data.component !== 'string' || data.component.trim().length === 0) errors.push('component');
    if (!data.categoria || typeof data.categoria !== 'string' || data.categoria.trim().length === 0) errors.push('categoria');
    if (!data.descripcio || typeof data.descripcio !== 'string' || data.descripcio.trim().length === 0) errors.push('descripcio');
    if (!data.imatge || typeof data.imatge !== 'string' || data.imatge.trim().length === 0) errors.push('imatge');
    if (!data.usuari || typeof data.usuari !== 'string' || data.usuari.trim().length === 0) errors.push('usuari');

    // Convierte el precio a cadena de texto eliminando espacios
    const precioStr = data.precio === null || data.precio === undefined ? '' : String(data.precio).trim();
    // Expresión regular que valida que sean solo dígitos, permitiendo opcionalmente un punto y hasta 2 decimales
    const precioRegex = /^(?:\d+)(?:\.(?:\d{1,2}))?$/;
    
    if (!precioRegex.test(precioStr)) {
        errors.push('precio (formato inválido, máximo 2 decimales)');
    } else {
        const precioNum = Number(precioStr);
        // Verifica que el valor transformado a número no sea un NaN y sea mayor o igual a cero
        if (isNaN(precioNum) || precioNum < 0) {
            errors.push('precio (debe ser un número >= 0)');
        }
    }
    return errors;
}

// ==========================================
// 3. ENDPOINTS DE USUARIOS, REGISTRE I LOGIN
// ==========================================

// GET /usuaris - Obtiene el listado de todos los usuarios registrados (Requiere token de autenticación)
app.get("/usuaris", verificarToken, (req, res) => {
    try {
        // Prepara la consulta SQL seleccionando solo datos no sensibles
        const stmt = db.prepare("SELECT id, nom, email FROM usuaris");
        const data = stmt.all(); // Ejecuta la consulta y obtiene todas las filas
        res.json(data); // Responde al cliente enviando los datos en formato JSON
    } catch (err) {
        res.status(500).json({ success: false, error: err.message }); // Manejo de errores internos del servidor
    }
});

// POST /registre - Permite crear una nueva cuenta de usuario de forma pública
app.post("/registre", async (req, res) => {
    // Pasa los datos recibidos por la función de validación
    const errors = validarUsuari(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Campos incorrectos: " + errors.join(', ') });
    }
    
    try {
        // Verifica si el correo electrónico ya existe previamente en la base de datos
        const checkStmt = db.prepare("SELECT id FROM usuaris WHERE email = ?");
        const existing = checkStmt.get(req.body.email); // Ejecuta y obtiene una única fila
        if (existing) {
            return res.status(400).json({ success: false, error: "El email ya está registrado" });
        }
        
        // Encripta la contraseña de forma asíncrona mediante un algoritmo de hashing (sal de 10 rondas)
        const hashedPassword = await bcrypt.hash(req.body.contrasenya, 10);
        
        // Prepara la inserción del nuevo usuario en la base de datos
        const stmt = db.prepare("INSERT INTO usuaris (username, nom, email, contrasenya) VALUES (?, ?, ?, ?)");
        // Ejecuta pasándole los parámetros correspondientes
        const info = stmt.run(req.body.email, req.body.nom, req.body.email, hashedPassword);
        
        // Responde éxito incluyendo el ID generado de forma automática por la base de datos
        res.json({ success: true, message: "Usuario registrado correctamente", id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /login - Autentica un usuario y le proporciona un token JWT
app.post("/login", async (req, res) => {
    try {
        // Comprueba la presencia física de los dos campos necesarios
        if (!req.body.email || !req.body.contrasenya) {
            return res.status(400).json({ success: false, error: "Email y contraseña requeridos" });
        }
        
        // Busca al usuario por su email incluyendo la contraseña encriptada y su rol de administrador
        const stmt = db.prepare("SELECT id, nom, email, contrasenya, admin FROM usuaris WHERE email = ?");
        const usuario = stmt.get(req.body.email);
        
        // Si no se encuentra ninguna coincidencia, retorna error de credenciales
        if (!usuario) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        // Compara la contraseña en texto plano recibida con el hash almacenado en la base de datos
        const passwordMatch = await bcrypt.compare(req.body.contrasenya, usuario.contrasenya);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: "Credenciales inválidas" });
        }
        
        // Genera el token JWT introduciendo los datos del perfil dentro del payload de forma firmada
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nom: usuario.nom, admin: usuario.admin },
            JWT_SECRET,
            { expiresIn: '24h' } // Duración del token de 24 horas continuas
        );
        
        // Retorna la confirmación junto al token generado y los datos limpios del perfil
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

// PUT /usuario - Actualiza la información del perfil del usuario autenticado actual
app.put('/usuario', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id; // Extrae el ID real del token verificado por el middleware

        // Valida la estructura del cuerpo recibido en la petición
        const errors = validarPerfil(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: 'Campos incorrectos: ' + errors.join(', ') });
        }

        const nom = req.body.nom;
        const email = req.body.email;
        const contrasenya = req.body.contrasenya;

        // Comprueba que el nuevo email elegido no pertenezca a OTRO usuario diferente de la base de datos
        const emailExisting = db.prepare('SELECT id FROM usuaris WHERE email = ? AND id != ?').get(email, usuarioId);
        if (emailExisting) {
            return res.status(400).json({ success: false, error: 'El email ya está registrado' });
        }

        // Si se envió una nueva contraseña válida, se encripta y se actualiza junto a los otros campos
        if (contrasenya && contrasenya.trim() !== '') {
            const hashedPassword = await bcrypt.hash(contrasenya, 10);
            db.prepare('UPDATE usuaris SET nom = ?, email = ?, contrasenya = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), hashedPassword, usuarioId);
        } else {
            // Si no se suministró contraseña, se ignorará este campo en la sentencia SQL para no alterarla
            db.prepare('UPDATE usuaris SET nom = ?, email = ? WHERE id = ?')
                .run(nom.trim(), email.trim(), usuarioId);
        }

        // Sincroniza de forma desnormalizada el nombre de usuario dentro de los productos del inventario que le pertenecen
        db.prepare('UPDATE inventari SET usuari = ? WHERE user_id = ?').run(nom.trim(), usuarioId);

        // Obtiene el estado actualizado actual de la base de datos
        const updated = db.prepare('SELECT id, nom, email, admin FROM usuaris WHERE id = ?').get(usuarioId);

        // Genera un token JWT renovado que contiene la información actualizada del perfil del usuario
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

// GET /productes - Obtiene los productos para el público en general (No requiere autenticación)
app.get("/productes", (req, res) => {
    try {
        // Solo selecciona aquellos registros cuyo estado de moderación sea explícitamente 'Aprovat'
        const stmt = db.prepare("SELECT * FROM inventari WHERE estat = 'Aprovat' ORDER BY id DESC");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /productes/admin - Obtiene la totalidad del inventario (Solo administradores)
app.get("/productes/admin", verificarToken, (req, res) => {
    // Comprueba mediante el token si el flag de administrador es falso para vetar el acceso
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

// GET /productes/revisio - Obtiene productos en espera de ser moderados (Solo administradores)
app.get("/productes/revisio", verificarToken, (req, res) => {
    if (!req.usuario.admin) {
        return res.status(403).json({ success: false, error: "Acceso denegado" });
    }
    try {
        // Filtra los registros que cuenten con el estado inicial 'Pendent'
        const stmt = db.prepare("SELECT * FROM inventari WHERE estat = 'Pendent'");
        const data = stmt.all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /productes/mios - Obtiene los productos publicados exclusivamente por el usuario autenticado
app.get('/productes/mios', verificarToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM inventari WHERE user_id = ? ORDER BY id DESC');
        const data = stmt.all(req.usuario.id); // Usa el id del token extraído
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /productes/:id - Busca y devuelve un único producto específico por su ID numérico
app.get('/productes/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM inventari WHERE id = ?');
        const data = stmt.get(req.params.id); // Extrae el parámetro dinámico `:id` de la URL
        if (!data) {
            return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /usuaris/:id/email - Obtiene el email de contacto del creador de un artículo específico
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

// POST /crearProducte - Agrega un nuevo producto para revisión en el inventario
app.post("/crearProducte", verificarToken, (req, res) => {
    // Mapea y prepara el objeto local estructurando los datos necesarios
    const datosProducte = {
        component: req.body.component,
        categoria: req.body.categoria,
        descripcio: req.body.descripcio,
        imatge: req.body.imatge,
        precio: req.body.precio,
        usuari: req.usuario.nom, // Asigna directamente el nombre que viene verificado del token
        estat: 'Pendent' // Todo producto nuevo entra en revisión por defecto y requiere aprobación de un admin
    };
    
    // Valida la integridad estructural de los datos asignados
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
            new Date().toISOString() // Almacena la fecha actual exacta en formato estandarizado ISO string
        );
        res.json({ success: true, id: info.lastInsertRowid, message: "Producto creado correctamente en estado pendiente." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /productes/:id - Modifica un producto existente (Requiere ser propietario o administrador)
app.put("/productes/:id", verificarToken, (req, res) => {
    const id = req.params.id;
    try {
        // Recupera el estado original del producto antes de proceder con el cambio
        const producto = db.prepare("SELECT * FROM inventari WHERE id = ?").get(id);
        if (!producto) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }

        // Evalúa permisos de seguridad críticos
        const isOwner = producto.user_id === req.usuario.id; // ¿El producto le pertenece al usuario del token?
        const isAdmin = req.usuario.admin; // ¿El usuario del token cuenta con permisos de administrador?
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "No tienes permiso para modificar este producto" });
        }

        // Si se envió un nuevo valor se actualiza, de lo contrario retiene el valor existente por defecto
        const component = req.body.component || producto.component;
        const categoria = req.body.categoria || producto.categoria;
        const descripcio = req.body.descripcio || producto.descripcio;
        const imatge = req.body.imatge || producto.imatge;
        const precio = req.body.precio !== undefined ? req.body.precio : producto.precio;
        let estat = producto.estat;

        // Regla estricta: Solo los administradores pueden alterar el estado de aprobación ('Aprovat', 'Rebutjat', etc.)
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

// DELETE /productes/:id - Elimina un producto por ID (Requiere ser propietario o administrador)
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

        // Ejecuta la sentencia DELETE física en la base de datos
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
// Obtiene el equivalente a la ruta del archivo actual (__filename) utilizando el estándar ESM (ES Modules)
const __filename = fileURLToPath(import.meta.url);
// Determina el directorio contenedor de dicho archivo (__dirname)
const __dirname = path.dirname(__filename);
// Resuelve la ruta absoluta apuntando a la carpeta contenedora de la interfaz del frontend ('../frontEnd')
const staticPath = path.resolve(__dirname, '../frontEnd');

// Configura Express para servir automáticamente archivos estáticos (HTML, CSS, JS, imágenes) desde esa carpeta
app.use(express.static(staticPath));

// Middleware que funciona como 'Fallback' para aplicaciones de una sola página (SPA)
app.use((req, res, next) => {
    // Array que contiene los prefijos reservados estrictamente para la API REST del backend
    const apiPrefixes = ['/productes', '/usuaris', '/login', '/registre', '/crearProducte'];
    
    // Si la ruta solicitada coincide con alguna de la API, le cede el control para evitar romper los endpoints
    for (let i = 0; i < apiPrefixes.length; i++) {
        if (req.path.startsWith(apiPrefixes[i])) return next();
    }
    
    // Si el cliente solicita cualquier otra ruta de página web por URL directa, le sirve el archivo HTML principal
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Enciende el servidor HTTP escuchando las peticiones entrantes por el puerto asignado (3000)
app.listen(PORT, () => {
    console.log('Servidor corriendo en el puerto ' + PORT);
});