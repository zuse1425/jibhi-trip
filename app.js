/* Jibhi trip app — vanilla JS, Supabase for live sync, localStorage for offline. */
(function () {
  "use strict";
  const C = window.TRIP_CONFIG;
  const TRIP = C.TRIP_ID;
  const LS_CACHE = "jt-cache-" + TRIP, LS_OUT = "jt-outbox-" + TRIP, LS_SEEN = "jt-seen-" + TRIP;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));

  // ---------------- state ----------------
  let S = { days: [], stops: [], suggestions: [], votes: [], comments: [], messages: [], members: [] };
  let sb = null, uid = null, myName = null, joined = false, online = navigator.onLine, editMode = false, tab = "plan", sugFilter = "open";
  let outbox = JSON.parse(localStorage.getItem(LS_OUT) || "[]");

  function saveCache() { try { localStorage.setItem(LS_CACHE, JSON.stringify(S)); } catch (e) {} }
  function loadCache() { try { const c = JSON.parse(localStorage.getItem(LS_CACHE)); if (c && c.stops) { S = Object.assign(S, c); return true; } } catch (e) {} return false; }

  // ---------------- maps helpers ----------------
  const search = (q, pid) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q) + (pid ? "&query_place_id=" + pid : "");
  const dir = (q, pid) => "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(q) + (pid ? "&destination_place_id=" + pid : "");
  const isUrl = (s) => /^https?:\/\//i.test(s || "");
  function mapLink(r) { if (isUrl(r.map_url)) return r.map_url; const q = r.q || [r.name || r.title, r.area].filter(Boolean).join(" "); return q ? search(q, r.pid) : null; }
  function goLink(r) { if (isUrl(r.map_url)) return r.map_url; const q = r.q || [r.name || r.title, r.area].filter(Boolean).join(" "); return q ? dir(q, r.pid) : null; }
  const A = (label, url, cls) => url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : "";

  // ---------------- time ----------------
  const ts = (date, t) => Date.parse(`${date}T${t}:00${C.TZ_OFFSET}`);
  function disp(t) { const [h, m] = t.split(":").map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, "0")}<small>${h < 12 ? "am" : "pm"}</small>`; }
  const fmtClock = (ms) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const fmtDay = (ms) => new Date(ms).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  function ago(iso) { const d = (Date.now() - Date.parse(iso)) / 60000; if (d < 1) return "now"; if (d < 60) return Math.round(d) + "m"; if (d < 1440) return Math.round(d / 60) + "h"; return fmtDay(Date.parse(iso)); }
  const nameOf = (id) => (S.members.find((m) => m.user_id === id) || {}).name || "Someone";

  // ---------------- writes (optimistic + outbox) ----------------
  function applyLocal(op) {
    const list = S[op.table];
    if (op.kind === "upsert") {
      const key = op.table === "votes" ? (r) => r.suggestion_id === op.row.suggestion_id && r.user_id === op.row.user_id : (r) => r.id === op.row.id;
      const i = list.findIndex(key);
      if (i >= 0) list[i] = Object.assign({}, list[i], op.row); else list.push(Object.assign({}, op.row));
    } else if (op.kind === "update") {
      const r = list.find((x) => x.id === op.match.id); if (r) Object.assign(r, op.row);
    } else if (op.kind === "delete") {
      S[op.table] = list.filter((r) => !Object.keys(op.match).every((k) => r[k] === op.match[k]));
    }
  }
  function write(op) { applyLocal(op); outbox.push(op); localStorage.setItem(LS_OUT, JSON.stringify(outbox)); saveCache(); render(); flush(); }
  let flushing = false;
  async function flush() {
    if (flushing || !sb || !joined || !navigator.onLine) return updateSync();
    flushing = true;
    while (outbox.length) {
      const op = outbox[0];
      let res;
      try {
        const t = sb.from(op.table);
        if (op.kind === "upsert") res = await t.upsert(op.row, op.table === "votes" ? { onConflict: "suggestion_id,user_id" } : undefined);
        else if (op.kind === "update") res = await t.update(op.row).match(op.match);
        else if (op.kind === "delete") res = await t.delete().match(op.match);
      } catch (e) { break; } // network: retry later
      if (res && res.error) {
        if (/fetch|network|Failed/i.test(res.error.message || "")) break;
        toast("Couldn't save: " + res.error.message);
      }
      outbox.shift(); localStorage.setItem(LS_OUT, JSON.stringify(outbox));
    }
    flushing = false; updateSync();
  }

  // ---------------- connect ----------------
  async function connect() {
    if (!window.supabase || !C.SUPABASE_URL) return;
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      if (!navigator.onLine) return;
      const r = await sb.auth.signInAnonymously();
      if (r.error) { toast("Sign-in failed: " + r.error.message); return; }
      session = r.data.session;
    }
    uid = session.user.id;
    const { data: me, error } = await sb.from("members").select("*").eq("trip_id", TRIP).eq("user_id", uid).maybeSingle();
    if (error && !/fetch/i.test(error.message)) toast(error.message);
    if (me) { joined = true; myName = me.name; localStorage.setItem("jt-name", myName); await loadAll(); subscribe(); flush(); }
    else showJoin();
    render();
  }
  async function loadAll() {
    const q = (t, o) => { let x = sb.from(t).select("*").eq("trip_id", TRIP); return o ? x.order(o) : x; };
    const [d, s, g, v, c, m, mem] = await Promise.all([q("days", "sort"), q("stops"), q("suggestions", "created_at"), q("votes"), q("comments", "created_at"), q("messages", "created_at"), q("members")]);
    const ok = (r) => r && !r.error && r.data;
    if (ok(d) && d.data.length) S.days = d.data;
    if (ok(s) && s.data.length) S.stops = s.data;
    if (ok(g)) S.suggestions = g.data; if (ok(v)) S.votes = v.data; if (ok(c)) S.comments = c.data; if (ok(m)) S.messages = m.data; if (ok(mem)) S.members = mem.data;
    // re-apply anything still waiting in the outbox
    outbox.forEach(applyLocal);
    saveCache(); render();
  }
  function subscribe() {
    const ch = sb.channel("trip-" + TRIP);
    ["stops", "suggestions", "votes", "comments", "messages", "members", "days"].forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: t === "days" ? undefined : "trip_id=eq." + TRIP }, (p) => {
        const list = S[t];
        const key = t === "votes" ? (r, o) => r.suggestion_id === o.suggestion_id && r.user_id === o.user_id
          : t === "members" ? (r, o) => r.user_id === o.user_id : t === "days" ? (r, o) => r.id === o.id : (r, o) => r.id === o.id;
        if (p.eventType === "DELETE") S[t] = list.filter((r) => !key(r, p.old));
        else { const i = list.findIndex((r) => key(r, p.new)); if (i >= 0) list[i] = p.new; else list.push(p.new); }
        saveCache(); render();
      });
    });
    ch.subscribe((st) => { live = st === "SUBSCRIBED"; updateSync(); });
  }
  let live = false;
  window.addEventListener("online", () => { online = true; if (!sb) connect(); else { loadAll(); flush(); } updateSync(); });
  window.addEventListener("offline", () => { online = false; updateSync(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sb && joined) { loadAll(); flush(); } });

  // ---------------- join ----------------
  function showJoin() {
    const pick = C.PEOPLE.map((p) => `<button type="button" class="pchip" data-name="${p}">${p}</button>`).join("");
    modal(`<h3>Join the trip</h3><p class="muted">Pick your name and enter the trip passcode (ask Naman).</p>
      <div class="pchips">${pick}</div><label>Your name<input name="name" required maxlength="40" value="${esc(localStorage.getItem("jt-name") || "")}"></label>
      <label>Trip passcode<input name="code" required autocomplete="off" autocapitalize="off"></label>
      <div class="mbtns"><button class="primary" value="join">Join</button></div>`, async (f, btn) => {
      if (btn !== "join") return true;
      const name = f.name.value.trim(), code = f.code.value.trim();
      if (!name || !code) return false;
      const { data, error } = await sb.rpc("join_trip", { p_trip: TRIP, p_code: code, p_name: name });
      if (error) { toast(error.message); return false; }
      if (!data) { toast("Wrong passcode"); return false; }
      joined = true; myName = name; localStorage.setItem("jt-name", name);
      await loadAll(); subscribe(); flush(); render(); return true;
    }, { closable: false });
    $("#mform").addEventListener("click", (e) => { const b = e.target.closest(".pchip"); if (b) $("#mform").name.value = b.dataset.name; });
  }

  // ---------------- render ----------------
  const KIND = { meal: "🍽️", drive: "🚐", do: "📸", stay: "🛏️", hike: "🥾", meet: "👋" };
  const LEG = { car: "🚐", walk: "🚶", hike: "🥾" };
  const live_stops = () => S.stops.filter((s) => !s.deleted);

  function render() {
    renderNow(); renderPlan(); renderIdeas(); renderChat(); renderInfo(); updateSync();
    $("#mename").textContent = myName || "Who are you?";
    document.body.classList.toggle("editing", editMode);
    $("#editbar").hidden = !editMode;
  }

  function renderNow() {
    const now = Date.now();
    const stops = live_stops().map((s) => Object.assign({ _ts: ts(s.date, s.t) }, s));
    if (!stops.length) return;
    const first = Math.min(...stops.filter((s) => s.day === "d1").map((s) => s._ts));
    const last = Math.max(...stops.map((s) => s._ts));
    const card = $("#nowcard");
    const clock = `<span>${fmtDay(now)} · ${fmtClock(now)}</span>`;
    if (now < first) {
      const diff = first - now, d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5), m = Math.floor((diff % 36e5) / 6e4);
      const sameDay = fmtDay(now) === fmtDay(first);
      card.innerHTML = `<div class="nc-k"><span>${sameDay ? "Today's the day" : "Countdown"}</span>${clock}</div>
        <div class="nc-t">${sameDay ? "Be at Hoshiarpur bus stand by 8:00 am" : `Trip starts in ${d ? d + "d " : ""}${h}h ${m}m`}</div>
        <div class="nc-s">Meet 7:45 am Fri 13 Nov · Hoshiarpur Bus Stand</div>
        <div class="nc-btns"><a href="#reach" data-tab-go="plan">🚌 My leave time</a>${A("📍 Bus stand", search("Hoshiarpur Bus Stand", "ChIJQd27AgDjGjkRlCdAiM834Jk"), "sec")}</div>`;
      return;
    }
    if (now > last + 3 * 36e5) { card.innerHTML = `<div class="nc-k"><span>Trip done</span>${clock}</div><div class="nc-t">Hope it was epic 🏔️</div>`; return; }
    const rows = [];
    S.days.forEach((d) => {
      const ds = stops.filter((s) => s.day === d.id).sort((a, b) => a._ts - b._ts);
      if (!ds.length || now < ds[0]._ts - 12 * 36e5 || now > ds[ds.length - 1]._ts + 3 * 36e5) return;
      let cur = null, nxt = null;
      ds.forEach((s) => { if (s._ts <= now) cur = s; else if (!nxt) nxt = s; });
      const lab = d.opt ? `Option ${d.opt} · ` : "";
      rows.push(`<div class="nc-row">${cur ? `<div class="nc-t">${lab}Now: ${esc(cur.name)}</div><div class="nc-s">📍 ${esc(cur.area || "")}</div>` : `<div class="nc-t">${lab}Up first: ${esc(nxt.name)}</div>`}
        ${nxt && cur ? `<div class="nc-s">Next · ${fmtClock(nxt._ts)} · ${esc(nxt.name)}</div>` : ""}
        <div class="nc-btns">${A("📍 Map", mapLink(cur || nxt), "")}${A("🧭 Go", goLink(nxt || cur), "sec")}<a href="#s-${(cur || nxt).id}" class="sec" data-tab-go="plan">Jump ↓</a></div></div>`);
    });
    card.innerHTML = `<div class="nc-k"><span>Right now</span>${clock}</div>` + (rows.join("") || `<div class="nc-t">Free time · check the plan</div>`);
  }

  function stopHTML(s, cur, nxt) {
    const alts = (s.alts || []).map((a) => A(`or ${esc(a.label)} ↗`, search(a.q, a.pid), "alt")).join("");
    const btns = A("📍 Map", mapLink(s), "btn") + A("🧭 Go", goLink(s), "btn ghost") + alts;
    const legH = s.leg ? `<div class="leg"><span>${LEG[s.leg.mode] || "🚐"} ${esc(s.leg.text)}${s.leg.url ? ` · <a href="${esc(s.leg.url)}" target="_blank" rel="noopener">route ↗</a>` : ""}</span></div>` : "";
    const ideaH = s.idea ? `<div class="idea"><div class="ib"><b>💡 ${esc(s.idea.title)}</b><span>${esc(s.idea.text)}</span>${(s.idea.links || []).length ? `<div class="btns">${s.idea.links.map((l) => A("🔎 " + esc(l.label), l.url, "alt")).join("")}</div>` : ""}</div></div>` : "";
    const cls = s.id === cur ? "now" : s.id === nxt ? "next" : ts(s.date, s.t) < Date.now() && cur ? "past" : "";
    return ideaH + legH + `<div class="stop ${s.kind} ${cls}" id="s-${s.id}"><div class="time">${s.label ? esc(s.label) : disp(s.t)}</div><div class="dot">${KIND[s.kind] || "📍"}</div>
      <div class="body"><div class="nowpill">NOW</div><div class="nextpill">NEXT</div>
      <div class="name">${esc(s.name)}${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ""}<button class="editbtn" data-edit="${s.id}" aria-label="Edit">✏️</button></div>
      ${s.area ? `<div class="area">${esc(s.area)}</div>` : ""}${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
      <div class="btns">${btns}</div></div></div>`;
  }

  function renderPlan() {
    const nav = [`<a href="#reach">🚌 Getting there</a>`].concat(S.days.map((d) => `<a href="#day-${d.id}">${esc(d.opt ? (d.opt === "A" ? "Sun A · " : "Sun B · ") + d.title : d.kicker.split(" · ")[0])}</a>`));
    $("#daynav").innerHTML = nav.join("");
    const now = Date.now();
    const html = S.days.map((d, i) => {
      const ds = live_stops().filter((s) => s.day === d.id).sort((a, b) => ts(a.date, a.t) - ts(b.date, b.t));
      let cur = null, nxt = null;
      ds.forEach((s) => { if (ts(s.date, s.t) <= now) cur = s.id; else if (!nxt) nxt = s.id; });
      if (!cur) nxt = null; // highlight only once the day has started
      let lastDate = ds[0] && ds[0].date, out = "";
      ds.forEach((s) => { if (s.date !== lastDate) { out += `<div class="sep">${fmtDay(ts(s.date, "12:00"))}</div>`; lastDate = s.date; } out += stopHTML(s, cur, nxt); });
      const openIdeas = S.suggestions.filter((g) => g.status === "open" && g.day === d.id).length;
      const pickHdr = d.opt === "A" ? `<p class="picklabel">Sun 15 – Mon 16 · we'll pick one on Saturday</p><div class="pick"><a href="#day-dA">A · Tirthan</a><a href="#day-dB">B · Manali</a></div>` : "";
      return pickHdr + `<section class="day ${d.opt === "B" ? "b" : d.opt === "A" ? "a" : ""}" id="day-${d.id}"><div class="dh"><div class="date">${esc(d.kicker)}</div><h2>${esc(d.title)}</h2>
        <div class="stay">🛏️ ${esc(d.stay)}</div>${A("🧭 Full day route", d.route, "routebtn")}
        ${openIdeas ? `<button class="ideachip" data-tab-go="ideas" data-sugday="${d.id}">💡 ${openIdeas} open idea${openIdeas > 1 ? "s" : ""} for this day</button>` : ""}</div>
        <div class="tl">${out}</div><div class="addrow"><button class="addbtn" data-add="${d.id}">＋ Add a stop</button><button class="addbtn sec" data-sug="${d.id}">💡 Suggest for this day</button></div></section>`;
    }).join("");
    $("#days").innerHTML = html;
  }

  function renderIdeas() {
    const f = sugFilter;
    const filters = [["open", "Open"], ["decided", "Decided"], ["dropped", "Dropped"], ["all", "All"]];
    $("#sugfilter").innerHTML = filters.map(([k, l]) => `<button class="fchip ${f === k ? "on" : ""}" data-f="${k}">${l} <b>${k === "all" ? S.suggestions.length : S.suggestions.filter((s) => s.status === k).length}</b></button>`).join("");
    const dayName = (id) => { const d = S.days.find((x) => x.id === id); return d ? (d.opt ? "Option " + d.opt : d.kicker.split(" · ")[0]) : "Any day"; };
    const list = S.suggestions.filter((s) => f === "all" || s.status === f)
      .sort((a, b) => S.votes.filter((v) => v.suggestion_id === b.id).length - S.votes.filter((v) => v.suggestion_id === a.id).length || Date.parse(b.created_at) - Date.parse(a.created_at));
    $("#suglist").innerHTML = list.length ? list.map((s) => {
      const vs = S.votes.filter((v) => v.suggestion_id === s.id), mine = vs.some((v) => v.user_id === uid);
      const cs = S.comments.filter((c) => c.suggestion_id === s.id);
      return `<div class="sug ${s.status}"><div class="sh"><span class="sday">${esc(dayName(s.day))}</span><span class="muted">${esc(nameOf(s.created_by))} · ${ago(s.created_at)}</span></div>
        <div class="name">${esc(s.title)}${s.status !== "open" ? `<span class="tag">${s.status}</span>` : ""}</div>
        ${s.area ? `<div class="area">${esc(s.area)}</div>` : ""}${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}
        <div class="btns">${A("📍 Map", mapLink(s), "btn ghost")}
          <button class="vbtn ${mine ? "on" : ""}" data-vote="${s.id}">👍 ${vs.length}</button>
          ${s.status === "open" ? `<button class="btn" data-decide="${s.id}">✅ Decide</button><button class="alt" data-drop="${s.id}">Drop</button>` : `<button class="alt" data-reopen="${s.id}">Reopen</button>`}</div>
        ${vs.length ? `<div class="muted small">👍 ${vs.map((v) => esc(nameOf(v.user_id))).join(", ")}</div>` : ""}
        <div class="cmts">${cs.map((c) => `<div class="cmt"><b>${esc(nameOf(c.user_id))}</b> ${esc(c.text)} <span class="muted">${ago(c.created_at)}</span></div>`).join("")}
          <form class="cform" data-cmt="${s.id}"><input placeholder="Comment…" maxlength="500"><button>↵</button></form></div></div>`;
    }).join("") : `<p class="empty">No ${f === "all" ? "" : f + " "}ideas yet. Tap <b>＋ Suggest a place</b>.</p>`;
    const open = S.suggestions.filter((s) => s.status === "open").length;
    const b = $("#badge-ideas"); b.hidden = !open; b.textContent = open;
  }

  function renderChat() {
    const box = $("#chatlist"), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    let lastDay = "";
    box.innerHTML = S.messages.length ? S.messages.map((m) => {
      const d = fmtDay(Date.parse(m.created_at)), sep = d !== lastDay ? `<div class="cday">${d}</div>` : ""; lastDay = d;
      const me = m.user_id === uid;
      return sep + `<div class="msg ${me ? "me" : ""}">${me ? "" : `<b>${esc(nameOf(m.user_id))}</b>`}<span>${esc(m.text)}</span><i>${fmtClock(Date.parse(m.created_at))}</i></div>`;
    }).join("") : `<p class="empty">No messages yet. Say hi 👋</p>`;
    if (atBottom || tab === "chat") box.scrollTop = box.scrollHeight;
    const seen = +localStorage.getItem(LS_SEEN) || 0;
    if (tab === "chat" && S.messages.length) localStorage.setItem(LS_SEEN, Date.parse(S.messages[S.messages.length - 1].created_at));
    const unread = S.messages.filter((m) => Date.parse(m.created_at) > seen && m.user_id !== uid).length;
    const b = $("#badge-chat"); b.hidden = !unread || tab === "chat"; b.textContent = unread;
  }

  function renderInfo() {
    $("#memberlist").innerHTML = S.members.length ? S.members.map((m) => `<span class="pchip static">${esc(m.name)}${m.user_id === uid ? " (you)" : ""}</span>`).join("") : `<span class="muted">Nobody joined yet</span>`;
  }

  function updateSync() {
    const el = $("#sync"); if (!el) return;
    const pend = outbox.length;
    let t, c;
    if (!navigator.onLine) { t = pend ? `Offline · ${pend} change${pend > 1 ? "s" : ""} waiting` : "Offline · showing saved copy"; c = "off"; }
    else if (!sb || !joined) { t = "Not joined yet"; c = "off"; }
    else if (pend) { t = `Syncing ${pend}…`; c = "wait"; }
    else { t = live ? "Live · synced" : "Synced"; c = "ok"; }
    el.textContent = t; el.className = "sync " + c;
  }

  // ---------------- modal + forms ----------------
  let onSubmit = null;
  function modal(inner, handler, opts = {}) {
    const dlg = $("#modal"), f = $("#mform");
    f.innerHTML = inner + (opts.closable === false ? "" : "");
    onSubmit = handler;
    dlg.dataset.closable = opts.closable === false ? "0" : "1";
    if (!dlg.open) dlg.showModal();
    const first = f.querySelector("input,textarea,select"); if (first && opts.focus !== false) setTimeout(() => first.focus(), 50);
  }
  $("#mform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter && e.submitter.value;
    if (btn === "cancel") { $("#modal").close(); return; }
    const ok = await onSubmit(e.target, btn);
    if (ok !== false) $("#modal").close();
  });
  $("#modal").addEventListener("cancel", (e) => { if ($("#modal").dataset.closable === "0") e.preventDefault(); });

  const DATES = [["2026-11-13", "Fri 13"], ["2026-11-14", "Sat 14"], ["2026-11-15", "Sun 15"], ["2026-11-16", "Mon 16"]];
  const opt = (arr, v) => arr.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("");
  const dayOpts = (v) => opt(S.days.map((d) => [d.id, d.opt ? `Sun–Mon · Option ${d.opt} (${d.title})` : d.kicker]), v);
  const defaultDate = (day) => ({ d1: "2026-11-13", d2: "2026-11-14" }[day] || "2026-11-15");

  function stopForm(s, preset) {
    const isNew = !s; s = s || Object.assign({ day: "d1", date: "2026-11-13", t: "12:00", kind: "do", name: "", area: "", note: "", tag: "", leg: null }, preset || {});
    modal(`<h3>${isNew ? "Add a stop" : "Edit stop"}</h3>
      <div class="grid2"><label>Day<select name="day">${dayOpts(s.day)}</select></label><label>Date<select name="date">${opt(DATES, s.date)}</select></label></div>
      <div class="grid2"><label>Time<input type="time" name="t" value="${esc(s.t)}" required></label>
      <label>Type<select name="kind">${opt([["do", "📸 Visit"], ["meal", "🍽️ Food"], ["hike", "🥾 Hike"], ["drive", "🚐 Drive"], ["stay", "🛏️ Stay"], ["meet", "👋 Meet"]], s.kind)}</select></label></div>
      <label>Place name<input name="name" value="${esc(s.name)}" required maxlength="120"></label>
      <label>Where (area / landmark)<input name="area" value="${esc(s.area || "")}" maxlength="160"></label>
      <label>Google Maps link <span class="muted">(optional, paste from Maps → Share)</span><input name="map_url" value="${esc(s.map_url || "")}" inputmode="url" placeholder="https://maps.app.goo.gl/…"></label>
      <label>Note<textarea name="note" rows="2" maxlength="400">${esc(s.note || "")}</textarea></label>
      <div class="grid2"><label>Meal tag<select name="tag">${opt([["", "—"], ["Breakfast", "Breakfast"], ["Lunch", "Lunch"], ["Snacks", "Snacks"], ["Dinner", "Dinner"]], s.tag || "")}</select></label>
      <label>Getting here<select name="legmode">${opt([["", "—"], ["car", "🚐 Drive"], ["walk", "🚶 Walk"], ["hike", "🥾 Hike"]], (s.leg && s.leg.mode) || "")}</select></label></div>
      <label>Travel note <span class="muted">(e.g. "~20 min · 6 km")</span><input name="legtext" value="${esc((s.leg && s.leg.text) || "")}" maxlength="120"></label>
      <div class="mbtns">${isNew ? "" : `<button value="delete" class="danger" formnovalidate>Delete</button>`}<button value="cancel" formnovalidate>Cancel</button><button value="save" class="primary">Save</button></div>`,
      (f, btn) => {
        if (btn === "delete") { if (confirm("Delete this stop for everyone?")) write({ table: "stops", kind: "update", match: { id: s.id }, row: { deleted: true } }); return true; }
        if (btn !== "save") return true;
        const mu = f.map_url.value.trim();
        const row = { day: f.day.value, date: f.date.value, t: f.t.value, kind: f.kind.value, name: f.name.value.trim(), area: f.area.value.trim(), note: f.note.value.trim(), tag: f.tag.value, map_url: mu || null,
          leg: f.legmode.value || f.legtext.value.trim() ? Object.assign({}, s.leg || {}, { mode: f.legmode.value || "car", text: f.legtext.value.trim() }) : null };
        if (mu || (!isNew && (row.name !== s.name || row.area !== s.area))) { if (!mu && s.q && row.name !== s.name) row.q = null; if (!mu && row.name !== s.name) row.pid = null; }
        if (isNew) write({ table: "stops", kind: "upsert", row: Object.assign({ id: uuid(), trip_id: TRIP, alts: [] }, row) });
        else write({ table: "stops", kind: "update", match: { id: s.id }, row });
        return true;
      });
  }

  function sugForm(day) {
    modal(`<h3>Suggest a place</h3>
      <label>What / where<input name="title" required maxlength="120" placeholder="e.g. Raghupur Fort sunrise"></label>
      <label>Area <span class="muted">(optional)</span><input name="area" maxlength="160"></label>
      <label>Google Maps link <span class="muted">(optional)</span><input name="map_url" inputmode="url" placeholder="https://maps.app.goo.gl/…"></label>
      <label>For which day<select name="day"><option value="">Any day</option>${dayOpts(day || "")}</select></label>
      <label>Why / note<textarea name="note" rows="2" maxlength="400"></textarea></label>
      <div class="mbtns"><button value="cancel" formnovalidate>Cancel</button><button value="save" class="primary">Post idea</button></div>`,
      (f, btn) => {
        if (btn !== "save") return true;
        write({ table: "suggestions", kind: "upsert", row: { id: uuid(), trip_id: TRIP, title: f.title.value.trim(), area: f.area.value.trim(), map_url: f.map_url.value.trim() || null,
          day: f.day.value || null, note: f.note.value.trim(), status: "open", created_by: uid, created_at: new Date().toISOString() } });
        tab = "ideas"; showTab(); return true;
      });
  }

  function decideForm(g) {
    const day = g.day || "d1";
    modal(`<h3>✅ Add “${esc(g.title)}” to the plan</h3>
      <div class="grid2"><label>Day<select name="day">${dayOpts(day)}</select></label><label>Date<select name="date">${opt(DATES, defaultDate(day))}</select></label></div>
      <div class="grid2"><label>Time<input type="time" name="t" value="12:00" required></label>
      <label>Type<select name="kind">${opt([["do", "📸 Visit"], ["meal", "🍽️ Food"], ["hike", "🥾 Hike"], ["drive", "🚐 Drive"], ["stay", "🛏️ Stay"]], "do")}</select></label></div>
      <div class="mbtns"><button value="cancel" formnovalidate>Cancel</button><button value="save" class="primary">Add to plan</button></div>`,
      (f, btn) => {
        if (btn !== "save") return true;
        const sid = uuid();
        write({ table: "stops", kind: "upsert", row: { id: sid, trip_id: TRIP, day: f.day.value, date: f.date.value, t: f.t.value, kind: f.kind.value, name: g.title, area: g.area || "", map_url: g.map_url, note: g.note || "", tag: "", alts: [] } });
        write({ table: "suggestions", kind: "update", match: { id: g.id }, row: { status: "decided", stop_id: sid, day: f.day.value } });
        toast("Added to the plan ✅"); return true;
      });
  }

  // ---------------- events ----------------
  function showTab() {
    document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + tab));
    document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    if (tab === "chat") { renderChat(); const box = $("#chatlist"); box.scrollTop = box.scrollHeight; }
    window.scrollTo({ top: tab === "plan" ? window.scrollY : 0 });
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a"); if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; showTab(); return; }
    if (d.tabGo) { tab = d.tabGo; if (d.sugday) sugFilter = "open"; showTab(); return; }
    if (!joined && (d.edit || d.add || d.sug || d.vote || d.decide || d.drop || d.reopen || d.act === "newsug")) { showJoin(); return; }
    if (d.edit) { stopForm(S.stops.find((s) => s.id === d.edit)); return; }
    if (d.add) { stopForm(null, { day: d.add, date: defaultDate(d.add) }); return; }
    if (d.sug) { sugForm(d.sug); return; }
    if (d.f) { sugFilter = d.f; renderIdeas(); return; }
    if (d.vote) {
      const mine = S.votes.find((v) => v.suggestion_id === d.vote && v.user_id === uid);
      write(mine ? { table: "votes", kind: "delete", match: { suggestion_id: d.vote, user_id: uid } } : { table: "votes", kind: "upsert", row: { suggestion_id: d.vote, user_id: uid, trip_id: TRIP } });
      return;
    }
    if (d.decide) { decideForm(S.suggestions.find((s) => s.id === d.decide)); return; }
    if (d.drop) { write({ table: "suggestions", kind: "update", match: { id: d.drop }, row: { status: "dropped" } }); return; }
    if (d.reopen) {
      const g = S.suggestions.find((s) => s.id === d.reopen);
      if (g && g.stop_id && confirm("Also remove it from the plan?")) write({ table: "stops", kind: "update", match: { id: g.stop_id }, row: { deleted: true } });
      write({ table: "suggestions", kind: "update", match: { id: d.reopen }, row: { status: "open", stop_id: null } }); return;
    }
    if (d.act === "newsug") { sugForm(null); return; }
    if (d.act === "editon") { if (!joined) return showJoin(); editMode = true; tab = "plan"; showTab(); render(); toast("Edit mode on · tap ✏️ on any stop"); return; }
    if (d.act === "editoff") { editMode = false; render(); return; }
    if (d.act === "rename") { showJoin(); return; }
    if (d.act === "refresh") { if (sb && joined) loadAll(); return; }
    if (t.id === "mebtn") { if (sb) showJoin(); return; }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.id === "chatform") {
      e.preventDefault(); const i = $("#chatinput"), text = i.value.trim(); if (!text) return;
      if (!joined) return showJoin();
      write({ table: "messages", kind: "upsert", row: { id: uuid(), trip_id: TRIP, user_id: uid, text, created_at: new Date().toISOString() } });
      i.value = ""; return;
    }
    if (f.dataset.cmt) {
      e.preventDefault(); const i = f.querySelector("input"), text = i.value.trim(); if (!text) return;
      if (!joined) return showJoin();
      write({ table: "comments", kind: "upsert", row: { id: uuid(), trip_id: TRIP, suggestion_id: f.dataset.cmt, user_id: uid, text, created_at: new Date().toISOString() } });
      i.value = "";
    }
  });

  let toastT;
  function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 3200); }

  // ---------------- boot ----------------
  async function boot() {
    if (!loadCache()) {
      try { const r = await fetch("data/seed.json", { cache: "no-cache" }); const seed = await r.json(); S.days = seed.days; S.stops = seed.stops.map((s, i) => Object.assign({ id: "seed" + i }, s)); } catch (e) {}
    }
    myName = localStorage.getItem("jt-name");
    render(); showTab();
    setInterval(() => { renderNow(); if (tab === "plan") renderPlan(); }, 60000);
    connect().catch((e) => { console.error(e); updateSync(); });
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  boot();
})();
