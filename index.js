const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer'); // Importamos multer para la subida de archivos

// --- 1. CONFIGURACIÓN INICIAL ---
const app = express();
const PORT = 3001;
const dbFolder = path.join(__dirname, 'database');
const galleryUploadsFolder = path.join(dbFolder, 'uploads', 'gallery');

// Crear carpetas necesarias si no existen (buena práctica)
fs.mkdirSync(galleryUploadsFolder, { recursive: true });

// --- 2. MIDDLEWARES ---
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.originalUrl}`);
  next();
});
// Servir imágenes estáticas de la galería
app.use('/uploads/gallery', express.static(galleryUploadsFolder));


// --- 3. RUTAS DE LA API ---

// Función auxiliar para leer archivos JSON de forma segura
const readJsonFile = (fileName) => {
  const filePath = path.join(dbFolder, fileName);
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent ? JSON.parse(fileContent) : [];
  }
  return [];
};

// --- Rutas existentes (Sedes, Barberos, Servicios, Citas) ---
// (No se modifican)
app.get('/api/sedes', (req, res) => res.json(readJsonFile('sedes.json')));
app.get('/api/barberos', (req, res) => res.json(readJsonFile('barberos.json')));
app.get('/api/servicios', (req, res) => res.json(readJsonFile('servicios.json')));
const writeCitas = (data) => fs.writeFileSync(path.join(dbFolder, 'nuevas_citas.json'), JSON.stringify(data, null, 2));
app.get('/api/citas', (req, res) => res.json(readJsonFile('nuevas_citas.json')));
app.post('/api/citas', (req, res) => {
    try {
        const citas = readJsonFile('nuevas_citas.json');
        const newCita = { ...req.body, id: `cita-${Date.now()}` };
        citas.push(newCita);
        writeCitas(citas);
        console.log('Cita recibida y guardada:', newCita);
        res.status(201).json({ message: 'Cita creada exitosamente', data: newCita });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
app.put('/api/citas', (req, res) => {
    try {
        const { id, ...updatedData } = req.body;
        if (!id) return res.status(400).json({ message: 'El ID es requerido.' });
        let citas = readJsonFile('nuevas_citas.json');
        const citaIndex = citas.findIndex(c => c.id === id);
        if (citaIndex === -1) return res.status(404).json({ message: 'Cita no encontrada.' });
        citas[citaIndex] = { ...citas[citaIndex], ...updatedData };
        writeCitas(citas);
        console.log('Cita actualizada:', citas[citaIndex]);
        res.status(200).json({ message: 'Cita actualizada', data: citas[citaIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
app.delete('/api/citas', (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: 'El ID es requerido.' });
        let citas = readJsonFile('nuevas_citas.json');
        const citasFiltradas = citas.filter(c => c.id !== id);
        if (citas.length === citasFiltradas.length) return res.status(404).json({ message: 'Cita no encontrada.' });
        writeCitas(citasFiltradas);
        res.status(200).json({ message: 'Cita eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ===============================================================
// --- NUEVO: CRUD PARA LA GALERÍA ---
// ===============================================================

const galleryDbPath = path.join(dbFolder, 'gallery.json');
const writeGallery = (data) => fs.writeFileSync(galleryDbPath, JSON.stringify(data, null, 2));

// Configuración de Multer para la subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, galleryUploadsFolder); // Directorio donde se guardan las imágenes
  },
  filename: (req, file, cb) => {
    // Genera un nombre de archivo único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// [GET] /api/gallery - Obtener todas las imágenes
app.get('/api/gallery', (req, res) => {
  res.json(readJsonFile('gallery.json'));
});

// [POST] /api/gallery - Subir una nueva imagen
// 'image' debe coincidir con el nombre del campo en el FormData del frontend
app.post('/api/gallery', upload.single('image'), (req, res) => {
  try {
    const { description, category } = req.body;
    if (!req.file || !description || !category) {
      return res.status(400).json({ message: 'Faltan datos: se requiere imagen, descripción y categoría.' });
    }

    const gallery = readJsonFile('gallery.json');
    const newImage = {
      id: `img-${Date.now()}`,
      fileName: req.file.filename,
      description,
      category,
    };

    gallery.push(newImage);
    writeGallery(gallery);

    console.log('Imagen subida y guardada:', newImage);
    res.status(201).json({ message: 'Imagen subida exitosamente', data: newImage });
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// [PUT] /api/gallery/:id - Actualizar descripción y categoría de una imagen
app.put('/api/gallery/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { description, category } = req.body;
        if (!description || !category) {
            return res.status(400).json({ message: 'Descripción y categoría son requeridas.' });
        }
        
        let gallery = readJsonFile('gallery.json');
        const imageIndex = gallery.findIndex(img => img.id === id);
        
        if (imageIndex === -1) {
            return res.status(404).json({ message: 'Imagen no encontrada.' });
        }
        
        gallery[imageIndex] = { ...gallery[imageIndex], description, category };
        writeGallery(gallery);
        
        console.log('Información de imagen actualizada:', gallery[imageIndex]);
        res.status(200).json({ message: 'Imagen actualizada', data: gallery[imageIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// [DELETE] /api/gallery/:id - Eliminar una imagen y su registro
app.delete('/api/gallery/:id', (req, res) => {
    try {
        const { id } = req.params;
        let gallery = readJsonFile('gallery.json');
        const imageToDelete = gallery.find(img => img.id === id);
        
        if (!imageToDelete) {
            return res.status(404).json({ message: 'Imagen no encontrada.' });
        }
        
        // 1. Borrar el archivo físico de la imagen
        const filePath = path.join(galleryUploadsFolder, imageToDelete.fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // 2. Filtrar el registro del JSON
        const updatedGallery = gallery.filter(img => img.id !== id);
        writeGallery(updatedGallery);
        
        console.log('Imagen eliminada, ID:', id);
        res.status(200).json({ message: 'Imagen eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- 4. INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor de API Central corriendo en http://localhost:${PORT}`);
});