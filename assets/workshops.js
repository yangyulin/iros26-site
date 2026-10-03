// IROS 2026 workshops & tutorials: search, day/time filters, bookmarks.
// Data: data/workshops.json (scripts/build_data.py).
(() => {
  "use strict";

  const DAYS = { Sunday: "Sun 27 Sep", Thursday: "Thu 1 Oct" };
  const SLOTS = { full: "Full day", am: "Morning", pm: "Afternoon" };
  const STAR_KEY = "iros26.workshop-stars";

  const $ = (id) => document.getElementById(id);
  const els = {
    q: $("q"), days: $("days"), slots: $("slots"), type: $("type"), rel: $("rel"), star: $("star"),
    starCount: $("star-count"), reset: $("reset"), summary: $("summary"), list: $("list"),
  };

  let items = [];
  let stars = loadStars();
  const state = { q: "", days: new Set(), slots: new Set(), type: "", rel: false, star: false };

  function loadStars() {
    try { return new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]")); } catch { return new Set(); }
  }
  function saveStars() {
    try { localStorage.setItem(STAR_KEY, JSON.stringify([...stars])); } catch { /* storage blocked */ }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const terms = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const slotOf = (w) => (w.length === "full-day" ? "full" : w.start < "12:00" ? "am" : "pm");

  function highlight(text, ts) {
    if (!ts.length) return esc(text);
    const re = new RegExp(`(${ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
  }

  // `ignore` drops one chip group so its own chips can show counts for every option.
  function matches(w, ts, ignore) {
    if (ignore !== "days" && state.days.size && !state.days.has(w.day)) return false;
    if (ignore !== "slots" && state.slots.size && !state.slots.has(w._slot)) return false;
    if (state.type && w.type !== state.type) return false;
    if (state.rel && !w.relevant) return false;
    if (state.star && !stars.has(w.id)) return false;
    return ts.every((t) => w._hay.includes(t));
  }

  function chips(el, labels, key, ts) {
    el.innerHTML = Object.entries(labels).map(([value, label]) => {
      const n = items.filter((w) => (key === "days" ? w.day : w._slot) === value && matches(w, ts, key)).length;
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
        <div class="meta">${DAYS[w.day]} · ${w.length} · <a href="${search}" target="_blank" rel="noopener">Find website</a></div>
      </div>
      <button type="button" class="star-btn" data-star="${w.id}" aria-pressed="${starred}"
        aria-label="${starred ? "Remove bookmark" : "Bookmark"}">${starred ? "★" : "☆"}</button>
    </article>`;
  }

  function render() {
    const ts = terms();
    chips(els.days, DAYS, "days", ts);
    chips(els.slots, SLOTS, "slots", ts);
    els.starCount.textContent = stars.size ? `(${stars.size})` : "";
    const res = items.filter((w) => matches(w, ts));
    els.summary.textContent = `${res.length} of ${items.length} workshops & tutorials`;
    if (!res.length) {
      els.list.innerHTML = `<p class="empty">No workshops match these filters.</p>`;
      return;
    }
    let html = "";
    for (const day of Object.keys(DAYS)) {
      const ofDay = res.filter((w) => w.day === day);
      if (!ofDay.length) continue;
      html += `<h2 class="day-head">${day === "Sunday" ? "Sunday, 27 Sep" : "Thursday, 1 Oct"}</h2>`;
      for (const [slot, label] of Object.entries(SLOTS)) {
        const group = ofDay.filter((w) => w._slot === slot);
        if (!group.length) continue;
        const span = slot === "full" ? "08:30–17:30" : slot === "am" ? "08:30–12:30" : "13:30–17:30";
        html += `<h3 class="slot-head">${label} <span class="muted">${span} · ${group.length}</span></h3>`;
        html += group.map((w) => card(w, ts)).join("");
      }
    }
    els.list.innerHTML = html;
  }

  function writeHash() {
    const h = new URLSearchParams();
    if (state.q) h.set("q", state.q);
    if (state.days.size) h.set("day", [...state.days].join(","));
    if (state.slots.size) h.set("time", [...state.slots].join(","));
    if (state.type) h.set("type", state.type);
    if (state.rel) h.set("rel", "1");
    if (state.star) h.set("star", "1");
    const s = h.toString();
    history.replaceState(null, "", s ? `#${s}` : location.pathname);
  }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    state.q = h.get("q") || "";
    state.days = new Set((h.get("day") || "").split(",").filter((d) => d in DAYS));
    state.slots = new Set((h.get("time") || "").split(",").filter((s) => s in SLOTS));
    state.type = h.get("type") || "";
    state.rel = h.get("rel") === "1";
    state.star = h.get("star") === "1";
  }

  function syncControls() {
    els.q.value = state.q;
    els.type.value = state.type;
    els.rel.checked = state.rel;
    els.star.checked = state.star;
  }

  function update() {
    writeHash();
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
      Object.assign(state, { q: "", days: new Set(), slots: new Set(), type: "", rel: false, star: false });
      syncControls();
      update();
    });
    els.list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-star]");
      if (!b) return;
      const id = b.dataset.star;
      stars.has(id) ? stars.delete(id) : stars.add(id);
      saveStars();
      render();
    });
    window.addEventListener("hashchange", () => { readHash(); syncControls(); render(); });
  }

  async function init() {
    try {
      items = await (await fetch("data/workshops.json")).json();
    } catch {
      els.summary.textContent = "Could not load data/workshops.json — serve the site over HTTP (python3 -m http.server).";
      return;
    }
    for (const w of items) {
      w._slot = slotOf(w);
      w._hay = `${w.title} ${w.room} ${w.type}`.toLowerCase();
    }
    const types = [...new Set(items.map((w) => w.type))].sort();
    for (const t of types) els.type.add(new Option(`${t[0].toUpperCase()}${t.slice(1)}s (${items.filter((w) => w.type === t).length})`, t));
    readHash();
    syncControls();
    bind();
    render();
  }

  init();
})();
