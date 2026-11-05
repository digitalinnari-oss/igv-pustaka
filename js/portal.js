(function () {
  "use strict";
  const CFG = window.IGV_CONFIG || {}, D = window.IGV_DATA;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rp = (n) => "Rp" + Math.round(+n || 0).toLocaleString("id-ID");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
  const MAX = 50 * 1024 * 1024;
  const KIND = { naskah: "Naskah", revisi: "Revisi", proof: "Proof redaksi", bukti_bayar: "Bukti bayar", lainnya: "Lainnya" };
  const PAY = { belum: ["Belum dibayar", "warn"], menunggu: ["Menunggu verifikasi", "info"], lunas: ["Lunas", "ok"], ditolak: ["Bukti ditolak", "bad"] };

  let sb = null;
  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const DEMO = !sb;
  let C = D.content, P = D.pricing, user = null, email = "";
  let subs = [], events = {}, payments = {}, files = {}, urls = {};
  const openIds = new Set();

  /* ---------- Teks & identitas ---------- */
  const tx = (s) => String(s ?? "").split("{nama}").join(C.brand.name || "").split("{perusahaan}").join(C.brand.company || "");
  function applySettings() {
    const B = C.brand || {};
    $$("[data-b]").forEach((el) => (el.textContent = B[el.dataset.b] || el.textContent));
    $("#pTitle").textContent = tx((C.portal || {}).title || "Portal Penulis");
    $("#pLead").textContent = tx((C.portal || {}).lead || "");
    const pay = C.payment || {};
    $("#bankName").textContent = pay.bank || ""; $("#bankAcct").textContent = pay.account || "";
    $("#bankHolder").textContent = pay.holder ? "a.n. " + pay.holder : ""; $("#bankNote").textContent = tx(pay.note || "");
    $("#waText").textContent = (B.whatsapp || "").replace(/^62/, "0"); $("#mailText").textContent = B.email || "";
    $$(".yr").forEach((e) => (e.textContent = new Date().getFullYear()));
    const pk = P.packages || [];
    $("#nPkg").innerHTML = pk.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} — ${rp(p.price)}</option>`).join("")
      + `<option value="chapter">Book chapter — ${rp((P.chapter || {}).price)}</option><option value="belum">Belum memilih</option>`;
    const pop = pk.find((p) => p.popular); if (pop) $("#nPkg").value = pop.id;
    document.title = "Portal Penulis · " + (B.name || "");
  }
  $("#copyAcct").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText($("#bankAcct").textContent.replace(/\D/g, "")); b.textContent = "Tersalin"; }
    catch { const r = document.createRange(); r.selectNodeContents($("#bankAcct")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Tekan Ctrl+C"; }
    setTimeout(() => (b.textContent = "Salin"), 1800);
  });

  /* ---------- Masuk / keluar ---------- */
  function showLogin(msg) {
    $("#loginForm").hidden = false; $("#app").hidden = true; $("#logout").hidden = true;
    if (msg) $("#lMsg").innerHTML = msg;
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const em = $("#lEmail").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { $("#lMsg").innerHTML = `<div class="alert err">Tulis alamat email yang lengkap, misalnya nama@kampus.ac.id.</div>`; return; }
    const btn = $("#lBtn"); btn.disabled = true; btn.textContent = "Mengirim…";
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } });
    btn.disabled = false; btn.textContent = "Kirim tautan masuk";
    $("#lMsg").innerHTML = error
      ? `<div class="alert err">Tautan belum terkirim (${esc(error.message)}). Tunggu satu menit lalu coba lagi.</div>`
      : `<div class="alert ok">Tautan masuk sudah dikirim ke <b>${esc(em)}</b>. Buka email Anda (periksa juga folder Spam), lalu klik tautannya dari perangkat ini.</div>`;
  });
  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); user = null; showLogin(""); });

  /* ---------- Memuat data ---------- */
  async function loadAll() {
    if (DEMO) {
      const d = D.demoPortal; email = d.email;
      subs = d.submissions; events = d.events; payments = d.payments; files = d.files; urls = {};
      return;
    }
    const [s, ev, pay, fl] = await Promise.all([
      sb.from("submissions").select("id,tracking_code,book_title,book_type,package,status,status_note,agreed_price,created_at").order("created_at", { ascending: false }),
      sb.from("submission_events").select("submission_id,status,note,created_at").order("created_at"),
      sb.from("payments").select("*").order("seq"),
      sb.from("submission_files").select("*").order("created_at", { ascending: false })
    ]);
    [s, ev, pay, fl].forEach((r) => r.error && console.error(r.error));
    subs = s.data || [];
    const group = (rows) => (rows || []).reduce((m, r) => ((m[r.submission_id] = m[r.submission_id] || []).push(r), m), {});
    events = group(ev.data); payments = group(pay.data); files = group(fl.data);
    const paths = (fl.data || []).map((f) => f.path).filter(Boolean);
    urls = {};
    if (paths.length) {
      const { data } = await sb.storage.from("manuscripts").createSignedUrls(paths, 3600);
      (data || []).forEach((u) => { if (u.signedUrl) urls[u.path] = u.signedUrl; });
    }
  }

  /* ---------- Tampilan ---------- */
  function render() {
    $("#who").textContent = email;
    const allPay = Object.values(payments).flat();
    const due = allPay.filter((p) => p.status === "belum" || p.status === "ditolak").reduce((s, p) => s + p.amount, 0);
    const wait = allPay.filter((p) => p.status === "menunggu").length;
    const active = subs.filter((s) => !["terbit", "ditolak"].includes(s.status)).length;
    $("#stats").innerHTML = `
      <div class="stat"><b class="mono">${subs.length}</b><span>naskah</span></div>
      <div class="stat"><b class="mono">${active}</b><span>dalam proses</span></div>
      <div class="stat"><b class="mono">${rp(due)}</b><span>tagihan belum dibayar${wait ? ` · ${wait} menunggu verifikasi` : ""}</span></div>`;

    if (!subs.length) {
      $("#subs").innerHTML = `<div class="empty">Belum ada naskah dengan email <b>${esc(email)}</b>.<br>Kirim naskah baru, atau hubungi redaksi bila Anda memakai email lain saat mengirim.</div>`;
      return;
    }
    $("#subs").innerHTML = subs.map(card).join("");
  }

  function card(s) {
    const st = D.stages, idx = st.findIndex((x) => x.id === s.status), rejected = s.status === "ditolak";
    const pct = rejected ? 100 : Math.round((Math.max(idx, 0)) / (st.length - 1) * 100);
    const label = rejected ? "Belum dapat diterbitkan" : (st[idx] || {}).label || s.status;
    const pays = payments[s.id] || [], fls = files[s.id] || [], evs = events[s.id] || [];
    const paid = pays.filter((p) => p.status === "lunas").reduce((a, p) => a + p.amount, 0);
    const total = pays.reduce((a, p) => a + p.amount, 0);
    const needs = pays.some((p) => p.status === "belum" || p.status === "ditolak");
    const evt = (id) => evs.filter((e) => e.status === id).pop();

    return `<article class="ms" data-id="${esc(s.id)}">
      <header class="ms-head">
        <div style="min-width:0"><h3>${esc(s.book_title)}</h3>
          <p class="note">${esc(s.book_type || "")} · dikirim ${fmt(s.created_at)} · <span class="mono">${esc(s.tracking_code)}</span></p></div>
        <span class="badge ${rejected ? "bad" : s.status === "terbit" ? "ok" : "info"}">${esc(label)}</span>
      </header>
      <div class="ms-progress" aria-label="Kemajuan ${pct}%"><div class="meter"><i style="width:${pct}%${rejected ? ";background:var(--bad)" : ""}"></i></div>
        <span class="note">Tahap ${Math.max(idx, 0) + 1} dari ${st.length}${!rejected && st[idx + 1] ? ` · berikutnya: ${esc(st[idx + 1].label)}` : ""}</span></div>
      ${s.status_note ? `<p class="callout"><b>Catatan redaksi:</b> ${esc(s.status_note)}</p>` : ""}
      ${needs ? `<p class="callout warn">Ada tagihan yang menunggu pembayaran Anda.</p>` : ""}

      <div class="ms-cols">
        <section>
          <h4>Tagihan${s.agreed_price ? ` <span class="note">· nilai kontrak ${rp(s.agreed_price)}</span>` : ""}</h4>
          ${pays.length ? `<ul class="pay-list">${pays.map((p) => payRow(p)).join("")}</ul>
            <div class="pay-sum"><span>Terbayar ${rp(paid)} dari ${rp(total)}</span><div class="meter"><i style="width:${total ? Math.round(paid / total * 100) : 0}%;background:var(--ok)"></i></div></div>`
            : `<p class="note">Tagihan dibuat redaksi setelah naskah lolos telaah dan kontrak disepakati.</p>`}
        </section>
        <section>
          <h4>Berkas</h4>
          ${fls.length ? `<ul class="file-list">${fls.map((f) => `<li><span class="kind${f.from_admin ? " admin" : ""}">${esc(KIND[f.kind] || f.kind)}</span>
              <span class="fname">${esc(f.name || f.path)}<small class="note">${fmt(f.created_at)}${f.note ? " · " + esc(f.note) : ""}</small></span>
              ${urls[f.path] ? `<a href="${esc(urls[f.path])}" target="_blank" rel="noopener">Unduh</a>` : DEMO ? `<span class="note">contoh</span>` : ""}</li>`).join("")}</ul>`
            : `<p class="note">Belum ada berkas.</p>`}
          ${rejected || s.status === "terbit" ? "" : `<div class="up-rev">
            <label class="lbl" for="rev-${esc(s.id)}">Kirim revisi atau berkas pendukung</label>
            <input type="file" id="rev-${esc(s.id)}" class="rev-file" accept=".doc,.docx,.pdf,.zip,.rar,.jpg,.jpeg,.png">
            <input type="text" class="rev-note" placeholder="Keterangan singkat (opsional)" maxlength="200" aria-label="Keterangan berkas">
            <button class="btn btn-ghost btn-sm rev-btn" type="button">Unggah</button>
            <span class="rev-msg note" aria-live="polite"></span></div>`}
        </section>
      </div>

      <details class="ms-tl"${openIds.has(s.id) ? " open" : ""}><summary>Riwayat tahapan</summary>
        <ol class="timeline">${st.map((x, i) => { const ev = evt(x.id); return `<li class="${!rejected && i < idx ? "done" : i === idx ? "now" : ""}"><div><b>${esc(x.label)}</b><small>${ev ? fmt(ev.created_at) + " · " : ""}${esc(ev && ev.note ? ev.note : x.hint)}</small></div></li>`; }).join("")}</ol>
      </details>
    </article>`;
  }

  function payRow(p) {
    const [lab, cls] = PAY[p.status] || [p.status, "info"];
    const canPay = p.status === "belum" || p.status === "ditolak";
    return `<li class="pay" data-pay="${esc(p.id)}">
      <div class="pay-main"><span>${esc(p.label)}</span><b class="mono">${rp(p.amount)}</b></div>
      <div class="pay-meta"><span class="badge ${cls}">${lab}</span>${p.status === "lunas" && p.verified_at ? `<span class="note">diverifikasi ${fmt(p.verified_at)}</span>` : p.paid_at ? `<span class="note">dikirim ${fmt(p.paid_at)}</span>` : ""}</div>
      ${p.status === "ditolak" && p.admin_note ? `<p class="note" style="color:var(--bad)">${esc(p.admin_note)}</p>` : ""}
      ${canPay ? `<div class="pay-up"><label class="btn btn-primary btn-sm file-btn">Unggah bukti transfer<input type="file" class="pay-file" accept="image/*,.pdf"></label><span class="pay-msg note" aria-live="polite"></span></div>` : ""}
    </li>`;
  }

  /* ---------- Unggah ---------- */
  async function upload(file) {
    if (file.size > MAX) throw new Error("Ukuran berkas maksimal 50 MB.");
    if (DEMO) return "demo/" + file.name;
    const safe = file.name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-90);
    const path = `${user.id}/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from("manuscripts").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error("Unggahan gagal: " + error.message);
    return path;
  }
  async function refresh() { await loadAll(); render(); }

  $("#subs").addEventListener("toggle", (e) => {
    const art = e.target.closest(".ms"); if (!art || !e.target.matches(".ms-tl")) return;
    e.target.open ? openIds.add(art.dataset.id) : openIds.delete(art.dataset.id);
  }, true);

  $("#subs").addEventListener("change", async (e) => {
    const inp = e.target.closest(".pay-file"); if (!inp || !inp.files[0]) return;
    const li = inp.closest(".pay"), msg = $(".pay-msg", li), file = inp.files[0];
    msg.textContent = "Mengunggah…";
    try {
      const path = await upload(file);
      if (DEMO) {
        const p = Object.values(payments).flat().find((x) => x.id === li.dataset.pay);
        p.status = "menunggu"; p.paid_at = new Date().toISOString();
        const sid = li.closest(".ms").dataset.id; (files[sid] = files[sid] || []).unshift({ id: "x" + Date.now(), kind: "bukti_bayar", name: file.name, created_at: new Date().toISOString() });
        render(); return;
      }
      const { error } = await sb.rpc("author_pay", { p_payment: li.dataset.pay, p_path: path, p_name: file.name });
      if (error) throw new Error(error.message);
      await refresh();
    } catch (err) { msg.textContent = err.message; msg.style.color = "var(--bad)"; inp.value = ""; }
  });

  $("#subs").addEventListener("click", async (e) => {
    const b = e.target.closest(".rev-btn"); if (!b) return;
    const box = b.closest(".up-rev"), sid = b.closest(".ms").dataset.id, msg = $(".rev-msg", box);
    const file = $(".rev-file", box).files[0], note = $(".rev-note", box).value.trim();
    if (!file) { msg.textContent = "Pilih berkas terlebih dahulu."; return; }
    b.disabled = true; msg.textContent = "Mengunggah…"; msg.style.color = "";
    try {
      const path = await upload(file);
      if (DEMO) { (files[sid] = files[sid] || []).unshift({ id: "x" + Date.now(), kind: "revisi", name: file.name, note, created_at: new Date().toISOString() }); render(); return; }
      const { error } = await sb.rpc("author_add_file", { p_submission: sid, p_kind: "revisi", p_path: path, p_name: file.name, p_note: note });
      if (error) throw new Error(error.message);
      await refresh();
    } catch (err) { msg.textContent = err.message; msg.style.color = "var(--bad)"; b.disabled = false; }
  });

  /* ---------- Naskah baru ---------- */
  const newForm = $("#newForm");
  $("#newBtn").addEventListener("click", () => { newForm.hidden = false; newForm.scrollIntoView({ behavior: "smooth", block: "start" }); $("#nName").focus({ preventScroll: true }); });
  $("#newClose").addEventListener("click", () => { newForm.hidden = true; });
  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#nMsg"), btn = $("#nBtn"), file = $("#nFile").files[0];
    if (!newForm.checkValidity() || !file) { msg.innerHTML = `<div class="alert err">Lengkapi nama, WhatsApp, judul, dan pilih file naskah.</div>`; newForm.reportValidity(); return; }
    const p = Object.fromEntries(new FormData(newForm).entries());
    btn.disabled = true; btn.textContent = "Mengunggah naskah…";
    try {
      const path = await upload(file);
      let code = "IGV-DEMO";
      if (!DEMO) {
        const r = await sb.rpc("submit_manuscript", { p: { ...p, email, manuscript_path: path, manuscript_name: file.name } });
        if (r.error) throw new Error(r.error.message);
        code = r.data;
      }
      msg.innerHTML = `<div class="alert ok">${DEMO ? "<b>Mode demo:</b> naskah tidak benar-benar dikirim. " : ""}Naskah terkirim dengan kode <span class="code-pill">${esc(code)}</span>. Redaksi menghubungi Anda dalam 2–3 hari kerja.</div>`;
      newForm.reset(); applySettings();
      if (!DEMO) await refresh();
    } catch (err) { msg.innerHTML = `<div class="alert err">${esc(err.message)}</div>`; }
    btn.disabled = false; btn.textContent = "Kirim naskah";
  });

  /* ---------- Mulai ---------- */
  async function start(session) {
    user = session.user; email = (user.email || "").toLowerCase();
    $("#loginForm").hidden = true; $("#app").hidden = false; $("#logout").hidden = false;
    $("#subs").innerHTML = `<p class="note">Memuat naskah…</p>`;
    await refresh();
  }

  (async function init() {
    if (sb) {
      const { data } = await sb.from("site_settings").select("key,value");
      (data || []).forEach((r) => { if (r.key === "content") C = D.merge(D.content, r.value); if (r.key === "pricing") P = D.merge(D.pricing, r.value); });
    }
    applySettings();
    if (DEMO) {
      $("#demoBanner").hidden = false; $("#app").hidden = false;
      await loadAll(); render(); return;
    }
    let started = false;
    sb.auth.onAuthStateChange((_ev, session) => {
      if (session && !started) { started = true; start(session); }
      if (!session) { started = false; }
    });
    const { data: { session } } = await sb.auth.getSession();
    if (session) { if (!started) { started = true; start(session); } }
    else showLogin("");
  })();
})();
