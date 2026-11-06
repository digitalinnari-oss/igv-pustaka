/* Surat otomatis (surat.html) dan halaman verifikasi (verifikasi.html) */
(function () {
  "use strict";
  const CFG = window.IGV_CONFIG || {}, D = window.IGV_DATA;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const longDate = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const params = new URLSearchParams(location.search);

  let sb = null;
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const DEMO = !sb;
  let C = D.content;
  const tx = (s) => String(s ?? "").split("{nama}").join(C.brand.name || "").split("{perusahaan}").join(C.brand.company || "");
  const stageLabel = (id) => id === "ditolak" ? "Tidak dilanjutkan" : ((D.stages.find((x) => x.id === id) || {}).label || id);

  async function loadSettings() {
    if (sb) {
      const { data } = await sb.from("site_settings").select("key,value");
      (data || []).forEach((r) => { if (r.key === "content") C = D.merge(D.content, r.value); });
    }
    const B = C.brand || {};
    $$("[data-b]").forEach((el) => (el.textContent = B[el.dataset.b] || el.textContent));
    $$(".yr").forEach((e) => (e.textContent = new Date().getFullYear()));
    D.applyLook(C);
  }

  async function fetchDoc(code) {
    if (DEMO) return { ...D.demoVerify, code: code && code !== "IGV-DEMO" ? code : "IGV-DEMO" };
    const { data, error } = await sb.rpc("verify_document", { p_code: code });
    if (error) { console.error(error); return undefined; }
    return data;
  }
  const verifyUrl = (code) => new URL("verifikasi.html?kode=" + encodeURIComponent(code), location.href).href;

  /* ================= SURAT ================= */
  async function initLetter() {
    let kind = params.get("jenis") === "skt" ? "skt" : "loa";
    const code = (params.get("kode") || "").trim().toUpperCase();
    $("#demoNote").hidden = !DEMO;
    if (!code && !DEMO) { $("#sheetHost").innerHTML = `<div class="empty">Buka surat dari Portal Penulis, atau tambahkan kode naskah di alamat, misalnya <span class="mono">surat.html?kode=IGV-26-XXXXXX</span>.</div>`; return; }
    const doc = await fetchDoc(code);
    if (doc === undefined) { $("#sheetHost").innerHTML = `<div class="alert err">Surat belum dapat dimuat karena gangguan koneksi. Muat ulang halaman.</div>`; return; }
    if (!doc) { $("#sheetHost").innerHTML = `<div class="alert err">Kode <b class="mono">${esc(code)}</b> tidak ditemukan.</div>`; return; }
    $("#verifyLink").href = verifyUrl(doc.code);

    const draw = () => {
      $$("#kindSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === kind));
      const ok = kind === "loa" ? doc.loa_valid : doc.skt_valid;
      $("#printBtn").disabled = !ok;
      if (!ok) {
        const why = kind === "loa"
          ? (doc.status === "ditolak" ? "Naskah ini tidak dilanjutkan, sehingga surat penerimaan tidak berlaku." : `Surat penerimaan tersedia setelah naskah lolos telaah dan masuk tahap kontrak. Tahap saat ini: <b>${esc(stageLabel(doc.status))}</b>.`)
          : `Surat keterangan terbit tersedia setelah buku berstatus <b>Terbit</b>. Tahap saat ini: <b>${esc(stageLabel(doc.status))}</b>.`;
        $("#sheetHost").innerHTML = `<div class="empty" style="max-width:640px">${why}</div>`;
        return;
      }
      $("#sheetHost").innerHTML = sheet(doc, kind);
      const q = $("#qr");
      if (q && window.QRCode) new window.QRCode(q, { text: verifyUrl(doc.code), width: 184, height: 184, correctLevel: window.QRCode.CorrectLevel.M });
      else if (q) q.innerHTML = `<span class="mono" style="font-size:7pt">QR tidak dapat dimuat</span>`;
      document.title = (kind === "loa" ? "LoA " : "SKT ") + doc.code;
    };
    $("#kindSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      kind = b.dataset.v;
      const u = new URL(location.href); u.searchParams.set("jenis", kind);
      try { history.replaceState(null, "", u); } catch (_) { /* pratinjau tanpa riwayat */ }
      draw();
    });
    $("#printBtn").addEventListener("click", () => window.print());
    draw();
  }

  function sheet(d, kind) {
    const B = C.brand || {}, L = C.letters || {};
    const date = kind === "loa" ? (d.accepted_at || d.submitted_at) : (d.published_at || new Date());
    const dt = new Date(date);
    const number = `${kind === "loa" ? "LoA" : "SKT"}/${d.code}/${ROMAN[dt.getMonth()]}/${dt.getFullYear()}`;
    const contact = [B.address, B.email, B.whatsapp ? "WA " + String(B.whatsapp).replace(/^62/, "0") : ""].filter(Boolean).join(" · ");
    const rows = [
      ["Judul", d.title], ["Penulis", d.authors], d.institution ? ["Institusi", d.institution] : null,
      ["Jenis buku", d.book_type || "Buku"], ["Kode naskah", d.code],
      kind === "loa" ? ["Tanggal diterima", longDate(d.accepted_at || d.submitted_at)] : null,
      kind === "skt" ? ["ISBN", d.isbn || "—"] : null,
      kind === "skt" ? ["Tanggal terbit", longDate(d.published_at) || "—"] : null
    ].filter(Boolean);
    return `<article class="sheet" aria-label="Surat">
      <header class="lh">
        <div class="lh-mark">${B.logoUrl ? `<img src="${esc(B.logoUrl)}" alt="">` : `<span class="brand-mark"></span>`}</div>
        <div><h1>${esc(B.name)}</h1><p><b>${esc(B.company)}</b>${B.ikapi ? ` · Anggota IKAPI No. ${esc(B.ikapi)}` : ""}</p><p>${esc(contact)}</p></div>
      </header>
      <div class="ltitle"><h2>${esc(tx(kind === "loa" ? L.loaTitle : L.sktTitle))}</h2><p>Nomor: <span class="mono">${esc(number)}</span></p></div>
      <div class="lbody">
        <p>Dengan hormat,</p>
        <p>${esc(tx(kind === "loa" ? L.loaIntro : L.sktIntro))}</p>
        <table class="ltable">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td><b>${esc(v)}</b></td></tr>`).join("")}</table>
        <p>${esc(tx(kind === "loa" ? L.loaAfter : L.sktAfter))}</p>
        <p>${esc(tx(L.closing))}</p>
      </div>
      <div class="lfoot">
        <div class="qr"><div class="code" id="qr"></div><span>Pindai untuk memeriksa keaslian surat ini, atau buka ${esc(new URL("verifikasi.html", location.href).host)}/verifikasi dan masukkan kode <b class="mono">${esc(d.code)}</b>.</span></div>
        <div class="sign">
          <p>${esc(L.city || "")}, ${esc(longDate(date))}<br>${esc(B.company)}</p>
          <div class="space">${L.signatureUrl ? `<img src="${esc(L.signatureUrl)}" alt="">` : ""}${L.stampUrl ? `<img class="stamp" src="${esc(L.stampUrl)}" alt="">` : ""}</div>
          <b>${esc(L.signerName)}</b><br>${esc(L.signerTitle)}
        </div>
      </div>
      ${DEMO ? `<div class="void" aria-hidden="true"><span>CONTOH</span></div>` : ""}
    </article>`;
  }

  /* ================= VERIFIKASI ================= */
  function initVerify() {
    $("#vDemo").hidden = !DEMO;
    const run = async (code) => {
      code = code.trim().toUpperCase(); if (!code) return;
      $("#vResult").innerHTML = `<p class="note">Memeriksa…</p>`;
      const d = DEMO ? (code === "IGV-DEMO" ? D.demoVerify : null) : await fetchDoc(code);
      if (d === undefined) { $("#vResult").innerHTML = `<div class="alert err">Pemeriksaan gagal karena gangguan koneksi. Coba lagi.</div>`; return; }
      if (!d) {
        $("#vResult").innerHTML = `<div class="vcard"><div class="vhead"><span class="vseal bad" aria-hidden="true">!</span><div><h2>Kode tidak terdaftar</h2><p class="note">Kode <b class="mono">${esc(code)}</b> tidak ada di sistem ${esc(C.brand.name)}. Surat dengan kode ini tidak berasal dari kami, atau kodenya salah ketik.</p></div></div></div>`;
        return;
      }
      $("#vResult").innerHTML = `<div class="vcard">
        <div class="vhead"><span class="vseal ok" aria-hidden="true">✓</span><div><h2>Terdaftar di ${esc(C.brand.name)}</h2><p class="note">${DEMO ? "Contoh hasil (mode demo). " : ""}Data di bawah ini berasal langsung dari sistem penerbit.</p></div></div>
        <dl class="kv" style="display:grid;grid-template-columns:140px 1fr;gap:6px 14px;margin:0">
          <dt class="note">Judul</dt><dd style="margin:0"><b>${esc(d.title)}</b></dd>
          <dt class="note">Penulis</dt><dd style="margin:0">${esc(d.authors)}</dd>
          ${d.institution ? `<dt class="note">Institusi</dt><dd style="margin:0">${esc(d.institution)}</dd>` : ""}
          <dt class="note">Jenis buku</dt><dd style="margin:0">${esc(d.book_type || "-")}</dd>
          <dt class="note">Kode naskah</dt><dd style="margin:0" class="mono">${esc(d.code)}</dd>
          <dt class="note">Status saat ini</dt><dd style="margin:0">${esc(stageLabel(d.status))}</dd>
          ${d.isbn ? `<dt class="note">ISBN</dt><dd style="margin:0" class="mono">${esc(d.isbn)}</dd>` : ""}
        </dl>
        <ul class="vdocs">
          <li><span>Surat Penerimaan Naskah (LoA)${d.accepted_at ? ` · diterima ${esc(longDate(d.accepted_at))}` : ""}</span><span class="badge ${d.loa_valid ? "ok" : "bad"}">${d.loa_valid ? "Berlaku" : d.status === "ditolak" ? "Tidak berlaku" : "Belum diterbitkan"}</span></li>
          <li><span>Surat Keterangan Terbit${d.published_at ? ` · terbit ${esc(longDate(d.published_at))}` : ""}</span><span class="badge ${d.skt_valid ? "ok" : "warn"}">${d.skt_valid ? "Berlaku" : "Buku belum terbit"}</span></li>
        </ul>
        <p class="note">Pastikan judul, nama penulis, dan nomor pada surat sama persis dengan data di atas. Hubungi ${esc(C.brand.email || "redaksi")} bila ada perbedaan.</p>
      </div>`;
    };
    $("#vForm").addEventListener("submit", (e) => { e.preventDefault(); run($("#vCode").value); });
    const pre = params.get("kode");
    if (pre) { $("#vCode").value = pre.toUpperCase(); run(pre); }
  }

  loadSettings().then(() => {
    if ($("#sheetHost")) initLetter();
    if ($("#vForm")) initVerify();
  });
})();
