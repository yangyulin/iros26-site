// Pure workshop-query logic for the workshops page.
export const WDAYS = ["Sunday", "Thursday"];
export const SLOTS = ["full", "am", "pm"];

export const slotOf = (w) => (w.length === "full-day" ? "full" : w.start < "12:00" ? "am" : "pm");

export const emptyWsState = () => ({ q: "", days: new Set(), slots: new Set(), type: "", rel: false, star: false });

export function matchWorkshop(w, st, ts, stars, ignore = null) {
  if (ignore !== "days" && st.days.size && !st.days.has(w.day)) return false;
  if (ignore !== "slots" && st.slots.size && !st.slots.has(slotOf(w))) return false;
  if (st.type && w.type !== st.type) return false;
  if (st.rel && !w.relevant) return false;
  if (st.star && !stars.has(w.id)) return false;
  const hay = `${w.title} ${w.room} ${w.type}`.toLowerCase();
  return ts.every((t) => hay.includes(t));
}

export function wsToHash(st) {
  const h = new URLSearchParams();
  if (st.q) h.set("q", st.q);
  if (st.days.size) h.set("day", [...st.days].join(","));
  if (st.slots.size) h.set("time", [...st.slots].join(","));
  if (st.type) h.set("type", st.type);
  if (st.rel) h.set("rel", "1");
  if (st.star) h.set("star", "1");
  return h.toString();
}

export function wsParseHash(hash) {
  const h = new URLSearchParams(String(hash).replace(/^#/, ""));
  const st = emptyWsState();
  st.q = h.get("q") || "";
  st.days = new Set((h.get("day") || "").split(",").filter((d) => WDAYS.includes(d)));
  st.slots = new Set((h.get("time") || "").split(",").filter((s) => SLOTS.includes(s)));
  st.type = h.get("type") || "";
  st.rel = h.get("rel") === "1";
  st.star = h.get("star") === "1";
  return st;
}
