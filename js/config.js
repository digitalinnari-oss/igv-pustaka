/* ============================================================
   KONFIGURASI SITUS
   SUPABASE_URL & SUPABASE_ANON_KEY: Supabase > Project Settings > API.
   Anon key memang aman dipasang di frontend; keamanan data dijaga
   oleh Row Level Security (lihat supabase/schema.sql).
   Jika dua nilai ini kosong, situs berjalan dalam MODE DEMO.

   Identitas (brand) di bawah hanya nilai awal. Setelah situs
   terhubung ke Supabase, ubah identitas, harga, dan semua teks
   dari admin.html > "Konten halaman" / "Harga & paket".
   ============================================================ */
window.IGV_CONFIG = {
  SUPABASE_URL: "https://eajyfevjwtohiulvurhh.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_K7iTHQkR_JDuaW0UkSBjPg_pZ-mkIRt...",

  brand: {
    name: "IGV Pustaka",
    company: "PT. Inovasi Global Ventures",
    tagline: "Penerbit Buku Akademik untuk Dosen dan Peneliti",
    whatsapp: "6281200000000",
    email: "redaksi.igvpustaka@gmail.com",
    address: "Jakarta, Indonesia",
    ikapi: "",
    isbnPrefix: "978-634-XXXX"
  }
};
