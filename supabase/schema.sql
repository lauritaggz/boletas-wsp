-- Ejecutar en Supabase > SQL Editor

create table if not exists usuarios (
  id              uuid primary key default gen_random_uuid(),
  telefono        text unique not null,      -- formato WhatsApp, sin "+": 56912345678
  nombre          text not null,
  dia_cierre      int check (dia_cierre between 1 and 31), -- null = último día del mes
  ultimo_reporte  date,
  creado_en       timestamptz default now()
);

create table if not exists boletas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  wa_message_id   text unique not null,      -- evita duplicados si Meta reintenta el webhook
  archivo_path    text not null,             -- ruta en el bucket "boletas"
  fecha           date,
  emisor          text,
  rut_emisor      text,
  tipo_doc        text,                      -- boleta, factura, voucher...
  concepto        text,
  monto           integer,                   -- CLP, sin decimales
  estado          text not null default 'pendiente' check (estado in ('pendiente','reportada')),
  reportada_en    date,
  creado_en       timestamptz default now()
);

create index if not exists boletas_usuario_estado on boletas (usuario_id, estado);

-- RLS activado y sin políticas: solo la service role (el backend) puede leer y escribir
alter table usuarios enable row level security;
alter table boletas  enable row level security;

-- Bucket privado para las fotos/PDF
insert into storage.buckets (id, name, public)
values ('boletas', 'boletas', false)
on conflict (id) do nothing;

-- Registrar a la persona autorizada (ajusta datos)
-- insert into usuarios (telefono, nombre, dia_cierre) values ('56912345678', 'Juan Pérez', null);
