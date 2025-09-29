// 1. Importaciones necesarias
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// 2. Inicialización de la aplicación Express
const app = express();
const PORT = 3001;

// 3. Middlewares
app.use(cors());
app.use(express.json());
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
    console.error(`Error grave al leer ${fileName}:`, error);
    throw error;
  }
};

// --- ENDPOINTS GET PARA DATOS GENERALES ---
app.get('/sedes', async (req, res) => {
  try {
    const sedes = await readDatabaseFile('sedes.json');
    res.json(sedes);
  } catch (error) { res.status(500).json({ message: 'Error al obtener las sedes.' }); }
});

app.get('/barberos', async (req, res) => {
  try {
    const barberos = await readDatabaseFile('barberos.json');
    res.json(barberos);
  } catch (error) { res.status(500).json({ message: 'Error al obtener los barberos.' }); }
});

app.get('/servicios', async (req, res) => {
  try {
    const servicios = await readDatabaseFile('servicios.json');
    res.json(servicios);
  } catch (error) { res.status(500).json({ message: 'Error al obtener los servicios.' }); }
});

// --- CRUD COMPLETO PARA CITAS (/citas) ---
const citasPath = path.join(__dirname, 'database', 'nuevas_citas.json');

// GET: Obtener todas las citas (CON MEJORA DE ORDENAMIENTO)
app.get('/citas', async (req, res) => {
  try {
    const citas = await readDatabaseFile('nuevas_citas.json');
    // Ordenamos las citas por fecha de inicio antes de enviarlas
    citas.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    res.json(citas);
  } catch (error) { res.status(500).json({ message: 'Error al obtener las citas.' }); }
});

// POST: Crear una nueva cita (con enriquecimiento de datos)
app.post('/citas', async (req, res) => {
  try {
    const { sedeId, barberId, clienteId, services, totalCost, start, end, title } = req.body;
    if (!sedeId || !barberId || !clienteId || !services || !start || !end) {
      return res.status(400).json({ message: "Faltan campos requeridos para crear la cita." });
    }
    const [sedes, barberos, serviciosDb, citas] = await Promise.all([
      readDatabaseFile('sedes.json'), readDatabaseFile('barberos.json'),
      readDatabaseFile('servicios.json'), readDatabaseFile('nuevas_citas.json')
    ]);
    const sedeInfo = sedes.find(s => String(s.ID_Sede) === String(sedeId));
    const barberoInfo = barberos.find(b => String(b.ID_Barbero) === String(barberId));
    const serviciosIds = JSON.parse(services);
    const serviciosInfo = serviciosIds.map(id => serviciosDb.find(s => String(s.ID_Servicio) === String(id))).filter(Boolean);
    const newAppointment = {
      id: `cita_${Date.now()}`, title, start, end, totalCost, clienteId, sedeId, barberId,
      services: JSON.stringify(serviciosIds),
      nombreSede: sedeInfo ? sedeInfo.Nombre_Sede : "Sede desconocida",
      nombreCompletoBarbero: barberoInfo ? `${barberoInfo.Nombre_Barbero} ${barberoInfo.Apellido_Barbero || ''}`.trim() : "Barbero desconocido",
      serviciosDetalle: serviciosInfo.map(s => ({ id: s.ID_Servicio, nombre: s.Nombre_Servicio, precio: s.Precio, duracion: s.Duracion_min }))
    };
    citas.push(newAppointment);
    await fs.writeFile(citasPath, JSON.stringify(citas, null, 2), 'utf8');
    res.status(201).json({ message: 'Cita creada con éxito', data: newAppointment });
  } catch (error) {
    console.error("Error en POST /citas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// PUT: Actualizar una cita
app.put('/citas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const citas = await readDatabaseFile('nuevas_citas.json');
    const citaIndex = citas.findIndex(c => c.id === id);
    if (citaIndex === -1) {
      return res.status(404).json({ message: `No se encontró la cita con ID ${id}` });
    }
    citas[citaIndex] = { ...citas[citaIndex], ...updatedData, id: citas[citaIndex].id };
    await fs.writeFile(citasPath, JSON.stringify(citas, null, 2), 'utf8');
    res.json({ message: 'Cita actualizada con éxito', data: citas[citaIndex] });
  } catch (error) {
    console.error(`Error en PUT /citas/${req.params.id}:`, error);
    res.status(500).json({ message: "Error al actualizar la cita." });
  }
});

// DELETE: Eliminar una cita
app.delete('/citas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const citas = await readDatabaseFile('nuevas_citas.json');
    const citasFiltradas = citas.filter(c => c.id !== id);
    if (citas.length === citasFiltradas.length) {
      return res.status(404).json({ message: `No se encontró la cita con ID ${id}` });
    }
    await fs.writeFile(citasPath, JSON.stringify(citasFiltradas, null, 2), 'utf8');
    res.status(200).json({ message: `Cita con ID ${id} eliminada con éxito` });
  } catch (error) {
    console.error(`Error en DELETE /citas/${req.params.id}:`, error);
    res.status(500).json({ message: "Error al eliminar la cita." });
  }
});

// --- Ruta de Contacto (ya existente) ---
const contactanosPath = path.join(__dirname, 'database', 'contactanos.json');
app.post('/contactanos', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }
    const contacts = await readDatabaseFile('contactanos.json');
    const newContact = {
      id: `msg_${Date.now()}`, nombre: name, email: email, mensaje: message,
      fecha: new Date().toISOString(),
    };
    contacts.push(newContact);
    await fs.writeFile(contactanosPath, JSON.stringify(contacts, null, 2), 'utf8');
    res.status(201).json({ message: 'Mensaje guardado con éxito', data: newContact });
  } catch (error) {
    console.error('Error en POST /contactanos:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log('-----------------------------------------');
  console.log(`🚀 API Central corriendo en http://localhost:${PORT}`);
  console.log('-----------------------------------------');
});