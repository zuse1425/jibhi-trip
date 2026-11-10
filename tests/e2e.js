// Playwright e2e at 390×844 with a mocked Supabase (tests/mock-supabase.js). Run: node tests/e2e.js
// Serves the repo with python3 -m http.server; screenshots → tests/out/. Not deployed.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "out");
const PORT = 8765 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}/`;
const MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(cond, msg) { if (cond) console.log("  ✓ " + msg); else { failures++; console.log("  ✗ " + msg); } }

async function open(browser, { time, scheme = "light", geo } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: "block",
    ...(geo ? { geolocation: geo, permissions: ["geolocation"] } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.route("**/vendor/supabase.js", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK }));
  if (time) await page.clock.install({ time: new Date(time) });
  await page.goto(BASE);
  await page.waitForSelector("#app:not([hidden])");
  await page.waitForSelector("#days .stop");
  return { ctx, page, errors };
}
const tab = (page, t) => page.click(`#tabbar [data-tab=${t}]`);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + ".png") });

async function main() {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    // ---------- US1 + layout: before the trip ----------
    console.log("Before the trip (10 Nov)");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-10T18:00:00+05:30" });
      check(/Trip starts in/.test(await page.textContent("#nowcard")), "Now card shows countdown");
      check((await page.$$("#tabbar button")).length === 5, "five tabs");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      check(!overflow, "no horizontal scroll at 390 px");
      await shot(page, "plan-light");
      for (const t of ["ideas", "chat", "money", "info"]) { await tab(page, t); await shot(page, t + "-light"); }
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }

    // ---------- US7: lock in the option (Sunday) ----------
    console.log("US7 · option lock-in (Sun 15 Nov 10:00 IST)");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-15T10:00:00+05:30" });
      const nc = await page.textContent("#nowcard");
      check(/Option A/.test(nc) && /Option B/.test(nc), "Now card shows both options before picking");
      check((await page.$$(".pickgo button")).length === 2, "Go with A / B buttons shown");
      await page.click('.pickgo [data-pick="B"]');
      await page.waitForSelector(".picked");
      check(!(await page.$("#day-dA")) && !!(await page.$("#day-dB")), "Option A hidden, B shown");
      check(!/Tirthan/.test(await page.textContent("#daynav")), "day nav has no Option A");
      check(!/Option A/.test(await page.textContent("#nowcard")), "Now card drops Option A");
      const row = await page.evaluate(() => window.__mock.db.trip_settings.find((r) => r.key === "chosen_opt"));
      check(row && row.value === "B", "trip_settings.chosen_opt = B synced");
      await page.click(".picked button");
      await page.waitForSelector(".pickgo");
      check(!!(await page.$("#day-dA")) && !!(await page.$("#day-dB")), "Change restores both options");
      // another phone picks A → realtime
      await page.evaluate(() => { const r = { trip_id: "jibhi-nov-2026", key: "chosen_opt", value: "A" }; window.__mock.emit("trip_settings", "INSERT", r); });
      await page.waitForSelector(".picked");
      check(!(await page.$("#day-dB")) && /Tirthan/.test(await page.textContent(".picked")), "remote pick (A) applied live");
      await page.evaluate(() => document.getElementById("pick").scrollIntoView());
      await shot(page, "us7-picked");
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }

    // ---------- US8: money ----------
    console.log("US8 · expenses");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-13T09:00:00+05:30" });
      await tab(page, "money");
      async function addExpense(title, amount, paidBy, split) {
        await page.click('[data-act="newexp"]');
        await page.fill('#mform [name="title"]', title);
        await page.fill('#mform [name="amount"]', String(amount));
        await page.selectOption('#mform [name="paid_by"]', paidBy);
        for (const box of await page.$$('#mform input[name="split"]')) {
          const v = await box.getAttribute("value"); const want = split.includes(v);
          if ((await box.isChecked()) !== want) await box.click();
        }
        await page.click('#mform button[value="save"]');
        await page.waitForTimeout(100);
      }
      await addExpense("Breakfast", 800, "Naman", ["Naman", "Mitali", "Himanshu", "Sirisha"]);
      let rows = await page.$$eval(".brow", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ")));
      check(/Naman.*gets ₹600/.test(rows[0]), "Naman gets ₹600");
      check(rows.slice(1).every((r) => /owes ₹200/.test(r)), "others owe ₹200");
      check((await page.$$(".srow")).length === 3, "3 settle-up transfers");
      const sh = await page.evaluate(() => window.TripMath.shares(100, ["Sirisha", "Himanshu", "Mitali"]));
      check(sh.Mitali === 34 && sh.Himanshu === 33 && sh.Sirisha === 33, "₹100 / 3 → 34/33/33 (PEOPLE order)");
      await addExpense("Chai", 100, "Mitali", ["Mitali", "Himanshu", "Sirisha"]);
      const B = await page.evaluate(() => window.TripMath.balances());
      check(B.Naman.net === 600 && B.Mitali.net === -200 + 66 && B.Himanshu.net === -233 && B.Sirisha.net === -233, "balances after second expense");
      check(Object.values(B).reduce((t, b) => t + b.net, 0) === 0, "balances sum to zero");
      check((await page.evaluate(() => window.__mock.db.expenses.length)) === 2, "expenses synced to server");
      await shot(page, "us8-money");
      // offline add → queued → flushed
      await ctx.setOffline(true);
      await addExpense("Parking", 50, "Himanshu", ["Himanshu"]);
      check(/Offline · 1 change waiting/.test(await page.textContent("#sync")), "offline expense queued");
      await ctx.setOffline(false);
      await page.waitForFunction(() => window.__mock.db.expenses.length === 3);
      check(true, "queued expense flushed on reconnect");
      // delete the breakfast
      await page.click('.exp:has-text("Breakfast")');
      await page.click('#mform button[value="delete"]');
      await page.waitForTimeout(100);
      const B2 = await page.evaluate(() => window.TripMath.balances());
      check(B2.Naman.net === 0 && !/Breakfast/.test(await page.textContent("#explist")), "delete updates balances");
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }

    // ---------- US9: photos ----------
    console.log("US9 · photos");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-14T12:00:00+05:30" });
      const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 3200; c.height = 2400; const g = c.getContext("2d");
        const gr = g.createLinearGradient(0, 0, 3200, 2400); gr.addColorStop(0, "#1f6b4a"); gr.addColorStop(1, "#e3a25c"); g.fillStyle = gr; g.fillRect(0, 0, 3200, 2400); return c.toDataURL("image/png").split(",")[1]; });
      await tab(page, "chat");
      await page.setInputFiles("#photoinput", { name: "big.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
      await page.waitForSelector("#mform img.pv");
      await page.fill('#mform [name="cap"]', "Serolsar 💙");
      await page.click('#mform button[value="save"]');
      await page.waitForSelector("#chatlist .mph img");
      const up = await page.evaluate(async () => { const o = Object.values(window.__mock.objects)[0]; const bm = await createImageBitmap(o.blob); return { w: bm.width, h: bm.height, type: o.blob.type, size: o.blob.size }; });
      check(up.w === 1600 && up.h === 1200 && up.type === "image/jpeg", `downscaled to ${up.w}×${up.h} ${up.type} (${Math.round(up.size / 1024)} KB)`);
      const msg = await page.evaluate(() => window.__mock.db.messages[0]);
      check(msg && msg.photo && msg.photo.startsWith("jibhi-nov-2026/") && msg.text === "Serolsar 💙", "message row has photo path + caption");
      await shot(page, "us9-chat");
      await page.click('#chatseg [data-cv="photos"]');
      check((await page.$$("#photogrid .tile")).length === 1 && (await page.textContent("#photocount")) === "1", "photo in grid + count");
      await shot(page, "us9-grid");
      await page.click("#photogrid .phdel");
      await page.waitForFunction(() => window.__mock.db.messages.length === 0);
      check(Object.keys(await page.evaluate(() => window.__mock.objects)).length === 0, "delete removes message + file");
      await ctx.setOffline(true);
      await page.click('#chatseg [data-cv="chat"]');
      await page.click('[data-act="photo"]');
      check(/need a connection/.test(await page.textContent("#toast")), "offline photo guard");
      await ctx.setOffline(false);
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }

    // ---------- US10: location ----------
    console.log("US10 · live location");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-14T12:00:00+05:30", geo: { latitude: 31.5869, longitude: 77.3449, accuracy: 30 } });
      await tab(page, "info");
      check(/Nobody's sharing/.test(await page.textContent("#loclist")), "nothing shared by default");
      check((await page.evaluate(() => window.__mock.db.locations.length)) === 0, "no location stored by default");
      await page.check("#locshare");
      await page.waitForSelector("#loclist .lrow");
      check(/\(you\)/.test(await page.textContent("#loclist")), "own location listed");
      const mine = await page.evaluate(() => window.__mock.db.locations[0]);
      check(mine && Math.abs(mine.lat - 31.5869) < 1e-4 && mine.user_id === "u-naman", "own row upserted");
      await page.evaluate(() => { const r = { trip_id: "jibhi-nov-2026", user_id: "u-mitali", lat: 31.6100, lng: 77.3700, acc: 20, updated_at: new Date().toISOString() }; window.__mock.db.locations.push(r); window.__mock.emit("locations", "INSERT", r); });
      await page.waitForSelector('#loclist .lrow:has-text("Mitali")');
      check(/km away/.test(await page.textContent('#loclist .lrow:has-text("Mitali")')), "distance to Mitali shown");
      await shot(page, "us10-location");
      await page.uncheck("#locshare");
      await page.waitForFunction(() => !window.__mock.db.locations.some((l) => l.user_id === "u-naman"));
      check(!/\(you\)/.test(await page.textContent("#loclist")), "switching off deletes own location");
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }

    // ---------- dark mode screenshots ----------
    console.log("Dark mode");
    {
      const { ctx, page, errors } = await open(browser, { time: "2026-11-15T10:00:00+05:30", scheme: "dark" });
      await shot(page, "plan-dark");
      await tab(page, "money"); await shot(page, "money-dark");
      await tab(page, "info"); await shot(page, "info-dark");
      check(errors.length === 0, "no console errors " + (errors.join(" | ") || ""));
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
