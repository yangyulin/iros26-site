// Client copy of the paper list: drops the date (the day says it) and repeated affiliations.
import papers from "../../../data/papers.json";

export function GET() {
  const slim = papers.map(({ date, affiliations, ...p }) => ({
    ...p,
    affiliations: [...new Set(affiliations.filter(Boolean))],
  }));
  return new Response(JSON.stringify(slim));
}
