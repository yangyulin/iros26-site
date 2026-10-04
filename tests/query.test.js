import { describe, it, expect } from "vitest";
import { dayCounts, emptyState, filterPapers, highlight, parseHash, toHash } from "../src/lib/query.js";

const P = (o) => ({
  id: "1", code: "W1 · #1", title: "T", authors: [], affiliations: [], keywords: [], session_id: "s",
  session: "S", session_type: "Lightning Talks", day: "Monday", time: "09:00", room: "301", relevant: false, topics: [], ...o,
});
const papers = [
  P({ id: "1", title: "Visual-Inertial Odometry", day: "Monday", relevant: true, keywords: ["SLAM"], topics: ["slam", "inertial"] }),
  P({ id: "2", title: "Grasping Soft Objects", day: "Tuesday", authors: ["Huang, Guoquan"], session_type: "Focused Sessions" }),
  P({ id: "3", title: "Calibration & Identification of Arms", day: "Wednesday", keywords: ["Calibration and Identification"], relevant: true }),
];
const ctx = { stars: new Set(["2"]), notes: { 3: { photos: 1, text: false } } };
const state = (o) => Object.assign(emptyState(), o);
const plain = (st) => ({ ...st, days: [...st.days] });

describe("hash state", () => {
  it("round-trips every field, including & + and spaces in values", () => {
    const st = state({
      q: "a&b c+d", days: new Set(["Monday", "Wednesday"]), type: "Focused Sessions", session: "383c1d",
      kw: "Calibration and Identification", topic: "feed-forward", rel: true, star: true, noted: true, sort: "title",
    });
    expect(plain(parseHash("#" + toHash(st)))).toEqual(plain(st));
  });
  it("reads v1 links", () => {
    const st = parseHash("#q=calibration&rel=1&day=Tuesday&kw=Sensor+Fusion&notes=1");
    expect(plain(st)).toEqual(plain(state({ q: "calibration", rel: true, days: new Set(["Tuesday"]), kw: "Sensor Fusion", noted: true })));
  });
  it("drops unknown days and junk values", () => {
    const st = parseHash("#day=Funday,Monday&sort=bogus&rel=yes&topic=astrology");
    expect(st.topic).toBe("");
    expect([...st.days]).toEqual(["Monday"]);
    expect(st.sort).toBe("time");
    expect(st.rel).toBe(false);
  });
  it("empty state gives an empty hash", () => expect(toHash(emptyState())).toBe(""));
});

describe("filterPapers", () => {
  const ids = (o) => filterPapers(papers, state(o), ctx).map((p) => p.id);
  it("needs every term, in any field, any case", () => {
    expect(ids({ q: "huang GRASPING" })).toEqual(["2"]);
    expect(ids({ q: "huang odometry" })).toEqual([]);
  });
  it("filters by day, type, keyword, topic, bookmarks and notes", () => {
    expect(ids({ days: new Set(["Monday", "Tuesday"]) })).toEqual(["1", "2"]);
    expect(ids({ type: "Focused Sessions" })).toEqual(["2"]);
    expect(ids({ kw: "SLAM" })).toEqual(["1"]);
    expect(ids({ rel: true })).toEqual(["1", "3"]);
    expect(ids({ star: true })).toEqual(["2"]);
    expect(ids({ noted: true })).toEqual(["3"]);
    expect(ids({ topic: "inertial" })).toEqual(["1"]);
  });
  it("sorts by title on request, keeps data order otherwise", () => {
    expect(ids({ sort: "title" })).toEqual(["3", "2", "1"]);
    expect(ids({})).toEqual(["1", "2", "3"]);
  });
  it("day counts ignore the day filter itself", () => {
    expect(dayCounts(papers, state({ days: new Set(["Monday"]) }), ctx)).toEqual({ Monday: 1, Tuesday: 1, Wednesday: 1 });
    expect(dayCounts(papers, state({ rel: true }), ctx)).toEqual({ Monday: 1, Tuesday: 0, Wednesday: 1 });
  });
});

describe("highlight", () => {
  it("escapes HTML and never splits entities", () => {
    expect(highlight("A & B <x>", ["b"])).toBe("A &amp; <mark>B</mark> &lt;x&gt;");
    expect(highlight("amp & lamp", ["amp"])).toBe("<mark>amp</mark> &amp; l<mark>amp</mark>");
  });
  it("treats regex characters literally", () => {
    expect(highlight("C++ (fast)", ["c++"])).toBe("<mark>C++</mark> (fast)");
  });
  it("only escapes when there are no terms", () => expect(highlight("<b>", [])).toBe("&lt;b&gt;"));
});
