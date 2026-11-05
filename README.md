# IGV Press — Website Penerbitan Buku Akademik
PT. Inovasi Global Ventures

Situs statis (HTML/CSS/JS murni, tanpa proses build) dengan database **Supabase**, kode di **GitHub**, dan hosting gratis di **Cloudflare Pages**.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Halaman utama: Profil, Layanan, Harga, Studio Penulis, Katalog, Call for Chapter, Lacak Naskah, Kirim Naskah, FAQ |
| `admin.html` | Dasbor redaksi (login): ubah status naskah, kelola katalog dan call for chapter |
| `js/config.js` | **Satu-satunya file yang wajib diubah**: kunci Supabase, nomor WA, email, alamat, nomor IKAPI |
| `js/data.js` | Harga paket, add-on, tarif cetak, angka kredit, daftar cek kesiapan naskah |
| `supabase/schema.sql` | Tabel, keamanan (RLS), dan fungsi untuk kirim/lacak naskah |
| `_headers` | Header keamanan untuk Cloudflare Pages |

## Fitur unggulan (pembeda dari penerbit lain)
1. **Pratinjau sampul & KDT langsung** di beranda — penulis mengetik judul dan langsung melihat sampul serta halaman katalognya.
2. **Kalkulator biaya** dengan rincian per item, hardcover/berwarna, layanan tambahan, dan simulasi cicilan 3×.
3. **Simulasi angka kredit** (PO PAK) termasuk pembagian 60/40 penulis utama–anggota.
4. **Cek kesiapan naskah** berdasarkan syarat ISBN Perpusnas.
5. **Lacak naskah real-time** dengan kode lacak dan riwayat tanggal tiap tahap.
6. **Call for chapter** dengan hitung mundur dan kuota yang terisi otomatis.

## Langkah deploy (±30 menit)

### 1. Supabase (database)
1. Daftar di https://supabase.com → **New project** (pilih region Singapore).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
3. **Authentication → Users → Add user**: buat akun redaksi (email + kata sandi).
4. Salin **User UID** akun itu, lalu jalankan di SQL Editor:
   ```sql
   insert into public.admins(user_id) values ('PASTE-USER-UID');
   ```
5. **Project Settings → API**: salin **Project URL** dan **anon public key** ke `js/config.js`.
6. Disarankan: **Authentication → Providers → Email** matikan "Allow new users to sign up" agar orang lain tidak bisa mendaftar.

### 2. GitHub (kode)
1. Buat repository baru, misalnya `igv-press` (boleh private).
2. Unggah semua file di folder ini (Add file → Upload files), atau:
   ```bash
   git init && git add . && git commit -m "Website IGV Press"
   git branch -M main
   git remote add origin https://github.com/USERNAME/igv-press.git
   git push -u origin main
   ```

### 3. Cloudflare Pages (hosting gratis)
1. Masuk https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pilih repository `igv-press`.
3. Build settings: **Framework preset: None**, **Build command: (kosong)**, **Build output directory: `/`**.
4. **Save and Deploy**. Situs aktif di `https://igv-press.pages.dev` (subdomain gratis).
5. Setiap kali Anda push ke GitHub, situs otomatis diperbarui.

### 4. Domain sendiri (opsional)
Subdomain `*.pages.dev` gratis selamanya. Domain sendiri (`igvpress.id`, `.co.id`, `.com`) tetap harus dibeli di registrar (±Rp150–350 ribu/tahun), lalu hubungkan di **Pages → Custom domains**. SSL dari Cloudflare gratis.

## Mengubah harga
Semua harga ada di `js/data.js` (`packages`, `chapter`, `addons`, `print`). Tabel harga dan kalkulator membaca sumber yang sama, jadi cukup ubah satu kali.

Acuan harga yang dipakai (dapat disesuaikan):
| Paket | Harga | Eksemplar | Halaman |
|---|---|---|---|
| Esensial | Rp1.250.000 | 5 | s.d. 150 |
| Profesional | Rp2.450.000 | 15 | s.d. 200 |
| Unggulan | Rp4.750.000 | 30 | s.d. 300 |
| Book chapter | Rp450.000/penulis | 1 | 1 bab |

## Yang perlu Anda pastikan sebelum tayang
- **Komitmen bisnis** di situs (royalti 20%, garansi ISBN atau uang kembali, cicilan 3×, reviewer sebidang, waktu proses) adalah usulan. Sesuaikan dengan kebijakan perusahaan sebelum dipublikasikan.
- **DOI** memerlukan keanggotaan Crossref (melalui sponsor/afiliasi). Jika belum, hapus `doi` dari `js/data.js`.
- **Nomor IKAPI**: isi `ikapi` di `js/config.js` setelah terdaftar; baris itu otomatis muncul di footer.
- **Nilai angka kredit** mengacu Pedoman Operasional PAK. Periksa kembali jika ada pedoman terbaru.
- Situs tidak menampilkan testimoni palsu. Bila ingin menambah testimoni, gunakan kutipan asli dengan izin penulis.

## Cara kerja keamanan
- Pengunjung **tidak bisa** membaca data naskah orang lain. Pengiriman dan pelacakan memakai fungsi `submit_manuscript` dan `track_submission` yang hanya mengembalikan judul, status, dan riwayat (tanpa email/WA).
- Hanya akun di tabel `admins` yang bisa membaca dan mengubah naskah, katalog, dan call for chapter.
- Mode demo aktif otomatis selama `config.js` belum diisi, sehingga tampilan bisa dicek tanpa database.
