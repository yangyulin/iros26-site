// Schedule page: program blocks per day, linked into the paper and workshop lists,
// with the viewer's bookmarked papers and workshops shown inside their blocks.
import { esc } from "../lib/query.js";
import { groupRows, papersInBlock, TALK_TYPES, workshopSlot, workshopsInBlock } from "../lib/schedule.js";
import { KEYS, loadSet } from "../lib/stars.js";
import { url } from "../lib/url.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const SHORT = { Sunday: "Sun 27", Monday: "Mon 28", Tuesday: "Tue 29", Wednesday: "Wed 30", Thursday: "Thu 1 Oct" };
const TYPE_LABEL = {
  contributed_talks: "Talks", awards: "Awards", keynote: "Keynotes", poster: "Posters", workshop: "Workshops",
  plenary_panel: "Plenary", forum: "Forum", social: "Social", opening: "Opening", exhibit: "Exhibit", break: "Break",
};

const $ = (id) => document.getElementById(id);
const els = { days: $("days"), plan: $("plan"), planCount: $("plan-count"), summary: $("summary"), timeline: $("timeline") };
const blocks = JSON.parse($("schedule-data").textContent);
const workshops = JSON.parse($("workshops-data").textContent);
const paperStars = loadSet(KEYS.papers);
const wsStars = loadSet(KEYS.workshops);
let papers = [];
let day = "Sunday";

const item = (time, title, room, href) =>
  `<li><span class="t">${time}</span> ${href ? `<a href="${href}">${esc(title)}</a>` : esc(title)} <span class="muted">· Rm ${esc(room)}</span></li>`;

function blockHtml(b) {
  const ps = papersInBlock(b, papers);
  const ws = workshopsInBlock(b, workshops);
  let link = "";
  let mine = [];
  if (ps) {
    link = `<a href="${url(`index.html#${new URLSearchParams({ day: b.day, type: TALK_TYPES[b.title] })}`)}">${ps.length} papers →</a>`;
    mine = ps.filter((p) => paperStars.has(p.id)).sort((a, c) => a.time.localeCompare(c.time))
      .map((p) => item(p.time, p.title, p.room, url(`paper/${p.id}.html`)));
  } else if (ws) {
    link = `<a href="${url(`workshops.html#day=${b.day}&time=full,${workshopSlot(b)}`)}">${ws.length} workshops →</a>`;
    mine = ws.filter((w) => wsStars.has(w.id)).map((w) => item(w.start, w.title, w.room, null));
  } else if (b.type === "poster" || b.type === "keynote") {
    link = `<a href="${url(`index.html#day=${b.day}`)}">${b.day}'s papers →</a>`;
  }
  const where = [b.room, b.notes].filter(Boolean).map(esc).join(" · ");
  const showMine = els.plan.checked && mine.length > 0;
  return `<div class="block t-${esc(b.type)}${showMine ? " has-mine" : ""}">
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
  const date = ofDay[0] ? new Date(`${ofDay[0].date}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long" }) : "";
  els.summary.textContent = `${day}, ${date} · ${ofDay.filter((b) => b.type !== "break").length} program blocks`;
  els.timeline.innerHTML = groupRows(ofDay).map(([span, bs]) => {
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
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("day");
  if (DAYS.includes(fromHash)) day = fromHash;
  els.days.addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (b) setDay(b.dataset.day);
  });
  els.plan.addEventListener("change", render);
  render();
  try {
    papers = await (await fetch(url("data/papers-index.json"))).json();
  } catch {
    els.summary.textContent += " · paper counts unavailable (reload to retry)";
    return;
  }
  render();
}

init();
