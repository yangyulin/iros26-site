// Build-time access to poster notes, validated against the paper list and public/ files.
import { existsSync } from "node:fs";
import { getCollection } from "astro:content";
import papers from "../../data/papers.json";

const paperIds = new Set(papers.map((p) => p.id));

export async function loadNotes() {
  const byPaper = new Map();
  for (const entry of await getCollection("notes")) {
    const { paper, photos } = entry.data;
    if (!paperIds.has(paper)) throw new Error(`Note ${entry.id}.md: paper id "${paper}" is not in data/papers.json`);
    if (byPaper.has(paper)) throw new Error(`Paper ${paper} has more than one note file`);
    for (const ph of photos) {
      for (const file of [ph.src, ph.thumb]) {
        if (!existsSync(`public/${file}`)) throw new Error(`Note ${entry.id}.md: missing photo public/${file}`);
      }
    }
    byPaper.set(paper, entry);
  }
  return byPaper;
}

// What the client-side paper list needs: { "<paper id>": { photos: n, text: bool } }.
export async function noteIndex() {
  const out = {};
  for (const [id, entry] of await loadNotes()) {
    out[id] = { photos: entry.data.photos.length, text: Boolean(entry.body?.trim()) };
  }
  return out;
}
