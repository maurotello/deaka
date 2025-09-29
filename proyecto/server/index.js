const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint para OBTENER todas las categorías
app.get('/api/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, marker_icon_slug FROM categories ORDER BY name');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para OBTENER listings publicados
app.get('/api/listings', async (req, res) => {
  try {
    const query = `
      SELECT
        l.id,
        l.title,
        l.description,
        l.address,
        ST_Y(l.location::geometry) AS latitude,
        ST_X(l.location::geometry) AS longitude,
        c.marker_icon_slug
      FROM
        listings AS l
      LEFT JOIN
        categories AS c ON l.category_id = c.id
      WHERE
        l.status = 'published';
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener los listings:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para CREAR listings
app.post('/api/listings', async (req, res) => {
  const { title, listingTypeId, categoryId, location, address, city, province, details } = req.body;
  const user_id = 'e708dc9d-5b4f-47d0-a60a-f246a1ae92cc';

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
      RETURNING id;
    `;
    const values = [title, user_id, categoryId, numericListingTypeId, 'pending', location.lng, location.lat, address, finalDetails];

    const result = await db.query(query, values);
    res.status(201).json({ message: 'Listado creado con éxito', id: result.rows[0].id });
  } catch (error) {
    console.error('Error al insertar el listado:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});