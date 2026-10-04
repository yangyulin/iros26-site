"""Find a public PDF (mostly arXiv preprints) for each IROS 2026 paper.

Exact title match (case, spacing and punctuation ignored) plus a first-author
surname check on the arXiv API (one request per 3 s, per arXiv's terms). With
OPENALEX_API_KEY set (free key: https://openalex.org/), OpenAlex is tried first
and also finds non-arXiv open-access PDFs; without a key its shared daily budget
runs out within ~100 searches, so it is skipped. Writes
data/pdfs.json: { "<paper id>": { "url": ..., "source": "arxiv" | "openalex" } }.
Lookups are cached in data/raw/pdf_cache.json (gitignored), so re-runs only
query papers not tried yet.

    python3 scripts/find_pdfs.py
"""
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "raw" / "pdf_cache.json"
OUT = ROOT / "data" / "pdfs.json"
MAILTO = "yangyulin1@gmail.com"  # OpenAlex polite pool
OPENALEX_KEY = os.environ.get("OPENALEX_API_KEY", "")
ATOM = "{http://www.w3.org/2005/Atom}"
STOP = {"with", "from", "into", "over", "under", "using", "via", "towards", "toward", "their", "that", "this", "through"}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def surname(author):
    """'Mendez-Mendez, Jorge' -> 'mendezmendez'."""
    return norm(author.split(",")[0])


class RateLimited(Exception):
    pass


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": f"iros26-site/1.0 (mailto:{MAILTO})"})
            return urllib.request.urlopen(req, timeout=30).read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise RateLimited(url.split("/")[2]) from e
            if i == tries - 1:
                raise
        except Exception:
            if i == tries - 1:
                raise
        time.sleep(3 * (i + 1))


def arxiv_pdf(url):
    m = re.search(r"arxiv\.org/(?:abs|pdf)/([^?#\s]+?)(?:v\d+)?(?:\.pdf)?$", url or "")
    return f"https://arxiv.org/pdf/{m.group(1)}" if m else None


def openalex(paper):
    q = urllib.parse.urlencode({
        "search": paper["title"], "per-page": 5, "mailto": MAILTO, "api_key": OPENALEX_KEY,
        "select": "title,authorships,locations,best_oa_location",
    })
    for w in json.loads(get("https://api.openalex.org/works?" + q))["results"]:
        if norm(w["title"]) != norm(paper["title"]):
            continue
        names = " ".join(norm(a["author"]["display_name"]) for a in w["authorships"])
        if paper["authors"] and surname(paper["authors"][0]) not in names:
            continue
        urls = [loc.get("pdf_url") or loc.get("landing_page_url") for loc in w["locations"]]
        for u in urls:
            if arxiv_pdf(u):
                return {"url": arxiv_pdf(u), "source": "arxiv"}
        oa = (w.get("best_oa_location") or {}).get("pdf_url")
        if oa:
            return {"url": oa, "source": "openalex"}
    return None


def arxiv(paper):
    # Stopwords in a ti: clause make arXiv return nothing, so query only the content words.
    words = [w for w in re.sub(r"[^A-Za-z0-9 ]", " ", paper["title"]).split() if len(w) > 3 and w.lower() not in STOP]
    q = urllib.parse.quote(" AND ".join(f"ti:{w}" for w in words[:8]))
    root = ET.fromstring(get(f"https://export.arxiv.org/api/query?search_query={q}&max_results=5"))
    for e in root.iter(f"{ATOM}entry"):
        if norm(e.findtext(f"{ATOM}title")) != norm(paper["title"]):
            continue
        names = " ".join(norm(a.findtext(f"{ATOM}name")) for a in e.iter(f"{ATOM}author"))
        if paper["authors"] and surname(paper["authors"][0]) not in names:
            continue
        return {"url": arxiv_pdf(e.findtext(f"{ATOM}id")), "source": "arxiv"}
    return None


def main():
    papers = json.loads((ROOT / "data" / "papers.json").read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    stages = [("openalex", openalex, 0.15)] if OPENALEX_KEY else []
    for stage, fn, pause in stages + [("arxiv", arxiv, 3.1)]:
        todo = [p for p in papers if stage not in cache.get(p["id"], {}) and not any(
            cache.get(p["id"], {}).get(s) for s in ("openalex", "arxiv"))]
        print(f"{stage}: {len(todo)} papers to look up")
        for n, p in enumerate(todo, 1):
            try:
                cache.setdefault(p["id"], {})[stage] = fn(p)
            except RateLimited as e:
                print(f"  {stage}: rate-limited by {e}; stopping this stage (re-run later to resume)")
                break
            except Exception as e:  # leave uncached so a re-run retries it
                print(f"  {p['id']}: {stage} failed ({e})")
            time.sleep(pause)
            if n % 50 == 0 or n == len(todo):
                CACHE.write_text(json.dumps(cache))
                found = sum(1 for c in cache.values() if c.get("openalex") or c.get("arxiv"))
                print(f"  {stage} {n}/{len(todo)}  found so far {found}")
        CACHE.write_text(json.dumps(cache))
    out = {}
    for p in papers:
        c = cache.get(p["id"], {})
        hit = c.get("openalex") or c.get("arxiv")
        if hit:
            out[p["id"]] = hit
    OUT.write_text(json.dumps(dict(sorted(out.items(), key=lambda kv: int(kv[0]))), indent=1) + "\n")
    print(f"{len(out)} of {len(papers)} papers have a PDF -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
