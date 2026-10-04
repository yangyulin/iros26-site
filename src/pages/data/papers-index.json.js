// Client copy of the paper list: drops the date (the day says it) and repeated affiliations,
// adds the public PDF link when one was found.
import papers from "../../../data/papers.json";
import { pdfs } from "../../lib/pdfs.js";

export function GET() {
  const slim = papers.map(({ date, affiliations, ...p }) => ({
    ...p,
    affiliations: [...new Set(affiliations.filter(Boolean))],
    ...(pdfs[p.id] ? { pdf: pdfs[p.id].url } : {}),
  }));
  return new Response(JSON.stringify(slim));
}
