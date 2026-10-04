// Infovaya (IROS 2026 attendee platform) presentation ids: { "<paper id>": <presentation id> }.
// Only the presentation page is linked (login required); PDFs are never hosted or linked here.
import { existsSync, readFileSync } from "node:fs";

export const infovaya = existsSync("data/infovaya.json") ? JSON.parse(readFileSync("data/infovaya.json", "utf8")) : {};
export const infovayaUrl = (presentationId) => `https://events.infovaya.com/presentation?id=${presentationId}`;
