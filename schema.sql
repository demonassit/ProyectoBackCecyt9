-- schema.sql
-- Ejecutar este script en Supabase: Panel de Supabase > SQL Editor > New query

create table talleres (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  instructor text,
  fecha date not null,
  cupo integer default 30,
  created_at timestamp with time zone default now()
);

create table asistencias (
  id uuid primary key default gen_random_uuid(),
  taller_id uuid references talleres(id) on delete cascade,
  nombre_alumno text not null,
  boleta text not null,
  fecha_registro timestamp with time zone default now()
);

-- Datos de ejemplo para practicar durante el curso
insert into talleres (nombre, instructor, fecha, cupo) values
  ('Introducción a Python', 'Ing. María López', '2026-08-10', 25),
  ('Fundamentos de Redes', 'Ing. Carlos Ramírez', '2026-08-12', 30),
  ('Diseño de Bases de Datos', 'Ing. Ana Torres', '2026-08-14', 20);

-- IMPORTANTE (solo para fines didácticos del curso):
-- Por defecto, Supabase activa "Row Level Security" (RLS) en tablas nuevas,
-- lo cual bloquea todas las peticiones hasta definir políticas de acceso.
-- Para simplificar el curso, se puede desactivar temporalmente así:
--
-- alter table talleres disable row level security;
-- alter table asistencias disable row level security;
--
-- En un proyecto real esto NO se debe hacer: se deben crear políticas
-- de RLS específicas. Es un excelente tema para mencionar en clase como
-- "próximo paso" una vez que el despliegue básico funcione.
