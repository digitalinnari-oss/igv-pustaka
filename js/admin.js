(async function () {
  "use strict";
  const CFG = window.IGV_CONFIG, D = window.IGV_DATA;
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { $("#notConfigured").hidden = false; return; }
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const STAT = [...D.stages.map((s) => [s.id, s.label]), ["ditolak", "Ditolak"]];
  const opts = (v) => STAT.map(([id, l]) => `<option value="${id}"${id === v ? " selected" : ""}>${l}</option>`).join("");
  $("#sFilter").innerHTML += STAT.map(([id, l]) => `<option value="${id}">${l}</option>`).join("");

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { $("#loginForm").hidden = false; $("#app").hidden = true; $("#logout").hidden = true; return; }
    const { data: me } = await sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (!me) { $("#loginForm").hidden = false; $("#lMsg").innerHTML = `<div class="alert err">Akun ini belum terdaftar sebagai admin. Tambahkan UID-nya ke tabel admins.</div>`; await sb.auth.signOut(); return; }
    $("#loginForm").hidden = true; $("#app").hidden = false; $("#logout").hidden = false;
    loadSubs(); loadBooks(); loadCalls(); loadSettings();
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $("#lEmail").value, password: $("#lPass").value });
    if (error) {
      const m = String(error.message || "").toLowerCase();
      const txt = m.includes("invalid login") ? "Email atau kata sandi salah, atau akun ini belum dibuat di Supabase (Authentication → Users)."
        : m.includes("not confirmed") ? "Email akun ini belum dikonfirmasi. Di Supabase buka Authentication → Users, lalu konfirmasi akun ini."
        : m.includes("api key") || m.includes("apikey") ? "Kunci Supabase di js/config.js tidak valid. Salin ulang Publishable key."
        : "Gagal masuk: " + error.message;
      $("#lMsg").innerHTML = `<div class="alert err">${esc(txt)}</div>`; return;
    }
    $("#lMsg").innerHTML = ""; boot();
  });
  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); boot(); });

  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    $$(".tab").forEach((x) => { x.setAttribute("aria-selected", x === t); $("#" + x.dataset.p).hidden = x !== t; });
  }));

  /* Naskah */
  let subs = [], pays = [], detailId = null, flash = "";
  const rp = (n) => "Rp" + Math.round(+n || 0).toLocaleString("id-ID");
  const fmtD = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
  const PAYL = { belum: ["Belum dibayar", "warn"], menunggu: ["Menunggu verifikasi", "info"], lunas: ["Lunas", "ok"], ditolak: ["Ditolak", "bad"] };
  const KIND = { naskah: "Naskah", revisi: "Revisi", proof: "Proof redaksi", bukti_bayar: "Bukti bayar", lainnya: "Lainnya" };
  const stageLabel = (id) => (STAT.find((x) => x[0] === id) || [id, id])[1];
  const waNum = (w) => { const d = String(w || "").replace(/\D/g, ""); return d.startsWith("0") ? "62" + d.slice(1) : d.startsWith("8") ? "62" + d : d; };

  async function loadSubs() {
    const [s, p] = await Promise.all([
      sb.from("submissions").select("*").order("created_at", { ascending: false }),
      sb.from("payments").select("*").order("seq")
    ]);
    if (s.error) return console.error(s.error);
    subs = s.data || []; pays = p.data || [];
    renderSubs(); renderSummary();
    if (detailId) openDetail(detailId, false);
  }
  const paysOf = (id) => pays.filter((p) => p.submission_id === id);

  function renderSummary() {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const active = subs.filter((s) => !["terbit", "ditolak"].includes(s.status));
    const waiting = pays.filter((p) => p.status === "menunggu");
    const paidMonth = pays.filter((p) => p.status === "lunas" && p.verified_at && new Date(p.verified_at) >= month).reduce((a, p) => a + p.amount, 0);
    const due = pays.filter((p) => p.status === "belum" || p.status === "ditolak").reduce((a, p) => a + p.amount, 0);
    $("#kpis").innerHTML = `
      <div class="kpi"><b>${subs.filter((s) => new Date(s.created_at) >= month).length}</b><span>naskah masuk bulan ini</span></div>
      <div class="kpi"><b>${active.length}</b><span>naskah dalam proses</span></div>
      <div class="kpi${waiting.length ? " hot" : ""}"><b>${waiting.length}</b><span>bukti bayar menunggu verifikasi</span></div>
      <div class="kpi"><b>${rp(paidMonth)}</b><span>pembayaran terverifikasi bulan ini · piutang ${rp(due)}</span></div>`;
    const max = Math.max(1, ...STAT.map(([id]) => subs.filter((s) => s.status === id).length));
    $("#stageBars").innerHTML = STAT.map(([id, l]) => { const n = subs.filter((s) => s.status === id).length;
      return `<div class="bar"><span>${esc(l)}</span><span class="track"><i style="width:${n / max * 100}%"></i></span><b>${n}</b></div>`; }).join("");
    const todo = [
      ...waiting.map((p) => { const s = subs.find((x) => x.id === p.submission_id) || {}; return [s.id, `Verifikasi bukti bayar ${esc(p.label)} · ${esc(s.book_title || "")}`]; }),
      ...subs.filter((s) => s.status === "diterima").map((s) => [s.id, `Telaah naskah baru · ${esc(s.book_title)}`]),
      ...subs.filter((s) => s.status === "kontrak" && !paysOf(s.id).length).map((s) => [s.id, `Buat jadwal tagihan · ${esc(s.book_title)}`])
    ];
    $("#todo").innerHTML = todo.slice(0, 12).map(([id, t]) => `<li><span>${t}</span><button class="linkish" type="button" data-open="${esc(id)}">Buka</button></li>`).join("")
      || `<li><span class="note">Tidak ada yang perlu ditindaklanjuti.</span></li>`;
  }
  $("#todo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]"); if (!b) return;
    $$(".tab").find((t) => t.dataset.p === "aNaskah").click(); openDetail(b.dataset.open, true);
  });

  function renderSubs() {
    const q = $("#sSearch").value.toLowerCase(), f = $("#sFilter").value;
    const list = subs.filter((s) => (!f || s.status === f) && (!q || [s.tracking_code, s.full_name, s.book_title, s.institution, s.email].join(" ").toLowerCase().includes(q)));
    $("#sRows").innerHTML = list.map((s) => {
      const ps = paysOf(s.id), w = ps.filter((p) => p.status === "menunggu").length, lunas = ps.filter((p) => p.status === "lunas").length;
      return `<tr data-id="${s.id}">
      <td class="mono">${esc(s.tracking_code)}<br><small class="note">${fmtD(s.created_at)}</small></td>
      <td style="min-width:240px"><b>${esc(s.book_title)}</b><br>${esc(s.full_name)} · ${esc(s.institution || "-")}<br><small class="note">${esc(s.email)} · WA ${esc(s.whatsapp)}</small>
        ${s.manuscript_url ? `<br><a href="${esc(s.manuscript_url)}" target="_blank" rel="noopener">Buka tautan naskah</a>` : ""}${s.notes ? `<br><small class="note">${esc(s.notes)}</small>` : ""}</td>
      <td><span class="pill">${esc(s.package || "-")}</span><br><small class="note">${esc(s.book_type || "")}${s.pages_estimate ? " · " + s.pages_estimate + " hlm" : ""}</small>
        ${ps.length ? `<br><small class="note">Bayar ${lunas}/${ps.length}</small>${w ? `<br><span class="badge info">${w} menunggu</span>` : ""}` : ""}</td>
      <td style="min-width:200px"><select class="st" aria-label="Status">${opts(s.status)}</select><input class="nt" aria-label="Catatan" placeholder="Catatan untuk penulis (tampil di Lacak)" value="${esc(s.status_note || "")}" style="margin-top:6px"></td>
      <td class="row-actions"><button class="btn btn-primary btn-sm sv" type="button">Simpan</button><button class="btn btn-ghost btn-sm dt" type="button">Detail</button></td></tr>`;
    }).join("") || `<tr><td colspan="5" class="note">Belum ada naskah.</td></tr>`;
  }
  $("#sSearch").addEventListener("input", renderSubs); $("#sFilter").addEventListener("change", renderSubs);
  $("#sRows").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr"); if (!tr || !tr.dataset.id) return;
    if (e.target.closest(".dt")) return openDetail(tr.dataset.id, true);
    const b = e.target.closest(".sv"); if (!b) return;
    b.disabled = true; b.textContent = "Menyimpan…";
    const { error } = await sb.from("submissions").update({ status: tr.querySelector(".st").value, status_note: tr.querySelector(".nt").value || null }).eq("id", tr.dataset.id);
    b.disabled = false; b.textContent = error ? "Gagal, coba lagi" : "Tersimpan";
    if (!error) { setTimeout(() => (b.textContent = "Simpan"), 1500); loadSubs(); }
  });

  /* ---------- Detail naskah ---------- */
  async function openDetail(id, scroll) {
    const s = subs.find((x) => x.id === id); if (!s) return;
    detailId = id;
    const box = $("#sDetail"); box.hidden = false;
    const { data: fl } = await sb.from("submission_files").select("*").eq("submission_id", id).order("created_at", { ascending: false });
    const files = fl || [];
    const paths = [...files.map((f) => f.path), ...paysOf(id).map((p) => p.proof_path)].filter(Boolean);
    const urls = {};
    if (paths.length) { const { data } = await sb.storage.from("manuscripts").createSignedUrls([...new Set(paths)], 3600); (data || []).forEach((u) => u.signedUrl && (urls[u.path] = u.signedUrl)); }
    const ps = paysOf(id), stages = ((ED.pricing.installment || {}).stages) || [];
    const total = ps.reduce((a, p) => a + p.amount, 0), paid = ps.filter((p) => p.status === "lunas").reduce((a, p) => a + p.amount, 0);
    const pkg = (ED.pricing.packages || []).find((p) => p.id === s.package);
    const suggest = s.agreed_price || (pkg ? pkg.price : s.package === "chapter" ? (ED.pricing.chapter || {}).price : 0) || 0;
    const brand = (ED.content.brand || {}).name || "Redaksi";
    const waText = `Yth. ${s.full_name},\n\nKabar naskah "${s.book_title}" (${s.tracking_code}): status saat ini *${stageLabel(s.status)}*.${s.status_note ? "\nCatatan: " + s.status_note : ""}${ps.some((p) => p.status === "belum" || p.status === "ditolak") ? "\n\nAda tagihan yang menunggu pembayaran. Rincian dan unggah bukti transfer melalui Portal Penulis." : ""}\n\nPantau naskah: ${location.origin}${location.pathname.replace(/admin\.html$/, "")}penulis.html\n\nSalam,\n${brand}`;

    box.innerHTML = `
      <div class="detail-head"><div style="min-width:0"><span class="eyebrow">Detail naskah · <span class="mono">${esc(s.tracking_code)}</span></span><h3 style="margin-top:4px">${esc(s.book_title)}</h3></div>
        <div class="inline"><a class="btn btn-ghost btn-sm" style="border-color:var(--ok);color:var(--ok)" href="https://wa.me/${waNum(s.whatsapp)}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Kabari via WhatsApp</a><button class="btn btn-ghost btn-sm" type="button" id="dClose">Tutup</button></div></div>
      <div class="detail-cols">
        <section>
          <h4>Penulis</h4>
          <dl class="kv"><dt>Nama</dt><dd>${esc(s.full_name)}</dd><dt>Institusi</dt><dd>${esc(s.institution || "-")}</dd><dt>Email</dt><dd>${esc(s.email)}</dd><dt>WhatsApp</dt><dd class="mono">${esc(s.whatsapp)}</dd>
            <dt>Jenis</dt><dd>${esc(s.book_type || "-")}</dd><dt>Paket</dt><dd>${esc(pkg ? pkg.name : s.package || "-")}</dd><dt>Halaman</dt><dd>${esc(s.pages_estimate || "-")}</dd><dt>Status</dt><dd>${esc(stageLabel(s.status))}</dd></dl>
          <h4>Berkas</h4>
          <ul class="file-list">${files.map((f) => `<li><span class="kind${f.from_admin ? " admin" : ""}">${esc(KIND[f.kind] || f.kind)}</span><span class="fname">${esc(f.name || f.path)}<small class="note">${fmtD(f.created_at)}${f.note ? " · " + esc(f.note) : ""}</small></span>${urls[f.path] ? `<a href="${esc(urls[f.path])}" target="_blank" rel="noopener">Unduh</a>` : ""}</li>`).join("") || `<li class="note">Belum ada berkas.${s.manuscript_url ? " Naskah dikirim lewat tautan." : ""}</li>`}</ul>
          <div class="up-rev"><label class="lbl" for="dFile">Kirim berkas ke penulis (proof, surat, dll.)</label>
            <div class="inline"><select id="dKind" style="max-width:160px"><option value="proof">Proof redaksi</option><option value="lainnya">Lainnya</option></select><input type="file" id="dFile"></div>
            <input id="dFileNote" placeholder="Keterangan (opsional)" maxlength="200"><button class="btn btn-ghost btn-sm" type="button" id="dUp">Unggah ke portal penulis</button><span class="note" id="dUpMsg"></span></div>
        </section>
        <section>
          <h4>Tagihan</h4>
          <div class="inline"><label class="lbl" for="dPrice">Nilai kontrak (Rp)</label><input id="dPrice" type="number" min="0" step="1000" value="${esc(s.agreed_price || suggest)}"><button class="btn btn-ghost btn-sm" type="button" id="dPriceSave">Simpan nilai</button></div>
          ${ps.length ? `<ul class="pay-list">${ps.map((p) => { const [l, c] = PAYL[p.status] || [p.status, "info"]; return `<li class="pay" data-pay="${p.id}">
              <div class="pay-main"><span>${esc(p.label)}</span><b class="mono">${rp(p.amount)}</b></div>
              <div class="pay-meta"><span class="badge ${c}">${l}</span>${p.paid_at ? `<span class="note">bukti ${fmtD(p.paid_at)}</span>` : ""}${p.proof_path && urls[p.proof_path] ? `<a href="${esc(urls[p.proof_path])}" target="_blank" rel="noopener">Lihat bukti</a>` : ""}</div>
              ${p.status !== "lunas" ? `<div class="inline"><button class="btn btn-primary btn-sm" data-act="lunas" type="button">Tandai lunas</button>${p.status === "menunggu" ? `<input class="pn" placeholder="Alasan penolakan" maxlength="200"><button class="btn btn-ghost btn-sm" data-act="tolak" type="button">Tolak bukti</button>` : ""}</div>` : `<span class="note">Diverifikasi ${fmtD(p.verified_at)}</span>`}
            </li>`; }).join("")}</ul>
            <div class="pay-sum"><span>Terbayar ${rp(paid)} dari ${rp(total)}</span><div class="meter"><i style="width:${total ? paid / total * 100 : 0}%;background:var(--ok)"></i></div></div>
            ${ps.some((p) => p.status === "lunas" || p.status === "menunggu") ? "" : `<button class="btn btn-ghost btn-sm" type="button" id="dDelSched">Hapus jadwal tagihan</button>`}`
          : `<p class="note">Belum ada jadwal tagihan. Jadwal dibuat dari nilai kontrak dengan pembagian: ${stages.map((x) => `${esc(x.label)} ${x.percent}%`).join(", ") || "belum diatur (lihat Harga & paket > Cicilan)"}.</p>
             <button class="btn btn-primary btn-sm" type="button" id="dMakeSched">Buat jadwal tagihan</button>`}
          <span class="note" id="dPayMsg" aria-live="polite">${esc(flash)}</span>
        </section>
      </div>`;
    flash = "";
    if (scroll) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#sDetail").addEventListener("click", async (e) => {
    const s = subs.find((x) => x.id === detailId); if (!s) return;
    const msg = $("#dPayMsg"); const say = (t) => { flash = t; msg.textContent = t; };
    if (e.target.closest("#dClose")) { $("#sDetail").hidden = true; detailId = null; return; }
    if (e.target.closest("#dPriceSave")) {
      const { error } = await sb.from("submissions").update({ agreed_price: +$("#dPrice").value || null }).eq("id", s.id);
      say(error ? "Gagal: " + error.message : "Nilai kontrak tersimpan."); if (!error) loadSubs(); return;
    }
    if (e.target.closest("#dMakeSched")) {
      const total = +$("#dPrice").value || 0, stages = ((ED.pricing.installment || {}).stages) || [];
      const sum = stages.reduce((a, x) => a + (+x.percent || 0), 0);
      if (!total) { say("Isi nilai kontrak terlebih dahulu."); return; }
      if (!stages.length || sum !== 100) { say(`Pembagian cicilan harus berjumlah 100% (sekarang ${sum}%). Atur di Harga & paket > Cicilan.`); return; }
      let left = total;
      const rows = stages.map((x, i) => { const amt = i === stages.length - 1 ? left : Math.round(total * x.percent / 100 / 1000) * 1000; left -= amt; return { submission_id: s.id, seq: i + 1, label: x.label, amount: amt }; });
      const r1 = await sb.from("submissions").update({ agreed_price: total }).eq("id", s.id);
      const r2 = await sb.from("payments").insert(rows);
      say(r1.error || r2.error ? "Gagal: " + (r1.error || r2.error).message : "Jadwal tagihan dibuat dan tampil di Portal Penulis.");
      loadSubs(); return;
    }
    if (e.target.closest("#dDelSched")) {
      const b = e.target.closest("#dDelSched");
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Klik lagi untuk menghapus"; return; }
      const { error } = await sb.from("payments").delete().eq("submission_id", s.id);
      say(error ? "Gagal: " + error.message : "Jadwal tagihan dihapus."); loadSubs(); return;
    }
    const act = e.target.closest("[data-act]");
    if (act) {
      const li = act.closest(".pay"), id = li.dataset.pay;
      if (act.dataset.act === "lunas") {
        const { error } = await sb.from("payments").update({ status: "lunas", verified_at: new Date().toISOString(), admin_note: null }).eq("id", id);
        say(error ? "Gagal: " + error.message : "Pembayaran ditandai lunas.");
      } else {
        const note = $(".pn", li).value.trim();
        if (!note) { say("Tulis alasan penolakan agar penulis tahu apa yang harus diperbaiki."); $(".pn", li).focus(); return; }
        const { error } = await sb.from("payments").update({ status: "ditolak", admin_note: note }).eq("id", id);
        say(error ? "Gagal: " + error.message : "Bukti ditolak. Penulis dapat mengunggah ulang.");
      }
      loadSubs(); return;
    }
    if (e.target.closest("#dUp")) {
      const file = $("#dFile").files[0], um = $("#dUpMsg");
      if (!file) { um.textContent = "Pilih berkas terlebih dahulu."; return; }
      if (file.size > 50 * 1024 * 1024) { um.textContent = "Ukuran berkas maksimal 50 MB."; return; }
      um.textContent = "Mengunggah…";
      const path = `admin/${s.id}/${Date.now()}-${file.name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-90)}`;
      const up = await sb.storage.from("manuscripts").upload(path, file, { contentType: file.type || undefined });
      if (up.error) { um.textContent = "Gagal: " + up.error.message; return; }
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("submission_files").insert({ submission_id: s.id, kind: $("#dKind").value, path, name: file.name, note: $("#dFileNote").value.trim() || null, from_admin: true, uploaded_by: user ? user.id : null });
      um.textContent = error ? "Gagal: " + error.message : "Terkirim ke portal penulis.";
      if (!error) openDetail(s.id, false);
    }
  });

  /* Buku */
  async function loadBooks() {
    const { data } = await sb.from("books").select("*").order("created_at", { ascending: false });
    $("#bRows").innerHTML = (data || []).map((b) => `<tr data-id="${b.id}"><td><b>${esc(b.title)}</b><br><small class="note">${esc(b.authors)}</small></td><td class="mono">${esc(b.isbn || "-")}</td><td>${esc(b.year || "")}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm tg" data-p="${b.published}">${b.published ? "Sembunyikan" : "Tampilkan"}</button><button class="btn btn-ghost btn-sm del">Hapus</button></td></tr>`).join("") || `<tr><td colspan="4" class="note">Katalog masih kosong.</td></tr>`;
  }
  $("#bookForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.target).entries());
    const cf = $("#bCoverFile").files[0];
    if (cf) {
      if (cf.size > 5 * 1024 * 1024) { $("#bMsg").innerHTML = `<div class="alert err">Gambar sampul maksimal 5 MB.</div>`; return; }
      $("#bMsg").innerHTML = `<p class="note">Mengunggah sampul…</p>`;
      const path = `${Date.now()}-${cf.name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80)}`;
      const up = await sb.storage.from("covers").upload(path, cf, { contentType: cf.type });
      if (up.error) { $("#bMsg").innerHTML = `<div class="alert err">Sampul gagal diunggah: ${esc(up.error.message)}</div>`; return; }
      p.cover_url = sb.storage.from("covers").getPublicUrl(path).data.publicUrl;
    }
    ["year", "pages"].forEach((k) => (p[k] = p[k] ? +p[k] : null));
    ["cover_url", "buy_url", "isbn", "category", "book_type"].forEach((k) => (p[k] = p[k] || null));
    const { error } = await sb.from("books").insert(p);
    $("#bMsg").innerHTML = error ? `<div class="alert err">${esc(error.message)}</div>` : `<div class="alert ok">Buku tersimpan dan tampil di katalog.</div>`;
    if (!error) { e.target.reset(); loadBooks(); }
  });
  $("#bRows").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    if (e.target.closest(".tg")) { await sb.from("books").update({ published: e.target.dataset.p !== "true" }).eq("id", tr.dataset.id); loadBooks(); }
    if (e.target.closest(".del")) {
      const b = e.target.closest(".del");
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Yakin hapus?"; return; }
      await sb.from("books").delete().eq("id", tr.dataset.id); loadBooks();
    }
  });

  /* Call */
  async function loadCalls() {
    const { data } = await sb.from("calls").select("*").order("deadline", { ascending: false });
    $("#kRows").innerHTML = (data || []).map((c) => `<tr data-id="${c.id}"><td><b>${esc(c.title)}</b><br><small class="note">${esc(c.field || "")}</small></td><td>${esc(c.deadline)}</td><td class="mono">${c.filled}/${c.quota ?? "-"}</td>
      <td><button class="btn btn-ghost btn-sm tg" data-o="${c.is_open}">${c.is_open ? "Tutup" : "Buka lagi"}</button></td></tr>`).join("") || `<tr><td colspan="4" class="note">Belum ada call.</td></tr>`;
  }
  $("#callForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.target).entries());
    p.quota = p.quota ? +p.quota : null; p.fee = p.fee ? +p.fee : null;
    const { error } = await sb.from("calls").insert(p);
    $("#kMsg").innerHTML = error ? `<div class="alert err">${esc(error.message)}</div>` : `<div class="alert ok">Call dibuka dan tampil di website.</div>`;
    if (!error) { e.target.reset(); loadCalls(); }
  });
  $("#kRows").addEventListener("click", async (e) => {
    const b = e.target.closest(".tg"); if (!b) return;
    await sb.from("calls").update({ is_open: b.dataset.o !== "true" }).eq("id", b.closest("tr").dataset.id); loadCalls();
  });

  /* =============== EDITOR HARGA & KONTEN =============== */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ED = { pricing: clone(D.pricing), content: clone(D.content) };
  const addonFields = new Set();

  const T = (label, hint) => ({ t: "text", label, hint });
  const A = (label, hint) => ({ t: "area", label, hint });
  const N = (label, hint) => ({ t: "num", label, hint });
  const M = (label) => ({ t: "money", label });
  const L = (label, hint) => ({ t: "lines", label, hint: hint || "Satu butir per baris." });
  const head = (label) => ({ t: "obj", label, fields: [["eyebrow", T("Label kecil")], ["title", T("Judul")], ["lead", A("Paragraf pembuka (boleh kosong)")]] });

  const SCHEMA = {
    pricing: { t: "obj", fields: [
      ["packages", { t: "list", label: "Paket penerbitan", item: "name", of: { t: "obj", fields: [
        ["name", T("Nama paket")], ["id", T("Kode paket", "Huruf kecil tanpa spasi, mis. profesional. Jangan diubah setelah ada naskah masuk.")],
        ["price", M("Harga per judul")], ["copies", N("Eksemplar termasuk")], ["maxPages", N("Batas halaman")],
        ["days", T("Waktu proses")], ["popular", { t: "bool", label: "Tandai \"Paling banyak dipilih\"" }],
        ["fit", T("Cocok untuk")], ["features", L("Fasilitas")],
        ["includes", { t: "addons", label: "Layanan tambahan yang sudah termasuk paket" }]] } }],
      ["chapter", { t: "obj", label: "Book chapter", fields: [["price", M("Harga per penulis")], ["features", L("Fasilitas")]] }],
      ["addons", { t: "list", label: "Layanan tambahan", item: "name", onChange: () => addonFields.forEach((f) => f()), of: { t: "obj", fields: [
        ["name", T("Nama layanan")], ["id", T("Kode", "Huruf kecil tanpa spasi.")], ["price", M("Harga")],
        ["unit", { t: "select", label: "Satuan", opts: [["flat", "Per judul"], ["page", "Per halaman"], ["item", "Per item"]] }]] } }],
      ["print", { t: "obj", label: "Tarif cetak (dipakai kalkulator)", fields: [
        ["base", M("Biaya dasar per eksemplar")], ["perPageBW", M("Per halaman hitam-putih")], ["perPageColor", M("Per halaman berwarna")],
        ["hardcover", M("Tambahan hardcover per eks")], ["extraLayoutPerPage", M("Layout per halaman di atas batas paket")]] }],
      ["installment", { t: "obj", label: "Cicilan", fields: [["note", A("Keterangan cicilan (tampil di halaman harga)")],
        ["stages", { t: "list", label: "Tahap pembayaran (dipakai saat membuat jadwal tagihan; total harus 100%)", item: "label", of: { t: "obj", fields: [["label", T("Nama tahap")], ["percent", N("Persen")]] } }]] }]
    ] },
    content: { t: "obj", fields: [
      ["brand", { t: "obj", label: "Identitas & kontak", fields: [
        ["name", T("Nama penerbit")], ["company", T("Nama perusahaan")], ["tagline", T("Slogan")],
        ["whatsapp", T("Nomor WhatsApp", "Format 62xxxxxxxxxx tanpa + atau spasi.")], ["email", T("Email")], ["address", T("Alamat", "Kota di awal alamat dipakai di halaman KDT.")],
        ["ikapi", T("Nomor anggota IKAPI", "Kosongkan jika belum ada.")], ["isbnPrefix", T("Awalan ISBN")]] }],
      ["hero", { t: "obj", label: "Beranda", fields: [
        ["eyebrow", T("Label kecil")], ["title", A("Judul besar", "Apit kata dengan *bintang* untuk menyorotnya.")], ["lead", A("Paragraf pembuka")],
        ["tryLabel", T("Petunjuk kotak pratinjau")], ["sampleTitle", T("Contoh judul")], ["sampleAuthor", T("Contoh penulis")], ["facts", L("Poin keunggulan singkat")]] }],
      ["profil", { t: "obj", label: "Profil", fields: [
        ["eyebrow", T("Label kecil")], ["title", T("Judul")], ["paragraphs", L("Paragraf profil", "Satu paragraf per baris.")],
        ["visi", A("Visi")], ["misi", L("Misi")]] }],
      ["why", { t: "obj", label: "Mengapa memilih kami", fields: [["eyebrow", T("Label kecil")], ["title", T("Judul")],
        ["items", { t: "list", label: "Keunggulan", item: "title", of: { t: "obj", fields: [["title", T("Judul")], ["text", A("Penjelasan")]] } }]] }],
      ["layanan", { t: "obj", label: "Layanan", fields: [["eyebrow", T("Label kecil")], ["title", T("Judul")], ["lead", A("Paragraf pembuka")],
        ["items", { t: "list", label: "Daftar layanan", item: "title", of: { t: "obj", fields: [["tag", T("Label")], ["title", T("Nama layanan")], ["text", A("Penjelasan")]] } }]] }],
      ["alur", { t: "obj", label: "Alur penerbitan", fields: [["eyebrow", T("Label kecil")], ["title", T("Judul")],
        ["steps", { t: "list", label: "Tahap", item: "title", of: { t: "obj", fields: [["title", T("Nama tahap")], ["text", T("Keterangan")]] } }]] }],
      ["sections", { t: "obj", label: "Judul bagian lain", fields: [
        ["harga", head("Paket & harga")], ["studio", head("Studio Penulis")], ["katalog", head("Katalog")], ["call", head("Call for chapter")],
        ["lacak", head("Lacak naskah")], ["kirim", head("Kirim naskah")], ["faq", head("Tanya jawab")]] }],
      ["privacyNote", A("Catatan privasi di formulir kirim naskah")],
      ["payment", { t: "obj", label: "Rekening pembayaran (tampil di Portal Penulis)", fields: [["bank", T("Nama bank")], ["account", T("Nomor rekening")], ["holder", T("Atas nama")], ["note", A("Petunjuk pembayaran")]] }],
      ["portal", { t: "obj", label: "Portal Penulis", fields: [["title", T("Judul")], ["lead", A("Paragraf pembuka")]] }],
      ["faq", { t: "list", label: "Tanya jawab (FAQ)", item: "q", of: { t: "obj", fields: [["q", T("Pertanyaan")], ["a", A("Jawaban")]] } }],
      ["credit", { t: "list", label: "Simulasi angka kredit", item: "label", of: { t: "obj", fields: [["label", T("Jenis karya")], ["id", T("Kode")], ["max", N("Angka kredit maksimum")]] } }],
      ["readiness", { t: "list", label: "Cek kesiapan naskah", item: "text", of: { t: "obj", fields: [["text", A("Syarat")], ["id", T("Kode")], ["w", N("Bobot", "Skor dihitung sebagai persentase dari total bobot.")]] } }]
    ] }
  };

  const node = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  function dflt(n) {
    if (n.t === "obj") { const o = {}; n.fields.forEach(([k, f]) => (o[k] = dflt(f))); return o; }
    if (["list", "lines", "addons"].includes(n.t)) return [];
    if (n.t === "num" || n.t === "money") return 0;
    if (n.t === "bool") return false;
    if (n.t === "select") return n.opts[0][0];
    return "";
  }
  let uid = 0;
  function build(n, h, k) {
    const id = "ed" + (++uid), lab = n.label || "";
    if (n.t === "obj") {
      if (!h[k] || typeof h[k] !== "object" || Array.isArray(h[k])) h[k] = dflt(n);
      const box = node(`<fieldset class="ed-obj">${lab ? `<legend>${esc(lab)}</legend>` : ""}<div class="ed-grid"></div></fieldset>`);
      n.fields.forEach(([kk, f]) => {
        const c = build(f, h[k], kk);
        if (["lines", "area", "list", "obj", "addons"].includes(f.t)) c.classList.add("wide");
        box.lastElementChild.appendChild(c);
      });
      return box;
    }
    if (n.t === "list") {
      if (!Array.isArray(h[k])) h[k] = [];
      const box = node(`<div class="ed-list"><div class="ed-list-head"><b>${esc(lab)}</b><button type="button" class="btn btn-ghost btn-sm">+ Tambah</button></div><div class="ed-items"></div></div>`);
      const items = box.lastElementChild;
      const title = (it, i) => String((n.item && it[n.item]) || "Butir baru " + (i + 1)).slice(0, 90);
      const draw = (openIdx) => {
        items.innerHTML = "";
        h[k].forEach((it, i) => {
          const card = node(`<details class="ed-item"${i === openIdx ? " open" : ""}><summary><span>${esc(title(it, i))}</span><span class="ed-actions"><button type="button" data-a="up" aria-label="Naikkan">↑</button><button type="button" data-a="down" aria-label="Turunkan">↓</button><button type="button" data-a="del">Hapus</button></span></summary></details>`);
          card.appendChild(build(n.of, h[k], i));
          card.addEventListener("input", () => { card.querySelector("summary > span").textContent = title(it, i); });
          card.querySelector(".ed-actions").addEventListener("click", (e) => {
            const b = e.target.closest("button"); if (!b) return;
            e.preventDefault();
            const arr = h[k];
            if (b.dataset.a === "up" && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); }
            if (b.dataset.a === "down" && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(); }
            if (b.dataset.a === "del") {
              if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Yakin?"; return; }
              arr.splice(i, 1); draw();
            }
            n.onChange && n.onChange();
          });
          items.appendChild(card);
        });
        if (!h[k].length) items.innerHTML = `<p class="hint">Belum ada butir. Klik "+ Tambah".</p>`;
      };
      box.querySelector(".ed-list-head button").addEventListener("click", () => { h[k].push(dflt(n.of)); draw(h[k].length - 1); n.onChange && n.onChange(); });
      box.addEventListener("change", () => n.onChange && n.onChange());
      draw();
      return box;
    }
    if (n.t === "bool") {
      const w = node(`<label class="ed-bool"><input type="checkbox" id="${id}"> ${esc(lab)}</label>`);
      const i = w.querySelector("input"); i.checked = !!h[k];
      i.addEventListener("change", () => (h[k] = i.checked));
      return w;
    }
    const w = node(`<div class="field"><label for="${id}">${esc(lab)}</label></div>`);
    let inp;
    if (n.t === "addons") {
      if (!Array.isArray(h[k])) h[k] = [];
      inp = node(`<div class="ed-addons" id="${id}"></div>`);
      const redraw = () => {
        inp.innerHTML = (ED.pricing.addons || []).map((a) => `<label><input type="checkbox" value="${esc(a.id)}"${h[k].includes(a.id) ? " checked" : ""}> ${esc(a.name || a.id)}</label>`).join("") || `<span class="hint">Belum ada layanan tambahan.</span>`;
      };
      inp.addEventListener("change", () => { h[k] = Array.from(inp.querySelectorAll("input:checked")).map((x) => x.value); });
      addonFields.add(redraw); redraw();
    } else if (n.t === "select") {
      inp = node(`<select id="${id}">${n.opts.map(([v, l]) => `<option value="${v}"${h[k] === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`);
      inp.addEventListener("change", () => (h[k] = inp.value));
    } else if (n.t === "num" || n.t === "money") {
      inp = node(`<input type="number" id="${id}" min="0" step="${n.t === "money" ? 500 : 1}">`);
      inp.value = h[k] ?? 0;
      const hint = n.t === "money" ? node(`<span class="hint mono">${rp(h[k])}</span>`) : null;
      inp.addEventListener("input", () => { h[k] = inp.value === "" ? 0 : +inp.value; if (hint) hint.textContent = rp(h[k]); });
      w.appendChild(inp); if (hint) w.appendChild(hint);
      if (n.hint) w.appendChild(node(`<span class="hint">${esc(n.hint)}</span>`));
      return w;
    } else if (n.t === "lines") {
      inp = node(`<textarea id="${id}" rows="${Math.min(10, Math.max(3, (h[k] || []).length + 1))}"></textarea>`);
      inp.value = (h[k] || []).join("\n");
      inp.addEventListener("input", () => (h[k] = inp.value.split("\n").map((s) => s.trim()).filter(Boolean)));
    } else if (n.t === "area") {
      inp = node(`<textarea id="${id}" rows="3"></textarea>`); inp.value = h[k] ?? "";
      inp.addEventListener("input", () => (h[k] = inp.value));
    } else {
      inp = node(`<input id="${id}">`); inp.value = h[k] ?? "";
      inp.addEventListener("input", () => (h[k] = inp.value));
    }
    w.appendChild(inp);
    if (n.hint) w.appendChild(node(`<span class="hint">${esc(n.hint)}</span>`));
    return w;
  }

  function renderEditor(key) {
    const root = $(key === "pricing" ? "#edPricing" : "#edContent");
    if (key === "pricing") addonFields.clear();
    root.innerHTML = "";
    const holder = { v: ED[key] };
    SCHEMA[key].fields.forEach(([k, f]) => root.appendChild(build(f, holder.v, k)));
  }

  function validate(key) {
    const v = ED[key];
    if (key === "pricing") {
      const ids = (v.packages || []).map((p) => p.id);
      if (!ids.length) return "Minimal harus ada satu paket.";
      if (ids.some((x) => !/^[a-z0-9_-]+$/.test(x || ""))) return "Kode paket wajib diisi dengan huruf kecil/angka tanpa spasi.";
      if (new Set(ids).size !== ids.length) return "Ada kode paket yang sama. Setiap paket butuh kode unik.";
      const aids = (v.addons || []).map((a) => a.id);
      if (aids.some((x) => !/^[a-z0-9_-]+$/.test(x || ""))) return "Kode layanan tambahan wajib diisi dengan huruf kecil/angka tanpa spasi.";
      if (new Set(aids).size !== aids.length) return "Ada kode layanan tambahan yang sama.";
      const st = (v.installment || {}).stages || [];
      const sum = st.reduce((a, x) => a + (+x.percent || 0), 0);
      if (st.length && sum !== 100) return `Total persen tahap pembayaran harus 100% (sekarang ${sum}%).`;
    }
    if (key === "content") {
      if (!(v.brand || {}).name) return "Nama penerbit tidak boleh kosong.";
      const cid = (v.credit || []).map((c) => c.id), rid = (v.readiness || []).map((r) => r.id);
      if (cid.some((x) => !x) || new Set(cid).size !== cid.length) return "Setiap jenis karya angka kredit butuh kode unik.";
      if (rid.some((x) => !x) || new Set(rid).size !== rid.length) return "Setiap syarat kesiapan naskah butuh kode unik.";
    }
    return null;
  }

  async function loadSettings() {
    const { data, error } = await sb.from("site_settings").select("key,value");
    if (error) console.error(error);
    (data || []).forEach((r) => { if (ED[r.key]) ED[r.key] = D.merge(clone(r.key === "pricing" ? D.pricing : D.content), r.value); });
    renderEditor("pricing"); renderEditor("content");
  }
  $$("[data-save]").forEach((b) => b.addEventListener("click", async () => {
    const key = b.dataset.save, msg = $("#msg-" + key);
    const bad = validate(key);
    if (bad) { msg.innerHTML = `<span style="color:var(--bad)">${esc(bad)}</span>`; return; }
    b.disabled = true; msg.textContent = "Menyimpan…";
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("site_settings").upsert({ key, value: ED[key], updated_at: new Date().toISOString(), updated_by: user ? user.id : null });
    b.disabled = false;
    msg.innerHTML = error ? `<span style="color:var(--bad)">Gagal menyimpan: ${esc(error.message)}</span>` : `<span style="color:var(--ok)">Tersimpan ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}. Situs langsung memakai versi ini.</span>`;
  }));
  $$("[data-reset]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.reset;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Klik lagi untuk mengembalikan"; setTimeout(() => { b.dataset.sure = ""; b.textContent = "Kembalikan ke bawaan"; }, 4000); return; }
    b.dataset.sure = ""; b.textContent = "Kembalikan ke bawaan";
    ED[key] = clone(key === "pricing" ? D.pricing : D.content); renderEditor(key);
    $("#msg-" + key).textContent = "Nilai bawaan dimuat. Tekan Simpan untuk menerapkannya di situs.";
  }));

  boot();
})();
