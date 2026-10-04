import { describe, it, expect } from "vitest";
import { joinBase } from "../src/lib/url.js";

describe("joinBase", () => {
  it("adds exactly one slash between base and path", () => {
    expect(joinBase("/iros26-site", "index.html")).toBe("/iros26-site/index.html");
    expect(joinBase("/iros26-site/", "/paper/3549.html")).toBe("/iros26-site/paper/3549.html");
    expect(joinBase("/", "notes/6/img_2791.webp")).toBe("/notes/6/img_2791.webp");
  });
  it("keeps hashes and queries intact", () => {
    expect(joinBase("/iros26-site/", "index.html#kw=Calibration+and+Identification")).toBe(
      "/iros26-site/index.html#kw=Calibration+and+Identification"
    );
  });
});
