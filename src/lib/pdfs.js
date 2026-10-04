// Public PDF links found by scripts/find_pdfs.py: { "<paper id>": { url, source } }.
// Missing file = no links yet (the build still works before the first lookup run).
import { existsSync, readFileSync } from "node:fs";

export const pdfs = existsSync("data/pdfs.json") ? JSON.parse(readFileSync("data/pdfs.json", "utf8")) : {};
