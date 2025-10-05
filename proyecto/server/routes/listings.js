import express from 'express';
import db from '../db.js';
import verifyToken from '../middleware/auth.js';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// =======================================================
// --- CONFIGURACIÓN UNIFICADA DE MULTER ---
// =======================================================

// 1. FILTRO DE ARCHIVOS (Definido primero para poder reutilizarlo)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: Solo se permiten archivos de imagen (jpeg, jpg, png, webp).'));
};

// 2. UPLOADER PARA CREAR listados (usa una carpeta temporal)
const createStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.tempId) req.tempId = uuidv4();
    const dest = path.join('uploads', req.tempId, file.fieldname);
    fs.mkdirsSync(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadMiddleware = multer({
  storage: createStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 6 }
]);

// 3. UPLOADER PARA EDITAR listados (guarda directamente en la carpeta final)
const editStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const listingId = req.params.id;
      const dest = path.join('uploads', listingId, file.fieldname);
      fs.mkdirsSync(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const multerEditUploader = multer({
    storage: editStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
}).fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 6 }
]);


// =======================================================
// --- RUTAS DE LA API ---
// =======================================================

// OBTENER todas las categorías
router.get('/categories', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, marker_icon_slug FROM categories ORDER BY name');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// OBTENER listings públicos para el mapa
router.get('/listings', async (req, res) => {
    try {
        // ... (Tu lógica de búsqueda y bbox aquí, sin cambios)
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
            whereClauses.push(`l.location && ST_MakeEnvelope($${queryParams.length - 3}, $${queryParams.length - 2}, $${queryParams.length - 1}, $${queryParams.length}, 4326)`);
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

// OBTENER los listados del usuario logueado
router.get('/my-listings', verifyToken, async (req, res) => {
    const { id: userId } = req.user;
    try {
        const query = `
            SELECT l.id, l.title, l.address, l.details->>'city' AS city, c.name AS category_name, l.status
            FROM listings AS l
            JOIN categories AS c ON l.category_id = c.id
            WHERE l.user_id = $1
            ORDER BY l.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener mis listados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// OBTENER los datos de un listado específico para editarlo
router.get('/listings/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { id: userId } = req.user;
    try {
        const query = `
            SELECT title, category_id, details, address, cover_image_path,
                   ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
            FROM listings WHERE id = $1 AND user_id = $2;
        `;
        const { rows } = await db.query(query, [id, userId]);

        if (rows.length === 0) return res.status(404).json({ error: 'Listado no encontrado o no autorizado.' });
        
        const listingData = rows[0];
        let galleryImages = [];
        try {
            galleryImages = await fs.readdir(path.join('uploads', id, 'galleryImages'));
        } catch (fsError) {
            console.log(`No se encontró directorio de galería para el listado ${id}, se asume vacío.`);
        }
        
        res.json({ ...listingData, gallery_images: galleryImages });
    } catch (error) {
        console.error('Error al obtener el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// CREAR un nuevo listado
router.post('/listings', verifyToken, uploadMiddleware, async (req, res) => {
    const { id: userId } = req.user;
    const { title, listingTypeId, categoryId, lat, lng, address, city, province, details } = req.body;
    const tempId = req.tempId;

    if (!title || !categoryId || !lat || !lng) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        const coverImageFile = req.files.coverImage ? req.files.coverImage[0] : null;
        const coverImagePath = coverImageFile ? coverImageFile.filename : null;
        const parsedDetails = JSON.parse(details);
        const finalDetails = { ...parsedDetails, city, province };

        const query = `
            INSERT INTO listings (user_id, title, category_id, listing_type_id, location, address, details, cover_image_path)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9)
            RETURNING id;
        `;
        const values = [userId, title, categoryId, 1, lng, lat, address, finalDetails, coverImagePath]; // Asumiendo listingTypeId=1 por ahora
        
        const result = await db.query(query, values);
        const newListingId = result.rows[0].id;
        
        if (tempId) {
            const tempPath = path.join('uploads', tempId);
            const finalPath = path.join('uploads', newListingId);
            if (await fs.pathExists(tempPath)) {
                await fs.copy(tempPath, finalPath);
                await fs.remove(tempPath);
            }
        }

        res.status(201).json({ message: 'Listado creado con éxito', id: newListingId });
    } catch (error) {
        if (tempId) await fs.remove(path.join('uploads', tempId));
        console.error('Error al crear el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// ACTUALIZAR un listado existente
router.post('/listings/:id', verifyToken, multerEditUploader, async (req, res) => {
    const { id: listingId } = req.params;
    const { id: userId } = req.user;
    try {
        const listingResult = await db.query('SELECT cover_image_path FROM listings WHERE id = $1 AND user_id = $2', [listingId, userId]);
        if (listingResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });
        
        const { cover_image_path: oldCoverFilename } = listingResult.rows[0];
        const { galleryImagesToDelete, deleteCoverImage } = req.body;
        
        if (galleryImagesToDelete) {
            const filesToDelete = JSON.parse(galleryImagesToDelete);
            for (const filename of filesToDelete) {
                await fs.remove(path.join('uploads', listingId, 'galleryImages', filename));
            }
        }

        let finalCoverFilename = oldCoverFilename;
        if (deleteCoverImage === 'true' && oldCoverFilename) {
            await fs.remove(path.join('uploads', listingId, 'coverImage', oldCoverFilename));
            finalCoverFilename = null;
        }

        if (req.files && req.files.coverImage) {
            if (oldCoverFilename) {
                await fs.remove(path.join('uploads', listingId, 'coverImage', oldCoverFilename));
            }
            finalCoverFilename = req.files.coverImage[0].filename;
        }
        
        const { title, categoryId, details, lat, lng, address, city, province } = req.body;
        const parsedDetails = JSON.parse(details);
        const finalDetails = { ...parsedDetails, city, province };

        await db.query(`
            UPDATE listings SET
                title = $1, category_id = $2, details = $3,
                location = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                address = $6, cover_image_path = $7
            WHERE id = $8 AND user_id = $9
        `, [title, categoryId, finalDetails, lng, lat, address, finalCoverFilename, listingId, userId]);
        
        res.status(200).json({ message: 'Listado actualizado con éxito.' });

    } catch (error) {
        console.error(`Error al actualizar el listado ${listingId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

export default router;