// End-to-end smoke test in headless Chrome against a running site.
//   npm run build && npm run preview   (separate shell), then:   npm run smoke
//   npm run smoke -- https://yangyulin.net/iros26-site/
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] || "http://localhost:4321/iros26-site/").replace(/\/?$/, "/");
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// CHROME overrides the browser binary; defaults cover macOS and Linux.
const CHROME = process.env.CHROME || (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "iros26-smoke-"))}`, "about:blank",
], { stdio: "ignore" });

async function newTab() {
  for (let i = 0; i < 50; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket((await newTab()).webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
  if (m.method === "Network.responseReceived") {
    const { status, url } = m.params.response;
    if (status >= 400 && !url.endsWith("/favicon.ico") && !url.includes("giscus.app")) problems.push(`${status} ${url}`);
  }
  if (m.method === "Runtime.exceptionThrown") {
    problems.push(`JS error: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
  }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => {
  const id = ++seq;
  pending.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});
for (const domain of ["Network", "Runtime", "Page"]) await send(`${domain}.enable`);
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? ""`);
async function open(path) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(2500);
}

let failed = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

await open("index.html");
check("papers: all loaded", (await text("#summary")).startsWith("1,933 of 1,933 papers"), await text("#summary"));
check("papers: title links to paper page", ((await evaluate(`document.querySelector(".title-link")?.getAttribute("href")`)) ?? "").includes("/paper/"));
await evaluate(`document.querySelector("[data-star]").click()`);
check("papers: bookmark saved", ((await evaluate(`localStorage.getItem("iros26.stars")`)) ?? "[]") !== "[]");

await open("index.html#q=calibration&rel=1");
const filtered = await text("#summary");
check("papers: v1 filter link", /^[1-9][\d,]* of 1,933 papers/.test(filtered), filtered);
await open("index.html#notes=1");
check("papers: photos filter", /^[1-9]\d* of 1,933 papers/.test(await text("#summary")), await text("#summary"));

await open("paper/3549.html");
check("paper page: title", (await text("h1")).startsWith("Leveraging Visual Foundation Models"));
check("paper page: poster photo", await evaluate(`!!document.querySelector(".notes [data-gallery] img")`));
await open("paper/561.html");
check("paper page without notes has no notes section", !(await evaluate(`!!document.querySelector(".notes")`)));

await open("posters.html");
check("photos page: galleries", (await evaluate(`document.querySelectorAll("[data-gallery] a[data-pswp-width]").length`)) > 100);
await evaluate(`document.querySelector("[data-gallery] a[data-pswp-width]").click()`);
await sleep(1500);
check("photos page: lightbox opens", await evaluate(`!!document.querySelector(".pswp--open")`));
await open("index.html#topic=calibration");
check("papers: topic link", (await text("#summary")).startsWith("30 of 1,933 papers"), await text("#summary"));

await open("workshops.html#day=Sunday");
check("workshops: v1 day link", (await text("#summary")).startsWith("44 of 86"), await text("#summary"));
await open("schedule.html#day=Monday");
check("schedule: Monday", (await text("#summary")).startsWith("Monday, September 28"), await text("#summary"));
check("schedule: bookmarked paper shown in its block", (await evaluate(`document.querySelectorAll(".mine li").length`)) >= 1);

await evaluate(`document.getElementById("theme-toggle").click()`);
check("theme toggle persists", (await evaluate(`document.documentElement.dataset.theme + "/" + localStorage.getItem("iros26.theme")`)) === "dark/dark");
check("no HTTP errors or JS exceptions", problems.length === 0, problems.join("; "));

ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
