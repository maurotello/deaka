import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();

// --- RUTA DE REGISTRO (Sin cambios, ya estaba bien) ---
router.post('/register', async (req, res) => {
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

// --- RUTA DE LOGIN (Totalmente modificada) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos.' });

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas.' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas.' });

        // 1. Crear Access Token (corta duración: 15 minutos)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        // 2. Crear Refresh Token (larga duración: 7 días)
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // 3. Guardar el refresh token en la base de datos para este usuario
        await db.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        // 4. Enviar el Refresh Token en una cookie HttpOnly (más segura)
        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
        });

        // 5. Enviar el Access Token y datos del usuario en la respuesta JSON
        res.json({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- NUEVA RUTA: REFRESH (con la modificación para devolver el usuario) ---
router.get('/refresh', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ message: 'No autorizado' });

    const refreshToken = cookies.jwt;

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const { rows } = await db.query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.id, refreshToken]);
        if (rows.length === 0) return res.status(401).json({ message: 'No autorizado, token no encontrado en BD.' });
        
        const user = rows[0];

        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        // Devolvemos el nuevo token Y la información del usuario
        res.json({ 
            accessToken,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Error en /refresh:", err.message);
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
});


// --- NUEVA RUTA: LOGOUT ---
router.post('/logout', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No hay contenido para procesar

    const refreshToken = cookies.jwt;

    // Borra el refresh token de la base de datos para invalidarlo
    await db.query('UPDATE users SET refresh_token = NULL WHERE refresh_token = $1', [refreshToken]);

    // Borra la cookie del navegador
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'strict', secure: true });
    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});

export default router;