# Centro Operativo Dorado

Panel central para gestión de proyectos, bitácora y módulos.

## Estructura
```
centro-operativo-dorado/
├─ index.html
├─ styles.css
├─ app.js
├─ README.md
├─ assets/
└─ modulos/
   ├─ oficina-ideas/
   │  ├─ index.html
   │  ├─ styles.css
   │  └─ app.js
   ├─ mama-salud/
   │  └─ index.html
   ├─ abc-de-vicky/
   │  └─ index.html
   ├─ audio-sagrado/
   │  └─ index.html
   ├─ kits-fisica/
   │  └─ index.html
   └─ maker-lab/
      └─ index.html
```

## Uso local
```sh
cd /data/data/com.termux/files/home/proyectos/centro-operativo-dorado
python3 -m http.server 8090
```
Luego abre: `http://127.0.0.1:8090/`

## Manual (GitHub)
- Archivo: `manual.html`
- En GitHub Pages: `https://doradoponcedeleon.github.io/centro-operativo-dorado/manual.html`

## Sincronización (Supabase sin login)
Este proyecto puede sincronizar datos entre dispositivos usando Supabase sin login.

### 1) Crear tabla y políticas (SQL)
En Supabase → SQL Editor, ejecuta:
```sql
create table if not exists public.cod_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.cod_data enable row level security;

create policy "public read" on public.cod_data
  for select using (true);

create policy "public insert" on public.cod_data
  for insert with check (true);

create policy "public update" on public.cod_data
  for update using (true);
```

### 2) Configurar credenciales en el frontend
En `app.js` y `modulos/oficina-ideas/app.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON`

### 3) Flujo
Los datos se guardan en la tabla `cod_data` con `id = "main"`.
