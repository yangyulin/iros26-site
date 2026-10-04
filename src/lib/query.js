// Pure paper-query logic for the papers page: state, URL hash, matching, highlighting.
export const DAYS = ["Monday", "Tuesday", "Wednesday"];

export function emptyState() {
  return { q: "", days: new Set(), type: "", session: "", kw: "", rel: false, star: false, noted: false, sort: "time" };
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const terms = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);

// Escape text and wrap term matches in <mark>; splitting the raw text keeps entities intact.
export function highlight(text, ts) {
  if (!ts.length) return esc(text);
  const re = new RegExp(`(${ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
}

export function haystack(p) {
  return [p.title, p.code, p.session, p.room, ...p.authors, ...p.affiliations, ...p.keywords].join(" \u0001 ").toLowerCase();
}

// ctx = { stars: Set<id>, notes: { [id]: { photos, text } } }. ignoreDay lets the day chips count every day.
export function matchPaper(p, st, ts, ctx, ignoreDay = false) {
  if (!ignoreDay && st.days.size && !st.days.has(p.day)) return false;
  if (st.type && p.session_type !== st.type) return false;
  if (st.session && p.session_id !== st.session) return false;
  if (st.kw && !p.keywords.includes(st.kw)) return false;
  if (st.rel && !p.relevant) return false;
  if (st.star && !ctx.stars.has(p.id)) return false;
  if (st.noted && !ctx.notes[p.id]) return false;
  const hay = p._hay ?? haystack(p);
  return ts.every((t) => hay.includes(t));
}

export function filterPapers(papers, st, ctx) {
  const ts = terms(st.q);
  const out = papers.filter((p) => matchPaper(p, st, ts, ctx));
  if (st.sort === "title") out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export function dayCounts(papers, st, ctx) {
  const ts = terms(st.q);
  const counts = Object.fromEntries(DAYS.map((d) => [d, 0]));
  for (const p of papers) if (matchPaper(p, st, ts, ctx, true)) counts[p.day]++;
  return counts;
}

export function toHash(st) {
  const h = new URLSearchParams();
  if (st.q) h.set("q", st.q);
  if (st.days.size) h.set("day", [...st.days].join(","));
  for (const k of ["type", "session", "kw"]) if (st[k]) h.set(k, st[k]);
  if (st.sort !== "time") h.set("sort", st.sort);
  if (st.rel) h.set("rel", "1");
  if (st.star) h.set("star", "1");
  if (st.noted) h.set("notes", "1");
  return h.toString();
}

export function parseHash(hash) {
  const h = new URLSearchParams(String(hash).replace(/^#/, ""));
  const st = emptyState();
  st.q = h.get("q") || "";
  st.days = new Set((h.get("day") || "").split(",").filter((d) => DAYS.includes(d)));
  st.type = h.get("type") || "";
  st.session = h.get("session") || "";
  st.kw = h.get("kw") || "";
  st.sort = h.get("sort") === "title" ? "title" : "time";
  st.rel = h.get("rel") === "1";
  st.star = h.get("star") === "1";
  st.noted = h.get("notes") === "1";
  return st;
}
