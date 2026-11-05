/* ============================================================
   NILAI BAWAAN (default) untuk harga dan seluruh konten situs.
   Setelah Supabase terhubung, admin mengubah semuanya dari
   admin.html (tab "Harga & paket" dan "Konten halaman"); nilai
   dari database menimpa nilai di file ini.
   Di teks, {nama} = nama penerbit, {perusahaan} = nama PT,
   dan *kata* = disorot (khusus judul beranda).
   ============================================================ */
window.IGV_DATA = {
  pricing: {
    packages: [
      {
        id: "esensial", name: "Esensial", price: 1250000, copies: 5, maxPages: 150,
        days: "21–30 hari kerja", popular: false,
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
        days: "10–14 hari kerja (jalur cepat)", popular: false,
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
    addons: [
      { id: "hki",        name: "Pendaftaran HKI (hak cipta)",          price: 450000, unit: "flat" },
      { id: "similarity", name: "Cek similarity + laporan",             price: 75000,  unit: "flat" },
      { id: "doi",        name: "DOI buku",                             price: 150000, unit: "flat" },
      { id: "heavyedit",  name: "Editing berat / penataan bab",         price: 12000,  unit: "page" },
      { id: "convert",    name: "Konversi tesis/disertasi/laporan penelitian menjadi buku", price: 1500000, unit: "flat" },
      { id: "translate",  name: "Terjemahan ke Bahasa Inggris",         price: 95000,  unit: "page" },
      { id: "illus",      name: "Ilustrasi/infografis (per 5 gambar)",  price: 350000, unit: "flat" }
    ],
    print: { base: 6000, perPageBW: 110, perPageColor: 600, hardcover: 22000, extraLayoutPerPage: 2500 },
    installment: {
      times: 3,
      note: "Cicilan 3× tanpa bunga: 40% saat kontrak, 30% saat proof, 30% sebelum cetak.",
      /* Dipakai saat redaksi membuat jadwal tagihan untuk satu naskah. Total persen harus 100. */
      stages: [
        { label: "Tahap 1 — saat kontrak", percent: 40 },
        { label: "Tahap 2 — proof disetujui", percent: 30 },
        { label: "Tahap 3 — sebelum cetak", percent: 30 }
      ]
    }
  },

  content: {
    brand: Object.assign({
      name: "IGV Press", company: "PT. Inovasi Global Ventures",
      tagline: "Penerbit buku akademik untuk dosen dan peneliti",
      whatsapp: "6281200000000", email: "redaksi@igvpress.id",
      address: "Jakarta, Indonesia", ikapi: "", isbnPrefix: "978-634-XXXX"
    }, (window.IGV_CONFIG || {}).brand || {}),

    hero: {
      eyebrow: "Penerbit buku akademik · ISBN Perpusnas RI",
      title: "Naskah Anda layak menjadi *buku ber-ISBN* yang terhitung di BKD dan PAK.",
      lead: "{nama} menerbitkan buku ajar, referensi, monograf, dan book chapter untuk dosen dan peneliti. Harga terbuka sejak awal, angka kredit bisa disimulasikan, dan setiap tahap naskah bisa Anda lacak sendiri.",
      tryLabel: "Coba ketik judul naskah Anda, lalu lihat sampul dan halaman katalognya",
      sampleTitle: "Asuhan Keperawatan Ibu Hamil dengan Preeklamsia",
      sampleAuthor: "Nama Anda, M.Kep.",
      facts: ["ISBN resmi Perpusnas", "Cicilan 3× tanpa bunga", "Royalti 20%", "Garansi ISBN atau uang kembali"]
    },

    profil: {
      eyebrow: "Profil",
      title: "Penerbit yang dibangun dari kebutuhan dosen.",
      paragraphs: [
        "{nama} adalah unit penerbitan {perusahaan}. Kami tahu menulis buku hanyalah separuh pekerjaan: buku juga harus lolos syarat ISBN Perpusnas, sesuai kaidah buku perguruan tinggi, dan bisa dipakai untuk BKD, PAK, maupun akreditasi program studi.",
        "Karena itu semua layanan kami dirancang untuk menghilangkan ketidakpastian: berapa biayanya, berapa lama prosesnya, dan berapa nilainya untuk karier akademik Anda."
      ],
      visi: "Menjadi penerbit akademik pilihan dosen Indonesia yang paling transparan dan paling cepat dalam membawa hasil riset menjadi buku bermutu.",
      misi: [
        "Menerbitkan buku ilmiah sesuai standar Perpusnas dan kaidah buku perguruan tinggi.",
        "Mendampingi dosen dari naskah mentah sampai buku terbit dan terjual.",
        "Membuka akses kolaborasi lintas kampus melalui program book chapter.",
        "Memberi royalti dan laporan penjualan yang jelas setiap semester."
      ]
    },

    why: {
      eyebrow: "Mengapa {nama}",
      title: "Enam hal yang jarang Anda temukan di penerbit lain.",
      items: [
        { title: "Lacak naskah real-time", text: "Setiap naskah punya kode lacak. Anda melihat sendiri tahapnya, dari telaah redaksi sampai ISBN keluar, tanpa harus menanyakan lewat WhatsApp." },
        { title: "Simulasi angka kredit", text: "Hitung perkiraan angka kredit buku Anda sebelum menulis, termasuk pembagian untuk penulis utama dan anggota." },
        { title: "Harga terbuka", text: "Kalkulator menunjukkan rincian biaya per item. Tidak ada biaya tersembunyi setelah kontrak ditandatangani." },
        { title: "Reviewer sebidang", text: "Paket Unggulan ditelaah oleh reviewer dari rumpun ilmu yang sama, lengkap dengan surat keterangan untuk berkas PAK." },
        { title: "Cicilan 3× tanpa bunga", text: "Bayar bertahap sesuai kemajuan naskah: saat kontrak, saat proof, dan sebelum cetak." },
        { title: "Garansi ISBN", text: "Naskah yang lolos telaah redaksi dijamin mendapat ISBN. Jika tidak, biaya penerbitan dikembalikan penuh." }
      ]
    },

    layanan: {
      eyebrow: "Layanan",
      title: "Semua jenis buku perguruan tinggi, dalam satu tempat.",
      lead: "Kami menerbitkan buku cetak dan e-book dengan ukuran UNESCO yang lazim untuk buku ilmiah.",
      items: [
        { tag: "Pendidikan", title: "Buku Ajar", text: "Pegangan mata kuliah dengan capaian pembelajaran, latihan, dan rangkuman tiap bab." },
        { tag: "Penelitian", title: "Buku Referensi", text: "Kajian mendalam satu bidang ilmu dari hasil penelitian. Nilai angka kredit tertinggi." },
        { tag: "Penelitian", title: "Monograf", text: "Pembahasan tuntas satu topik penelitian yang spesifik, cocok sebagai luaran hibah." },
        { tag: "Kolaborasi", title: "Book Chapter", text: "Satu bab dalam buku bunga rampai bersama penulis dari berbagai kampus." },
        { tag: "Konversi", title: "Tesis & Disertasi jadi Buku", text: "Kami bantu menulis ulang karya ilmiah menjadi buku yang memenuhi syarat ISBN." },
        { tag: "Pendidikan", title: "Modul & Panduan Praktikum", text: "Modul laboratorium, panduan klinik, dan buku kerja mahasiswa." },
        { tag: "Pendukung", title: "HKI, Similarity, DOI", text: "Pendaftaran hak cipta ke DJKI, laporan similarity, dan DOI untuk buku." },
        { tag: "Institusi", title: "Writing Camp Kampus", text: "Pendampingan menulis buku untuk satu fakultas atau program studi, sampai terbit." }
      ]
    },

    alur: {
      eyebrow: "Alur penerbitan",
      title: "Dari naskah ke buku dalam enam tahap.",
      steps: [
        { title: "Kirim naskah", text: "Isi formulir dan lampirkan tautan naskah." },
        { title: "Telaah redaksi", text: "Penilaian kelayakan dalam 2–3 hari kerja." },
        { title: "Kontrak", text: "Perjanjian penerbitan dan pembayaran tahap 1." },
        { title: "Editing & layout", text: "Penyuntingan, tata letak, dan sampul." },
        { title: "Proof & ISBN", text: "Anda menyetujui proof, kami ajukan ISBN." },
        { title: "Cetak & terbit", text: "Eksemplar dikirim, buku masuk katalog." }
      ]
    },

    sections: {
      harga:   { eyebrow: "Paket & harga", title: "Harga wajar untuk kantong dosen, tanpa biaya kejutan.", lead: "Semua paket sudah termasuk ISBN, layout, sampul, dan e-book. Pilih sesuai jenis buku dan target karier Anda." },
      studio:  { eyebrow: "Studio Penulis", title: "Rencanakan buku Anda sebelum mengirim naskah.", lead: "Tiga alat gratis: hitung biaya, perkirakan angka kredit, dan periksa apakah naskah sudah siap terbit." },
      katalog: { eyebrow: "Katalog", title: "Buku yang telah terbit.", lead: "" },
      call:    { eyebrow: "Call for Chapter", title: "Kolaborasi lintas kampus yang sedang dibuka.", lead: "Satu bab, satu ISBN, dan biaya yang ringan. Pilih tema yang sesuai bidang Anda." },
      lacak:   { eyebrow: "Lacak Naskah", title: "Di mana naskah saya sekarang?", lead: "Masukkan kode lacak yang Anda terima saat mengirim naskah." },
      kirim:   { eyebrow: "Kirim Naskah", title: "Telaah naskah gratis dalam 2–3 hari kerja.", lead: "Unggah naskah ke Google Drive atau OneDrive, atur aksesnya menjadi \"siapa saja yang memiliki tautan\", lalu tempel tautannya di formulir. Anda langsung mendapat kode lacak." },
      faq:     { eyebrow: "Tanya jawab", title: "Yang sering ditanyakan dosen.", lead: "" }
    },

    privacyNote: "Data Anda hanya dipakai untuk proses penerbitan dan tidak dibagikan ke pihak lain.",

    payment: {
      bank: "Bank Mandiri",
      account: "000-00-0000000-0",
      holder: "PT. Inovasi Global Ventures",
      note: "Tulis kode lacak naskah pada berita transfer, lalu unggah bukti transfer di Portal Penulis. Redaksi memverifikasi dalam 1×24 jam kerja."
    },

    portal: {
      title: "Portal Penulis",
      lead: "Pantau naskah, bayar tagihan bertahap, dan kirim revisi dari satu tempat. Masuk cukup dengan email yang Anda pakai saat mengirim naskah, tanpa kata sandi."
    },

    faq: [
      { q: "Berapa lama sampai buku terbit?", a: "Tergantung paket: 21–30 hari kerja (Esensial), 14–21 hari kerja (Profesional), dan 10–14 hari kerja (Unggulan), dihitung sejak naskah final dan kontrak disetujui. Waktu terbit ISBN dari Perpusnas berada di luar kendali kami, tetapi selalu tampak di dasbor Lacak Naskah." },
      { q: "Apakah buku bisa dipakai untuk BKD dan kenaikan jabatan?", a: "Ya, selama jenis bukunya sesuai (buku ajar, referensi, monograf, atau book chapter) dan terbit ber-ISBN dari penerbit resmi. Gunakan Simulasi Angka Kredit untuk perkiraan nilainya." },
      { q: "Naskah seperti apa yang ditolak untuk ISBN?", a: "Antara lain naskah yang terlalu tipis, kumpulan artikel jurnal atau skripsi yang belum diolah menjadi buku, dan naskah dengan similarity tinggi. Cek Kesiapan Naskah membantu Anda memeriksanya lebih awal." },
      { q: "Bagaimana sistem cicilannya?", a: "40% saat kontrak, 30% saat proof disetujui, dan 30% sebelum naik cetak. Tanpa bunga dan tanpa biaya administrasi." },
      { q: "Bagaimana royalti dibayarkan?", a: "Royalti 20% dari harga jual bersih untuk setiap buku yang terjual melalui jaringan kami, dilaporkan dan dibayarkan setiap semester." },
      { q: "Siapa pemegang hak cipta buku?", a: "Penulis. Penerbit memegang hak terbit sesuai masa kontrak. Pada paket Profesional dan Unggulan kami mendaftarkan hak cipta atas nama penulis ke DJKI." }
    ],

    /* Nilai maksimum mengacu Pedoman Operasional PAK Dosen. */
    credit: [
      { id: "referensi",   label: "Buku referensi",               max: 40 },
      { id: "monograf",    label: "Monograf",                     max: 20 },
      { id: "ajar",        label: "Buku ajar (unsur pendidikan)", max: 20 },
      { id: "chapter_int", label: "Book chapter internasional",   max: 15 },
      { id: "chapter_nas", label: "Book chapter nasional",        max: 10 }
    ],

    readiness: [
      { id: "pages",   w: 15, text: "Isi naskah minimal 49 halaman (di luar halaman awal) untuk penulis tunggal." },
      { id: "struct",  w: 15, text: "Struktur lengkap: prakata, daftar isi, bab-bab, daftar pustaka, indeks/glosarium." },
      { id: "rewrite", w: 15, text: "Bukan skripsi/tesis atau artikel jurnal yang disalin mentah; sudah ditulis ulang sebagai buku." },
      { id: "sim",     w: 15, text: "Sudah dicek similarity dan kutipan diparafrasa dengan benar." },
      { id: "cite",    w: 10, text: "Gaya sitasi konsisten (APA, Vancouver, dll.), idealnya dengan Mendeley/Zotero." },
      { id: "figs",    w: 10, text: "Gambar dan tabel milik sendiri, atau sudah ada izin/sumber yang jelas." },
      { id: "reader",  w: 10, text: "Sasaran pembaca jelas; untuk buku ajar ada capaian pembelajaran tiap bab." },
      { id: "bio",     w: 10, text: "Biodata penulis dan sinopsis 150–200 kata sudah siap." }
    ]
  },

  /* ---------- CONTOH (hanya tampil di mode demo) ---------- */
  demoBooks: [
    { title: "Asuhan Keperawatan Maternitas Berbasis Bukti", authors: "Contoh Penulis, M.Kep.", category: "Kesehatan", book_type: "Buku ajar", isbn: "978-634-0000-01-1", year: 2026, pages: 212, cover_color: "#0F4C45" },
    { title: "Metodologi Penelitian Kuantitatif untuk Ilmu Sosial", authors: "Contoh Penulis, Dr.", category: "Sosial", book_type: "Buku referensi", isbn: "978-634-0000-02-8", year: 2026, pages: 248, cover_color: "#3A3F7A" },
    { title: "Sistem Pendukung Keputusan dengan Metode TOPSIS", authors: "Contoh Penulis, M.Kom.", category: "Teknik & Komputer", book_type: "Monograf", isbn: "978-634-0000-03-5", year: 2026, pages: 136, cover_color: "#7A2E2E" },
    { title: "Manajemen Keuangan Syariah Kontemporer", authors: "Contoh Penulis, M.E.", category: "Ekonomi", book_type: "Buku referensi", isbn: "978-634-0000-04-2", year: 2025, pages: 190, cover_color: "#5B4A1E" },
    { title: "Pembelajaran Berdiferensiasi di Sekolah Dasar", authors: "Contoh Penulis, M.Pd.", category: "Pendidikan", book_type: "Buku ajar", isbn: "978-634-0000-05-9", year: 2025, pages: 164, cover_color: "#1E4E79" },
    { title: "Kesehatan Ibu dan Anak di Era Digital (Bunga Rampai)", authors: "Tim Kontributor", category: "Kesehatan", book_type: "Book chapter", isbn: "978-634-0000-06-6", year: 2026, pages: 280, cover_color: "#4A2F5C" }
  ],
  demoPortal: {
    email: "penulis.contoh@kampus.ac.id",
    submissions: [
      { id: "d1", tracking_code: "IGV-26-A1B2C3", book_title: "Contoh: Asuhan Keperawatan Maternitas Berbasis Bukti", book_type: "Buku referensi", package: "profesional", status: "layout", status_note: "Sampul alternatif sudah dikirim, mohon pilih salah satu.", agreed_price: 2450000, created_at: "2026-10-20" },
      { id: "d2", tracking_code: "IGV-26-D4E5F6", book_title: "Contoh: Bab \"Peran Keluarga pada Ibu Hamil Hipertensi\"", book_type: "Book chapter", package: "chapter", status: "review", status_note: null, agreed_price: null, created_at: "2026-11-02" }
    ],
    events: {
      d1: [{ status: "diterima", created_at: "2026-10-20" }, { status: "review", created_at: "2026-10-21" }, { status: "kontrak", created_at: "2026-10-23" }, { status: "editing", created_at: "2026-10-27" }, { status: "layout", created_at: "2026-11-03", note: "Sampul alternatif sudah dikirim, mohon pilih salah satu." }],
      d2: [{ status: "diterima", created_at: "2026-11-02" }, { status: "review", created_at: "2026-11-03" }]
    },
    payments: {
      d1: [
        { id: "p1", seq: 1, label: "Tahap 1 — saat kontrak", amount: 980000, status: "lunas", paid_at: "2026-10-23" },
        { id: "p2", seq: 2, label: "Tahap 2 — proof disetujui", amount: 735000, status: "belum" },
        { id: "p3", seq: 3, label: "Tahap 3 — sebelum cetak", amount: 735000, status: "belum" }
      ],
      d2: []
    },
    files: {
      d1: [
        { id: "f1", kind: "naskah", name: "Naskah-Maternitas-v1.docx", created_at: "2026-10-20" },
        { id: "f2", kind: "proof", name: "Proof-layout-bab1-3.pdf", from_admin: true, created_at: "2026-11-03" }
      ],
      d2: [{ id: "f3", kind: "naskah", name: "Bab-Keluarga-Hipertensi.docx", created_at: "2026-11-02" }]
    }
  },

  demoCalls: [
    { id: "demo-1", title: "Keperawatan Maternitas & Kesehatan Reproduksi", field: "Kesehatan", description: "Bunga rampai bab hasil penelitian atau kajian pustaka 15–20 halaman per bab.", deadline_days: 18, quota: 15, filled: 9, fee: 450000 },
    { id: "demo-2", title: "Transformasi Digital Pendidikan Tinggi", field: "Pendidikan", description: "Praktik baik pembelajaran digital, asesmen, dan kurikulum OBE.", deadline_days: 32, quota: 20, filled: 6, fee: 450000 }
  ],

  /* Tahap naskah terkait dengan kolom status di database; jangan diubah id-nya. */
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
  ],

  /* Gabungkan nilai database ke atas nilai bawaan. Array diganti utuh. */
  merge: function merge(base, over) {
    if (Array.isArray(base) || Array.isArray(over) || typeof over !== "object" || over === null || typeof base !== "object" || base === null) return over === undefined ? base : over;
    const out = { ...base };
    Object.keys(over).forEach((k) => { out[k] = merge(base[k], over[k]); });
    return out;
  }
};
