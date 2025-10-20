import db from '../db.js';

// ===============================================
// 1. LECTURA: Obtener TODAS las categorías (principales + subcategorías)
// ===============================================
export const getAllCategories = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, slug, parent_id, marker_icon_slug FROM categories ORDER BY parent_id, name'
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================================
// 2. LECTURA: Obtener SOLO categorías principales (parent_id = NULL)
// ===============================================
export const getMainCategories = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, slug, marker_icon_slug FROM categories WHERE parent_id IS NULL ORDER BY name'
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener categorías principales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================================
// 3. LECTURA: Obtener subcategorías de una categoría
// ===============================================
export const getSubcategories = async (req, res) => {
    const { parentId } = req.params;
    try {
        const { rows } = await db.query(
            'SELECT id, name, slug, parent_id, marker_icon_slug FROM categories WHERE parent_id = $1 ORDER BY name',
            [parentId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================================
// 4. CREACIÓN: Crear una nueva categoría o subcategoría
// ===============================================
export const createCategory = async (req, res) => {
    const { name, slug, parent_id, marker_icon_slug } = req.body;

    // Validación
    if (!name || !slug) {
        return res.status(400).json({ error: 'El nombre y slug son obligatorios.' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO categories (name, slug, parent_id, marker_icon_slug) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, slug, parent_id, marker_icon_slug`,
            [name, slug, parent_id || null, marker_icon_slug || null]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================================
// 5. MODIFICACIÓN: Actualizar una categoría
// ===============================================
export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, slug, parent_id, marker_icon_slug } = req.body;

    // Validación
    if (!name || !slug) {
        return res.status(400).json({ error: 'El nombre y slug son obligatorios.' });
    }

    try {
        const { rows } = await db.query(
            `UPDATE categories 
             SET name = $1, slug = $2, parent_id = $3, marker_icon_slug = $4 
             WHERE id = $5 
             RETURNING id, name, slug, parent_id, marker_icon_slug`,
            [name, slug, parent_id || null, marker_icon_slug || null, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ===============================================
// 6. BAJA: Eliminar una categoría
// ===============================================
export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar si la categoría tiene subcategorías
        const { rows: subcats } = await db.query(
            'SELECT id FROM categories WHERE parent_id = $1',
            [id]
        );

        if (subcats.length > 0) {
            return res.status(400).json({ 
                error: 'No puedes eliminar una categoría que tiene subcategorías. Elimínalas primero.' 
            });
        }

        const result = await db.query(
            'DELETE FROM categories WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        res.status(200).json({ message: 'Categoría eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};