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
    loadSubs(); loadBooks(); loadCalls();
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $("#lEmail").value, password: $("#lPass").value });
    if (error) { $("#lMsg").innerHTML = `<div class="alert err">Email atau kata sandi salah.</div>`; return; }
    $("#lMsg").innerHTML = ""; boot();
  });
  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); boot(); });

  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    $$(".tab").forEach((x) => { x.setAttribute("aria-selected", x === t); $("#" + x.dataset.p).hidden = x !== t; });
  }));

  /* Naskah */
  let subs = [];
  async function loadSubs() {
    const { data, error } = await sb.from("submissions").select("*").order("created_at", { ascending: false });
    if (error) return console.error(error);
    subs = data; renderSubs();
  }
  function renderSubs() {
    const q = $("#sSearch").value.toLowerCase(), f = $("#sFilter").value;
    const list = subs.filter((s) => (!f || s.status === f) && (!q || [s.tracking_code, s.full_name, s.book_title, s.institution].join(" ").toLowerCase().includes(q)));
    $("#sRows").innerHTML = list.map((s) => `<tr data-id="${s.id}">
      <td class="mono">${esc(s.tracking_code)}<br><small class="note">${new Date(s.created_at).toLocaleDateString("id-ID")}</small></td>
      <td style="min-width:240px"><b>${esc(s.book_title)}</b><br>${esc(s.full_name)} · ${esc(s.institution || "-")}<br><small class="note">${esc(s.email)} · WA ${esc(s.whatsapp)}</small><br><a href="${esc(s.manuscript_url)}" target="_blank" rel="noopener">Buka naskah</a>${s.notes ? `<br><small class="note">${esc(s.notes)}</small>` : ""}</td>
      <td><span class="pill">${esc(s.package || "-")}</span><br><small class="note">${esc(s.book_type || "")}${s.pages_estimate ? " · " + s.pages_estimate + " hlm" : ""}</small></td>
      <td style="min-width:200px"><select class="st">${opts(s.status)}</select><input class="nt" placeholder="Catatan untuk penulis (tampil di Lacak)" value="${esc(s.status_note || "")}" style="margin-top:6px"></td>
      <td><button class="btn btn-primary btn-sm sv" type="button">Simpan</button></td></tr>`).join("") || `<tr><td colspan="5" class="note">Belum ada naskah.</td></tr>`;
  }
  $("#sSearch").addEventListener("input", renderSubs); $("#sFilter").addEventListener("change", renderSubs);
  $("#sRows").addEventListener("click", async (e) => {
    const b = e.target.closest(".sv"); if (!b) return;
    const tr = b.closest("tr");
    b.disabled = true; b.textContent = "Menyimpan…";
    const { error } = await sb.from("submissions").update({ status: tr.querySelector(".st").value, status_note: tr.querySelector(".nt").value || null }).eq("id", tr.dataset.id);
    b.disabled = false; b.textContent = error ? "Gagal, coba lagi" : "Tersimpan";
    if (!error) { setTimeout(() => (b.textContent = "Simpan"), 1500); loadSubs(); }
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

  boot();
})();
