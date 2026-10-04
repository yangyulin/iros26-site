import { describe, it, expect } from "vitest";
import { loadSet, saveSet } from "../src/lib/stars.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};
const blocked = {
  getItem() { throw new Error("SecurityError"); },
  setItem() { throw new Error("QuotaExceededError"); },
};

describe("stars storage", () => {
  it("round-trips a set", () => {
    const s = memory();
    expect(saveSet("k", new Set(["561", "831"]), s)).toBe(true);
    expect([...loadSet("k", s)]).toEqual(["561", "831"]);
  });
  it("blocked storage reads empty and reports a failed write", () => {
    expect(loadSet("k", blocked).size).toBe(0);
    expect(saveSet("k", new Set(["1"]), blocked)).toBe(false);
  });
  it("corrupt or non-array JSON reads empty", () => {
    const s = memory();
    s.setItem("a", "{not json");
    s.setItem("b", '{"x":1}');
    s.setItem("c", '"abc"');
    expect(loadSet("a", s).size + loadSet("b", s).size + loadSet("c", s).size).toBe(0);
  });
  it("missing localStorage global (Node) reads empty", () => expect(loadSet("k").size).toBe(0));
});
