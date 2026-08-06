-- Place Parfaite relational schema.
-- The legacy app_state row is intentionally preserved during migration.

create table if not exists wedding_tables (
  id smallint primary key check (id between 1 and 100),
  name text not null,
  motto text not null default '',
  capacity smallint not null check (capacity between 1 and 30),
  updated_at timestamptz not null default now()
);

create table if not exists wedding_guests (
  id bigint primary key,
  name text not null,
  status text not null,
  age_group text not null default 'À définir',
  affiliation text not null default 'À définir',
  gender text not null default 'Non précisé',
  languages text[] not null default array['Français']::text[],
  tags text[] not null default '{}'::text[],
  table_id smallint references wedding_tables(id),
  locked_table_id smallint references wedding_tables(id),
  override_table_id smallint references wedding_tables(id),
  pair_id text,
  pair_type text,
  partner text,
  couple_id text,
  couple_partner text,
  updated_at timestamptz not null default now()
);

create table if not exists wedding_separation_rules (
  id text primary key,
  guest_a_id bigint not null references wedding_guests(id) on delete cascade,
  guest_b_id bigint not null references wedding_guests(id) on delete cascade,
  check (guest_a_id <> guest_b_id)
);

create table if not exists wedding_settings (
  singleton boolean primary key default true check (singleton),
  default_capacity smallint not null default 8,
  priorities jsonb not null default '{}'::jsonb,
  room_assignments jsonb not null default '{}'::jsonb,
  room_positions jsonb not null default '[]'::jsonb,
  iterations jsonb not null default '{}'::jsonb,
  active_iteration smallint not null default 1 check (active_iteration in (1, 2)),
  updated_at timestamptz not null default now()
);

create index if not exists wedding_guests_table_id_idx on wedding_guests(table_id);
create index if not exists wedding_guests_status_idx on wedding_guests(status);
create index if not exists wedding_guests_name_idx on wedding_guests(lower(name));
