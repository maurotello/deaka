import 'dotenv/config';
//require('dotenv').config(); // Carga las variables de .env al inicio
console.log('El valor de JWT_SECRET es:', process.env.JWT_SECRET);
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
//const express = require('express');
//const cors = require('cors');
//const path = require('path');

// Importamos nuestras rutas
//const authRoutes = require('./routes/auth');
//const listingRoutes = require('./routes/listings');
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Usamos las rutas con sus prefijos
app.use('/api/auth', authRoutes);
app.use('/api', listingRoutes);

app.listen(PORT, () => {
  console.log('El valor de JWT_SECRET es:', process.env.JWT_SECRET ? 'Cargado correctamente' : 'UNDEFINED');
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});