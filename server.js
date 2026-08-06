// server.js
// API REST para el registro de asistencia a talleres del CECyT 9.
// Se conecta a Supabase (Postgres) usando el cliente oficial de Supabase.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Habilita CORS para que el frontend (en otro dominio, ej. Vercel)
// pueda hacer peticiones a esta API.
app.use(cors());
app.use(express.json());

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

// GET /api/talleres - listar todos los talleres, ordenados por fecha
app.get('/api/talleres', async (req, res) => {
  const { data, error } = await supabase
    .from('talleres')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/talleres - crear un nuevo taller
app.post('/api/talleres', async (req, res) => {
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

// GET /api/talleres/:id/asistencias - listar los alumnos que registraron asistencia
app.get('/api/talleres/:id/asistencias', async (req, res) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
