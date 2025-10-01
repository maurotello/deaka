import express from 'express';
import db from '../db.js';
import verifyToken from '../middleware/auth.js';

/*
const express = require('express');
const db = require('../db');
const verifyToken = require('../middleware/auth'); // Importamos el middleware
*/
const router = express.Router();

// --- RUTAS PÚBLICAS (no necesitan token) ---

// Endpoint para OBTENER todas las categorías
router.get('/categories', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, marker_icon_slug FROM categories ORDER BY name');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para OBTENER listings publicados
router.get('/listings', async (req, res) => {
    try {
        const { search, bbox } = req.query;
        let queryParams = [];
        let whereClauses = ["l.status = 'published'"];

        if (search && search.length > 2) {
            queryParams.push(`%${search}%`);
            whereClauses.push(`l.title ILIKE $${queryParams.length}`);
        }

        if (bbox) {
            const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
            queryParams.push(minLng, minLat, maxLng, maxLat);
            whereClauses.push(`l.location && ST_MakeEnvelope($${queryParams.length-3}, $${queryParams.length-2}, $${queryParams.length-1}, $${queryParams.length}, 4326)`);
        }

        const query = `
          SELECT l.id, l.title, ST_Y(l.location::geometry) AS latitude, ST_X(l.location::geometry) AS longitude, c.marker_icon_slug
          FROM listings AS l
          LEFT JOIN categories AS c ON l.category_id = c.id
          WHERE ${whereClauses.join(' AND ')}
          LIMIT 50;`;
        
        const { rows } = await db.query(query, queryParams);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener los listings:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- RUTA PROTEGIDA (necesita token) ---

// Endpoint para CREAR listings
router.post('/listings', verifyToken, async (req, res) => { // <-- Se añade 'verifyToken'
    const { title, listingTypeId, categoryId, location, address, city, province, details } = req.body;
    
    // ▼▼▼ LA LÍNEA CLAVE - YA NO ESTÁ HARDCODEADO ▼▼▼
    const user_id = req.user.id; // Se obtiene del token decodificado por el middleware

    if (!title || !listingTypeId || !location || !user_id) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        const typeResult = await db.query('SELECT id FROM listing_types WHERE slug = $1', [listingTypeId]);
        if (typeResult.rows.length === 0) {
            return res.status(400).json({ error: 'El tipo de listado no es válido.' });
        }
        const numericListingTypeId = typeResult.rows[0].id;
        const finalDetails = { ...details, city, province };

        const query = `
          INSERT INTO listings (title, user_id, category_id, listing_type_id, status, location, address, details)
          VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9)
          RETURNING id;`;
        const values = [title, user_id, categoryId, numericListingTypeId, 'pending', location.lng, location.lat, address, finalDetails];

        const result = await db.query(query, values);
        res.status(201).json({ message: 'Listado creado con éxito', id: result.rows[0].id });
    } catch (error) {
        console.error('Error al insertar el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


//module.exports = router;
export default router;