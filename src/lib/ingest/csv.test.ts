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

  it("folds an unquoted-comma field-count mismatch into one calm note", () => {
    // Older exports leave the comma in a 'Audible,iPhone' manufacturer unquoted,
    // so the row parses with an extra field against the 5-column header.
    const { rows, warnings } = parseCsv(
      "First Activation Date,Last Activation Date,Player Manufacturer,Player Model,Player Type\n2024-03-02T00:23:35Z,2024-03-02T00:23:35Z,Audible,iPhone,iPhone,audible_adp",
    );
    expect(rows).toHaveLength(1); // read leniently, not dropped
    expect(warnings).toEqual(["1 row had an unexpected field count (an older export likely left a comma unquoted); read leniently"]);
  });

  it("collapses many field-count mismatches into a single note", () => {
    const { rows, warnings } = parseCsv("a,b,c\n1,x,y,extra\n2,p,q,extra\n3,m,n,extra");
    expect(rows).toHaveLength(3);
    expect(warnings).toEqual(["3 rows had an unexpected field count (an older export likely left a comma unquoted); read leniently"]);
  });
});
