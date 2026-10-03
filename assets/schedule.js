// IROS 2026 day-by-day schedule with links into the paper and workshop lists,
// and the viewer's bookmarked papers/workshops placed inside their blocks.
// Data: data/schedule.json, data/papers.json, data/workshops.json.
(() => {
  "use strict";

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const SHORT = { Sunday: "Sun 27", Monday: "Mon 28", Tuesday: "Tue 29", Wednesday: "Wed 30", Thursday: "Thu 1 Oct" };
  // Schedule block title -> paper session_type.
  const TALK_TYPES = {
    "Contributed Talks (Focused)": "Focused Sessions",
    "Contributed Talks (Lightning)": "Lightning Talks",
    "Contributed Talks (Special)": "Special Sessions",
    Awards: "Award Candidates",
  };
  const TYPE_LABEL = {
    contributed_talks: "Talks", awards: "Awards", keynote: "Keynotes", poster: "Posters", workshop: "Workshops",
    plenary_panel: "Plenary", forum: "Forum", social: "Social", opening: "Opening", exhibit: "Exhibit", break: "Break",
  };

  const $ = (id) => document.getElementById(id);
  const els = { days: $("days"), plan: $("plan"), planCount: $("plan-count"), summary: $("summary"), timeline: $("timeline") };

  let blocks = [], papers = [], workshops = [];
  let paperStars = new Set(), wsStars = new Set();
  let day = "Sunday";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const half = (t) => (t < "12:00" ? "am" : "pm");

  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
  }

  // Papers presented in a talk block: same day, session type, and half of the day.
  function papersIn(b) {
    const type = TALK_TYPES[b.title];
    if (!type || !["contributed_talks", "awards"].includes(b.type)) return null;
    return papers.filter((p) => p.day === b.day && p.session_type === type && half(p.time) === half(b.start));
  }

  // Workshops in a workshop block: A1/A2/C1/C2 = morning, B1/B2/D1/D2 = afternoon; full-day ones in both.
  function workshopsIn(b) {
    if (b.type !== "workshop") return null;
    const slot = /[AC]\d$/.test(b.title) ? "am" : "pm";
    return workshops.filter((w) => w.day === b.day && (w.length === "full-day" || half(w.start) === slot));
  }

  function blockHtml(b) {
    const ps = papersIn(b);
    const ws = workshopsIn(b);
    let link = "", mine = [];
    if (ps) {
      const h = new URLSearchParams({ day: b.day, type: TALK_TYPES[b.title] });
      link = `<a href="index.html#${h}">${ps.length} papers →</a>`;
      mine = ps.filter((p) => paperStars.has(p.id)).sort((a, c) => a.time.localeCompare(c.time))
        .map((p) => `<li><span class="t">${p.time}</span> ${esc(p.title)} <span class="muted">· Rm ${esc(p.room)}</span></li>`);
    } else if (ws) {
      const slot = /[AC]\d$/.test(b.title) ? "am" : "pm";
      link = `<a href="workshops.html#day=${b.day}&time=full,${slot}">${ws.length} workshops →</a>`;
      mine = ws.filter((w) => wsStars.has(w.id))
        .map((w) => `<li><span class="t">${w.start}</span> ${esc(w.title)} <span class="muted">· Rm ${esc(w.room)}</span></li>`);
    } else if (b.type === "poster" || b.type === "keynote") {
      link = `<a href="index.html#day=${b.day}">${b.day}'s papers →</a>`;
    }
    const where = [b.room, b.notes].filter(Boolean).map(esc).join(" · ");
    const showMine = els.plan.checked && mine.length;
    return `<div class="block t-${b.type}${showMine ? " has-mine" : ""}">
      <div class="block-type">${TYPE_LABEL[b.type] || esc(b.type)}</div>
      <div class="block-title">${esc(b.title)}</div>
      ${where ? `<div class="muted block-where">${where}</div>` : ""}
      ${link ? `<div class="block-link">${link}</div>` : ""}
      ${showMine ? `<ul class="mine">${mine.join("")}</ul>` : ""}
    </div>`;
  }

  function render() {
    els.days.innerHTML = DAYS.map((d) =>
      `<button type="button" class="chip" role="tab" data-day="${d}" aria-pressed="${d === day}" aria-selected="${d === day}">${SHORT[d]}</button>`
    ).join("");
    const nPlan = paperStars.size + wsStars.size;
    els.planCount.textContent = nPlan ? `(${nPlan})` : "(none yet)";

    const ofDay = blocks.filter((b) => b.day === day);
    const rows = new Map();
    for (const b of ofDay) {
      const k = `${b.start}–${b.end}`;
      if (!rows.has(k)) rows.set(k, []);
      rows.get(k).push(b);
    }
    const date = ofDay[0] ? new Date(`${ofDay[0].date}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long" }) : "";
    els.summary.textContent = `${day}, ${date} · ${ofDay.filter((b) => b.type !== "break").length} program blocks`;
    els.timeline.innerHTML = [...rows].map(([span, bs]) => {
      const isBreak = bs.every((b) => b.type === "break");
      return `<section class="row${isBreak ? " row-break" : ""}">
        <div class="row-time">${span}</div>
        <div class="row-blocks">${bs.map(blockHtml).join("")}</div>
      </section>`;
    }).join("");
  }

  function setDay(d) {
    day = d;
    history.replaceState(null, "", `#day=${d}`);
    render();
  }

  async function init() {
    try {
      [blocks, papers, workshops] = await Promise.all(
        ["schedule", "papers", "workshops"].map((n) => fetch(`data/${n}.json`).then((r) => r.json()))
      );
    } catch {
      els.summary.textContent = "Could not load the schedule data — serve the site over HTTP (python3 -m http.server).";
      return;
    }
    paperStars = readSet("iros26.stars");
    wsStars = readSet("iros26.workshop-stars");
    const fromHash = new URLSearchParams(location.hash.slice(1)).get("day");
    if (DAYS.includes(fromHash)) day = fromHash;
    els.days.addEventListener("click", (e) => {
      const b = e.target.closest("[data-day]");
      if (b) setDay(b.dataset.day);
    });
    els.plan.addEventListener("change", render);
    render();
  }

  init();
})();
