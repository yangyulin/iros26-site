// Build-time access to photo notes (papers, workshops, events), validated against the
// program data and the files in public/.
import { existsSync } from "node:fs";
import { getCollection } from "astro:content";
import papers from "../../data/papers.json";
import workshops from "../../data/workshops.json";

const paperIds = new Set(papers.map((p) => p.id));
const workshopIds = new Set(workshops.map((w) => w.id));

function checkPhotos(entry) {
  for (const ph of entry.data.photos) {
    for (const file of [ph.src, ph.thumb, ph.zoom]) {
      if (!existsSync(`public/${file}`)) throw new Error(`Note ${entry.id}.md: missing photo public/${file}`);
    }
  }
}

// { papers: Map<paper id, entry>, workshops: Map<workshop id, entry>, events: entry[] }
export async function loadAllNotes() {
  const out = { papers: new Map(), workshops: new Map(), events: [] };
  for (const entry of await getCollection("notes")) {
    const { paper, workshop } = entry.data;
    checkPhotos(entry);
    if (paper) {
      if (!paperIds.has(paper)) throw new Error(`Note ${entry.id}.md: paper id "${paper}" is not in data/papers.json`);
      if (out.papers.has(paper)) throw new Error(`Paper ${paper} has more than one note file`);
      out.papers.set(paper, entry);
    } else if (workshop) {
      if (!workshopIds.has(workshop)) throw new Error(`Note ${entry.id}.md: workshop id "${workshop}" is not in data/workshops.json`);
      if (out.workshops.has(workshop)) throw new Error(`Workshop ${workshop} has more than one note file`);
      out.workshops.set(workshop, entry);
    } else {
      out.events.push(entry);
    }
  }
  return out;
}

export async function loadNotes() {
  return (await loadAllNotes()).papers;
}

// What the client-side paper list needs: { "<paper id>": { photos: n, text: bool, thumb: path | null } }.
export async function noteIndex() {
  const out = {};
  for (const [id, entry] of await loadNotes()) {
    out[id] = { photos: entry.data.photos.length, text: Boolean(entry.body?.trim()), thumb: entry.data.photos[0]?.thumb ?? null };
  }
  return out;
}
