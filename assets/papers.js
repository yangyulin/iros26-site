// IROS 2026 paper list: search, filters, bookmarks, and per-paper photo notes.
// Data: data/papers.json (scripts/build_data.py) and optional data/notes.json
// ({ "<paper id>": { "text": "...", "photos": [{ "src": "notes/<id>/<file>.webp", "thumb": "..." }] } },
// written by scripts/add_photos.py; "text" is plain text, blank lines separate paragraphs).
(() => {
  "use strict";

  const PAGE = 150;
  const DAYS = ["Monday", "Tuesday", "Wednesday"];
  const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed" };
  const STAR_KEY = "iros26.stars";

  const $ = (id) => document.getElementById(id);
  const els = {
    q: $("q"), days: $("days"), type: $("type"), session: $("session"), kw: $("kw"),
    rel: $("rel"), star: $("star"), noted: $("noted"), notedCount: $("noted-count"), starCount: $("star-count"), sort: $("sort"),
    reset: $("reset"), summary: $("summary"), list: $("list"), more: $("more"),
  };

  let papers = [];
  let notes = {};
  let stars = loadStars();
  let shown = PAGE;
  const state = { q: "", days: new Set(), type: "", session: "", kw: "", rel: false, star: false, noted: false, sort: "time" };

  function loadStars() {
    try { return new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]")); } catch { return new Set(); }
  }
  function saveStars() {
    try { localStorage.setItem(STAR_KEY, JSON.stringify([...stars])); } catch { /* storage blocked */ }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const terms = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);

  // Escape text and wrap search-term matches in <mark>; split on the raw text so entities stay intact.
  function highlight(text, ts) {
    if (!ts.length) return esc(text);
    const re = new RegExp(`(${ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
  }

  // ---- filtering ------------------------------------------------------------

  function matches(p, ts, ignoreDay) {
    if (!ignoreDay && state.days.size && !state.days.has(p.day)) return false;
    if (state.type && p.session_type !== state.type) return false;
    if (state.session && p.session_id !== state.session) return false;
    if (state.kw && !p.keywords.includes(state.kw)) return false;
    if (state.rel && !p.relevant) return false;
    if (state.star && !stars.has(p.id)) return false;
    if (state.noted && !notes[p.id]) return false;
    return ts.every((t) => p._hay.includes(t));
  }

  function filtered() {
    const ts = terms();
    const out = papers.filter((p) => matches(p, ts, false));
    if (state.sort === "title") out.sort((a, b) => a.title.localeCompare(b.title));
    return out;
  }

  // ---- rendering ------------------------------------------------------------

  function renderDays() {
    const ts = terms();
    const counts = Object.fromEntries(DAYS.map((d) => [d, 0]));
    for (const p of papers) if (matches(p, ts, true)) counts[p.day]++;
    els.days.innerHTML = DAYS.map((d) =>
      `<button type="button" class="chip" data-day="${d}" aria-pressed="${state.days.has(d)}">` +
      `${DAY_SHORT[d]} ${d === "Monday" ? "28" : d === "Tuesday" ? "29" : "30"} Sep<span class="n">${counts[d]}</span></button>`
    ).join("");
  }

  function authorsHtml(p, ts) {
    const max = 8;
    const names = p.authors.slice(0, max).map((a) => highlight(a, ts)).join(", ");
    const more = p.authors.length > max ? ` <span class="muted">+${p.authors.length - max} more</span>` : "";
    const affs = [...new Set(p.affiliations.filter(Boolean))];
    return `<div class="authors">${names}${more}</div>` +
      (affs.length ? `<div class="affs">${affs.slice(0, 4).map((a) => highlight(a, ts)).join(" · ")}${affs.length > 4 ? " · …" : ""}</div>` : "");
  }

  function notesHtml(p) {
    const n = notes[p.id];
    if (!n) return "";
    const text = (n.text || "").trim();
    const paras = text ? text.split(/\n\s*\n/).map((t) => `<p>${esc(t)}</p>`).join("") : "";
    const photos = (n.photos || []).map((ph) =>
      `<a href="${esc(ph.src)}" target="_blank" rel="noopener"><img src="${esc(ph.thumb || ph.src)}" alt="Poster photo" loading="lazy"></a>`
    ).join("");
    return `<div class="notes">${paras ? `<div class="note-text">${paras}</div>` : ""}${photos ? `<div class="note-photos">${photos}</div>` : ""}</div>`;
  }

  function noteBadge(p) {
    const n = notes[p.id];
    if (!n) return "";
    const k = (n.photos || []).length;
    const label = [n.text && n.text.trim() ? "notes" : "", k ? `${k} photo${k > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
    return label ? `<span class="badge award">${label}</span>` : "";
  }

  function paperHtml(p, ts) {
    const starred = stars.has(p.id);
    const badges =
      (p.relevant ? `<span class="badge">calib &amp; state est.</span>` : "") +
      (p.session_type === "Award Candidates" ? `<span class="badge award">award candidate</span>` : "") +
      noteBadge(p);
    return `<article class="paper${p.relevant ? " is-rel" : ""}" id="p${esc(p.id)}">
      <div class="when"><b>${p.time}</b>${DAY_SHORT[p.day]} · Rm ${esc(p.room)}</div>
      <div>
        <h3>${highlight(p.title, ts)}${badges}</h3>
        ${authorsHtml(p, ts)}
        <div class="meta">
          <button type="button" data-session="${esc(p.session_id)}">${highlight(p.session, ts)}</button>
          · ${esc(p.session_type)} · ${esc(p.code)}
        </div>
        <div class="kw">${p.keywords.map((k) => `<button type="button" data-kw="${esc(k)}">${highlight(k, ts)}</button>`).join("")}</div>
        ${notesHtml(p)}
      </div>
      <button type="button" class="star-btn" data-star="${esc(p.id)}" aria-pressed="${starred}"
        aria-label="${starred ? "Remove bookmark" : "Bookmark"}">${starred ? "★" : "☆"}</button>
    </article>`;
  }

  function render() {
    const ts = terms();
    const res = filtered();
    renderDays();
    els.starCount.textContent = stars.size ? `(${stars.size})` : "";
    const rel = res.filter((p) => p.relevant).length;
    els.summary.textContent = `${res.length.toLocaleString()} of ${papers.length.toLocaleString()} papers` +
      (rel && !state.rel ? ` · ${rel} calibration & state estimation` : "");

    if (!res.length) {
      els.list.innerHTML = `<p class="empty">No papers match these filters.</p>`;
      els.more.hidden = true;
      return;
    }
    const page = res.slice(0, shown);
    let html = "";
    let day = null;
    for (const p of page) {
      if (state.sort === "time" && p.day !== day) {
        day = p.day;
        html += `<h2 class="day-head">${day}, ${p.date.slice(8)} Sep</h2>`;
      }
      html += paperHtml(p, ts);
    }
    els.list.innerHTML = html;
    els.more.hidden = res.length <= shown;
    els.more.textContent = `Show ${Math.min(PAGE, res.length - shown)} more (${(res.length - shown).toLocaleString()} left)`;
  }

  // ---- URL state ------------------------------------------------------------

  function writeHash() {
    const h = new URLSearchParams();
    if (state.q) h.set("q", state.q);
    if (state.days.size) h.set("day", [...state.days].join(","));
    for (const k of ["type", "session", "kw", "sort"]) if (state[k] && !(k === "sort" && state[k] === "time")) h.set(k, state[k]);
    if (state.rel) h.set("rel", "1");
    if (state.star) h.set("star", "1");
    if (state.noted) h.set("notes", "1");
    const s = h.toString();
    history.replaceState(null, "", s ? `#${s}` : location.pathname);
  }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    state.q = h.get("q") || "";
    state.days = new Set((h.get("day") || "").split(",").filter((d) => DAYS.includes(d)));
    state.type = h.get("type") || "";
    state.session = h.get("session") || "";
    state.kw = h.get("kw") || "";
    state.sort = h.get("sort") === "title" ? "title" : "time";
    state.rel = h.get("rel") === "1";
    state.star = h.get("star") === "1";
    state.noted = h.get("notes") === "1";
  }

  function syncControls() {
    els.q.value = state.q;
    els.type.value = state.type;
    els.session.value = state.session;
    els.kw.value = state.kw;
    els.rel.checked = state.rel;
    els.star.checked = state.star;
    els.noted.checked = state.noted;
    els.sort.value = state.sort;
  }

  function update() {
    shown = PAGE;
    writeHash();
    render();
  }

  // ---- setup ----------------------------------------------------------------

  function fillSelects() {
    const count = (key) => papers.reduce((m, p) => m.set(p[key], (m.get(p[key]) || 0) + 1), new Map());

    for (const [t, n] of [...count("session_type")].sort((a, b) => b[1] - a[1])) {
      els.type.add(new Option(`${t} (${n})`, t));
    }

    const sessions = new Map();
    for (const p of papers) {
      const s = sessions.get(p.session_id) || { id: p.session_id, day: p.day, date: p.date, time: p.time, title: p.session, room: p.room, n: 0 };
      if (p.time < s.time) s.time = p.time;
      s.n++;
      sessions.set(p.session_id, s);
    }
    for (const d of DAYS) {
      const g = document.createElement("optgroup");
      g.label = d;
      [...sessions.values()].filter((s) => s.day === d).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
        .forEach((s) => g.appendChild(new Option(`${s.time} · ${s.title} (${s.n})`, s.id)));
      els.session.appendChild(g);
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
    for (const k of ["rel", "star", "noted"]) {
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
      Object.assign(state, { q: "", days: new Set(), type: "", session: "", kw: "", rel: false, star: false, noted: false, sort: "time" });
      syncControls();
      update();
    });
    els.more.addEventListener("click", () => { shown += PAGE; render(); });

    els.list.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.star) {
        const id = b.dataset.star;
        stars.has(id) ? stars.delete(id) : stars.add(id);
        saveStars();
        if (state.star) { render(); return; }
        const on = stars.has(id);
        b.setAttribute("aria-pressed", on);
        b.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark");
        b.textContent = on ? "★" : "☆";
        els.starCount.textContent = stars.size ? `(${stars.size})` : "";
      } else if (b.dataset.session) {
        state.session = b.dataset.session;
        syncControls();
        update();
        window.scrollTo({ top: 0 });
      } else if (b.dataset.kw) {
        state.kw = b.dataset.kw;
        syncControls();
        update();
        window.scrollTo({ top: 0 });
      }
    });
    window.addEventListener("hashchange", () => { readHash(); syncControls(); shown = PAGE; render(); });
  }

  async function init() {
    try {
      papers = await (await fetch("data/papers.json")).json();
    } catch (err) {
      els.summary.textContent = "Could not load data/papers.json — serve the site over HTTP (python3 -m http.server).";
      return;
    }
    try {
      const r = await fetch("data/notes.json");
      if (r.ok) notes = await r.json();
    } catch { /* no notes yet */ }
    for (const p of papers) {
      p._hay = [p.title, p.code, p.session, p.room, ...p.authors, ...p.affiliations, ...p.keywords].join(" \u0001 ").toLowerCase();
    }
    const nNotes = Object.keys(notes).length;
    els.notedCount.textContent = nNotes ? `(${nNotes})` : "";
    fillSelects();
    readHash();
    syncControls();
    bind();
    render();
  }

  init();
})();
