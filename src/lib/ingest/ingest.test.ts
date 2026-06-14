import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { TakeoutError } from "@/types/takeout";

import { ingestTakeout } from "./index";
import { zipProvider } from "./zip";

const LISTENING_HEADER =
  '"Start Date","End Date","Event Duration Milliseconds","Start Position Milliseconds","End Position Milliseconds","Product Name","ASIN","Book Length Milliseconds","Delivery Type","Narration Speed","Bookmark","Audio Type","Asin Owned","Listening Mode","Store","App Version","Local Timezone"';

const LISTENING_CSV =
  "﻿" +
  [
    LISTENING_HEADER,
    '"2024-01-02","2024-01-02","600000","0","600000","Book A","B000TEST01","3600000","Download","1.00","0","FullTitle","No","Offline","Audible","4.0","Europe/Berlin"',
  ].join("\n");

const LIBRARY_CSV = "﻿ASIN,title,authors,marketplace\nB000TEST01,Book A,Ann Author,www.audible.de\n";

const ACCOUNT_JSON = JSON.stringify({
  "audible.de": { "Creation Date": "2021-06-07T23:55:30.000Z" },
});

async function buildZip(entries: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) zip.file(path, content);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("ingestTakeout", () => {
  it("parses a complete mini-takeout and reports ignored files", async () => {
    const data = await buildZip({
      "Audible.Listening/Account Holder/Listening.csv": LISTENING_CSV,
      "Audible.Listening/Kids Profile 1/Listening.csv": LISTENING_CSV,
      "Audible.AudibleLibraryItemFactoryService/datasets/Library/Library.csv": LIBRARY_CSV,
      "Audible.CustomerOnboarding.4/CustomerOnboardingAttributes.json": ACCOUNT_JSON,
      "README.txt": "junk",
    });

    const { bundle, report } = await ingestTakeout(await zipProvider(data));

    expect(bundle.listening).toHaveLength(2);
    expect(bundle.profiles).toHaveLength(2);
    expect(bundle.library).toHaveLength(1);
    expect(bundle.account).toHaveLength(1);
    expect(report.recognizedFileCount).toBe(4);
    expect(report.ignoredPaths).toEqual(["README.txt"]);
    const byKey = new Map(report.datasets.map((d) => [d.key, d.status]));
    expect(byKey.get("listening")).toBe("loaded");
    expect(byKey.get("library")).toBe("loaded");
    expect(byKey.get("account")).toBe("loaded");
    expect(byKey.get("purchases")).toBe("missing");
  });

  it("tolerates a wrapper directory around the service folders", async () => {
    const data = await buildZip({
      "My Takeout/Audible.Listening/Account Holder/Listening.csv": LISTENING_CSV,
    });
    const { bundle } = await ingestTakeout(await zipProvider(data));
    expect(bundle.listening).toHaveLength(1);
    expect(bundle.profiles).toEqual(["Account Holder"]);
  });

  it("records missing datasets without failing (partial takeout)", async () => {
    const data = await buildZip({
      "Audible.Listening/Account Holder/Listening.csv": LISTENING_CSV,
    });
    const { bundle, report } = await ingestTakeout(await zipProvider(data));

    expect(bundle.listening).toHaveLength(1);
    expect(bundle.library).toEqual([]);
    const library = report.datasets.find((d) => d.key === "library")!;
    expect(library.status).toBe("missing");
  });

  it("rejects a zip with nothing recognizable", async () => {
    const data = await buildZip({ "photos/cat.txt": "meow" });
    await expect(ingestTakeout(await zipProvider(data))).rejects.toThrow(TakeoutError);
  });
});

describe("zipProvider", () => {
  it("rejects non-zip data with a friendly error", async () => {
    const garbage = new TextEncoder().encode("definitely not a zip");
    await expect(zipProvider(garbage)).rejects.toThrow(TakeoutError);
  });
});
