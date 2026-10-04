# iros26-site

Searchable program for IROS 2026 (Pittsburgh, 27 Sep – 1 Oct 2026):
papers, workshops and schedule. Tracked in mira: `tasks/iros-26/website/`.

## Site

Astro 6 static site (MVIS look) deployed by `.github/workflows/deploy.yml` to https://yangyulin.net/iros26-site/.

- `src/pages/` — `index.astro` (papers), `paper/[id].astro` (one page per paper: photos, notes, PDF links),
  `posters.astro` (Photos: papers, workshops, events), `workshops.astro`, `schedule.astro`,
  `data/papers-index.json.js` (client paper list)
- `src/lib/` — pure query logic (unit-tested in `tests/*.test.js`), `src/scripts/` — page DOM glue
- Local: `npm install`, `npm run dev`; checks: `npm test`, `python3 -m unittest discover -s tests -p "test_*.py"`,
  `npm run build && npm run preview` then `npm run smoke` (`-- <base url>` to test another server)
- PDF links: `scripts/find_pdfs.py` (arXiv) → `data/pdfs.json`; Infovaya presentation links → `data/infovaya.json`
  (links only; Infovaya PDFs are never published)

## Data

`python3 scripts/build_data.py` turns `data/raw/` into `data/{papers,workshops,schedule}.json`
and checks the counts against the official totals.

| File | Count | Source |
|---|---|---|
| `raw/papers_gisbi-kim.json` | 1,933 papers | Official Paper & Author Index, parsed by [gisbi-kim/iros2026-explorer](https://github.com/gisbi-kim/iros2026-explorer) (`output/papers.json`, last push 2026-08-26; repo has no license, personal use only) |
| `raw/workshops.jsonl` | 86 (44 Sun + 42 Thu) | https://2026.ieee-iros.org/program/workshops/ (fetched 2026-10-01) |
| `raw/schedule.jsonl` | 68 blocks | https://2026.ieee-iros.org/program/program-overview/ (fetched 2026-10-01) |

Notes:
- The official site blocks scripted downloads (Cloudflare WAF 403), so the workshop and schedule data
  came from a page fetch, not a scraper. It can't be re-run automatically.
- The workshop data has no organizers or external URLs yet.
- The schedule was extracted from a grid by a model. The Wednesday 08:30 talk blocks it produced are dropped in
  `build_data.py` (no paper starts before 09:00 on any day), leaving 65 blocks.
- Papers have no abstracts. `relevant` = the "Calibration & state estimation" topic tag: title terms plus
  RAS keywords (see `is_topic` in the build script).

- `raw/papers_gisbi-kim.json` is not in this repo (upstream has no license); fetch it from
  gisbi-kim/iros2026-explorer to re-run the build. Program data © IEEE/IROS 2026 organizers;
  credit to gisbi-kim for the index parse.

## Poster notes

Photos from the Drive folder `Iros2026` → `photos/raw/` (gitignored):
`rclone copy gdrive: photos/raw --drive-root-folder-id 1QHz3YEL6BsmDEKlM82UozbciHg7Y77G_`.
`photos/matches.json` maps each photo to a paper id, with crop/blur boxes that remove bystanders' faces.
`python3 scripts/add_photos.py` writes EXIF-free WebP (1600 px + 480 px thumb) to `public/notes/<paper id>/`
and the photo list into `src/content/notes/<paper id>.md`. Write your note as the Markdown body of that file;
re-running the script never touches the body.
