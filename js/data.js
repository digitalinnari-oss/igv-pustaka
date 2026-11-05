/* ============================================================
   DATA STATIS: harga, add-on, angka kredit, dan contoh data demo.
   Harga di sini dipakai oleh tabel harga DAN kalkulator sekaligus,
   jadi cukup ubah satu tempat.
   ============================================================ */
window.IGV_DATA = {
  packages: [
    {
      id: "esensial", name: "Esensial", price: 1250000, copies: 5, maxPages: 150,
      days: "21–30 hari kerja",
      fit: "Buku ajar atau modul pertama dengan naskah yang sudah rapi.",
      includes: [],
      features: [
        "ISBN Perpusnas + KDT",
        "Layout isi ukuran UNESCO 15,5 × 23 cm",
        "Desain sampul (2 alternatif)",
        "Proofreading ejaan (PUEBI/EYD V)",
        "E-book PDF terproteksi",
        "5 eksemplar cetak + sertifikat penulis",
        "Dasbor Lacak Naskah"
      ]
    },
    {
      id: "profesional", name: "Profesional", price: 2450000, copies: 15, maxPages: 200,
      days: "14–21 hari kerja", popular: true,
      fit: "Buku referensi atau monograf hasil penelitian untuk BKD & PAK.",
      includes: ["hki", "similarity"],
      features: [
        "Semua fasilitas Esensial",
        "Editing bahasa & konsistensi istilah",
        "Cek similarity + laporan resmi",
        "Pendaftaran hak cipta (HKI) ke DJKI",
        "Listing Google Books & toko daring",
        "15 eksemplar cetak",
        "Royalti 20% dari setiap penjualan"
      ]
    },
    {
      id: "unggulan", name: "Unggulan", price: 4750000, copies: 30, maxPages: 300,
      days: "10–14 hari kerja (jalur cepat)",
      fit: "Buku referensi untuk pengajuan Lektor Kepala / Guru Besar.",
      includes: ["hki", "similarity", "doi", "heavyedit"],
      features: [
        "Semua fasilitas Profesional",
        "Telaah substansi oleh reviewer sebidang + surat keterangan",
        "Editing berat & penataan struktur bab",
        "DOI untuk buku",
        "Sampul eksklusif + mockup promosi",
        "30 eksemplar cetak",
        "Peluncuran buku daring & siaran pers"
      ]
    }
  ],

  chapter: {
    price: 450000,
    features: [
      "Satu bab dalam buku kolaborasi ber-ISBN",
      "Editor kepala dari bidang yang sama",
      "E-book + 1 eksemplar cetak",
      "Sertifikat kontributor",
      "Cocok untuk BKD semester berjalan"
    ]
  },

  /* unit: "flat" | "page" (dikali jumlah halaman) | "item" */
  addons: [
    { id: "hki",        name: "Pendaftaran HKI (hak cipta)",          price: 450000, unit: "flat" },
    { id: "similarity", name: "Cek similarity + laporan",             price: 75000,  unit: "flat" },
    { id: "doi",        name: "DOI buku",                             price: 150000, unit: "flat" },
    { id: "heavyedit",  name: "Editing berat / penataan bab",         price: 12000,  unit: "page" },
    { id: "convert",    name: "Konversi tesis/disertasi/laporan penelitian menjadi buku", price: 1500000, unit: "flat" },
    { id: "translate",  name: "Terjemahan ke Bahasa Inggris",         price: 95000,  unit: "page" },
    { id: "illus",      name: "Ilustrasi/infografis (per 5 gambar)",  price: 350000, unit: "flat" }
  ],

  print: {
    /* biaya cetak per eksemplar = dasar + halaman × tarif, dibulatkan ke Rp500 */
    base: 6000, perPageBW: 110, perPageColor: 600, hardcover: 22000,
    extraLayoutPerPage: 2500
  },

  installment: { times: 3, note: "Cicilan 3× tanpa bunga: 40% saat kontrak, 30% saat proof, 30% sebelum cetak." },

  /* Nilai maksimum mengacu Pedoman Operasional PAK Dosen. Verifikasi ke pedoman terbaru di institusi. */
  credit: {
    types: [
      { id: "referensi",   label: "Buku referensi",                 max: 40 },
      { id: "monograf",    label: "Monograf",                       max: 20 },
      { id: "ajar",        label: "Buku ajar (unsur pendidikan)",   max: 20 },
      { id: "chapter_int", label: "Book chapter internasional",     max: 15 },
      { id: "chapter_nas", label: "Book chapter nasional",          max: 10 }
    ]
  },

  readiness: [
    { id: "pages",   w: 15, text: "Isi naskah minimal 49 halaman (di luar halaman awal) untuk penulis tunggal." },
    { id: "struct",  w: 15, text: "Struktur lengkap: prakata, daftar isi, bab-bab, daftar pustaka, indeks/glosarium." },
    { id: "rewrite", w: 15, text: "Bukan skripsi/tesis atau artikel jurnal yang disalin mentah; sudah ditulis ulang sebagai buku." },
    { id: "sim",     w: 15, text: "Sudah dicek similarity dan kutipan diparafrasa dengan benar." },
    { id: "cite",    w: 10, text: "Gaya sitasi konsisten (APA, Vancouver, dll.), idealnya dengan Mendeley/Zotero." },
    { id: "figs",    w: 10, text: "Gambar dan tabel milik sendiri, atau sudah ada izin/sumber yang jelas." },
    { id: "reader",  w: 10, text: "Sasaran pembaca jelas; untuk buku ajar ada capaian pembelajaran tiap bab." },
    { id: "bio",     w: 10, text: "Biodata penulis dan sinopsis 150–200 kata sudah siap." }
  ],

  /* ---------- CONTOH (hanya tampil di mode demo) ---------- */
  demoBooks: [
    { title: "Asuhan Keperawatan Maternitas Berbasis Bukti", authors: "Contoh Penulis, M.Kep.", category: "Kesehatan", book_type: "Buku ajar", isbn: "978-634-0000-01-1", year: 2026, pages: 212, cover_color: "#0F4C45" },
    { title: "Metodologi Penelitian Kuantitatif untuk Ilmu Sosial", authors: "Contoh Penulis, Dr.", category: "Sosial", book_type: "Buku referensi", isbn: "978-634-0000-02-8", year: 2026, pages: 248, cover_color: "#3A3F7A" },
    { title: "Sistem Pendukung Keputusan dengan Metode TOPSIS", authors: "Contoh Penulis, M.Kom.", category: "Teknik & Komputer", book_type: "Monograf", isbn: "978-634-0000-03-5", year: 2026, pages: 136, cover_color: "#7A2E2E" },
    { title: "Manajemen Keuangan Syariah Kontemporer", authors: "Contoh Penulis, M.E.", category: "Ekonomi", book_type: "Buku referensi", isbn: "978-634-0000-04-2", year: 2025, pages: 190, cover_color: "#5B4A1E" },
    { title: "Pembelajaran Berdiferensiasi di Sekolah Dasar", authors: "Contoh Penulis, M.Pd.", category: "Pendidikan", book_type: "Buku ajar", isbn: "978-634-0000-05-9", year: 2025, pages: 164, cover_color: "#1E4E79" },
    { title: "Kesehatan Ibu dan Anak di Era Digital (Bunga Rampai)", authors: "Tim Kontributor", category: "Kesehatan", book_type: "Book chapter", isbn: "978-634-0000-06-6", year: 2026, pages: 280, cover_color: "#4A2F5C" }
  ],

  demoCalls: [
    { id: "demo-1", title: "Keperawatan Maternitas & Kesehatan Reproduksi", field: "Kesehatan", description: "Bunga rampai bab hasil penelitian atau kajian pustaka 15–20 halaman per bab.", deadline_days: 18, quota: 15, filled: 9, fee: 450000 },
    { id: "demo-2", title: "Transformasi Digital Pendidikan Tinggi", field: "Pendidikan", description: "Praktik baik pembelajaran digital, asesmen, dan kurikulum OBE.", deadline_days: 32, quota: 20, filled: 6, fee: 450000 }
  ],

  stages: [
    { id: "diterima", label: "Naskah diterima",       hint: "Tim redaksi memeriksa kelengkapan berkas." },
    { id: "review",   label: "Telaah redaksi",        hint: "Penilaian kelayakan isi dan format (2–3 hari kerja)." },
    { id: "kontrak",  label: "Kontrak & pembayaran",  hint: "Perjanjian penerbitan dan pembayaran tahap pertama." },
    { id: "editing",  label: "Editing",               hint: "Penyuntingan bahasa dan konsistensi." },
    { id: "layout",   label: "Layout & sampul",       hint: "Tata letak isi dan desain sampul." },
    { id: "proof",    label: "Persetujuan proof",     hint: "Penulis memeriksa dan menyetujui hasil akhir." },
    { id: "isbn",     label: "Pengajuan ISBN",        hint: "Diajukan ke Perpusnas RI." },
    { id: "cetak",    label: "Cetak & kirim",         hint: "Produksi eksemplar dan pengiriman." },
    { id: "terbit",   label: "Terbit",                hint: "Buku tampil di katalog dan toko daring." }
  ]
};
