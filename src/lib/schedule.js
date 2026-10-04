// Pure helpers for the schedule page: which papers and workshops belong to a program block.
export const TALK_TYPES = {
  "Contributed Talks (Focused)": "Focused Sessions",
  "Contributed Talks (Lightning)": "Lightning Talks",
  "Contributed Talks (Special)": "Special Sessions",
  Awards: "Award Candidates",
};

export const half = (t) => (t < "12:00" ? "am" : "pm");

// Papers presented in a talk block: same day, session type and half of the day; null for other blocks.
export function papersInBlock(block, papers) {
  const type = TALK_TYPES[block.title];
  if (!type || !["contributed_talks", "awards"].includes(block.type)) return null;
  return papers.filter((p) => p.day === block.day && p.session_type === type && half(p.time) === half(block.start));
}

// Workshop blocks A*/C* are mornings, B*/D* afternoons; full-day workshops belong to both.
export const workshopSlot = (block) => (/[AC]\d$/.test(block.title) ? "am" : "pm");

export function workshopsInBlock(block, workshops) {
  if (block.type !== "workshop") return null;
  const slot = workshopSlot(block);
  return workshops.filter((w) => w.day === block.day && (w.length === "full-day" || half(w.start) === slot));
}

// Blocks with the same start–end span share a row; rows keep the order they first appear in.
export function groupRows(blocks) {
  const rows = new Map();
  for (const b of blocks) {
    const span = `${b.start}–${b.end}`;
    if (!rows.has(span)) rows.set(span, []);
    rows.get(span).push(b);
  }
  return [...rows];
}
