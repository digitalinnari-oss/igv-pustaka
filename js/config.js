/* ============================================================
   KONFIGURASI SITUS — ubah bagian ini saja sebelum deploy.
   SUPABASE_URL & SUPABASE_ANON_KEY: Supabase > Project Settings > API.
   Anon key memang aman dipasang di frontend; keamanan data dijaga
   oleh Row Level Security (lihat supabase/schema.sql).
   Jika dua nilai ini kosong, situs berjalan dalam MODE DEMO.
   ============================================================ */
window.IGV_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  brand: {
    name: "IGV Press",
    company: "PT. Inovasi Global Ventures",
    tagline: "Penerbit buku akademik untuk dosen dan peneliti",
    whatsapp: "6281200000000",          // ganti: format 62xxxxxxxxxx
    email: "redaksi@igvpress.id",       // ganti dengan email resmi
    address: "Jakarta, Indonesia",      // ganti dengan alamat kantor
    ikapi: "",                          // isi nomor anggota IKAPI jika sudah ada, mis. "123/DKI/2026"
    isbnPrefix: "978-634-XXXX"          // awalan ISBN penerbit dari Perpusnas
  }
};
