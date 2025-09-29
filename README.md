======================================================================
              💈 KINGDOM BARBER - API CENTRAL DE GESTIÓN
======================================================================

📖 DESCRIPCIÓN GENERAL
----------------------

Este repositorio contiene el código fuente de la **API central** 
desarrollada en **Node.js y Express**.  

La API permite gestionar todos los datos de la barbería, incluyendo:  
- Citas  
- Clientes  
- Barberos  
- Servicios  
- Galería de imágenes  

Está diseñada para ser consumida por múltiples aplicaciones front-end, 
como el **panel de administración (dashboard)** y la **página web de citas**.

======================================================================
                   ✨ CARACTERÍSTICAS PRINCIPALES
======================================================================

- **Gestión de Citas (CRUD):**  
  Endpoints completos para crear, leer, actualizar y eliminar citas.

- **Consulta de Datos Maestros:**  
  Rutas para obtener información de sedes, barberos, clientes y servicios.

- **Gestión de Galería de Imágenes (CRUD):**  
  Subida, actualización, consulta y eliminación de imágenes, 
  incluyendo el manejo de archivos físicos en el servidor.

- **Recepción de Mensajes:**  
  Endpoint para guardar mensajes enviados desde el formulario de contacto.

- **Persistencia de Datos:**  
  Se utilizan archivos **JSON** como base de datos, facilitando la 
  configuración y portabilidad.

- **Servidor de Archivos Estáticos:**  
  Sirve las imágenes de la galería para consumo directo desde el front-end.

======================================================================
                  📁 ESTRUCTURA DEL PROYECTO
======================================================================

.
├── database/
│   ├── barberos.json
│   ├── citas.json
│   ├── clientes.json
│   ├── contactanos.json
│   ├── gallery.json
│   ├── nuevas_citas.json
│   ├── sedes.json
│   └── servicios.json
├── node_modules/
├── public/
│   └── gallery/
│       └── (aquí se guardan las imágenes subidas)
├── index.js          # Archivo principal del servidor
├── package.json
├── package-lock.json
└── README.md

**index.js:** Contiene la lógica del servidor Express, 
middlewares y definición de endpoints.  

**database/:** Directorio que funciona como base de datos en JSON.  

**public/gallery/:** Carpeta donde se almacenan las imágenes subidas.  

======================================================================
                        🚀 CÓMO EMPEZAR
======================================================================

**Prerrequisitos:**  
- Tener instalado Node.js (versión LTS recomendada).

**Instalación:**
1. Clona el repositorio:  
   `git clone https://github.com/JuanRivera24/nombre-del-repositorio.git`

2. Navega al directorio:  
   `cd nombre-del-repositorio`

3. Instala las dependencias:  
   `npm install`

4. Configura directorios:  
   Asegúrate de que existan `database/` y `public/gallery/`.  
   Los archivos `.json` se crearán automáticamente si no existen.

**Ejecución:**  
- Inicia el servidor:  
  `node index.js`  

La API estará corriendo en:  
👉 **http://localhost:3001**

======================================================================
                       📡 ENDPOINTS DE LA API
======================================================================

-----------------------------
-- ENDPOINTS COMPARTIDOS --
-----------------------------

- **GET /sedes:** Lista de sedes.  
- **GET /barberos:** Lista de barberos.  
- **GET /servicios:** Lista de servicios.  
- **GET /clientes:** Lista de clientes.  
- **GET /citas:** Historial de citas.  

-----------------------------
-- GESTIÓN DE CITAS NUEVAS --
-----------------------------

- **GET /nuevas_citas:** Obtiene todas las citas agendadas.  
- **POST /nuevas_citas:** Crea una nueva cita (requiere JSON).  
- **PUT /nuevas_citas/:id:** Actualiza cita existente.  
- **DELETE /nuevas_citas/:id:** Elimina una cita por id.  

-----------------------------
-- GALERÍA Y CONTACTO --
-----------------------------

- **POST /contactanos:** Guarda un mensaje del formulario de contacto.  
- **GET /gallery:** Obtiene todas las imágenes.  
- **POST /gallery/upload:** Sube una nueva imagen (multipart/form-data).  
- **PUT /gallery/:id:** Actualiza descripción o categoría de imagen.  
- **DELETE /gallery/:id:** Elimina imagen de la BD y servidor.  

======================================================================
                🛠️ TECNOLOGÍAS UTILIZADAS
======================================================================

- **Node.js:** Entorno de ejecución JavaScript.  
- **Express.js:** Framework para la API REST.  
- **CORS:** Middleware para habilitar acceso entre dominios.  
- **Multer:** Middleware para subida de archivos.  

======================================================================
