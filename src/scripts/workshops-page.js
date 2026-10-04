// Workshops page: filters from src/lib/workshops.js over the data inlined by workshops.astro.
import { esc, highlight, terms } from "../lib/query.js";
import { KEYS, loadSet, saveSet } from "../lib/stars.js";
import { emptyWsState, matchWorkshop, slotOf, wsParseHash, wsToHash } from "../lib/workshops.js";

const DAY_LABEL = { Sunday: "Sun 27 Sep", Thursday: "Thu 1 Oct" };
const DAY_HEAD = { Sunday: "Sunday, 27 Sep", Thursday: "Thursday, 1 Oct" };
const SLOT_LABEL = { full: "Full day", am: "Morning", pm: "Afternoon" };
const SLOT_SPAN = { full: "08:30–17:30", am: "08:30–12:30", pm: "13:30–17:30" };

const $ = (id) => document.getElementById(id);
const els = {
  q: $("q"), days: $("days"), slots: $("slots"), type: $("type"), rel: $("rel"), star: $("star"),
  starCount: $("star-count"), reset: $("reset"), summary: $("summary"), list: $("list"),
};
const items = JSON.parse($("workshops-data").textContent);
const stars = loadSet(KEYS.workshops);
let state = wsParseHash(location.hash);

function chips(el, labels, key, ts) {
  el.innerHTML = Object.entries(labels).map(([value, label]) => {
    const n = items.filter((w) => (key === "days" ? w.day : slotOf(w)) === value && matchWorkshop(w, state, ts, stars, key)).length;
    return `<button type="button" class="chip" data-${key}="${value}" aria-pressed="${state[key].has(value)}">${label}<span class="n">${n}</span></button>`;
  }).join("");
}

function card(w, ts) {
  const starred = stars.has(w.id);
  const search = `https://www.google.com/search?q=${encodeURIComponent(`"${w.title}" IROS 2026`)}`;
  return `<article class="paper ws${w.relevant ? " is-rel" : ""}">
    <div class="when"><b>${w.start}–${w.end}</b>Rm ${highlight(w.room, ts)}</div>
    <div>
      <h3>${highlight(w.title, ts)}${w.relevant ? `<span class="badge">calib &amp; state est.</span>` : ""}${w.type === "tutorial" ? `<span class="badge award">tutorial</span>` : ""}</h3>
      <div class="meta">${DAY_LABEL[w.day]} · ${esc(w.length)} · <a href="${search}" target="_blank" rel="noopener">Find website</a></div>
    </div>
    <button type="button" class="star-btn" data-star="${esc(w.id)}" aria-pressed="${starred}"
      aria-label="${starred ? "Remove bookmark" : "Bookmark"}">${starred ? "★" : "☆"}</button>
  </article>`;
}

function render() {
  const ts = terms(state.q);
  chips(els.days, DAY_LABEL, "days", ts);
  chips(els.slots, SLOT_LABEL, "slots", ts);
  els.starCount.textContent = stars.size ? `(${stars.size})` : "";
  const res = items.filter((w) => matchWorkshop(w, state, ts, stars));
  els.summary.textContent = `${res.length} of ${items.length} workshops & tutorials`;
  if (!res.length) {
    els.list.innerHTML = `<p class="empty">No workshops match these filters.</p>`;
    return;
  }
  let html = "";
  for (const day of Object.keys(DAY_LABEL)) {
    const ofDay = res.filter((w) => w.day === day);
    if (!ofDay.length) continue;
    html += `<h2 class="day-head">${DAY_HEAD[day]}</h2>`;
    for (const slot of Object.keys(SLOT_LABEL)) {
      const group = ofDay.filter((w) => slotOf(w) === slot);
      if (!group.length) continue;
      html += `<h3 class="slot-head">${SLOT_LABEL[slot]} <span class="muted">${SLOT_SPAN[slot]} · ${group.length}</span></h3>`;
      html += group.map((w) => card(w, ts)).join("");
    }
  }
  els.list.innerHTML = html;
}

function syncControls() {
  els.q.value = state.q;
  els.type.value = state.type;
  els.rel.checked = state.rel;
  els.star.checked = state.star;
}

function update() {
  const h = wsToHash(state);
  history.replaceState(null, "", h ? `#${h}` : location.pathname);
  render();
}

function bind() {
  let timer;
  els.q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = els.q.value.trim(); update(); }, 120);
  });
  els.type.addEventListener("change", () => { state.type = els.type.value; update(); });
  for (const k of ["rel", "star"]) {
    els[k].addEventListener("change", () => { state[k] = els[k].checked; update(); });
  }
  for (const key of ["days", "slots"]) {
    els[key].addEventListener("click", (e) => {
      const b = e.target.closest(`[data-${key}]`);
      if (!b) return;
      const v = b.dataset[key];
      state[key].has(v) ? state[key].delete(v) : state[key].add(v);
      update();
    });
  }
  els.reset.addEventListener("click", () => {
    state = emptyWsState();
    syncControls();
    update();
  });
  els.list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (!b) return;
    const id = b.dataset.star;
    stars.has(id) ? stars.delete(id) : stars.add(id);
    saveSet(KEYS.workshops, stars);
    render();
  });
  window.addEventListener("hashchange", () => {
    state = wsParseHash(location.hash);
    syncControls();
    render();
  });
}

for (const t of [...new Set(items.map((w) => w.type))].sort()) {
  els.type.add(new Option(`${t[0].toUpperCase()}${t.slice(1)}s (${items.filter((w) => w.type === t).length})`, t));
}
syncControls();
bind();
render();
