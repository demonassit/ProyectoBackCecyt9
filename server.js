// server.js
// API REST para el registro de asistencia a talleres del CECyT 9.
// Se conecta a Supabase (Postgres) usando el cliente oficial de Supabase.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Habilita CORS para que el frontend (en otro dominio, ej. Vercel)
// pueda hacer peticiones a esta API. Origin específico (no "*") porque
// las cookies de sesión requieren credentials: true.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// Sesión de administrador. En producción (Render) el frontend vive en otro
// dominio (Vercel), así que la cookie necesita sameSite:'none' + secure:true
// para viajar cross-domain; en local (mismo origin, http) basta con 'lax'.
// El valor de respaldo del secret es solo para que el proceso no truene si
// falta la variable de entorno real; SESSION_SECRET debe estar en Render.
const enProduccion = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'valor-inseguro-temporal-configura-SESSION_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: enProduccion,
    sameSite: enProduccion ? 'none' : 'lax',
  },
}));

function requiereAdmin(req, res, next) {
  if (req.session.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
}

const MODO_MANTENIMIENTO = process.env.MODO_MANTENIMIENTO === 'true';

app.use('/api', (req, res, next) => {
  if (MODO_MANTENIMIENTO) {
    return res.status(503).json({ error: 'Servicio no disponible temporalmente' });
  }
  next();
});

// Cliente de Supabase. La URL y la llave se leen de variables de entorno,
// nunca deben escribirse directamente en el código.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Ruta de prueba para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Registro de Asistencia - CECyT 9 funcionando correctamente' });
});

// POST /api/auth/login - autentica al administrador y abre sesión
app.post('/api/auth/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'correo y contrasena son obligatorios' });
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('correo', correo)
    .single();

  if (error || !usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
  if (!coincide) return res.status(401).json({ error: 'Credenciales inválidas' });

  req.session.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  res.json({ nombre: usuario.nombre, rol: usuario.rol });
});

// POST /api/auth/logout - cierra la sesión activa
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ mensaje: 'Sesión cerrada' }));
});

// GET /api/auth/me - devuelve el usuario de la sesión activa, o null
app.get('/api/auth/me', (req, res) => {
  res.json({ usuario: req.session.usuario || null });
});

// GET /api/talleres - listar todos los talleres, ordenados por fecha
app.get('/api/talleres', async (req, res) => {
  const { data, error } = await supabase
    .from('talleres')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/talleres - crear un nuevo taller (solo administrador)
app.post('/api/talleres', requiereAdmin, async (req, res) => {
  const { nombre, instructor, fecha, cupo } = req.body;

  if (!nombre || !fecha) {
    return res.status(400).json({ error: 'nombre y fecha son obligatorios' });
  }

  const { data, error } = await supabase
    .from('talleres')
    .insert([{ nombre, instructor, fecha, cupo: cupo || 30 }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// GET /api/talleres/:id - obtener un taller y su número de asistentes
app.get('/api/talleres/:id', async (req, res) => {
  const { id } = req.params;

  const { data: taller, error: errorTaller } = await supabase
    .from('talleres')
    .select('*')
    .eq('id', id)
    .single();

  if (errorTaller) return res.status(404).json({ error: 'Taller no encontrado' });

  const { count } = await supabase
    .from('asistencias')
    .select('*', { count: 'exact', head: true })
    .eq('taller_id', id);

  res.json({ ...taller, asistentes: count || 0 });
});

// GET /api/talleres/:id/asistencias - listar los alumnos que registraron asistencia (solo administrador)
app.get('/api/talleres/:id/asistencias', requiereAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('asistencias')
    .select('*')
    .eq('taller_id', id)
    .order('fecha_registro', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/asistencias - registrar la asistencia de un alumno a un taller
app.post('/api/asistencias', async (req, res) => {
  const { taller_id, nombre_alumno, boleta } = req.body;

  if (!taller_id || !nombre_alumno || !boleta) {
    return res.status(400).json({ error: 'taller_id, nombre_alumno y boleta son obligatorios' });
  }

  const { data, error } = await supabase
    .from('asistencias')
    .insert([{ taller_id, nombre_alumno, boleta }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// PUT /api/talleres/:id - actualizar un taller (solo administrador)
app.put('/api/talleres/:id', requiereAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, instructor, fecha, cupo } = req.body;

  if (!nombre || !fecha) {
    return res.status(400).json({ error: 'nombre y fecha son obligatorios' });
  }

  const { data, error } = await supabase
    .from('talleres')
    .update({ nombre, instructor, fecha, cupo })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(404).json({ error: 'Taller no encontrado' });
  res.json(data[0]);
});

// DELETE /api/talleres/:id - eliminar un taller (solo administrador)
app.delete('/api/talleres/:id', requiereAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('talleres')
    .delete()
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(404).json({ error: 'Taller no encontrado' });
  res.status(204).send();
});

// GET /api/legacy - ruta artificial: Express/Node nunca generan un 505 real
// (es un código de nivel de protocolo HTTP, no de aplicación). Se agrega solo
// para que el grupo conozca el código; no representa una falla real de servidor.
app.get('/api/legacy', (req, res) => {
  res.status(505).json({ error: 'HTTP Version Not Supported' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
