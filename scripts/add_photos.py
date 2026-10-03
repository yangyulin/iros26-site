"""Publish poster photos as per-paper notes.

Reads photos/matches.json (photo -> paper id, optional crop/blur boxes) and the
originals in photos/raw/, writes resized, EXIF-free WebP files to
notes/<paper id>/ and merges the photo lists into data/notes.json. Note text
already in data/notes.json is kept.

    python3 scripts/add_photos.py
"""
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "photos" / "raw"
MATCHES = ROOT / "photos" / "matches.json"
NOTES_JSON = ROOT / "data" / "notes.json"
NOTES_DIR = ROOT / "notes"

PREVIEW = 1600  # boxes in matches.json are in this preview's coordinates
FULL, THUMB = 1600, 480


def box(b, scale):
    return tuple(round(v * scale) for v in b)


def process(entry):
    """Return the cleaned full-size image for one photo entry."""
    im = ImageOps.exif_transpose(Image.open(RAW / entry["file"])).convert("RGB")
    scale = max(im.size) / PREVIEW
    for b in entry.get("blur", []):
        region = box(b, scale)
        patch = im.crop(region).filter(ImageFilter.GaussianBlur(radius=40 * scale))
        im.paste(patch, region[:2])
    if "crop" in entry:
        im = im.crop(box(entry["crop"], scale))
    return im


def main():
    papers = {p["id"] for p in json.loads((ROOT / "data" / "papers.json").read_text())}
    notes = json.loads(NOTES_JSON.read_text()) if NOTES_JSON.exists() else {}
    photos_by_paper = {}

    for entry in json.loads(MATCHES.read_text())["photos"]:
        if "skip" in entry:
            print(f"skip {entry['file']}: {entry['skip']}")
            continue
        pid = entry["paper"]
        assert pid in papers, f"{entry['file']}: unknown paper id {pid}"
        out = NOTES_DIR / pid
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(entry["file"]).stem.lower()

        im = process(entry)
        full = im.copy()
        full.thumbnail((FULL, FULL))
        full.save(out / f"{stem}.webp", "WEBP", quality=82)  # Pillow writes no EXIF unless asked
        thumb = im.copy()
        thumb.thumbnail((THUMB, THUMB))
        thumb.save(out / f"{stem}-thumb.webp", "WEBP", quality=78)

        photos_by_paper.setdefault(pid, []).append({
            "src": f"notes/{pid}/{stem}.webp",
            "thumb": f"notes/{pid}/{stem}-thumb.webp",
        })
        print(f"{entry['file']} -> notes/{pid}/{stem}.webp {full.size}")

    for pid, photos in photos_by_paper.items():
        note = notes.setdefault(pid, {"text": ""})
        note["photos"] = photos
    NOTES_JSON.write_text(json.dumps(dict(sorted(notes.items(), key=lambda kv: int(kv[0]))), ensure_ascii=False, indent=1) + "\n")
    print(f"{len(photos_by_paper)} papers with photos -> {NOTES_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
