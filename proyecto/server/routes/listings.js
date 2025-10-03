import express from 'express';
import db from '../db.js';
import verifyToken from '../middleware/auth.js';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

/*
const express = require('express');
const db = require('../db');
const verifyToken = require('../middleware/auth'); // Importamos el middleware
*/
const router = express.Router();

// --- RUTAS PÚBLICAS (no necesitan token) ---

// --- CONFIGURACIÓN AVANZADA DE MULTER ---
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: Solo se permiten archivos de imagen (jpeg, jpg, png, webp).'));
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.tempId) req.tempId = uuidv4();
    // file.fieldname será 'coverImage' o 'galleryImages'
    const dest = `uploads/${req.tempId}/${file.fieldname}`;
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Renombramos el archivo para evitar colisiones y caracteres extraños
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Límite general de 2MB
});

// Middleware de subida con límites específicos
const uploadMiddleware = (req, res, next) => {
  const uploader = upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 6 }
  ]);

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uno de los archivos es demasiado grande (Máx 2MB).' });
      }
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

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
//router.post('/listings', verifyToken, async (req, res) => {
router.post('/listings', verifyToken, uploadMiddleware, async (req, res) => {

    // Los datos de texto ahora vienen en req.body
    //const { title, listingTypeId, categoryId, address, city, province, details } = req.body;
    // Los archivos vienen en req.files
    const coverImageFile = req.files.coverImage ? req.files.coverImage[0] : null;


    const { title, listingTypeId, categoryId, address, city, province, details } = req.body;
    
    // ▼▼▼ LA LÍNEA CLAVE - YA NO ESTÁ HARDCODEADO ▼▼▼
    const user_id = req.user.id; // Se obtiene del token decodificado por el middleware
    const location = {
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng)
    };


    if (!title || !listingTypeId || !location || !user_id) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const tempId = req.tempId;
    try {
        const typeResult = await db.query('SELECT id FROM listing_types WHERE slug = $1', [listingTypeId]);

        if (typeResult.rows.length === 0) {
            return res.status(400).json({ error: 'El tipo de listado no es válido.' });
        }
        const numericListingTypeId = typeResult.rows[0].id;
        const finalDetails = { ...details, city, province };

        const coverImagePath = coverImageFile ? coverImageFile.filename : null;

        /*const query = `
          INSERT INTO listings (title, user_id, category_id, listing_type_id, status, location, address, details)
          VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9)
          RETURNING id;`;
        */
        const query = `
            INSERT INTO listings (title, user_id, category_id, listing_type_id, status, location, address, details, cover_image_path)
            VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9, $10)
            RETURNING id;
        `;

        const values = [title, user_id, categoryId, numericListingTypeId, 'pending', location.lng, location.lat, address, details, coverImagePath];

        const result = await db.query(query, values);
        const newListingId = result.rows[0].id;

        if (tempId) {
            const tempPath = path.join('uploads', tempId);
            const finalPath = path.join('uploads', newListingId);
            
            try {
                // En lugar de mover, copiamos el contenido
                await fs.copy(tempPath, finalPath);
                console.log(`Archivos copiados de ${tempPath} a ${finalPath}`);
                
                // Una vez copiados, eliminamos la carpeta temporal
                await fs.remove(tempPath);
                console.log(`Carpeta temporal ${tempPath} eliminada.`);

            } catch (moveError) {
                console.error(`Error al procesar la carpeta ${tempPath}:`, moveError);
                // Opcional: podrías querer manejar este error, pero por ahora solo lo logueamos
            }
        }
        
        res.status(201).json({ message: 'Listado creado con éxito', id: newListingId });


        //const values = [title, user_id, categoryId, numericListingTypeId, 'pending', location.lng, location.lat, address, finalDetails];

        //const result = await db.query(query, values);
        //res.status(201).json({ message: 'Listado creado con éxito', id: result.rows[0].id });
    } catch (error) {
        if (tempId) {
            const tempPath = path.join('uploads', tempId);
            await fs.remove(tempPath);
        }
        console.error('Error al insertar el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


//module.exports = router;
export default router;