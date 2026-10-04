"""scripts/add_photos.py: clean WebP output, Markdown front matter, note body preserved, bad ids rejected."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import add_photos  # noqa: E402


def make_root(tmp, matches):
    root = Path(tmp)
    (root / "data").mkdir()
    (root / "data" / "papers.json").write_text(json.dumps([{"id": "7"}, {"id": "8"}]))
    (root / "photos" / "raw").mkdir(parents=True)
    exif = Image.Exif()
    exif[0x010F] = "Apple"                 # Make
    exif[0x0132] = "2026:09:30 16:50:04"   # DateTime
    Image.new("RGB", (4032, 3024), "white").save(root / "photos" / "raw" / "IMG_1.JPG", exif=exif)
    (root / "photos" / "matches.json").write_text(json.dumps({"photos": matches}))
    return root


class AddPhotos(unittest.TestCase):
    def test_writes_clean_webp_and_note(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = make_root(tmp, [
                {"file": "IMG_1.JPG", "paper": "7", "crop": [0, 0, 800, 600], "blur": [[0, 0, 100, 100]]},
                {"file": "IMG_2.JPG", "paper": "8", "skip": "duplicate"},
            ])
            add_photos.run(root)
            full = Image.open(root / "public/notes/7/img_1.webp")
            thumb = Image.open(root / "public/notes/7/img_1-thumb.webp")
            zoom = Image.open(root / "public/notes/7/img_1-zoom.webp")
            self.assertEqual(full.size, (1600, 1200))  # 800x600 preview px = 2016x1512 raw px, shrunk to 1600
            self.assertEqual(zoom.size, (2016, 1512))  # below the 3000 px zoom cap: kept at raw resolution
            self.assertLessEqual(max(thumb.size), 480)
            self.assertEqual(len(full.getexif()) + len(zoom.getexif()), 0)
            note = (root / "src/content/notes/7.md").read_text()
            self.assertTrue(note.startswith('---\npaper: "7"\nphotos:\n'))
            self.assertIn(
                "  - src: notes/7/img_1.webp\n    thumb: notes/7/img_1-thumb.webp\n"
                "    zoom: notes/7/img_1-zoom.webp\n    width: 2016\n    height: 1512\n",
                note,
            )
            self.assertFalse((root / "src/content/notes/8.md").exists())

    def test_rerun_keeps_note_body(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = make_root(tmp, [{"file": "IMG_1.JPG", "paper": "7"}])
            add_photos.run(root)
            path = root / "src/content/notes/7.md"
            path.write_text(path.read_text().rstrip("\n") + "\nGreat poster on hand-eye calibration.\n")
            add_photos.run(root)
            self.assertTrue(path.read_text().endswith("\n---\nGreat poster on hand-eye calibration.\n"))

    def test_unknown_paper_id_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = make_root(tmp, [{"file": "IMG_1.JPG", "paper": "999"}])
            with self.assertRaises(SystemExit):
                add_photos.run(root)


if __name__ == "__main__":
    unittest.main()
