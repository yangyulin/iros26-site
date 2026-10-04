import { describe, it, expect } from "vitest";
import { emptyWsState, matchWorkshop, slotOf, wsParseHash, wsToHash } from "../src/lib/workshops.js";

const W = (o) => ({ id: "W01", type: "workshop", title: "T", day: "Sunday", length: "half-day", start: "08:30", end: "12:30", room: "401", relevant: false, ...o });
const items = [
  W({ id: "W01", length: "full-day", end: "17:30", title: "Industrial Robot Learning" }),
  W({ id: "W02", title: "Data in Field Robotics: From State Estimation to Navigation", relevant: true }),
  W({ id: "W03", day: "Thursday", start: "13:30", end: "17:30", type: "tutorial", room: "336" }),
];
const ids = (o, stars = new Set(), ignore = null) => {
  const st = Object.assign(emptyWsState(), o);
  return items.filter((w) => matchWorkshop(w, st, (st.q || "").toLowerCase().split(/\s+/).filter(Boolean), stars, ignore)).map((w) => w.id);
};

describe("slotOf", () => {
  it("full-day, morning, afternoon", () => expect(items.map(slotOf)).toEqual(["full", "am", "pm"]));
});

describe("matchWorkshop", () => {
  it("filters by day, slot, type, topic, bookmarks and text", () => {
    expect(ids({ days: new Set(["Thursday"]) })).toEqual(["W03"]);
    expect(ids({ slots: new Set(["full", "am"]) })).toEqual(["W01", "W02"]);
    expect(ids({ type: "tutorial" })).toEqual(["W03"]);
    expect(ids({ rel: true })).toEqual(["W02"]);
    expect(ids({ star: true }, new Set(["W01"]))).toEqual(["W01"]);
    expect(ids({ q: "336" })).toEqual(["W03"]);
  });
  it("ignore drops one chip group so its chips can count every option", () => {
    expect(ids({ days: new Set(["Thursday"]) }, new Set(), "days")).toEqual(["W01", "W02", "W03"]);
  });
});

describe("workshop hash", () => {
  it("reads v1 links", () => {
    const st = wsParseHash("#day=Thursday&time=full,am&type=tutorial&rel=1");
    expect([...st.days]).toEqual(["Thursday"]);
    expect([...st.slots]).toEqual(["full", "am"]);
    expect(st.type).toBe("tutorial");
    expect(st.rel).toBe(true);
  });
  it("round-trips and ignores junk", () => {
    const st = Object.assign(emptyWsState(), { q: "a&b", days: new Set(["Sunday"]), slots: new Set(["pm"]), star: true });
    const back = wsParseHash("#" + wsToHash(st));
    expect({ ...back, days: [...back.days], slots: [...back.slots] }).toEqual({ ...st, days: ["Sunday"], slots: ["pm"] });
    expect([...wsParseHash("#day=Monday&time=night").days]).toEqual([]);
  });
});
