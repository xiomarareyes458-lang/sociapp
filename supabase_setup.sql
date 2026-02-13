
-- 1. Tabla de Perfiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  joined_at bigint,
  cover_photo text,
  followers uuid[] default '{}',
  following uuid[] default '{}',
  created_at timestamp with time zone default now()
);

-- 2. Tabla de Publicaciones
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  content text,
  image_url text,
  type text default 'image',
  created_at timestamp with time zone default now()
);

-- 3. Tabla de Likes (Independiente)
create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

-- 4. Tabla de Comentarios
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  text text, -- columna alias para compatibilidad
  created_at timestamp with time zone default now()
);

-- 5. Tabla de Amigos (Relación de amistad mutua)
create table if not exists friends (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- 6. Tabla de Solicitudes de Amistad
create table if not exists friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default now(),
  unique(sender_id, receiver_id)
);

-- 7. Tabla de Notificaciones
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  type text not null,
  reference_id uuid,
  read boolean default false,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Habilitar RLS en todas las tablas
alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table friends enable row level security;
alter table friend_requests enable row level security;
alter table notifications enable row level security;

-- Políticas de seguridad (Simplificadas para prototipo)
create policy "Todo es legible para usuarios autenticados" on profiles for select using (true);
create policy "Todo es legible para usuarios autenticados" on posts for select using (true);
create policy "Todo es legible para usuarios autenticados" on likes for select using (true);
create policy "Todo es legible para usuarios autenticados" on comments for select using (true);
create policy "Todo es legible para usuarios autenticados" on friends for select using (true);
create policy "Todo es legible para usuarios autenticados" on friend_requests for select using (true);
create policy "Todo es legible para usuarios autenticados" on notifications for select using (true);

create policy "Escritura permitida para autenticados" on profiles for all using (auth.uid() = id);
create policy "Escritura permitida para autenticados" on posts for all using (auth.uid() = user_id);
create policy "Escritura permitida para autenticados" on likes for all using (auth.uid() = user_id);
create policy "Escritura permitida para autenticados" on comments for all using (auth.uid() = user_id);
create policy "Escritura permitida para autenticados" on friends for all using (auth.uid() = user_id);
create policy "Escritura permitida para autenticados" on friend_requests for all using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Escritura permitida para autenticados" on notifications for all using (auth.uid() = user_id or auth.uid() = sender_id);
