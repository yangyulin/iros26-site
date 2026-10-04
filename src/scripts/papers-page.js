// Papers page: wires the filter controls to src/lib/query.js and renders the result list.
import { DAYS, dayCounts, emptyState, esc, filterPapers, haystack, highlight, parseHash, terms, toHash } from "../lib/query.js";
import { KEYS, loadSet, saveSet } from "../lib/stars.js";
import { url } from "../lib/url.js";

const PAGE = 150;
const DAY_LABEL = { Monday: "Mon 28 Sep", Tuesday: "Tue 29 Sep", Wednesday: "Wed 30 Sep" };

const $ = (id) => document.getElementById(id);
const els = {
  q: $("q"), days: $("days"), type: $("type"), session: $("session"), kw: $("kw"), rel: $("rel"),
  noted: $("noted"), notedCount: $("noted-count"), star: $("star"), starCount: $("star-count"),
  sort: $("sort"), reset: $("reset"), summary: $("summary"), list: $("list"), more: $("more"),
};

const notes = JSON.parse($("notes-index").textContent || "{}");
const ctx = { stars: loadSet(KEYS.papers), notes };
let papers = [];
let state = emptyState();
let shown = PAGE;

function noteBadge(p) {
  const n = notes[p.id];
  if (!n) return "";
  const label = [n.text ? "notes" : "", n.photos ? `${n.photos} photo${n.photos > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
  return label ? `<span class="badge award">${label}</span>` : "";
}

function authorsHtml(p, ts) {
  const max = 8;
  const names = p.authors.slice(0, max).map((a) => highlight(a, ts)).join(", ");
  const more = p.authors.length > max ? ` <span class="muted">+${p.authors.length - max} more</span>` : "";
  const affs = p.affiliations;
  return `<div class="authors">${names}${more}</div>` +
    (affs.length ? `<div class="affs">${affs.slice(0, 4).map((a) => highlight(a, ts)).join(" · ")}${affs.length > 4 ? " · …" : ""}</div>` : "");
}

function paperHtml(p, ts) {
  const starred = ctx.stars.has(p.id);
  const badges =
    (p.relevant ? `<span class="badge">calib &amp; state est.</span>` : "") +
    (p.session_type === "Award Candidates" ? `<span class="badge award">award candidate</span>` : "") +
    noteBadge(p);
  return `<article class="paper${p.relevant ? " is-rel" : ""}" id="p${esc(p.id)}">
    <div class="when"><b>${p.time}</b>${DAY_LABEL[p.day].slice(0, 3)} · Rm ${esc(p.room)}</div>
    <div>
      <h3><a class="title-link" href="${url(`paper/${p.id}.html`)}">${highlight(p.title, ts)}</a>${badges}</h3>
      ${authorsHtml(p, ts)}
      <div class="meta">
        <button type="button" data-session="${esc(p.session_id)}">${highlight(p.session, ts)}</button>
        · ${esc(p.session_type)} · ${esc(p.code)}
      </div>
      <div class="kw">${p.keywords.map((k) => `<button type="button" data-kw="${esc(k)}">${highlight(k, ts)}</button>`).join("")}</div>
    </div>
    <button type="button" class="star-btn" data-star="${esc(p.id)}" aria-pressed="${starred}"
      aria-label="${starred ? "Remove bookmark" : "Bookmark"}">${starred ? "★" : "☆"}</button>
  </article>`;
}

function renderDays() {
  const counts = dayCounts(papers, state, ctx);
  els.days.innerHTML = DAYS.map((d) =>
    `<button type="button" class="chip" data-day="${d}" aria-pressed="${state.days.has(d)}">${DAY_LABEL[d]}<span class="n">${counts[d]}</span></button>`
  ).join("");
}

function render() {
  const ts = terms(state.q);
  const res = filterPapers(papers, state, ctx);
  renderDays();
  els.starCount.textContent = ctx.stars.size ? `(${ctx.stars.size})` : "";
  const rel = res.filter((p) => p.relevant).length;
  els.summary.textContent = `${res.length.toLocaleString("en-US")} of ${papers.length.toLocaleString("en-US")} papers` +
    (rel && !state.rel ? ` · ${rel} calibration & state estimation` : "");
  if (!res.length) {
    els.list.innerHTML = `<p class="empty">No papers match these filters.</p>`;
    els.more.hidden = true;
    return;
  }
  let html = "";
  let day = null;
  for (const p of res.slice(0, shown)) {
    if (state.sort === "time" && p.day !== day) {
      day = p.day;
      html += `<h2 class="day-head">${day}, ${DAY_LABEL[day].slice(4)}</h2>`;
    }
    html += paperHtml(p, ts);
  }
  els.list.innerHTML = html;
  els.more.hidden = res.length <= shown;
  els.more.textContent = `Show ${Math.min(PAGE, res.length - shown)} more (${(res.length - shown).toLocaleString("en-US")} left)`;
}

function syncControls() {
  els.q.value = state.q;
  els.type.value = state.type;
  els.session.value = state.session;
  els.kw.value = state.kw;
  els.rel.checked = state.rel;
  els.noted.checked = state.noted;
  els.star.checked = state.star;
  els.sort.value = state.sort;
}

function update() {
  shown = PAGE;
  const h = toHash(state);
  history.replaceState(null, "", h ? `#${h}` : location.pathname);
  render();
}

function fillSelects() {
  const types = new Map();
  for (const p of papers) types.set(p.session_type, (types.get(p.session_type) || 0) + 1);
  for (const [t, n] of [...types].sort((a, b) => b[1] - a[1])) els.type.add(new Option(`${t} (${n})`, t));

  const sessions = new Map();
  for (const p of papers) {
    const s = sessions.get(p.session_id) || { id: p.session_id, day: p.day, time: p.time, title: p.session, n: 0 };
    if (p.time < s.time) s.time = p.time;
    s.n++;
    sessions.set(p.session_id, s);
  }
  for (const d of DAYS) {
    const group = document.createElement("optgroup");
    group.label = d;
    [...sessions.values()].filter((s) => s.day === d)
      .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
      .forEach((s) => group.appendChild(new Option(`${s.time} · ${s.title} (${s.n})`, s.id)));
    els.session.appendChild(group);
  }

  const kws = new Map();
  for (const p of papers) for (const k of p.keywords) kws.set(k, (kws.get(k) || 0) + 1);
  [...kws].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, n]) => els.kw.add(new Option(`${k} (${n})`, k)));
}

function bind() {
  let timer;
  els.q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = els.q.value.trim(); update(); }, 120);
  });
  for (const k of ["type", "session", "kw", "sort"]) {
    els[k].addEventListener("change", () => { state[k] = els[k].value; update(); });
  }
  for (const k of ["rel", "noted", "star"]) {
    els[k].addEventListener("change", () => { state[k] = els[k].checked; update(); });
  }
  els.days.addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (!b) return;
    const d = b.dataset.day;
    state.days.has(d) ? state.days.delete(d) : state.days.add(d);
    update();
  });
  els.reset.addEventListener("click", () => {
    state = emptyState();
    syncControls();
    update();
  });
  els.more.addEventListener("click", () => { shown += PAGE; render(); });
  els.list.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.star) {
      const id = b.dataset.star;
      ctx.stars.has(id) ? ctx.stars.delete(id) : ctx.stars.add(id);
      saveSet(KEYS.papers, ctx.stars);
      if (state.star) { render(); return; }
      const on = ctx.stars.has(id);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark");
      b.textContent = on ? "★" : "☆";
      els.starCount.textContent = ctx.stars.size ? `(${ctx.stars.size})` : "";
    } else if (b.dataset.session || b.dataset.kw) {
      if (b.dataset.session) state.session = b.dataset.session;
      else state.kw = b.dataset.kw;
      syncControls();
      update();
      window.scrollTo({ top: 0 });
    }
  });
  window.addEventListener("hashchange", () => {
    state = parseHash(location.hash);
    syncControls();
    shown = PAGE;
    render();
  });
}

async function init() {
  try {
    papers = await (await fetch(url("data/papers-index.json"))).json();
  } catch {
    els.summary.textContent = "Could not load the paper list. Reload the page to try again.";
    return;
  }
  for (const p of papers) p._hay = haystack(p);
  const nNotes = Object.keys(notes).length;
  els.notedCount.textContent = nNotes ? `(${nNotes})` : "";
  fillSelects();
  state = parseHash(location.hash);
  syncControls();
  bind();
  render();
}

init();
