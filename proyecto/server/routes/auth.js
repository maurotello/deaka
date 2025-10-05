import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();

// --- RUTA DE REGISTRO (Sin cambios) ---
router.post('/register', async (req, res) => {
    // ... (Tu código actual está bien aquí)
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const { rows } = await db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, password_hash]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'El email ya está en uso o hubo un error en el servidor.' });
    }
});

// --- RUTA DE LOGIN (CORREGIDA) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos.' });

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas.' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas.' });

        // Usamos la misma variable de entorno en todos lados para consistencia
        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET, // CORREGIDO: Usar JWT_SECRET
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET, // CORREGIDO: Usar JWT_REFRESH_SECRET
            { expiresIn: '7d' }
        );
        
        await db.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        // ▼▼▼ CAMBIO CLAVE ▼▼▼
        // El nombre de la cookie ahora es 'refreshToken', consistente con el resto del código.
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        res.json({
            accessToken,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- RUTA DE REFRESH (CORREGIDA Y SIMPLIFICADA) ---
router.get('/refresh', async (req, res) => {
    // ▼▼▼ CAMBIO CLAVE ▼▼▼
    // Ahora buscamos 'refreshToken' y SÍ la vamos a encontrar.
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: 'No autorizado, no se proporcionó token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const userResult = await db.query('SELECT id, email, refresh_token FROM users WHERE id = $1', [decoded.id]);
        
        // Verificamos que el usuario exista Y que el token en la DB coincida (mayor seguridad)
        if (userResult.rows.length === 0 || userResult.rows[0].refresh_token !== refreshToken) {
            return res.status(403).json({ error: 'Acceso prohibido' });
        }
        
        const user = userResult.rows[0];

        // Creamos el nuevo access token
        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET, // Usamos JWT_SECRET
            { expiresIn: '15m' }
        );

        // Devolvemos el nuevo token y los datos del usuario
        res.json({
            accessToken,
            user: { id: user.id, email: user.email }
        });

    } catch (err) {
        console.error("Error en /refresh:", err.message);
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
});

// --- RUTA DE LOGOUT (CORREGIDA) ---
router.post('/logout', async (req, res) => {
    // ▼▼▼ CAMBIO CLAVE ▼▼▼
    // Buscamos la cookie correcta
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.sendStatus(204); // No hay nada que hacer
    }
    
    // Invalidamos el token en la base de datos
    await db.query('UPDATE users SET refresh_token = NULL WHERE refresh_token = $1', [refreshToken]);

    // ▼▼▼ CAMBIO CLAVE ▼▼▼
    // Limpiamos la cookie correcta del navegador
    res.clearCookie('refreshToken', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' 
    });

    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});

export default router;