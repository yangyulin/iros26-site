import { describe, it, expect } from "vitest";
import { groupRows, papersInBlock, workshopsInBlock } from "../src/lib/schedule.js";

const papers = [
  { id: "1", day: "Monday", session_type: "Lightning Talks", time: "09:12" },
  { id: "2", day: "Monday", session_type: "Lightning Talks", time: "14:41" },
  { id: "3", day: "Monday", session_type: "Award Candidates", time: "09:00" },
  { id: "4", day: "Tuesday", session_type: "Lightning Talks", time: "09:12" },
];
const workshops = [
  { id: "W1", day: "Sunday", length: "full-day", start: "08:30" },
  { id: "W2", day: "Sunday", length: "half-day", start: "08:30" },
  { id: "W3", day: "Sunday", length: "half-day", start: "13:30" },
  { id: "W4", day: "Thursday", length: "half-day", start: "13:30" },
];
const talk = (o) => ({ day: "Monday", start: "09:00", end: "10:15", type: "contributed_talks", title: "Contributed Talks (Lightning)", ...o });
const ids = (xs) => xs.map((x) => x.id);

describe("papersInBlock", () => {
  it("matches day, session type and half of the day", () => {
    expect(ids(papersInBlock(talk(), papers))).toEqual(["1"]);
    expect(ids(papersInBlock(talk({ start: "14:30", end: "15:45" }), papers))).toEqual(["2"]);
  });
  it("maps Awards blocks to award candidates", () => {
    expect(ids(papersInBlock(talk({ type: "awards", title: "Awards" }), papers))).toEqual(["3"]);
  });
  it("is null for blocks that are not talks", () => {
    expect(papersInBlock(talk({ type: "keynote", title: "Keynotes" }), papers)).toBeNull();
    expect(papersInBlock(talk({ type: "awards", title: "Awards Lunch" }), papers)).toBeNull();
  });
});

describe("workshopsInBlock", () => {
  const block = (day, title) => ({ day, type: "workshop", title });
  it("morning block = full-day + morning workshops that day", () => {
    expect(ids(workshopsInBlock(block("Sunday", "Workshop A1"), workshops))).toEqual(["W1", "W2"]);
  });
  it("afternoon block = full-day + afternoon", () => {
    expect(ids(workshopsInBlock(block("Sunday", "Workshop B2"), workshops))).toEqual(["W1", "W3"]);
    expect(ids(workshopsInBlock(block("Thursday", "Workshop D1"), workshops))).toEqual(["W4"]);
  });
  it("is null for other blocks", () => {
    expect(workshopsInBlock({ day: "Sunday", type: "break", title: "Lunch (On Own)" }, workshops)).toBeNull();
  });
});

describe("groupRows", () => {
  it("groups identical spans in first-seen order", () => {
    const rows = groupRows([
      { start: "09:00", end: "10:15", title: "a" },
      { start: "10:15", end: "11:15", title: "b" },
      { start: "09:00", end: "10:15", title: "c" },
    ]);
    expect(rows.map(([span, bs]) => [span, bs.map((b) => b.title)])).toEqual([
      ["09:00–10:15", ["a", "c"]],
      ["10:15–11:15", ["b"]],
    ]);
  });
});
