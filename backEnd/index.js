import express from "express";
import fs, { read } from "fs";
import bodyParser from "body-parser";
import { error } from "console";
import cors from "cors"
import db from "./db/dbConnection.js"


const PORT = 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());


app.listen(PORT, () => {
    console.log("Server listening on port " + PORT)
})

app.get("/usuaris", (req, res) => {
    const data = readData()
    res.json(data.usuaris)
})

function validarUsuari(data) {
    const errors = [];
    if (!data.nom || typeof data.nom !== 'string') errors.push('nom');
    if (!data.email || typeof data.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) errors.push('email');
    if (!data.contrasenya || typeof data.contrasenya !== 'string' || data.contrasenya.length < 6) errors.push('contrasenya');
    return errors;
}

app.post("/crearUsuari", (req, res) => {
    const errors = validarUsuari(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
    }
    // Aquí iría la lógica para insertar el usuario en la base de datos
    res.json({ success: true, message: "Usuari validat (lógica de inserción pendiente)" });
});

app.get("/productes", (req, res) => {
    const stmt = db.prepare("SELECT * FROM inventari");
    const data = stmt.all();
    res.json(data);
})

app.get("/productes/:id", (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM inventari WHERE id = ?");
        const data = stmt.get(req.params.id);
        if (!data) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
})

function validarProducte(data) {
    const errors = [];
    if (!data.component || typeof data.component !== 'string') errors.push('component');
    if (!data.categoria || typeof data.categoria !== 'string') errors.push('categoria');
    if (!data.estat || typeof data.estat !== 'string') errors.push('estat');
    if (!data.descripcio || typeof data.descripcio !== 'string') errors.push('descripcio');
    if (!data.imatge || typeof data.imatge !== 'string') errors.push('imatge');
    if (!data.usuari || typeof data.usuari !== 'string') errors.push('usuari');
    return errors;
}

app.post("/crearProducte", (req, res) => {
    // Si no se envía 'estat', ponerlo a 'Pendent' por defecto
    if (!req.body.estat || typeof req.body.estat !== 'string') {
        req.body.estat = 'Pendent';
    }
    const errors = validarProducte(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
    }
    const stmt = db.prepare("INSERT INTO inventari (component, categoria, estat, descripcio, imatge, usuari) VALUES (?, ?, ?, ?, ?, ?)");
    const info = stmt.run(req.body.component, req.body.categoria, req.body.estat, req.body.descripcio, req.body.imatge, req.body.usuari);
    res.json({ success: true, id: info.lastInsertRowid });
});

app.put("/productes/:id", (req, res) => {
    const id = req.params.id;
    // Si no se envía 'estat', ponerlo a 'Pendent' por defecto
    if (!req.body.estat || typeof req.body.estat !== 'string') {
        req.body.estat = 'Pendent';
    }
    const errors = validarProducte({ ...req.body, usuari: 'dummy' }); // usuari no es relevante para modificar
    // Solo validar los campos que se van a modificar
    if (errors.filter(e => e !== 'usuari').length > 0) {
        return res.status(400).json({ success: false, error: "Faltan o son incorrectos los campos: " + errors.join(', ') });
    }
    try {
        const stmt = db.prepare("UPDATE inventari SET component = ?, categoria = ?, estat = ?, descripcio = ?, imatge = ? WHERE id = ?");
        const info = stmt.run(req.body.component, req.body.categoria, req.body.estat, req.body.descripcio, req.body.imatge, id);
        if (info.changes === 0) {
            return res.status(404).json({ success: false, error: "Producto no encontrado" });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete("/productes/:id", (req, res) => {
    const id = req.params.id;
    try {
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


