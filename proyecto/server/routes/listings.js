import express from 'express';
import verifyToken from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js'; 
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// 🚨 Importar SOLO las funciones del controlador
import { 
    getCategories, 
    getMapListings, 
    getMyListings, 
    updateListingStatus,
    deleteListing, 
    getListingForEdit, 
    createListing, 
    updateListing
} from '../controllers/listingController.js'; 


// =======================================================
// --- CONFIGURACIÓN UNIFICADA DE MULTER (Mantenida aquí) ---
// =======================================================

// 1. FILTRO DE ARCHIVOS (Queda aquí)
const fileFilter = (req, file, cb) => {
    // ... (Tu lógica de filtro) ...
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: Solo se permiten archivos de imagen (jpeg, jpg, png, webp).'));
};

// 2. STORAGE PARA CREAR listados (usa una carpeta temporal)
const createStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // 🚨 CRÍTICO: req.tempId debe ser un tipo reconocido. Asegúrate que `req` pueda tener esta propiedad.
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

// 3. STORAGE PARA EDITAR listados (guarda directamente en la carpeta final)
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


const router = express.Router();

// =======================================================
// --- RUTAS DE LA API (Conexión) ---
// =======================================================

// PÚBLICAS
router.get('/categories', getCategories); // 👈 Limpio
router.get('/listings', getMapListings);   // 👈 Limpio (Consulta Geoespacial)

// PROTEGIDAS (USUARIO/DUEÑO)
router.get('/my-listings', verifyToken, getMyListings); // 👈 Limpio
router.get('/listings/:id', verifyToken, getListingForEdit); // 👈 Limpio
router.delete('/listings/:id', verifyToken, deleteListing); // 👈 Limpio

// PROTEGIDAS (CON MULTER)
// 🚨 Nota: Multer se ejecuta antes que el controlador.
router.post('/listings', verifyToken, uploadMiddleware, createListing); // 👈 Limpio
router.post('/listings/:id', verifyToken, multerEditUploader, updateListing); // 👈 Limpio

// PROTEGIDAS (ADMIN)
// 🚨 Nota: requireRole se ejecuta después de verifyToken para garantizar que req.user exista.
router.patch('/listings/:id/status', verifyToken, requireRole(['admin']), updateListingStatus); // 👈 Limpio


router.get('/protected-test', verifyToken, (req, res) => {
  res.json({
    message: 'Acceso a ruta protegida exitoso',
    user: req.user,
  });
});

export default router;