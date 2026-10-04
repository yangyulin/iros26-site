"""Normalize raw IROS 2026 program data into data/{papers,workshops,schedule}.json.

Inputs (data/raw/):
  papers_gisbi-kim.json  - parsed official Paper & Author Index (github.com/gisbi-kim/iros2026-explorer)
  workshops.jsonl        - official Workshops & Tutorials page
  schedule.jsonl         - official Program Overview grid
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"

DATES = {"Sunday": "2026-09-27", "Monday": "2026-09-28", "Tuesday": "2026-09-29",
         "Wednesday": "2026-09-30", "Thursday": "2026-10-01"}

# "Calibration & state estimation" topic tag. Title terms + RAS keywords; bare "localization",
# "inertial" and "sensor fusion" over-matched in v1 (sound-source localization, radar scene recon).
TOPIC_TITLE = re.compile(
    r"(?<!confidence )(?<!uncertainty )calibrat(?!ion[- ]free)|visual[- ]inertial|\bVIO\b|\bVINS\b|\bIMU\b|"
    r"inertial (?:odometry|navigation)|SLAM|odometry|state estimation|kalman|factor graph|"
    r"rolling[- ]shutter|extrinsic|hand[- ]eye",
    re.I,
)
TOPIC_KEYWORDS = {"Calibration and Identification", "Localization"}


def is_topic(title, keywords):
    return bool(TOPIC_TITLE.search(title)) or any(k in TOPIC_KEYWORDS or "SLAM" in k for k in keywords)


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def to_24h(t):
    """'8:30 AM' -> '08:30'."""
    h, m, ap = re.fullmatch(r"(\d{1,2}):(\d{2})\s*(AM|PM)", t.strip()).groups()
    h = int(h) % 12 + (12 if ap == "PM" else 0)
    return f"{h:02d}:{m}"


def build_papers():
    raw = json.loads((RAW / "papers_gisbi-kim.json").read_text())["papers"]
    papers = []
    for p in raw:
        papers.append({
            "id": p["paper_number"],
            "code": p["code"],
            "title": p["title"],
            "authors": [a["name"] for a in p["authors"]],
            "affiliations": [a.get("aff", "") for a in p["authors"]],
            "keywords": p["keywords"],
            "session_id": p["session"],
            "session": p["session_title"],
            "session_type": p["session_type"],
            "day": p["day"],
            "date": DATES[p["day"]],
            "time": p["time"].zfill(5),  # '9:00' -> '09:00' so times sort as strings
            "room": p["room"],
            "relevant": is_topic(p["title"], p["keywords"]),
        })
    papers.sort(key=lambda p: (p["date"], p["time"], p["room"], p["id"]))
    return papers


def build_workshops():
    out = []
    for i, w in enumerate(read_jsonl(RAW / "workshops.jsonl"), 1):
        length, start, end = re.fullmatch(r"(full-day|half-day)\s+(.+?)–(.+)", w["time"]).groups()
        out.append({
            "id": f"W{i:02d}",
            "type": w["type"],
            "title": w["title"],
            "day": w["day"],
            "date": DATES[w["day"]],
            "length": length,
            "start": to_24h(start),
            "end": to_24h(end),
            "room": w["room"],
            "relevant": is_topic(w["title"], []),
        })
    return out


def build_schedule():
    rows = read_jsonl(RAW / "schedule.jsonl")
    # The grid extraction produced Wednesday 08:30-09:00 talk blocks that the paper data contradicts:
    # no paper on any day starts before 09:00, and Mon/Tue have no such block. Drop them.
    rows = [r for r in rows if "unverified" not in r.get("notes", "")]
    for r in rows:
        assert DATES[r["day"]] == r["date"], r
    rows.sort(key=lambda r: (r["date"], r["start"], r["title"]))
    return rows


def check(papers, workshops, schedule):
    assert len(schedule) == 65, len(schedule)
    assert len(papers) == 1933, len(papers)
    assert len({p["id"] for p in papers}) == len(papers), "duplicate paper ids"
    assert len(workshops) == 86, len(workshops)
    by_day = {d: sum(w["day"] == d for w in workshops) for d in ("Sunday", "Thursday")}
    assert by_day == {"Sunday": 44, "Thursday": 42}, by_day
    assert {p["day"] for p in papers} <= {"Monday", "Tuesday", "Wednesday"}
    for p in papers:
        assert re.fullmatch(r"\d{2}:\d{2}", p["time"]) and p["room"] and p["title"], p
    return by_day


def main():
    papers, workshops, schedule = build_papers(), build_workshops(), build_schedule()
    by_day = check(papers, workshops, schedule)
    for name, data in [("papers", papers), ("workshops", workshops), ("schedule", schedule)]:
        (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    days = {d: sum(p["day"] == d for p in papers) for d in ("Monday", "Tuesday", "Wednesday")}
    print(f"papers    {len(papers)}  by day {days}  sessions {len({p['session_id'] for p in papers})}"
          f"  relevant {sum(p['relevant'] for p in papers)}")
    print(f"workshops {len(workshops)}  by day {by_day}  relevant {sum(w['relevant'] for w in workshops)}")
    print(f"schedule  {len(schedule)} blocks")


if __name__ == "__main__":
    main()
