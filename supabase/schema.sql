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


-- ---------- Pengaturan situs (harga & konten, diatur dari admin.html) ----------
-- key = 'pricing' atau 'content'; value = JSON. Baris yang belum ada memakai nilai bawaan js/data.js.
create table if not exists public.site_settings (
  key text primary key check (key in ('pricing', 'content')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
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
alter table public.site_settings enable row level security;

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

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

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


-- =====================================================================
--  TAHAP 2 — Portal Penulis, pembayaran bertahap, unggah berkas
--  Bagian ini aman dijalankan pada database yang sudah berisi data.
-- =====================================================================

alter table public.submissions add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.submissions add column if not exists agreed_price int check (agreed_price is null or agreed_price >= 0);
alter table public.submissions add column if not exists manuscript_path text;
alter table public.submissions alter column manuscript_url drop not null;
alter table public.submissions drop constraint if exists submissions_manuscript_src;
alter table public.submissions add constraint submissions_manuscript_src
  check (manuscript_url is not null or manuscript_path is not null);
create index if not exists submissions_email_idx on public.submissions (lower(email));
create index if not exists submissions_author_idx on public.submissions (author_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  seq int not null,
  label text not null,
  amount int not null check (amount >= 0),
  status text not null default 'belum' check (status in ('belum', 'menunggu', 'lunas', 'ditolak')),
  proof_path text,
  admin_note text,
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_sub_idx on public.payments (submission_id);

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  kind text not null check (kind in ('naskah', 'revisi', 'proof', 'bukti_bayar', 'lainnya')),
  path text not null,
  name text,
  note text,
  uploaded_by uuid references auth.users(id) on delete set null,
  from_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists files_sub_idx on public.submission_files (submission_id);

-- Penulis = pengguna yang login dengan email yang sama dengan email di naskah
-- (email terverifikasi lewat tautan masuk), atau author_id yang tercatat.
create or replace function public.owns_submission(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.submissions s
    where s.id = sid
      and (s.author_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '-'))));
$$;

-- Kirim naskah (versi tahap 2): mendukung tautan ATAU file yang diunggah penulis yang login.
create or replace function public.submit_manuscript(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_path text := nullif(p->>'manuscript_path', ''); v_url text := nullif(trim(p->>'manuscript_url'), ''); v_id uuid;
begin
  if v_path is not null and (auth.uid() is null or v_path not like auth.uid()::text || '/%') then
    raise exception 'File naskah tidak valid';
  end if;
  if v_url is not null and v_url !~* '^https://' then raise exception 'Tautan naskah harus diawali https://'; end if;
  if v_url is null and v_path is null then raise exception 'Lampirkan tautan atau file naskah'; end if;

  loop
    v_code := 'IGV-' || to_char(now(), 'YY') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.submissions where tracking_code = v_code);
  end loop;

  insert into public.submissions(tracking_code, full_name, email, whatsapp, institution, book_title, book_type, package,
                                 pages_estimate, manuscript_url, manuscript_path, notes, call_id, author_id)
  values (v_code, trim(p->>'full_name'),
          lower(coalesce(nullif(auth.jwt() ->> 'email', ''), trim(p->>'email'))),
          trim(p->>'whatsapp'), nullif(trim(p->>'institution'), ''), trim(p->>'book_title'),
          p->>'book_type', p->>'package', nullif(p->>'pages_estimate', '')::int, v_url, v_path,
          nullif(p->>'notes', ''), nullif(p->>'call_id', '')::uuid, auth.uid())
  returning id into v_id;

  if v_path is not null then
    insert into public.submission_files(submission_id, kind, path, name, uploaded_by)
    values (v_id, 'naskah', v_path, nullif(p->>'manuscript_name', ''), auth.uid());
  end if;
  return v_code;
end $$;

-- Penulis menambah berkas (revisi, dll.) pada naskahnya sendiri
create or replace function public.author_add_file(p_submission uuid, p_kind text, p_path text, p_name text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.owns_submission(p_submission) then raise exception 'Naskah tidak ditemukan'; end if;
  if p_kind not in ('naskah', 'revisi', 'lainnya') then raise exception 'Jenis berkas tidak valid'; end if;
  if p_path not like auth.uid()::text || '/%' then raise exception 'Lokasi berkas tidak valid'; end if;
  insert into public.submission_files(submission_id, kind, path, name, note, uploaded_by)
  values (p_submission, p_kind, p_path, p_name, nullif(p_note, ''), auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- Penulis mengirim bukti transfer untuk satu tahap pembayaran
create or replace function public.author_pay(p_payment uuid, p_path text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_sid uuid;
begin
  select submission_id into v_sid from public.payments where id = p_payment and status in ('belum', 'ditolak');
  if v_sid is null or not public.owns_submission(v_sid) then raise exception 'Tagihan tidak ditemukan atau sudah diproses'; end if;
  if p_path not like auth.uid()::text || '/%' then raise exception 'Lokasi berkas tidak valid'; end if;
  update public.payments set proof_path = p_path, status = 'menunggu', paid_at = now(), admin_note = null where id = p_payment;
  insert into public.submission_files(submission_id, kind, path, name, uploaded_by)
  values (v_sid, 'bukti_bayar', p_path, p_name, auth.uid());
end $$;

revoke all on function public.author_add_file(uuid, text, text, text, text) from public;
revoke all on function public.author_pay(uuid, text, text) from public;
grant execute on function public.author_add_file(uuid, text, text, text, text) to authenticated;
grant execute on function public.author_pay(uuid, text, text) to authenticated;
grant execute on function public.submit_manuscript(jsonb) to anon, authenticated;

alter table public.payments enable row level security;
alter table public.submission_files enable row level security;

drop policy if exists "submissions author read" on public.submissions;
create policy "submissions author read" on public.submissions for select using (public.owns_submission(id));
drop policy if exists "events author read" on public.submission_events;
create policy "events author read" on public.submission_events for select using (public.owns_submission(submission_id));

drop policy if exists "payments admin all" on public.payments;
create policy "payments admin all" on public.payments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "payments author read" on public.payments;
create policy "payments author read" on public.payments for select using (public.owns_submission(submission_id));

drop policy if exists "files admin all" on public.submission_files;
create policy "files admin all" on public.submission_files for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "files author read" on public.submission_files;
create policy "files author read" on public.submission_files for select using (public.owns_submission(submission_id));

-- ---------- Storage ----------
-- manuscripts: privat, maks 50 MB per berkas. Penulis menulis ke folder <user_id>/..., redaksi ke admin/<submission_id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('manuscripts', 'manuscripts', false, 52428800) on conflict (id) do nothing;
-- covers: publik, untuk gambar sampul katalog
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;

drop policy if exists "ms author upload" on storage.objects;
create policy "ms author upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ms read" on storage.objects;
create policy "ms read" on storage.objects for select to authenticated
  using (bucket_id = 'manuscripts' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.submission_files f where f.path = storage.objects.name and public.owns_submission(f.submission_id))));
drop policy if exists "ms admin write" on storage.objects;
create policy "ms admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'manuscripts' and public.is_admin());
drop policy if exists "ms admin delete" on storage.objects;
create policy "ms admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'manuscripts' and public.is_admin());

drop policy if exists "covers admin insert" on storage.objects;
create policy "covers admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers admin update" on storage.objects;
create policy "covers admin update" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers admin delete" on storage.objects;
create policy "covers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_admin());


-- =====================================================================
--  TAHAP 3 — Peran staf redaksi: Super admin & Editor
--  Super admin : semua menu, termasuk Harga, Konten, Tampilan, Staf.
--  Editor      : naskah, pembayaran, berkas, katalog, call for chapter.
--  Aman dijalankan ulang.
-- =====================================================================

create table if not exists public.staff (
  email text primary key check (email = lower(email) and email like '%@%'),
  name text,
  role text not null default 'editor' check (role in ('super', 'editor')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- Admin dari tahap sebelumnya otomatis menjadi super admin
insert into public.staff(email, role)
select lower(u.email), 'super' from public.admins a join auth.users u on u.id = a.user_id
where u.email is not null
on conflict (email) do nothing;

create or replace function public.jwt_email()
returns text language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from public.staff where email = public.jwt_email() and role = 'super') then 'super'
    when exists (select 1 from public.admins where user_id = auth.uid()) then 'super'
    when exists (select 1 from public.staff where email = public.jwt_email()) then 'editor'
    else null end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$ select public.my_role() is not null; $$;
create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.my_role() = 'super', false); $$;

grant execute on function public.my_role() to authenticated;

-- Harus selalu ada minimal satu super admin; staf yang dihapus/diturunkan
-- juga kehilangan akses lama dari tabel admins.
create or replace function public.staff_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'super' and (tg_op = 'DELETE' or new.role <> 'super' or new.email <> old.email)
     and not exists (select 1 from public.staff where role = 'super' and email <> old.email) then
    raise exception 'Harus ada minimal satu super admin';
  end if;
  if tg_op = 'DELETE' or new.role <> 'super' or new.email <> old.email then
    delete from public.admins where user_id in (select id from auth.users where lower(email) = old.email);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_staff_guard on public.staff;
create trigger trg_staff_guard before update or delete on public.staff
  for each row execute function public.staff_guard();

alter table public.staff enable row level security;
drop policy if exists "staff read" on public.staff;
create policy "staff read" on public.staff for select using (public.is_admin());
drop policy if exists "staff super write" on public.staff;
create policy "staff super write" on public.staff for all using (public.is_super()) with check (public.is_super());

-- Hanya super admin yang boleh mengubah harga, konten, dan tampilan
drop policy if exists "settings admin write" on public.site_settings;
drop policy if exists "settings super write" on public.site_settings;
create policy "settings super write" on public.site_settings for all using (public.is_super()) with check (public.is_super());

-- =====================================================================
--  MENAMBAH SUPER ADMIN PERTAMA pada instalasi baru (cukup sekali):
--    insert into public.staff(email, role) values ('email@anda.com', 'super');
--  Staf berikutnya ditambahkan dari admin.html > tab "Staf redaksi".
-- =====================================================================
