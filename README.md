# Backend - Registro de Asistencia CECyT 9

API REST hecha con Node.js + Express que administra talleres y el registro de
asistencia de alumnos. Se conecta a una base de datos Postgres alojada en
Supabase.

## Estructura

```
server.js       -> servidor Express con todas las rutas de la API
schema.sql      -> script para crear las tablas en Supabase
.env.example    -> variables de entorno necesarias (copiar como .env)
```

## Cómo correrlo en tu computadora

1. Instala las dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` a `.env` y llena los valores con los datos de tu
   proyecto de Supabase (Project Settings > API).
3. Levanta el servidor:
   ```
   npm run dev
   ```
4. Prueba que funciona entrando a `http://localhost:3001` en el navegador.

## Cómo desplegarlo en Render (gratis)

1. Sube este proyecto a un repositorio de GitHub.
2. En Render.com, crea un nuevo "Web Service" y conéctalo a ese repositorio.
3. Configuración:
   - Build command: `npm install`
   - Start command: `npm start`
4. En la sección "Environment", agrega las mismas variables que tienes en tu
   `.env` (`SUPABASE_URL`, `SUPABASE_KEY`).
5. Al terminar el despliegue, Render te da una URL pública, por ejemplo
   `https://cecyt9-asistencia-backend.onrender.com`. Esa es la URL que el
   frontend usará para hacer sus peticiones.

Nota: en el plan gratuito, el servicio "se duerme" tras 15 minutos sin uso y
tarda unos segundos en despertar en la siguiente petición. Es un buen punto
para explicar en clase qué implica tener un servidor siempre encendido
(y por qué cuesta dinero).

## Endpoints disponibles

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|---------------------------------------|
| GET    | /api/talleres                 | Lista todos los talleres              |
| POST   | /api/talleres                 | Crea un nuevo taller                  |
| GET    | /api/talleres/:id             | Obtiene un taller y su nº de asistentes |
| GET    | /api/talleres/:id/asistencias | Lista los alumnos registrados         |
| POST   | /api/asistencias              | Registra la asistencia de un alumno   |
