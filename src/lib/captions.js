// Captions for photo galleries: what a photo belongs to, when and where.
import { url } from "./url.js";

const DATE = { Sunday: "Sun 27 Sep", Monday: "Mon 28 Sep", Tuesday: "Tue 29 Sep", Wednesday: "Wed 30 Sep", Thursday: "Thu 1 Oct" };

export const paperCaption = (p) => ({
  title: p.title,
  meta: `${DATE[p.day]} ${p.time} · Rm ${p.room} · ${p.code}`,
  href: url(`paper/${p.id}.html`),
});

export const workshopCaption = (w) => ({
  title: w.title,
  meta: `${w.id} · ${DATE[w.day]} ${w.start}–${w.end} · Rm ${w.room}`,
  href: url(`posters.html#${w.id.toLowerCase()}`),
});

export const eventCaption = (title) => ({ title, meta: "IROS 2026" });
