/* ============================================================
   KONFIGURASI SITUS
   Kunci Supabase: Supabase > Project Settings > API Keys.
   Publishable key aman dipasang di situs; keamanan data dijaga
   oleh Row Level Security (lihat supabase/schema.sql).

   Identitas (brand) di bawah hanya nilai awal. Setelah situs
   terhubung, ubah identitas, harga, dan semua teks dari
   admin.html > "Konten halaman" / "Harga & paket".
   ============================================================ */
window.IGV_CONFIG = {
  SUPABASE_URL: "https://eajyfevjwtohiulvurhh.supabase.co",

  /* GANTI teks di antara tanda kutip dengan Publishable key LENGKAP
     (salin dengan tombol salin di Supabase, jangan diblok manual).
     Kunci yang benar diawali sb_publishable_ dan TIDAK berakhiran ... */
  SUPABASE_ANON_KEY: "TEMPEL_PUBLISHABLE_KEY_LENGKAP_DI_SINI",

  brand: {
    name: "IGV Pustaka",
    company: "PT. Inovasi Global Ventures",
    tagline: "Penerbit buku akademik untuk dosen dan peneliti",
    whatsapp: "6281200000000",
    email: "redaksi@igvpress.id",
    address: "Jakarta, Indonesia",
    ikapi: "",
    isbnPrefix: "978-634-XXXX"
  }
};
