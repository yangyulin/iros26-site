"""Publish poster photos as per-paper notes.

Reads photos/matches.json (photo -> paper id, optional crop/blur boxes) and the
originals in photos/raw/, writes resized, EXIF-free WebP files to
public/notes/<paper id>/ (480 px thumb, 1600 px display, up to 3000 px zoom
for reading poster text in the lightbox) and the photo list, with the zoom
image's pixel size, into the front matter of
src/content/notes/<paper id>.md. The note body (your text) is never touched.

    python3 scripts/add_photos.py
"""
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

PREVIEW = 1600  # boxes in matches.json are in this preview's coordinates
FULL, THUMB, ZOOM = 1600, 480, 3000


def scaled(box, scale):
    return tuple(round(v * scale) for v in box)


def clean_image(path, entry):
    """Rotate per EXIF, blur bystanders, crop to the poster; returns an RGB image with no metadata."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.info.clear()
    scale = max(im.size) / PREVIEW
    for box in entry.get("blur", []):
        region = scaled(box, scale)
        im.paste(im.crop(region).filter(ImageFilter.GaussianBlur(radius=40 * scale)), region[:2])
    if "crop" in entry:
        im = im.crop(scaled(entry["crop"], scale))
    return im


def note_body(text):
    """Everything after the front matter of an existing note file."""
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[end + 5:]
    return text


def note_file(pid, photos, body):
    lines = ["---", f'paper: "{pid}"', "photos:"]
    for ph in photos:
        lines += [f"  - src: {ph['src']}", f"    thumb: {ph['thumb']}", f"    zoom: {ph['zoom']}",
                  f"    width: {ph['width']}", f"    height: {ph['height']}"]
    return "\n".join(lines) + "\n---\n" + body


def run(root):
    root = Path(root)
    papers = {p["id"] for p in json.loads((root / "data" / "papers.json").read_text())}
    photos_by_paper = {}
    for entry in json.loads((root / "photos" / "matches.json").read_text())["photos"]:
        if "skip" in entry:
            print(f"skip {entry['file']}: {entry['skip']}")
            continue
        pid = entry["paper"]
        if pid not in papers:
            raise SystemExit(f"{entry['file']}: unknown paper id {pid}")
        out = root / "public" / "notes" / pid
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(entry["file"]).stem.lower()
        im = clean_image(root / "photos" / "raw" / entry["file"], entry)
        sizes = {}
        for size, name, quality in [(FULL, f"{stem}.webp", 82), (THUMB, f"{stem}-thumb.webp", 82),
                                    (ZOOM, f"{stem}-zoom.webp", 80)]:
            copy = im.copy()
            copy.thumbnail((size, size))
            copy.save(out / name, "WEBP", quality=quality)
            sizes[size] = copy.size
        photos_by_paper.setdefault(pid, []).append({
            "src": f"notes/{pid}/{stem}.webp", "thumb": f"notes/{pid}/{stem}-thumb.webp",
            "zoom": f"notes/{pid}/{stem}-zoom.webp", "width": sizes[ZOOM][0], "height": sizes[ZOOM][1],
        })
        print(f"{entry['file']} -> public/notes/{pid}/{stem}.webp")

    notes_dir = root / "src" / "content" / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    for pid, photos in photos_by_paper.items():
        path = notes_dir / f"{pid}.md"
        body = note_body(path.read_text()) if path.exists() else "\n"
        path.write_text(note_file(pid, photos, body))
    print(f"{len(photos_by_paper)} papers with photos -> src/content/notes/")
    return photos_by_paper


if __name__ == "__main__":
    run(Path(__file__).resolve().parent.parent)
