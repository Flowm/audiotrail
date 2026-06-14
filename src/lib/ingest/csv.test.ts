import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("strips the UTF-8 BOM from the first header", () => {
    const { rows } = parseCsv('﻿"A","B"\n"1","2"');
    expect(rows).toEqual([{ A: "1", B: "2" }]);
  });

  it("keeps quoted embedded commas intact", () => {
    const { rows } = parseCsv('"Maker","Model"\n"Audible,iPhone","iPhone"');
    expect(rows[0]?.Maker).toBe("Audible,iPhone");
  });

  it("trims trailing spaces in headers (Signal strength quirk)", () => {
    const { rows } = parseCsv('"Time","Signal strength "\n"t1","weak"');
    expect(rows[0]?.["Signal strength"]).toBe("weak");
  });

  it("handles quote-only-when-needed files and skips blank lines", () => {
    const { rows } = parseCsv('a,b\n1,"x,y"\n\n2,plain\n');
    expect(rows).toEqual([
      { a: "1", b: "x,y" },
      { a: "2", b: "plain" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsv('"A","B"\r\n"1","2"\r\n');
    expect(rows).toEqual([{ A: "1", B: "2" }]);
  });
});
