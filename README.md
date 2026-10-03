# iros26-site

Searchable program for IROS 2026 (Pittsburgh, 27 Sep – 1 Oct 2026):
papers, workshops and schedule. Tracked in mira: `tasks/iros-26/website/`.

## Site

Static HTML/CSS/JS — `index.html` (papers), `workshops.html`, `schedule.html`, `assets/` — over `data/papers.json`, served by GitHub Pages:
https://yangyulin.github.io/iros26-site/. Local preview: `python3 -m http.server`.

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
- Papers have no abstracts. `relevant` = regex match on calibration / VIO / SLAM / state-estimation terms
  (see `RELEVANT` in the build script).

- `raw/papers_gisbi-kim.json` is not in this repo (upstream has no license); fetch it from
  gisbi-kim/iros2026-explorer to re-run the build. Program data © IEEE/IROS 2026 organizers;
  credit to gisbi-kim for the index parse.

## Poster notes

Photos from the Drive folder `Iros2026` → `photos/raw/` (gitignored, via `rclone copy gdrive: photos/raw --drive-root-folder-id <folder id>`).
`photos/matches.json` maps each photo to a paper id, with crop/blur boxes that remove bystanders' faces.
`python3 scripts/add_photos.py` writes EXIF-free WebP (1600px + 480px thumb) to `notes/<paper id>/` and merges
them into `data/notes.json`. Add your own text under `"text"` for a paper in `data/notes.json` (blank line = new paragraph).
