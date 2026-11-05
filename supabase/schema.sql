-- =====================================================================
--  IGV Press — skema database Supabase
--  Jalankan seluruh file ini di Supabase > SQL Editor > New query > Run.
--  Aman dijalankan ulang (idempotent sebisa mungkin).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Admin redaksi ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Katalog buku ----------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text not null,
  category text,                 -- Kesehatan, Pendidikan, Ekonomi, ...
  book_type text,                -- Buku ajar, Buku referensi, Monograf, Book chapter
  isbn text,
  year int,
  pages int,
  cover_color text default '#0F4C45',
  cover_url text,                -- opsional: URL gambar sampul (mis. dari Supabase Storage)
  buy_url text,                  -- opsional: tautan toko/marketplace/Google Books
  description text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Call for chapter ----------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  field text,
  description text,
  deadline date not null,
  quota int,
  filled int not null default 0,
  fee int default 450000,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Naskah masuk ----------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 160 and email like '%@%'),
  whatsapp text not null check (char_length(whatsapp) between 8 and 20),
  institution text check (char_length(institution) <= 160),
  book_title text not null check (char_length(book_title) between 3 and 250),
  book_type text,
  package text,
  pages_estimate int,
  manuscript_url text not null check (manuscript_url ~* '^https://'),
  notes text check (char_length(notes) <= 2000),
  call_id uuid references public.calls(id) on delete set null,
  status text not null default 'diterima'
    check (status in ('diterima','review','kontrak','editing','layout','proof','isbn','cetak','terbit','ditolak')),
  status_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_events (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- Catat riwayat setiap kali status berubah
create or replace function public.log_submission_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.status_note is distinct from old.status_note then
    insert into public.submission_events(submission_id, status, note) values (new.id, new.status, new.status_note);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_submission_status on public.submissions;
create trigger trg_submission_status
  before update on public.submissions
  for each row execute function public.log_submission_status();

create or replace function public.log_submission_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.submission_events(submission_id, status, note) values (new.id, new.status, null);
  return new;
end $$;

drop trigger if exists trg_submission_insert on public.submissions;
create trigger trg_submission_insert
  after insert on public.submissions
  for each row execute function public.log_submission_insert();

-- ---------- Fungsi publik (dipanggil dari website) ----------
-- Kirim naskah: mengembalikan kode lacak. Pengunjung TIDAK bisa membaca tabel submissions.
create or replace function public.submit_manuscript(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  loop
    v_code := 'IGV-' || to_char(now(), 'YY') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.submissions where tracking_code = v_code);
  end loop;

  insert into public.submissions(tracking_code, full_name, email, whatsapp, institution, book_title,
                                 book_type, package, pages_estimate, manuscript_url, notes, call_id)
  values (v_code,
          trim(p->>'full_name'), lower(trim(p->>'email')), trim(p->>'whatsapp'), nullif(trim(p->>'institution'), ''),
          trim(p->>'book_title'), p->>'book_type', p->>'package',
          nullif(p->>'pages_estimate', '')::int, trim(p->>'manuscript_url'), nullif(p->>'notes', ''),
          nullif(p->>'call_id', '')::uuid);
  return v_code;
end $$;

-- Lacak naskah: hanya mengembalikan judul, jenis, status, dan riwayat. Tanpa data pribadi.
create or replace function public.track_submission(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tracking_code', s.tracking_code,
    'book_title', s.book_title,
    'book_type', s.book_type,
    'status', s.status,
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'created_at', e.created_at) order by e.created_at)
                        from public.submission_events e where e.submission_id = s.id), '[]'::jsonb))
  from public.submissions s
  where s.tracking_code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.submit_manuscript(jsonb) from public;
revoke all on function public.track_submission(text) from public;
grant execute on function public.submit_manuscript(jsonb) to anon, authenticated;
grant execute on function public.track_submission(text) to anon, authenticated;

-- Tambah hitungan "filled" otomatis saat ada pendaftar book chapter
create or replace function public.bump_call_filled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.call_id is not null then
    update public.calls set filled = filled + 1 where id = new.call_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_bump_call on public.submissions;
create trigger trg_bump_call after insert on public.submissions
  for each row execute function public.bump_call_filled();

-- ---------- Row Level Security ----------
alter table public.admins enable row level security;
alter table public.books enable row level security;
alter table public.calls enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_events enable row level security;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (user_id = auth.uid());

drop policy if exists "books public read" on public.books;
create policy "books public read" on public.books for select using (published or public.is_admin());
drop policy if exists "books admin write" on public.books;
create policy "books admin write" on public.books for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "calls public read" on public.calls;
create policy "calls public read" on public.calls for select using (is_open or public.is_admin());
drop policy if exists "calls admin write" on public.calls;
create policy "calls admin write" on public.calls for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "submissions admin all" on public.submissions;
create policy "submissions admin all" on public.submissions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events admin read" on public.submission_events;
create policy "events admin read" on public.submission_events for select using (public.is_admin());

-- =====================================================================
--  SETELAH MENJALANKAN FILE INI:
--  1. Authentication > Users > Add user  (email + password akun redaksi)
--  2. Salin User UID-nya, lalu jalankan:
--       insert into public.admins(user_id) values ('PASTE-USER-UID-DI-SINI');
--  3. (Opsional) contoh data awal:
--       insert into public.calls(title, field, description, deadline, quota)
--       values ('Keperawatan Maternitas & Kesehatan Reproduksi', 'Kesehatan',
--               'Bab hasil penelitian atau kajian pustaka 15–20 halaman.', current_date + 30, 15);
-- =====================================================================
