// 1. Importaciones necesarias
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');

// 2. Inicialización y configuración
const app = express();
const PORT = 3001;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/gallery')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage: storage });

// 3. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} en ${req.originalUrl}`);
  next();
});

// --- FUNCIÓN HELPER PARA LEER ARCHIVOS JSON ---
const readDatabaseFile = async (fileName) => {
  const filePath = path.join(__dirname, 'database', fileName);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf8');
      return [];
    }
    throw error;
  }
};

// --- ENDPOINTS COMPARTIDOS (usados por ambos proyectos) ---
app.get('/sedes', async (req, res) => { try { const data = await readDatabaseFile('sedes.json'); res.json(data); } catch (e) { res.status(500).json({message:'Error'}); } });
app.get('/barberos', async (req, res) => { try { const data = await readDatabaseFile('barberos.json'); res.json(data); } catch (e) { res.status(500).json({message:'Error'}); } });
app.get('/servicios', async (req, res) => { try { const data = await readDatabaseFile('servicios.json'); res.json(data); } catch (e) { res.status(500).json({message:'Error'}); } });

// --- ENDPOINTS PARA PI_WEB2 (Calendario de Citas Nuevas) ---
const nuevasCitasPath = path.join(__dirname, 'database', 'nuevas_citas.json');
app.get('/nuevas_citas', async (req, res) => { try { const citas = await readDatabaseFile('nuevas_citas.json'); citas.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()); res.json(citas); } catch (error) { res.status(500).json({ message: 'Error al obtener citas nuevas.' }); } });
app.post('/nuevas_citas', async (req, res) => { try { const { sedeId, barberId, clienteId, services, totalCost, start, end, title } = req.body; if (!sedeId || !barberId || !clienteId || !services || !start || !end) { return res.status(400).json({ message: "Faltan campos." }); } const [sedes, barberos, serviciosDb, citas] = await Promise.all([ readDatabaseFile('sedes.json'), readDatabaseFile('barberos.json'), readDatabaseFile('servicios.json'), readDatabaseFile('nuevas_citas.json') ]); const sedeInfo = sedes.find(s => String(s.ID_Sede) === String(sedeId)); const barberoInfo = barberos.find(b => String(b.ID_Barbero) === String(barberId)); const serviciosIds = JSON.parse(services); const serviciosInfo = serviciosIds.map(id => serviciosDb.find(s => String(s.ID_Servicio) === String(id))).filter(Boolean); const newAppointment = { id: `cita_${Date.now()}`, title, start, end, totalCost, clienteId, sedeId, barberId, services: JSON.stringify(serviciosIds), nombreSede: sedeInfo ? sedeInfo.Nombre_Sede : "Sede desconocida", nombreCompletoBarbero: barberoInfo ? `${barberoInfo.Nombre_Barbero} ${barberoInfo.Apellido_Barbero || ''}`.trim() : "Barbero desconocido", serviciosDetalle: serviciosInfo.map(s => ({ id: s.ID_Servicio, nombre: s.Nombre_Servicio, precio: s.Precio, duracion: s.Duracion_min })) }; citas.push(newAppointment); await fs.writeFile(nuevasCitasPath, JSON.stringify(citas, null, 2), 'utf8'); res.status(201).json({ message: 'Cita creada.', data: newAppointment }); } catch (error) { res.status(500).json({ message: "Error interno." }); } });
app.put('/nuevas_citas/:id', async (req, res) => { try { const { id } = req.params; const updatedData = req.body; const [sedes, barberos, serviciosDb, citas] = await Promise.all([ readDatabaseFile('sedes.json'), readDatabaseFile('barberos.json'), readDatabaseFile('servicios.json'), readDatabaseFile('nuevas_citas.json') ]); const citaIndex = citas.findIndex(c => c.id === id); if (citaIndex === -1) { return res.status(404).json({ message: `ID no encontrado ${id}` }); } const sedeInfo = sedes.find(s => String(s.ID_Sede) === String(updatedData.sedeId)); const barberoInfo = barberos.find(b => String(b.ID_Barbero) === String(updatedData.barberId)); const serviciosIds = JSON.parse(updatedData.services); const serviciosInfo = serviciosIds.map(id => serviciosDb.find(s => String(s.ID_Servicio) === String(id))).filter(Boolean); const citaActualizada = { ...citas[citaIndex], ...updatedData, nombreSede: sedeInfo ? sedeInfo.Nombre_Sede : "Sede desconocida", nombreCompletoBarbero: barberoInfo ? `${barberoInfo.Nombre_Barbero} ${barberoInfo.Apellido_Barbero || ''}`.trim() : "Barbero desconocido", serviciosDetalle: serviciosInfo.map(s => ({ id: s.ID_Servicio, nombre: s.Nombre_Servicio, precio: s.Precio, duracion: s.Duracion_min })) }; citas[citaIndex] = citaActualizada; await fs.writeFile(nuevasCitasPath, JSON.stringify(citas, null, 2), 'utf8'); res.json({ message: 'Cita actualizada.', data: citaActualizada }); } catch (error) { res.status(500).json({ message: "Error al actualizar." }); } });
app.delete('/nuevas_citas/:id', async (req, res) => { try { const { id } = req.params; const citas = await readDatabaseFile('nuevas_citas.json'); const citasFiltradas = citas.filter(c => c.id !== id); if (citas.length === citasFiltradas.length) { return res.status(404).json({ message: `ID no encontrado ${id}` }); } await fs.writeFile(nuevasCitasPath, JSON.stringify(citasFiltradas, null, 2), 'utf8'); res.status(200).json({ message: `Cita eliminada ${id}` }); } catch (error) { res.status(500).json({ message: "Error al eliminar." }); } });

// --- ENDPOINTS PARA PI_NTP (Dashboard) ---
app.get('/clientes', async (req, res) => { try { const data = await readDatabaseFile('clientes.json'); res.json(data); } catch (e) { res.status(500).json({ message: 'Error al obtener clientes.' }); } });
app.get('/citas', async (req, res) => { try { const data = await readDatabaseFile('citas.json'); res.json(data); } catch (e) { res.status(500).json({ message: 'Error al obtener el historial de citas.' }); } });

// --- ENDPOINTS DE CONTACTO Y GALERÍA ---
app.post('/contactanos', async (req, res) => { try { const contactanosPath = path.join(__dirname, 'database', 'contactanos.json'); const { name, email, message } = req.body; if (!name || !email || !message) { return res.status(400).json({ error: 'Faltan campos.' }); } const contacts = await readDatabaseFile('contactanos.json'); const newContact = { id: `msg_${Date.now()}`, nombre: name, email: email, mensaje: message, fecha: new Date().toISOString(), }; contacts.push(newContact); await fs.writeFile(contactanosPath, JSON.stringify(contacts, null, 2), 'utf8'); res.status(201).json({ message: 'Mensaje guardado.', data: newContact }); } catch (error) { res.status(500).json({ error: 'Error interno.' }); } });
const galleryPath = path.join(__dirname, 'database', 'gallery.json');
app.get('/gallery', async (req, res) => { try { const images = await readDatabaseFile('gallery.json'); res.json(images.reverse()); } catch (error) { res.status(500).json({ message: 'Error al obtener galería.' }); } });
app.post('/gallery/upload', upload.single('image'), async (req, res) => { try { const { description, category } = req.body; const file = req.file; if (!file || !description || !category) { return res.status(400).json({ message: 'Faltan datos.' }); } const gallery = await readDatabaseFile('gallery.json'); const newId = gallery.length > 0 ? Math.max(...gallery.map(img => img.id)) + 1 : 1; const newImageEntry = { id: newId, fileName: file.filename, description, category }; gallery.push(newImageEntry); await fs.writeFile(galleryPath, JSON.stringify(gallery, null, 2), 'utf8'); res.status(201).json({ success: true, fileName: file.filename }); } catch (error) { res.status(500).json({ success: false, message: 'Error en servidor.' }); } });
app.put('/gallery/:id', async (req, res) => { try { const { id } = req.params; const { description, category } = req.body; const gallery = await readDatabaseFile('gallery.json'); const imageIndex = gallery.findIndex(img => String(img.id) === String(id)); if (imageIndex === -1) { return res.status(404).json({ message: 'ID no encontrado.' }); } gallery[imageIndex] = { ...gallery[imageIndex], description, category }; await fs.writeFile(galleryPath, JSON.stringify(gallery, null, 2), 'utf8'); res.json(gallery[imageIndex]); } catch (error) { res.status(500).json({ message: 'Error al actualizar.' }); } });
app.delete('/gallery/:id', async (req, res) => { try { const { id } = req.params; const gallery = await readDatabaseFile('gallery.json'); const imageToDelete = gallery.find(img => String(img.id) === String(id)); if (!imageToDelete) { return res.status(404).json({ message: 'Imagen no encontrada.' }); } const imagePath = path.join(__dirname, 'public/gallery', imageToDelete.fileName); try { await fs.unlink(imagePath); } catch (fileError) { console.warn(`Archivo no encontrado: ${imageToDelete.fileName}.`); } const updatedGallery = gallery.filter(img => String(img.id) !== String(id)); await fs.writeFile(galleryPath, JSON.stringify(updatedGallery, null, 2), 'utf8'); res.status(200).json({ success: true, message: 'Imagen eliminada.' }); } catch (error) { res.status(500).json({ message: 'Error al eliminar.' }); } });

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log('-----------------------------------------');
  console.log(`🚀 API Central corriendo en http://localhost:${PORT}`);
  console.log('-----------------------------------------');
});