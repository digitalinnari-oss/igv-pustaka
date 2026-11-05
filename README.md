# IGV Press — Website Penerbitan Buku Akademik
PT. Inovasi Global Ventures

Situs statis (HTML/CSS/JS murni, tanpa proses build) dengan database **Supabase**, kode di **GitHub**, dan hosting gratis di **Cloudflare Pages**.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Halaman utama: Profil, Layanan, Harga, Studio Penulis, Katalog, Call for Chapter, Lacak Naskah, Kirim Naskah, FAQ |
| `penulis.html` | **Portal Penulis**: masuk via email tanpa kata sandi, pantau naskah, bayar tagihan bertahap, unggah naskah & revisi |
| `admin.html` | Dasbor redaksi (login): status naskah, katalog, call for chapter, **harga & paket**, dan **seluruh teks halaman** |
| `js/config.js` | **Satu-satunya file yang wajib diubah**: kunci Supabase (identitas di sini hanya nilai awal) |
| `js/data.js` | Nilai **bawaan** harga dan konten; dipakai sampai admin menyimpan versi sendiri |
| `supabase/schema.sql` | Tabel, keamanan (RLS), dan fungsi untuk kirim/lacak naskah |
| `_headers` | Header keamanan untuk Cloudflare Pages |

## Fitur unggulan (pembeda dari penerbit lain)
1. **Pratinjau sampul & KDT langsung** di beranda — penulis mengetik judul dan langsung melihat sampul serta halaman katalognya.
2. **Kalkulator biaya** dengan rincian per item, hardcover/berwarna, layanan tambahan, dan simulasi cicilan 3×.
3. **Simulasi angka kredit** (PO PAK) termasuk pembagian 60/40 penulis utama–anggota.
4. **Cek kesiapan naskah** berdasarkan syarat ISBN Perpusnas.
5. **Lacak naskah real-time** dengan kode lacak dan riwayat tanggal tiap tahap.
6. **Call for chapter** dengan hitung mundur dan kuota yang terisi otomatis.
7. **Portal Penulis**: semua naskah, tagihan cicilan, bukti transfer, proof dari redaksi, dan revisi dalam satu dasbor.
8. **Dasbor redaksi**: ringkasan bulanan, daftar "perlu tindakan", verifikasi pembayaran, kirim proof, dan tombol kabar WhatsApp berisi status terkini.

## Langkah deploy (±45–60 menit)

Panduan lengkap langkah demi langkah ada di dokumen "Panduan Pemasangan IGV Press". Ringkasannya:

### 1. Supabase (database)
1. Daftar di https://supabase.com → **New project** (pilih region Singapore).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
3. **Authentication → Users → Add user**: buat akun redaksi (email + kata sandi).
4. Salin **User UID** akun itu, lalu jalankan di SQL Editor:
   ```sql
   insert into public.admins(user_id) values ('PASTE-USER-UID');
   ```
5. **Project Settings → API**: salin **Project URL** dan **anon public key** ke `js/config.js`.
6. **Authentication → Providers → Email**: biarkan "Allow new users to sign up" **aktif**, karena penulis masuk ke Portal Penulis lewat tautan email. Ini aman: hak redaksi hanya diberikan kepada akun yang ada di tabel `admins`.
7. **Authentication → URL Configuration**: isi **Site URL** dengan alamat situs (mis. `https://igv-press.pages.dev`) dan tambahkan `https://igv-press.pages.dev/penulis.html` ke **Redirect URLs**. Tanpa ini, tautan masuk penulis akan gagal.
8. **Email pengirim (penting)**: layanan email bawaan Supabase hanya untuk uji coba dan dibatasi beberapa email per jam. Sebelum tayang, pasang SMTP sendiri di **Authentication → Emails → SMTP Settings** (misalnya Brevo atau Resend, keduanya punya paket gratis), lalu ubah template email "Magic Link" ke Bahasa Indonesia.

### 2. GitHub (kode)
1. Buat repository baru, misalnya `igv-press` (boleh private).
2. Unggah **isi** folder ini (bukan foldernya) lewat tautan *uploading an existing file*, sehingga `index.html` berada di tingkat atas repository. Atau lewat terminal:
   ```bash
   git init && git add . && git commit -m "Website IGV Press"
   git branch -M main
   git remote add origin https://github.com/USERNAME/igv-press.git
   git push -u origin main
   ```

### 3. Cloudflare Pages (hosting gratis)
1. Masuk https://dash.cloudflare.com → **Workers & Pages → Create application → tab Pages → Import an existing Git repository**.
2. Pilih repository `igv-press`.
3. Build settings: **Framework preset: None**, **Build command: `exit 0`**, **Build output directory: `/`**.
4. **Save and Deploy**. Situs aktif di `https://igv-press.pages.dev` (subdomain gratis).
5. Setiap kali Anda push ke GitHub, situs otomatis diperbarui.

### 4. Domain sendiri (opsional)
Subdomain `*.pages.dev` gratis selamanya. Domain sendiri (`igvpress.id`, `.co.id`, `.com`) tetap harus dibeli di registrar (±Rp150–350 ribu/tahun), lalu hubungkan di **Pages → Custom domains**. SSL dari Cloudflare gratis.

## Peran redaksi
| Peran | Bisa mengakses |
|---|---|
| Super admin | Semua menu: Ringkasan, Naskah, Katalog, Call for chapter, Harga & paket, Konten halaman, **Tampilan**, **Staf redaksi** |
| Editor | Ringkasan, Naskah (status, tagihan, verifikasi, berkas), Katalog, Call for chapter |

- Super admin menambah staf di **Staf redaksi** cukup dengan email; staf masuk lewat tombol **Kirim tautan masuk ke email** di `/admin`.
- Sistem menolak menghapus atau menurunkan super admin terakhir.
- **Tampilan**: logo, favicon, warna utama & aksen (6 pilihan siap pakai atau warna bebas), huruf judul & isi, urutan/nama/tampil-sembunyi tiap bagian dan menu.
- Di Supabase **Authentication → URL Configuration → Redirect URLs** isi `https://<situs>/**` agar tautan masuk berfungsi untuk `/penulis` dan `/admin`.

## Alur kerja harian redaksi
1. **Ringkasan** menampilkan naskah baru, bukti bayar yang menunggu, dan naskah yang belum punya jadwal tagihan. Klik **Buka** untuk langsung ke detailnya.
2. Di **Naskah masuk → Detail**: isi **nilai kontrak**, klik **Buat jadwal tagihan** (otomatis dibagi sesuai tahap cicilan, mis. 40/30/30), lalu ubah status ke "Kontrak & pembayaran".
3. Penulis mengunggah bukti transfer di Portal Penulis → muncul di Ringkasan → klik **Lihat bukti**, lalu **Tandai lunas** atau **Tolak bukti** dengan alasan.
4. Kirim proof layout lewat **Kirim berkas ke penulis**; penulis mengunduhnya dari portal dan mengirim revisi balik.
5. Tombol **Kabari via WhatsApp** membuka WhatsApp dengan pesan status terkini yang sudah terisi.

Berkas naskah disimpan di Supabase Storage (bucket privat `manuscripts`, maks 50 MB per berkas). Paket gratis Supabase memberi 1 GB penyimpanan; arsipkan naskah lama ke Google Drive bila mendekati batas.

## Mengatur harga dan konten dari admin
Masuk ke `https://domain-anda/admin.html`, lalu:
- **Harga & paket**: tambah/hapus/urutkan paket, ubah harga, eksemplar, batas halaman, fasilitas, layanan tambahan, tarif cetak, dan cicilan. Tabel harga, kalkulator, dan pilihan paket di formulir langsung ikut berubah.
- **Konten halaman**: rekening pembayaran, teks Portal Penulis, identitas & kontak (nama, PT, WhatsApp, email, alamat, IKAPI, awalan ISBN), beranda, profil, visi-misi, keunggulan, layanan, alur, judul tiap bagian, FAQ, nilai angka kredit, dan syarat cek kesiapan naskah.
- Ketik `{nama}` atau `{perusahaan}` di teks mana pun; otomatis diganti nama penerbit/PT. Di judul beranda, apit kata dengan `*bintang*` untuk menyorotnya.
- **Kembalikan ke bawaan** memuat ulang isi `js/data.js`; baru berlaku setelah Anda menekan Simpan.

Pengaturan disimpan di tabel `site_settings` (dua baris: `pricing` dan `content`). Pengunjung hanya bisa membaca; hanya admin yang bisa mengubah.

Acuan harga bawaan:
| Paket | Harga | Eksemplar | Halaman |
|---|---|---|---|
| Esensial | Rp1.250.000 | 5 | s.d. 150 |
| Profesional | Rp2.450.000 | 15 | s.d. 200 |
| Unggulan | Rp4.750.000 | 30 | s.d. 300 |
| Book chapter | Rp450.000/penulis | 1 | 1 bab |

Yang masih diubah lewat kode: urutan dan susunan bagian halaman, warna/huruf (`css/style.css`), nama tahap Lacak Naskah (terkait kolom status database), dan label tombol.

## Yang perlu Anda pastikan sebelum tayang
- **Komitmen bisnis** di situs (royalti 20%, garansi ISBN atau uang kembali, cicilan 3×, reviewer sebidang, waktu proses) adalah usulan. Sesuaikan dengan kebijakan perusahaan sebelum dipublikasikan.
- **DOI** memerlukan keanggotaan Crossref (melalui sponsor/afiliasi). Jika belum, hapus layanan DOI di admin > Harga & paket.
- **Nomor IKAPI**: isi di admin > Konten halaman > Identitas & kontak; baris itu otomatis muncul di footer.
- **Nilai angka kredit** mengacu Pedoman Operasional PAK. Periksa kembali jika ada pedoman terbaru.
- Situs tidak menampilkan testimoni palsu. Bila ingin menambah testimoni, gunakan kutipan asli dengan izin penulis.

## Cara kerja keamanan
- Pengunjung **tidak bisa** membaca data naskah orang lain. Pengiriman dan pelacakan memakai fungsi `submit_manuscript` dan `track_submission` yang hanya mengembalikan judul, status, dan riwayat (tanpa email/WA).
- Hanya akun di tabel `admins` yang bisa membaca dan mengubah naskah, katalog, dan call for chapter.
- Mode demo aktif otomatis selama `config.js` belum diisi, sehingga tampilan bisa dicek tanpa database.
