import db from '../db.js';
import fs from 'fs-extra'; // Para manejo de archivos (copy, remove)
import path from 'path';    // Para manejo de rutas de archivos
import { v4 as uuidv4 } from 'uuid'; // Solo si lo necesitas para la lógica interna

// =======================================================
// --- LÓGICA DE DATOS Y GEOESPACIAL ---
// =======================================================

// OBTENER todas las categorías
export const getCategories = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, marker_icon_slug FROM categories ORDER BY name');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// OBTENER listings públicos para el mapa (Filtros PostGIS)
export const getMapListings = async (req, res) => {
    try {
        const { search, bbox } = req.query;
        let queryParams = [];
        let whereClauses = ["l.status = 'published'"];
        
        if (search && search.length > 2) {
            queryParams.push(`%${search}%`);
            whereClauses.push(`l.title ILIKE $${queryParams.length}`);
        }
        
        // 🚨 Lógica Geoespacial CRÍTICA: Filtrado por Bounding Box (bbox)
        if (bbox) {
            const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
            queryParams.push(minLng, minLat, maxLng, maxLat);
            // El operador && se usa en PostGIS para verificar si dos geometrías se solapan
            // Usamos ST_MakeEnvelope para crear un rectángulo (bbox)
            whereClauses.push(`l.location && ST_MakeEnvelope($${queryParams.length - 3}, $${queryParams.length - 2}, $${queryParams.length - 1}, $${queryParams.length}, 4326)`);
        }
        
        // ST_Y() y ST_X() se usan para extraer Latitud y Longitud del punto geográfico.
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
};

// OBTENER los listados del usuario logueado (PROTEGIDA)
export const getMyListings = async (req, res) => {
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
};

// OBTENER los datos de un listado específico para editarlo (PROTEGIDA - solo dueño)
export const getListingForEdit = async (req, res) => {
    const { id } = req.params;
    const { id: userId } = req.user;
    try {
        // Nota: Asegúrate que el campo `location` sea GEOGRAPHY o GEOMETRY
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
            // Lógica de archivos: Buscar la galería en el disco
            galleryImages = await fs.readdir(path.join('uploads', id, 'galleryImages'));
        } catch (fsError) {
            console.log(`No se encontró directorio de galería para el listado ${id}, se asume vacío.`);
        }
        
        res.json({ ...listingData, gallery_images: galleryImages });
    } catch (error) {
        console.error('Error al obtener el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// =======================================================
// --- LÓGICA DE CREACIÓN Y ACTUALIZACIÓN (MULTER + DB) ---
// =======================================================

// CREAR un nuevo listado (Con Multer y PostGIS)
export const createListing = async (req, res) => {
    const { id: userId } = req.user;
    // req.body ahora contiene los campos de texto
    const { title, listingTypeId, categoryId, lat, lng, address, city, province, details } = req.body;
    // req.tempId fue asignado por el middleware de Multer
    const tempId = req.tempId;

    if (!title || !categoryId || !lat || !lng) {
        // 🚨 Seguridad: Limpiar archivos si la validación falla
        if (tempId) await fs.remove(path.join('uploads', tempId));
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        const coverImageFile = req.files.coverImage ? req.files.coverImage[0] : null;
        const coverImagePath = coverImageFile ? coverImageFile.filename : null;
        
        // Manejo de JSON: Convertir la cadena 'details' a objeto JSON para PostgreSQL
        const parsedDetails = JSON.parse(details);
        const finalDetails = { ...parsedDetails, city, province };
        
        // 🚨 Inserción con PostGIS (GEOGRAPHY type)
        const query = `
            INSERT INTO listings (user_id, title, category_id, listing_type_id, location, address, details, cover_image_path, status)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, 'pending')
            RETURNING id;
        `;
        const values = [userId, title, categoryId, listingTypeId || 1, lng, lat, address, finalDetails, coverImagePath]; 
        
        const result = await db.query(query, values);
        const newListingId = result.rows[0].id;
        
        // 🚨 Lógica de Archivos: Mover archivos temporales a la carpeta permanente (newListingId)
        if (tempId) {
            const tempPath = path.join('uploads', tempId);
            const finalPath = path.join('uploads', newListingId.toString()); // Convertir a string para path
            if (await fs.pathExists(tempPath)) {
                await fs.copy(tempPath, finalPath);
                await fs.remove(tempPath);
            }
        }

        res.status(201).json({ message: 'Listado creado con éxito', id: newListingId });
    } catch (error) {
        // 🚨 Lógica de Archivos: Limpiar archivos temporales en caso de fallo de DB
        if (tempId) await fs.remove(path.join('uploads', tempId));
        console.error('Error al crear el listado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


// ACTUALIZAR un listado existente (Con Multer y PostGIS)
export const updateListing = async (req, res) => {
    const { id: listingId } = req.params;
    const { id: userId } = req.user;
    
    try {
        // 1. Verificar propiedad
        const listingResult = await db.query('SELECT cover_image_path FROM listings WHERE id = $1 AND user_id = $2', [listingId, userId]);
        if (listingResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado o Listado no encontrado.' });
        
        const { cover_image_path: oldCoverFilename } = listingResult.rows[0];
        const { galleryImagesToDelete, deleteCoverImage } = req.body;
        
        // 2. Lógica de Archivos: Eliminación de archivos viejos (galería y portada)
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
        
        // 3. Preparar datos para UPDATE
        const { title, categoryId, details, lat, lng, address, city, province } = req.body;
        const parsedDetails = JSON.parse(details);
        const finalDetails = { ...parsedDetails, city, province };

        // 4. Actualización con PostGIS (GEOGRAPHY type)
        await db.query(`
            UPDATE listings SET
                title = $1, category_id = $2, details = $3,
                location = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                address = $6, cover_image_path = $7, updated_at = NOW()
            WHERE id = $8 AND user_id = $9
        `, [title, categoryId, finalDetails, lng, lat, address, finalCoverFilename, listingId, userId]);
        
        res.status(200).json({ message: 'Listado actualizado con éxito.' });

    } catch (error) {
        console.error(`Error al actualizar el listado ${listingId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ---------------------------------------------
// Función 9: MODERACIÓN (Actualizar Estado - Admin Only)
// ---------------------------------------------
export const updateListingStatus = async (req, res) => {
    const { id: listingId } = req.params;
    const { status } = req.body; 

    if (!['published', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido proporcionado.' });
    }

    try {
        const query = `
            UPDATE listings SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, status;
        `;
        const result = await db.query(query, [status, listingId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Listado no encontrado.' });
        }
        
        res.status(200).json({ message: `Estado del listado ${listingId} actualizado a ${status}` });

    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ---------------------------------------------
// Función 10: ELIMINAR listado (PROTEGIDA)
// ---------------------------------------------
export const deleteListing = async (req, res) => {
    const { id: listingId } = req.params;
    const { id: userId } = req.user; 

    try {
        // 1. Verificar propiedad
        const checkQuery = await db.query(
            'SELECT id FROM listings WHERE id = $1 AND user_id = $2',
            [listingId, userId]
        );

        if (checkQuery.rowCount === 0) {
            return res.status(403).json({ error: 'Acceso prohibido. No eres el dueño de este listado.' });
        }

        // 2. Eliminar de la Base de Datos
        const deleteQuery = await db.query('DELETE FROM listings WHERE id = $1', [listingId]);
        
        if (deleteQuery.rowCount === 0) {
             return res.status(404).json({ error: 'Listado no encontrado para eliminar.' });
        }

        // 3. Eliminar archivos del disco (fs-extra)
        const folderPath = path.join('uploads', listingId.toString());
        if (await fs.pathExists(folderPath)) {
             await fs.remove(folderPath); 
        }

        res.status(200).json({ message: 'Listado y archivos asociados eliminados con éxito.' });

    } catch (error) {
        console.error(`Error al eliminar el listado ${listingId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el listado.' });
    }
};

// ... Puedes añadir otras funciones como getListingDetailsPublic, etc.