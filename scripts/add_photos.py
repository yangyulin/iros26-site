"""Publish conference photos as notes on papers, workshops and events.

Reads photos/matches.json (photo -> paper id, workshop id or event key, optional
crop/blur boxes; events are defined in its "events" map) and the
originals in photos/raw/, writes resized, EXIF-free WebP files to
public/notes/<key>/ (480 px thumb, 1600 px display, up to 3000 px zoom
for reading poster text in the lightbox) and the photo list, with the zoom
image's pixel size, into the front matter of
src/content/notes/<key>.md (key = paper id, lowercased workshop id or event key).
The note body (your text) is never touched.

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


def note_file(kind, key, title, photos, body):
    lines = ["---", f'{kind}: "{key}"']
    if title:
        lines.append(f'title: "{title}"')
    lines.append("photos:")
    for ph in photos:
        lines += [f"  - src: {ph['src']}", f"    thumb: {ph['thumb']}", f"    zoom: {ph['zoom']}",
                  f"    width: {ph['width']}", f"    height: {ph['height']}"]
    return "\n".join(lines) + "\n---\n" + body


def target(entry, papers, workshops, events):
    """(kind, id, note key, title) for a matches.json entry; exits on an unknown id."""
    if "paper" in entry:
        if entry["paper"] not in papers:
            raise SystemExit(f"{entry['file']}: unknown paper id {entry['paper']}")
        return "paper", entry["paper"], entry["paper"], None
    if "workshop" in entry:
        if entry["workshop"] not in workshops:
            raise SystemExit(f"{entry['file']}: unknown workshop id {entry['workshop']}")
        return "workshop", entry["workshop"], entry["workshop"].lower(), None
    if entry.get("event") in events:
        return "event", entry["event"], entry["event"], events[entry["event"]]
    raise SystemExit(f"{entry['file']}: needs a known paper, workshop or event (events are listed in matches.json)")


def run(root):
    root = Path(root)
    papers = {p["id"] for p in json.loads((root / "data" / "papers.json").read_text())}
    ws_path = root / "data" / "workshops.json"
    workshops = {w["id"] for w in json.loads(ws_path.read_text())} if ws_path.exists() else set()
    matches = json.loads((root / "photos" / "matches.json").read_text())
    events = matches.get("events", {})
    notes = {}  # note key -> {kind, id, title, photos}
    for entry in matches["photos"]:
        if "skip" in entry:
            print(f"skip {entry['file']}: {entry['skip']}")
            continue
        kind, iid, key, title = target(entry, papers, workshops, events)
        out = root / "public" / "notes" / key
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
        note = notes.setdefault(key, {"kind": kind, "id": iid, "title": title, "photos": []})
        note["photos"].append({
            "src": f"notes/{key}/{stem}.webp", "thumb": f"notes/{key}/{stem}-thumb.webp",
            "zoom": f"notes/{key}/{stem}-zoom.webp", "width": sizes[ZOOM][0], "height": sizes[ZOOM][1],
        })
        print(f"{entry['file']} -> public/notes/{key}/{stem}.webp")

    notes_dir = root / "src" / "content" / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    for key, n in notes.items():
        path = notes_dir / f"{key}.md"
        body = note_body(path.read_text()) if path.exists() else "\n"
        path.write_text(note_file(n["kind"], n["id"], n["title"], n["photos"], body))
    print(f"{len(notes)} notes (papers, workshops, events) -> src/content/notes/")
    return {k: n["photos"] for k, n in notes.items()}


if __name__ == "__main__":
    run(Path(__file__).resolve().parent.parent)
