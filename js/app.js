(function () {
  "use strict";
  const CFG = window.IGV_CONFIG || { brand: {} };
  const D = window.IGV_DATA;
  const B = CFG.brand || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Supabase ---------- */
  let sb = null;
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
    try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { console.error(e); }
  }
  const DEMO = !sb;

  /* ---------- Brand text ---------- */
  $$("[data-brand]").forEach((el) => {
    const k = el.dataset.brand;
    if (k === "isbn") el.textContent = B.isbnPrefix || el.textContent;
    else if (B[k]) el.textContent = B[k];
  });
  const waDisplay = (B.whatsapp || "").replace(/^62/, "0");
  $("#waText").textContent = waDisplay;
  $("#mailText").textContent = B.email || "";
  $("#waFloat").href = "https://wa.me/" + (B.whatsapp || "") + "?text=" + encodeURIComponent("Halo " + (B.name || "") + ", saya ingin konsultasi penerbitan buku.");
  if (B.ikapi) { const l = $("#ikapiLine"); l.textContent = "Anggota IKAPI No. " + B.ikapi; l.hidden = false; }
  $("#year").textContent = new Date().getFullYear();
  $("#modeLine").textContent = DEMO ? "Mode demo: data belum terhubung ke Supabase" : "";
  $("#trackHint").hidden = !DEMO;
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const t = $("#" + b.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = "Tersalin"; }
    catch { const r = document.createRange(); r.selectNodeContents($("#" + b.dataset.copy)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Tekan Ctrl+C"; }
    setTimeout(() => (b.textContent = "Salin"), 1800);
  }));

  /* ---------- Nav ---------- */
  const menuBtn = $("#menuBtn"), links = $("#navLinks");
  menuBtn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", (e) => { if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  if ("IntersectionObserver" in window) {
    const map = new Map($$(".nav-links a[href^='#']").map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting && map.has(en.target.id)) { map.forEach((a) => a.classList.remove("active")); map.get(en.target.id).classList.add("active"); }
    }), { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Hero live preview ---------- */
  const hT = $("#heroTitle"), hA = $("#heroAuthor");
  const syncHero = () => {
    const t = hT.value.trim() || "Judul Naskah Anda", a = hA.value.trim() || "Nama Penulis";
    $("#coverTitle").textContent = t; $("#kdtTitle").textContent = t;
    $("#coverAuthor").textContent = a; $("#kdtAuthor").textContent = a; $("#kdtAuthor2").textContent = a;
  };
  hT.addEventListener("input", syncHero); hA.addEventListener("input", syncHero);

  /* ---------- Harga ---------- */
  $("#plans").innerHTML = D.packages.map((p) => `
    <article class="plan${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="ribbon">Paling banyak dipilih</span>' : ""}
      <h3>${esc(p.name)}</h3>
      <p class="note">${esc(p.fit)}</p>
      <div class="price mono">${rp(p.price)}<br><small>per judul · s.d. ${p.maxPages} halaman</small></div>
      <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="meta">Waktu proses: ${esc(p.days)}<br>Cicilan ${D.installment.times}× ${rp(p.price / D.installment.times)}</p>
      <a class="btn ${p.popular ? "btn-primary" : "btn-ghost"}" href="#kirim" data-pick="${p.id}">Pilih ${esc(p.name)}</a>
    </article>`).join("");
  $("#chapterPlan").innerHTML = `
    <h3>Book Chapter</h3>
    <div class="price mono">${rp(D.chapter.price)}<br><small>per penulis per bab</small></div>
    <ul>${D.chapter.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
    <a class="btn btn-ghost" href="#call">Lihat tema yang dibuka</a>`;
  const unitTxt = { flat: "", page: " / halaman", item: " / item" };
  $("#addonTable").innerHTML = D.addons.map((a) => `<tr><td>${esc(a.name)}</td><td class="num">${rp(a.price)}${unitTxt[a.unit]}</td></tr>`).join("")
    + `<tr><td>Cetak tambahan (softcover, hitam-putih)</td><td class="num">mulai ${rp(unitPrint(100, "soft", "bw"))} / eks</td></tr>`;
  $("#installNote").textContent = D.installment.note + " Harga dapat berubah; harga final tercantum di kontrak.";

  /* ---------- Kalkulator ---------- */
  function unitPrint(pages, cover, color) {
    const P = D.print;
    let u = P.base + pages * (color === "color" ? P.perPageColor : P.perPageBW) + (cover === "hard" ? P.hardcover : 0);
    return Math.ceil(u / 500) * 500;
  }
  const cPkg = $("#cPkg"), fPkg = $("#fPkg");
  const pkgOpts = D.packages.map((p) => `<option value="${p.id}">${esc(p.name)} — ${rp(p.price)}</option>`).join("");
  cPkg.innerHTML = pkgOpts;
  fPkg.innerHTML = pkgOpts + `<option value="chapter">Book chapter — ${rp(D.chapter.price)}</option><option value="belum">Belum memilih</option>`;
  cPkg.value = "profesional"; fPkg.value = "profesional";
  const state = { cover: "soft", color: "bw" };
  $("#cAddons").innerHTML = D.addons.map((a) => `
    <label class="check" data-id="${a.id}"><input type="checkbox" value="${a.id}"><span>${esc(a.name)}<br><small class="inc"></small></span><small class="mono">${rp(a.price)}${unitTxt[a.unit]}</small></label>`).join("");
  function segBind(id, key, cb) {
    $$("#" + id + " button").forEach((b) => b.addEventListener("click", () => {
      $$("#" + id + " button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      state[key] = b.dataset.v; cb();
    }));
  }
  segBind("cCover", "cover", calc); segBind("cColor", "color", calc);
  ["#cPkg", "#cPages", "#cCopies"].forEach((s) => $(s).addEventListener("input", calc));
  $("#cAddons").addEventListener("change", calc);

  let lastCalc = null;
  function calc() {
    const p = D.packages.find((x) => x.id === cPkg.value);
    const pages = Math.max(49, Math.min(900, +$("#cPages").value || 0));
    const copies = Math.max(0, Math.min(2000, Math.floor(+$("#cCopies").value || 0)));
    const rows = [[`Paket ${p.name} (termasuk ${p.copies} eks)`, p.price]];
    if (pages > p.maxPages) rows.push([`Layout ${pages - p.maxPages} halaman di atas batas paket`, (pages - p.maxPages) * D.print.extraLayoutPerPage]);
    const extra = Math.max(0, copies - p.copies);
    const u = unitPrint(pages, state.cover, state.color);
    if (extra) rows.push([`Cetak tambahan ${extra} eks × ${rp(u)}`, extra * u]);
    const diff = u - unitPrint(pages, "soft", "bw");
    if (diff > 0) {
      const spec = [state.cover === "hard" ? "hardcover" : "", state.color === "color" ? "isi berwarna" : ""].filter(Boolean).join(" & ");
      rows.push([`Selisih ${spec} untuk ${p.copies} eks dalam paket`, diff * p.copies]);
    }
    const chosen = [];
    $$("#cAddons .check").forEach((lab) => {
      const id = lab.dataset.id, a = D.addons.find((x) => x.id === id), inp = $("input", lab);
      const inc = p.includes.includes(id);
      lab.classList.toggle("included", inc); inp.disabled = inc; if (inc) inp.checked = true;
      $(".inc", lab).textContent = inc ? "Sudah termasuk paket" : "";
      if (inp.checked && !inc) { const cost = a.unit === "page" ? a.price * pages : a.price; rows.push([a.name, cost]); chosen.push(a.name); }
    });
    const total = rows.reduce((s, r) => s + r[1], 0);
    $("#cRows").innerHTML = rows.map((r) => `<div class="row"><span>${esc(r[0])}</span><span>${rp(r[1])}</span></div>`).join("");
    $("#cTotal").textContent = rp(total); $("#cBig").textContent = rp(total);
    $("#cInstall").textContent = `Atau cicil ${D.installment.times}×: ${rp(total * .4)} saat kontrak, lalu ${rp(total * .3)} dua kali.`;
    lastCalc = { p, pages, copies, total, chosen };
  }
  calc();
  $("#cApply").addEventListener("click", () => {
    const c = lastCalc;
    fPkg.value = c.p.id; $("#fPages").value = c.pages;
    $("#fNotes").value = `Estimasi kalkulator: paket ${c.p.name}, ${c.pages} hlm, ${c.copies} eks, ${state.cover === "hard" ? "hardcover" : "softcover"}, isi ${state.color === "color" ? "berwarna" : "hitam-putih"}${c.chosen.length ? ", tambahan: " + c.chosen.join(", ") : ""}. Total ${rp(c.total)}.`;
    location.hash = "#kirim"; $("#fName").focus({ preventScroll: true });
  });
  $("#plans").addEventListener("click", (e) => { const a = e.target.closest("[data-pick]"); if (a) fPkg.value = a.dataset.pick; });

  /* ---------- Tabs ---------- */
  const tabs = $$(".tab");
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus(); }
    });
  });
  function select(t) {
    tabs.forEach((x) => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = !on; });
  }

  /* ---------- Angka kredit ---------- */
  $("#akType").innerHTML = D.credit.types.map((t) => `<option value="${t.id}">${esc(t.label)} (maks ${t.max})</option>`).join("");
  state.role = "utama";
  segBind("akRole", "role", ak);
  $("#akType").addEventListener("input", ak); $("#akN").addEventListener("input", ak);
  function ak() {
    const t = D.credit.types.find((x) => x.id === $("#akType").value);
    const n = Math.max(1, Math.min(20, Math.floor(+$("#akN").value || 1)));
    let shares = [], mine, explain;
    if (n === 1) { shares = [1]; mine = 0; explain = "Penulis tunggal memperoleh seluruh angka kredit."; }
    else if (state.role === "setara") { shares = Array(n).fill(1 / n); mine = 0; explain = `Tanpa penulis utama, nilai dibagi rata kepada ${n} penulis.`; }
    else { shares = [0.6, ...Array(n - 1).fill(0.4 / (n - 1))]; mine = state.role === "utama" ? 0 : 1; explain = `Penulis utama 60%, sisa 40% dibagi kepada ${n - 1} penulis anggota.`; }
    const val = t.max * shares[mine];
    $("#akBig").textContent = val.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " AK";
    $("#akMax").textContent = `${t.label}: nilai maksimum ${t.max} angka kredit per judul.`;
    $("#akSplit").innerHTML = shares.map((s, i) => `<span class="${i === mine ? "me" : ""}" style="flex:${s}" title="${(s * 100).toFixed(0)}%">${i === mine ? "Anda" : n <= 6 ? (s * 100).toFixed(0) + "%" : ""}</span>`).join("");
    $("#akExplain").textContent = explain + " Ini perkiraan nilai maksimum; tim penilai dapat memberi nilai lebih rendah sesuai mutu karya.";
  }
  ak();

  /* ---------- Kesiapan naskah ---------- */
  $("#rList").innerHTML = D.readiness.map((r) => `<label class="check"><input type="checkbox" value="${r.id}"><span>${esc(r.text)}</span><small></small></label>`).join("");
  $("#rList").addEventListener("change", ready);
  function ready() {
    const on = $$("#rList input:checked").map((i) => i.value);
    const score = D.readiness.filter((r) => on.includes(r.id)).reduce((s, r) => s + r.w, 0);
    $("#rScore").textContent = score + "%"; $("#rBar").style.width = score + "%";
    const missing = D.readiness.filter((r) => !on.includes(r.id));
    $("#rMsg").textContent = score >= 85 ? "Naskah Anda tampak siap. Kirim untuk telaah redaksi."
      : score >= 55 ? `Hampir siap. Lengkapi dulu: ${missing.slice(0, 2).map((m) => m.text.split(";")[0].replace(/\.$/, "").toLowerCase()).join("; ")}.`
      : "Masih perlu persiapan. Paket Unggulan atau layanan konversi naskah dapat membantu menata ulang naskah Anda.";
  }
  ready();

  /* ---------- Katalog ---------- */
  let books = [], cat = "Semua";
  const coverHTML = (b) => `<div class="cover" style="--c:${esc(b.cover_color || "#0F4C45")}">
      <span class="c-type">${esc(b.book_type || "")}</span><span class="c-title">${esc(b.title)}</span>
      <span class="c-author">${esc(b.authors)}</span><span class="c-pub">${esc(B.name || "IGV Press")}</span></div>`;
  function renderBooks() {
    const q = $("#catSearch").value.trim().toLowerCase();
    const list = books.filter((b) => (cat === "Semua" || b.category === cat) &&
      (!q || [b.title, b.authors, b.isbn].join(" ").toLowerCase().includes(q)));
    $("#books").innerHTML = list.length ? list.map((b) => `
      <article class="book">${b.cover_url ? `<img src="${esc(b.cover_url)}" alt="Sampul ${esc(b.title)}" loading="lazy" style="aspect-ratio:155/230;object-fit:cover;border-radius:3px 8px 8px 3px">` : coverHTML(b)}
        <h3>${esc(b.title)}</h3><p>${esc(b.authors)} · ${esc(b.year || "")}${b.pages ? " · " + b.pages + " hlm" : ""}</p>
        ${b.isbn ? `<span class="isbn">ISBN ${esc(b.isbn)}</span>` : ""}
        ${b.buy_url ? `<a class="btn btn-ghost btn-sm" href="${esc(b.buy_url)}" target="_blank" rel="noopener">Beli / lihat</a>` : ""}
      </article>`).join("") : `<div class="empty">Belum ada buku yang cocok dengan pencarian ini.</div>`;
  }
  function renderChips() {
    const cats = ["Semua", ...new Set(books.map((b) => b.category).filter(Boolean))];
    $("#catChips").innerHTML = cats.map((c) => `<button type="button" class="chip" aria-pressed="${c === cat}">${esc(c)}</button>`).join("");
  }
  $("#catChips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; cat = b.textContent; renderChips(); renderBooks(); });
  $("#catSearch").addEventListener("input", renderBooks);
  async function loadBooks() {
    if (DEMO) { books = D.demoBooks; $("#catDemo").hidden = false; }
    else {
      const { data, error } = await sb.from("books").select("*").eq("published", true).order("year", { ascending: false }).order("created_at", { ascending: false });
      if (error) console.error(error);
      books = data || [];
    }
    renderChips(); renderBooks();
  }

  /* ---------- Call for chapter ---------- */
  let calls = [];
  async function loadCalls() {
    if (DEMO) { calls = D.demoCalls; $("#callDemo").hidden = false; }
    else {
      const { data, error } = await sb.from("calls").select("*").eq("is_open", true).order("deadline");
      if (error) console.error(error);
      calls = (data || []).map((c) => ({ ...c, deadline_days: Math.ceil((new Date(c.deadline) - new Date()) / 864e5) })).filter((c) => c.deadline_days >= 0);
    }
    $("#fCall").innerHTML = `<option value="">—</option>` + calls.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
    $("#calls").innerHTML = calls.length ? calls.map((c) => {
      const pct = c.quota ? Math.min(100, Math.round((c.filled || 0) / c.quota * 100)) : 0;
      return `<article class="call">
        <div class="days"><b class="mono">${c.deadline_days}</b><small>hari lagi</small></div>
        <div style="min-width:0"><span class="tag">${esc(c.field || "Umum")}</span><h3 style="margin-top:6px">${esc(c.title)}</h3><p>${esc(c.description || "")}</p>
          ${c.quota ? `<div class="quota"><span>${c.filled || 0} dari ${c.quota} bab terisi</span><div class="meter"><i style="width:${pct}%"></i></div></div>` : ""}</div>
        <div style="display:grid;gap:8px;justify-items:start"><span class="mono">${rp(c.fee || D.chapter.price)}</span><button class="btn btn-primary btn-sm" type="button" data-join="${esc(c.id)}">Daftar bab</button></div>
      </article>`;
    }).join("") : `<div class="empty">Belum ada call for chapter yang dibuka. Pantau halaman ini atau hubungi kami untuk mengusulkan tema.</div>`;
  }
  $("#calls").addEventListener("click", (e) => {
    const b = e.target.closest("[data-join]"); if (!b) return;
    const c = calls.find((x) => String(x.id) === b.dataset.join);
    $("#fType").value = "Book chapter"; fPkg.value = "chapter"; $("#fCall").value = c.id;
    $("#fNotes").value = `Mendaftar book chapter tema: ${c.title}`;
    location.hash = "#kirim"; $("#fName").focus({ preventScroll: true });
  });

  /* ---------- Lacak ---------- */
  $("#trackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("#trackCode").value.trim().toUpperCase();
    const out = $("#trackResult");
    out.innerHTML = `<p class="note" style="color:inherit;margin-top:16px">Mencari…</p>`;
    let res = null;
    if (DEMO) {
      if (code === "IGV-DEMO") res = { tracking_code: code, book_title: "Contoh: Asuhan Keperawatan Maternitas Berbasis Bukti", book_type: "Buku referensi", status: "layout",
        events: [{ status: "diterima", created_at: "2026-10-20" }, { status: "review", created_at: "2026-10-21" }, { status: "kontrak", created_at: "2026-10-23" }, { status: "editing", created_at: "2026-10-27" }, { status: "layout", created_at: "2026-11-03", note: "Sampul alternatif dikirim via email." }] };
    } else {
      const { data, error } = await sb.rpc("track_submission", { p_code: code });
      if (error) console.error(error);
      res = data;
    }
    if (!res) { out.innerHTML = `<div class="track-head" style="color:var(--ink)">Kode <b class="mono">${esc(code)}</b> tidak ditemukan. Periksa kembali kode di email konfirmasi Anda.</div>`; return; }
    const idx = D.stages.findIndex((s) => s.id === res.status);
    const evt = (id) => (res.events || []).filter((e) => e.status === id).pop();
    const fmt = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    out.innerHTML = `<div class="track-head" style="color:var(--ink)"><div style="min-width:0"><b>${esc(res.book_title)}</b><br><small class="note">${esc(res.book_type || "")}</small></div><span class="code-pill">${esc(res.tracking_code)}</span></div>
      <ol class="timeline">${D.stages.map((s, i) => { const ev = evt(s.id); return `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><div><b>${esc(s.label)}</b><small style="color:inherit;opacity:.75">${ev ? fmt(ev.created_at) + " · " : ""}${esc(ev && ev.note ? ev.note : s.hint)}</small></div></li>`; }).join("")}</ol>`;
  });

  /* ---------- Kirim naskah ---------- */
  $("#submitForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, msg = $("#fMsg"), btn = $("#fBtn");
    if (!f.checkValidity()) { msg.innerHTML = `<div class="alert err">Lengkapi nama, email, WhatsApp, judul, dan tautan naskah (diawali https://).</div>`; f.reportValidity(); return; }
    const p = Object.fromEntries(new FormData(f).entries());
    btn.disabled = true; btn.textContent = "Mengirim…";
    let code = null, err = null;
    if (DEMO) code = "IGV-DEMO";
    else { const r = await sb.rpc("submit_manuscript", { p }); code = r.data; err = r.error; }
    btn.disabled = false; btn.textContent = "Kirim naskah";
    if (err || !code) { console.error(err); msg.innerHTML = `<div class="alert err">Naskah belum terkirim karena gangguan koneksi. Coba lagi, atau kirim melalui WhatsApp ${esc(waDisplay)}.</div>`; return; }
    msg.innerHTML = `<div class="alert ok">${DEMO ? "<b>Mode demo:</b> data belum tersimpan. " : ""}Naskah terkirim. Simpan kode lacak Anda: <span class="code-pill">${esc(code)}</span><br><small class="note">Redaksi menghubungi Anda melalui WhatsApp dalam 2–3 hari kerja.</small></div>`;
    f.reset(); fPkg.value = "profesional";
  });

  loadBooks(); loadCalls();
})();
