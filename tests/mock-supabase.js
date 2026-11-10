/* In-memory stand-in for supabase-js v2 used by tests/e2e.js (never deployed).
   Served in place of vendor/supabase.js via Playwright request routing.
   Covers what app.js uses: auth, rpc, from().select/eq/order/upsert/update/delete/match, channel, storage. */
(function () {
  "use strict";
  const TRIP = "jibhi-nov-2026";
  const ME = { id: "u-naman", name: "Naman" };
  const PEOPLE = [ME, { id: "u-mitali", name: "Mitali" }, { id: "u-himanshu", name: "Himanshu" }, { id: "u-sirisha", name: "Sirisha" }];
  const xhr = new XMLHttpRequest(); xhr.open("GET", "data/seed.json", false); xhr.send();
  const seed = JSON.parse(xhr.responseText);
  const withTrip = (r) => Object.assign({ trip_id: TRIP }, r);
  const db = {
    days: seed.days.map((d, i) => withTrip(Object.assign({ sort: i }, d))),
    stops: seed.stops.map((s, i) => withTrip(Object.assign({ id: s.id || "seed-" + i, alts: [], deleted: false }, s))),
    suggestions: [], votes: [], comments: [], messages: [], expenses: [], locations: [], trip_settings: [],
    members: PEOPLE.map((p) => ({ trip_id: TRIP, user_id: p.id, name: p.name })),
    trip_pages: [
      { trip_id: TRIP, id: "title", html: "🏔️ Test Trip" }, { trip_id: TRIP, id: "lead", html: "Mock data" },
      { trip_id: TRIP, id: "reach", html: '<section class="day" id="reach"><div class="dh"><h2>Getting there</h2></div></section>' },
      { trip_id: TRIP, id: "know", html: "" }, { trip_id: TRIP, id: "footer", html: "test footer" }],
  };
  const KEYS = { votes: ["suggestion_id", "user_id"], members: ["user_id"], trip_settings: ["trip_id", "key"], locations: ["trip_id", "user_id"] };
  const handlers = [], log = [], objects = {};
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const matches = (r, m) => Object.keys(m).every((k) => r[k] === m[k]);
  function emit(table, eventType, row, old) {
    handlers.filter((h) => h.table === table).forEach((h) => setTimeout(() => h.cb({ eventType, new: row || {}, old: old || row || {} }), 0));
  }

  function builder(table) {
    const st = { op: "select", filters: {}, order: null };
    const b = {
      select() { return b; },
      eq(k, v) { st.filters[k] = v; return b; },
      order(k) { st.order = k; return b; },
      match(m) { Object.assign(st.filters, m); return b; },
      upsert(row, opts) { st.op = "upsert"; st.row = row; st.conflict = opts && opts.onConflict; return b; },
      update(row) { st.op = "update"; st.row = row; return b; },
      delete() { st.op = "delete"; return b; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    function run() {
      const list = db[table] || (db[table] = []);
      log.push({ table, op: st.op, row: st.row && clone(st.row), filters: clone(st.filters) });
      if (st.op === "select") {
        let out = list.filter((r) => matches(r, st.filters)).map(clone);
        if (st.order) out.sort((a, b) => (a[st.order] > b[st.order] ? 1 : a[st.order] < b[st.order] ? -1 : 0));
        return { data: out, error: null };
      }
      if (st.op === "upsert") {
        const keys = st.conflict ? st.conflict.split(",") : KEYS[table] || ["id"];
        const i = list.findIndex((r) => keys.every((k) => r[k] === st.row[k]));
        if (i >= 0) list[i] = Object.assign({}, list[i], clone(st.row)); else list.push(clone(st.row));
        return { data: null, error: null };
      }
      if (st.op === "update") { list.filter((r) => matches(r, st.filters)).forEach((r) => Object.assign(r, clone(st.row))); return { data: null, error: null }; }
      if (st.op === "delete") { db[table] = list.filter((r) => !matches(r, st.filters)); return { data: null, error: null }; }
      return { data: null, error: { message: "unsupported" } };
    }
    return b;
  }

  function createClient() {
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: ME.id, email: "me@example.test" } } } }),
        signOut: async () => ({ error: null }),
        signInWithOAuth: async () => ({ error: null }),
      },
      rpc: async (fn) => (fn === "claim_membership" ? { data: ME.name, error: null } : { data: null, error: { message: "no such rpc" } }),
      from: (t) => builder(t),
      channel() {
        const ch = { on(_type, filter, cb) { handlers.push({ table: filter.table, cb }); return ch; }, subscribe(cb) { setTimeout(() => cb && cb("SUBSCRIBED"), 0); return ch; } };
        return ch;
      },
      storage: {
        from(bucket) {
          return {
            async upload(path, blob) { objects[path] = { blob, url: URL.createObjectURL(blob), bucket }; log.push({ storage: "upload", path, size: blob.size }); return { data: { path }, error: null }; },
            async createSignedUrls(paths) { return { data: paths.map((p) => ({ path: p, signedUrl: objects[p] ? objects[p].url : null })), error: null }; },
            async remove(paths) { paths.forEach((p) => delete objects[p]); log.push({ storage: "remove", paths }); return { data: null, error: null }; },
          };
        },
      },
    };
  }
  window.supabase = { createClient };
  window.__mock = { db, log, objects, emit, PEOPLE, TRIP };
})();
