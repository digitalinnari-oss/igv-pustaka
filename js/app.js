(function () {
  "use strict";
  const CFG = window.IGV_CONFIG || {};
  const D = window.IGV_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rp = (n) => "Rp" + Math.round(+n || 0).toLocaleString("id-ID");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Pengaturan aktif: bawaan dari data.js, ditimpa isi tabel site_settings */
  let P = D.pricing, C = D.content, B = C.brand;
  const tx = (s) => String(s ?? "").split("{nama}").join(B.name || "").split("{perusahaan}").join(B.company || "");
  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- Supabase ---------- */
  let sb = null;
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
    try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { console.error(e); }
  }
  const DEMO = !sb;
  const state = { cover: "soft", color: "bw", role: "utama" };
  const unitTxt = { flat: "", page: " / halaman", item: " / item" };
  const ICONS = [
    '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>',
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2 1-4 4-4"/>',
    '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>'
  ];

  /* ================= RENDER KONTEN ================= */
  let heroTouched = false;
  function renderLayout() {
    const L = C.layout || {}, secs = (L.sections || []).filter((x) => x && document.getElementById(x.id));
    ((D.content.layout || {}).sections || []).forEach((d) => { if (!secs.some((x) => x.id === d.id)) secs.push(d); });
    const main = $("main");
    secs.forEach((x) => { const el = document.getElementById(x.id); main.appendChild(el); el.hidden = !x.show; });
    const shown = secs.filter((x) => x.show);
    const nav = shown.filter((x) => x.id !== "kirim").map((x) => `<li><a href="#${esc(x.id)}">${esc(tx(x.label))}</a></li>`);
    if (L.portalLink !== false) nav.push(`<li><a href="penulis.html">${esc(tx(L.portalLabel || "Portal Penulis"))}</a></li>`);
    const kirim = shown.find((x) => x.id === "kirim");
    if (kirim) nav.push(`<li><a class="btn btn-primary btn-sm" href="#kirim">${esc(tx(kirim.label))}</a></li>`);
    $("#navLinks").innerHTML = nav.join("");
    const foot = shown.filter((x) => x.id !== "kirim").slice(0, 5).map((x) => `<li><a href="#${esc(x.id)}">${esc(tx(x.label))}</a></li>`);
    if (L.portalLink !== false) foot.push(`<li><a href="penulis.html">${esc(tx(L.portalLabel || "Portal Penulis"))}</a></li>`);
    foot.push(`<li><a href="admin.html">Masuk redaksi</a></li>`);
    $("#footLinks").innerHTML = foot.join("");
    $$(".hero .btn-row a[href='#kirim']").forEach((a) => (a.hidden = !kirim));
    $$(".hero .btn-row a[href='#studio']").forEach((a) => (a.hidden = !shown.some((x) => x.id === "studio")));
    setupSpy();
  }

  function renderContent() {
    B = C.brand || {};
    D.applyLook(C);
    renderLayout();
    $$("[data-b]").forEach((el) => { el.textContent = B[el.dataset.b] || ""; });
    $$("[data-c]").forEach((el) => { el.textContent = tx(get(C, el.dataset.c)); });
    $$("[data-sec]").forEach((el) => {
      const s = (C.sections || {})[el.dataset.sec] || {};
      el.innerHTML = `${s.eyebrow ? `<span class="eyebrow">${esc(tx(s.eyebrow))}</span>` : ""}<h2>${esc(tx(s.title))}</h2>${s.lead ? `<p class="lead">${esc(tx(s.lead))}</p>` : ""}`;
    });
    const h = C.hero || {};
    $("#heroH1").innerHTML = esc(tx(h.title)).replace(/\*(.+?)\*/g, "<em>$1</em>");
    $("#heroFacts").innerHTML = (h.facts || []).map((f) => `<span>${esc(tx(f))}</span>`).join("");
    if (!heroTouched) { $("#heroTitle").value = h.sampleTitle || ""; $("#heroAuthor").value = h.sampleAuthor || ""; syncHero(); }
    $("#kdtCity").textContent = (B.address || "Jakarta").split(",")[0];

    const pf = C.profil || {};
    $("#profilParas").innerHTML = (pf.paragraphs || []).map((p) => `<p class="lead">${esc(tx(p))}</p>`).join("");
    $("#profilMisi").innerHTML = (pf.misi || []).map((m) => `<li>${esc(tx(m))}</li>`).join("");
    $("#whyGrid").innerHTML = ((C.why || {}).items || []).map((it, i) => `
      <article class="card"><span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[i % ICONS.length]}</svg></span><h3>${esc(tx(it.title))}</h3><p>${esc(tx(it.text))}</p></article>`).join("");
    $("#layananGrid").innerHTML = ((C.layanan || {}).items || []).map((it) => `
      <article class="card">${it.tag ? `<span class="tag">${esc(tx(it.tag))}</span>` : ""}<h3>${esc(tx(it.title))}</h3><p>${esc(tx(it.text))}</p></article>`).join("");
    const steps = (C.alur || {}).steps || [];
    $("#alurList").innerHTML = steps.map((s) => `<li><b>${esc(tx(s.title))}</b><span>${esc(tx(s.text))}</span></li>`).join("");
    $("#alurList").style.gridTemplateColumns = window.innerWidth > 960 ? `repeat(${Math.min(Math.max(steps.length, 1), 6)},minmax(0,1fr))` : "";
    $("#faqList").innerHTML = (C.faq || []).map((f) => `<details><summary>${esc(tx(f.q))}</summary><p>${esc(tx(f.a))}</p></details>`).join("");

    $("#waText").textContent = (B.whatsapp || "").replace(/^62/, "0");
    $("#mailText").textContent = B.email || "";
    $("#waFloat").href = "https://wa.me/" + (B.whatsapp || "") + "?text=" + encodeURIComponent("Halo " + (B.name || "") + ", saya ingin konsultasi penerbitan buku.");
    const ik = $("#ikapiLine"); ik.textContent = B.ikapi ? "Anggota IKAPI No. " + B.ikapi : ""; ik.hidden = !B.ikapi;
    if (B.name) document.title = B.name;
  }

  /* ================= RENDER HARGA ================= */
  function unitPrint(pages, cover, color) {
    const pr = P.print || {};
    const u = (+pr.base || 0) + pages * (color === "color" ? +pr.perPageColor || 0 : +pr.perPageBW || 0) + (cover === "hard" ? +pr.hardcover || 0 : 0);
    return Math.ceil(u / 500) * 500;
  }
  function instTimes() { const i = P.installment || {}; return Math.max(1, ((i.stages || []).length) || +i.times || 1); }
  function renderPricing() {
    const pk = P.packages || [], inst = P.installment || { note: "" }, times = instTimes();
    $("#plans").innerHTML = pk.map((p) => `
      <article class="plan${p.popular ? " popular" : ""}">
        ${p.popular ? '<span class="ribbon">Paling banyak dipilih</span>' : ""}
        <h3>${esc(p.name)}</h3>
        <p class="note">${esc(tx(p.fit))}</p>
        <div class="price mono">${rp(p.price)}<br><small>per judul · s.d. ${esc(p.maxPages)} halaman</small></div>
        <ul>${(p.features || []).map((f) => `<li>${esc(tx(f))}</li>`).join("")}</ul>
        <p class="meta">Waktu proses: ${esc(p.days)}${times > 1 ? `<br>Cicilan ${times}× ${rp(p.price / times)}` : ""}</p>
        <a class="btn ${p.popular ? "btn-primary" : "btn-ghost"}" href="#kirim" data-pick="${esc(p.id)}">Pilih ${esc(p.name)}</a>
      </article>`).join("");
    $("#plans").style.gridTemplateColumns = window.innerWidth > 960 ? `repeat(${Math.min(Math.max(pk.length, 1), 4)},minmax(0,1fr))` : "";
    const ch = P.chapter || {};
    $("#chapterPlan").innerHTML = `<h3>Book Chapter</h3>
      <div class="price mono">${rp(ch.price)}<br><small>per penulis per bab</small></div>
      <ul>${(ch.features || []).map((f) => `<li>${esc(tx(f))}</li>`).join("")}</ul>
      <a class="btn btn-ghost" href="#call">Lihat tema yang dibuka</a>`;
    $("#addonTable").innerHTML = (P.addons || []).map((a) => `<tr><td>${esc(a.name)}</td><td class="num">${rp(a.price)}${unitTxt[a.unit] || ""}</td></tr>`).join("")
      + `<tr><td>Cetak tambahan (softcover, hitam-putih)</td><td class="num">mulai ${rp(unitPrint(100, "soft", "bw"))} / eks</td></tr>`;
    $("#installNote").textContent = tx(inst.note) + " Harga dapat berubah; harga final tercantum di kontrak.";

    const keepC = $("#cPkg").value, keepF = $("#fPkg").value;
    const opts = pk.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} — ${rp(p.price)}</option>`).join("");
    $("#cPkg").innerHTML = opts;
    $("#fPkg").innerHTML = opts + `<option value="chapter">Book chapter — ${rp(ch.price)}</option><option value="belum">Belum memilih</option>`;
    const def = (pk.find((p) => p.popular) || pk[0] || {}).id;
    $("#cPkg").value = pk.some((p) => p.id === keepC) ? keepC : def;
    $("#fPkg").value = keepF && $(`#fPkg option[value="${CSS.escape(keepF)}"]`) ? keepF : def;
    $("#cAddons").innerHTML = (P.addons || []).map((a) => `
      <label class="check" data-id="${esc(a.id)}"><input type="checkbox" value="${esc(a.id)}"><span>${esc(a.name)}<br><small class="inc"></small></span><small class="mono">${rp(a.price)}${unitTxt[a.unit] || ""}</small></label>`).join("");
  }

  /* ================= KALKULATOR ================= */
  let lastCalc = null;
  function calc() {
    const p = (P.packages || []).find((x) => x.id === $("#cPkg").value);
    if (!p) return;
    const pages = Math.max(49, Math.min(900, +$("#cPages").value || 0));
    const copies = Math.max(0, Math.min(2000, Math.floor(+$("#cCopies").value || 0)));
    const inc = p.includes || [];
    const rows = [[`Paket ${p.name} (termasuk ${p.copies} eks)`, +p.price]];
    if (pages > p.maxPages) rows.push([`Layout ${pages - p.maxPages} halaman di atas batas paket`, (pages - p.maxPages) * (+P.print.extraLayoutPerPage || 0)]);
    const extra = Math.max(0, copies - p.copies);
    const u = unitPrint(pages, state.cover, state.color);
    if (extra) rows.push([`Cetak tambahan ${extra} eks × ${rp(u)}`, extra * u]);
    const diff = u - unitPrint(pages, "soft", "bw");
    if (diff > 0 && p.copies) {
      const spec = [state.cover === "hard" ? "hardcover" : "", state.color === "color" ? "isi berwarna" : ""].filter(Boolean).join(" & ");
      rows.push([`Selisih ${spec} untuk ${p.copies} eks dalam paket`, diff * p.copies]);
    }
    const chosen = [];
    $$("#cAddons .check").forEach((lab) => {
      const id = lab.dataset.id, a = (P.addons || []).find((x) => x.id === id), inp = $("input", lab);
      const isInc = inc.includes(id);
      lab.classList.toggle("included", isInc); inp.disabled = isInc; if (isInc) inp.checked = true;
      $(".inc", lab).textContent = isInc ? "Sudah termasuk paket" : "";
      if (inp.checked && !isInc) { rows.push([a.name, a.unit === "page" ? a.price * pages : +a.price]); chosen.push(a.name); }
    });
    const total = rows.reduce((s, r) => s + r[1], 0);
    const times = instTimes();
    $("#cRows").innerHTML = rows.map((r) => `<div class="row"><span>${esc(r[0])}</span><span>${rp(r[1])}</span></div>`).join("");
    $("#cTotal").textContent = rp(total); $("#cBig").textContent = rp(total);
    $("#cInstall").textContent = times > 1 ? `Atau cicil ${times}× sekitar ${rp(total / times)} per tahap.` : "";
    lastCalc = { p, pages, copies, total, chosen };
  }

  /* ================= ANGKA KREDIT ================= */
  function renderAK() {
    const keep = $("#akType").value;
    $("#akType").innerHTML = (C.credit || []).map((t) => `<option value="${esc(t.id)}">${esc(t.label)} (maks ${esc(t.max)})</option>`).join("");
    if ((C.credit || []).some((t) => t.id === keep)) $("#akType").value = keep;
  }
  function ak() {
    const t = (C.credit || []).find((x) => x.id === $("#akType").value);
    if (!t) return;
    const n = Math.max(1, Math.min(20, Math.floor(+$("#akN").value || 1)));
    let shares, mine = 0, explain;
    if (n === 1) { shares = [1]; explain = "Penulis tunggal memperoleh seluruh angka kredit."; }
    else if (state.role === "setara") { shares = Array(n).fill(1 / n); explain = `Tanpa penulis utama, nilai dibagi rata kepada ${n} penulis.`; }
    else { shares = [0.6, ...Array(n - 1).fill(0.4 / (n - 1))]; mine = state.role === "utama" ? 0 : 1; explain = `Penulis utama 60%, sisa 40% dibagi kepada ${n - 1} penulis anggota.`; }
    const val = t.max * shares[mine];
    $("#akBig").textContent = val.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " AK";
    $("#akMax").textContent = `${t.label}: nilai maksimum ${t.max} angka kredit per judul.`;
    $("#akSplit").innerHTML = shares.map((s, i) => `<span class="${i === mine ? "me" : ""}" style="flex:${s}" title="${(s * 100).toFixed(0)}%">${i === mine ? "Anda" : n <= 6 ? (s * 100).toFixed(0) + "%" : ""}</span>`).join("");
    $("#akExplain").textContent = explain + " Ini perkiraan nilai maksimum; tim penilai dapat memberi nilai lebih rendah sesuai mutu karya.";
  }

  /* ================= KESIAPAN NASKAH ================= */
  function renderReady() {
    $("#rList").innerHTML = (C.readiness || []).map((r) => `<label class="check"><input type="checkbox" value="${esc(r.id)}"><span>${esc(tx(r.text))}</span><small></small></label>`).join("");
  }
  function ready() {
    const list = C.readiness || [];
    const totalW = list.reduce((s, r) => s + (+r.w || 0), 0) || 1;
    const on = $$("#rList input:checked").map((i) => i.value);
    const score = Math.round(list.filter((r) => on.includes(r.id)).reduce((s, r) => s + (+r.w || 0), 0) / totalW * 100);
    $("#rScore").textContent = score + "%"; $("#rBar").style.width = score + "%";
    const missing = list.filter((r) => !on.includes(r.id));
    $("#rMsg").textContent = score >= 85 ? "Naskah Anda tampak siap. Kirim untuk telaah redaksi."
      : score >= 55 ? `Hampir siap. Lengkapi dulu: ${missing.slice(0, 2).map((m) => tx(m.text).split(";")[0].replace(/\.$/, "").toLowerCase()).join("; ")}.`
      : "Masih perlu persiapan. Paket dengan editing berat atau layanan konversi naskah dapat membantu menata ulang naskah Anda.";
  }

  function renderAll() { renderContent(); renderPricing(); renderAK(); renderReady(); calc(); ak(); ready(); }

  /* ================= INTERAKSI (dipasang sekali) ================= */
  function syncHero() {
    const t = $("#heroTitle").value.trim() || "Judul Naskah Anda", a = $("#heroAuthor").value.trim() || "Nama Penulis";
    $("#coverTitle").textContent = t; $("#kdtTitle").textContent = t;
    $("#coverAuthor").textContent = a; $("#kdtAuthor").textContent = a; $("#kdtAuthor2").textContent = a;
  }
  ["#heroTitle", "#heroAuthor"].forEach((s) => $(s).addEventListener("input", () => { heroTouched = true; syncHero(); }));
  $$(".yr").forEach((e) => (e.textContent = new Date().getFullYear()));
  $("#modeLine").textContent = DEMO ? "Mode demo: data belum terhubung ke Supabase" : "";
  $("#trackHint").hidden = !DEMO;

  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const el = $("#" + b.dataset.copy);
    try { await navigator.clipboard.writeText(el.textContent); b.textContent = "Tersalin"; }
    catch { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Tekan Ctrl+C"; }
    setTimeout(() => (b.textContent = "Salin"), 1800);
  }));

  const menuBtn = $("#menuBtn"), links = $("#navLinks");
  menuBtn.addEventListener("click", () => { const open = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open); });
  links.addEventListener("click", (e) => { if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  let spy = null;
  function setupSpy() {
    if (!("IntersectionObserver" in window)) return;
    if (spy) spy.disconnect();
    const map = new Map($$(".nav-links a[href^='#']").map((a) => [a.getAttribute("href").slice(1), a]));
    spy = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting && map.has(en.target.id)) { map.forEach((a) => a.classList.remove("active")); map.get(en.target.id).classList.add("active"); }
    }), { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { renderContent(); renderPricing(); calc(); }, 200); });

  function segBind(id, key, cb) {
    $$("#" + id + " button").forEach((b) => b.addEventListener("click", () => {
      $$("#" + id + " button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      state[key] = b.dataset.v; cb();
    }));
  }
  segBind("cCover", "cover", calc); segBind("cColor", "color", calc); segBind("akRole", "role", ak);
  ["#cPkg", "#cPages", "#cCopies"].forEach((s) => $(s).addEventListener("input", calc));
  $("#cAddons").addEventListener("change", calc);
  $("#akType").addEventListener("input", ak); $("#akN").addEventListener("input", ak);
  $("#rList").addEventListener("change", ready);

  const goForm = () => { location.hash = "#kirim"; $("#fName").focus({ preventScroll: true }); };
  $("#cApply").addEventListener("click", () => {
    const c = lastCalc; if (!c) return;
    $("#fPkg").value = c.p.id; $("#fPages").value = c.pages;
    $("#fNotes").value = `Estimasi kalkulator: paket ${c.p.name}, ${c.pages} hlm, ${c.copies} eks, ${state.cover === "hard" ? "hardcover" : "softcover"}, isi ${state.color === "color" ? "berwarna" : "hitam-putih"}${c.chosen.length ? ", tambahan: " + c.chosen.join(", ") : ""}. Total ${rp(c.total)}.`;
    goForm();
  });
  $("#plans").addEventListener("click", (e) => { const a = e.target.closest("[data-pick]"); if (a) $("#fPkg").value = a.dataset.pick; });

  const tabs = $$(".tab");
  function selectTab(t) { tabs.forEach((x) => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = !on; }); }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; selectTab(n); n.focus(); }
    });
  });

  /* ================= KATALOG ================= */
  let books = [], cat = "Semua";
  const coverHTML = (b) => `<div class="cover" style="--c:${esc(b.cover_color || "#0F4C45")}">
      <span class="c-type">${esc(b.book_type || "")}</span><span class="c-title">${esc(b.title)}</span>
      <span class="c-author">${esc(b.authors)}</span><span class="c-pub">${esc(B.name || "")}</span></div>`;
  function renderBooks() {
    const q = $("#catSearch").value.trim().toLowerCase();
    const list = books.filter((b) => (cat === "Semua" || b.category === cat) && (!q || [b.title, b.authors, b.isbn].join(" ").toLowerCase().includes(q)));
    $("#books").innerHTML = list.length ? list.map((b) => `
      <article class="book">${b.cover_url ? `<img src="${esc(b.cover_url)}" alt="Sampul ${esc(b.title)}" loading="lazy" style="aspect-ratio:155/230;object-fit:cover;border-radius:3px 8px 8px 3px">` : coverHTML(b)}
        <h3>${esc(b.title)}</h3><p>${esc(b.authors)} · ${esc(b.year || "")}${b.pages ? " · " + b.pages + " hlm" : ""}</p>
        ${b.isbn ? `<span class="isbn">ISBN ${esc(b.isbn)}</span>` : ""}
        ${b.buy_url ? `<a class="btn btn-ghost btn-sm" href="${esc(b.buy_url)}" target="_blank" rel="noopener">Beli / lihat</a>` : ""}
      </article>`).join("") : `<div class="empty">Belum ada buku yang cocok.</div>`;
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

  /* ================= CALL FOR CHAPTER ================= */
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
        <div style="display:grid;gap:8px;justify-items:start"><span class="mono">${rp(c.fee || (P.chapter || {}).price)}</span><button class="btn btn-primary btn-sm" type="button" data-join="${esc(c.id)}">Daftar bab</button></div>
      </article>`;
    }).join("") : `<div class="empty">Belum ada call for chapter yang dibuka. Pantau halaman ini atau hubungi kami untuk mengusulkan tema.</div>`;
  }
  $("#calls").addEventListener("click", (e) => {
    const b = e.target.closest("[data-join]"); if (!b) return;
    const c = calls.find((x) => String(x.id) === b.dataset.join);
    $("#fType").value = "Book chapter"; $("#fPkg").value = "chapter"; $("#fCall").value = c.id;
    $("#fNotes").value = `Mendaftar book chapter tema: ${c.title}`;
    goForm();
  });

  /* ================= LACAK ================= */
  $("#trackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("#trackCode").value.trim().toUpperCase(), out = $("#trackResult");
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
    if (!res) { out.innerHTML = `<div class="track-head" style="color:var(--ink)">Kode <b class="mono">${esc(code)}</b> tidak ditemukan. Periksa kembali kode di pesan konfirmasi Anda.</div>`; return; }
    const idx = D.stages.findIndex((s) => s.id === res.status);
    const evt = (id) => (res.events || []).filter((x) => x.status === id).pop();
    const fmt = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const rejected = res.status === "ditolak";
    out.innerHTML = `<div class="track-head" style="color:var(--ink)"><div style="min-width:0"><b>${esc(res.book_title)}</b><br><small class="note">${esc(res.book_type || "")}</small></div><span class="code-pill">${esc(res.tracking_code)}</span></div>
      ${rejected ? `<div class="track-head" style="color:var(--ink)">Naskah belum dapat diterbitkan. ${esc((evt("ditolak") || {}).note || "Redaksi akan menghubungi Anda dengan catatan perbaikan.")}</div>` : ""}
      <ol class="timeline">${D.stages.map((s, i) => { const ev = evt(s.id); return `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><div><b>${esc(s.label)}</b><small style="color:inherit;opacity:.75">${ev ? fmt(ev.created_at) + " · " : ""}${esc(ev && ev.note ? ev.note : s.hint)}</small></div></li>`; }).join("")}</ol>
      <p style="margin-top:4px"><a class="btn btn-foil btn-sm" href="penulis.html">Lihat tagihan & kirim revisi di Portal Penulis</a></p>`;
  });

  /* ================= KIRIM NASKAH ================= */
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
    if (err || !code) { console.error(err); msg.innerHTML = `<div class="alert err">Naskah belum terkirim karena gangguan koneksi. Coba lagi, atau kirim melalui WhatsApp ${esc($("#waText").textContent)}.</div>`; return; }
    msg.innerHTML = `<div class="alert ok">${DEMO ? "<b>Mode demo:</b> data belum tersimpan. " : ""}Naskah terkirim. Simpan kode lacak Anda: <span class="code-pill">${esc(code)}</span><br><small class="note">Redaksi menghubungi Anda melalui WhatsApp dalam 2–3 hari kerja.</small></div>`;
    f.reset(); renderPricing();
  });

  /* ================= MULAI ================= */
  renderAll();
  loadBooks(); loadCalls();
  if (sb) {
    sb.from("site_settings").select("key,value").then(({ data, error }) => {
      if (error) return console.error(error);
      (data || []).forEach((r) => {
        if (r.key === "pricing") P = D.merge(D.pricing, r.value);
        if (r.key === "content") C = D.merge(D.content, r.value);
      });
      renderAll(); renderBooks(); loadCalls();
    });
  }
})();
