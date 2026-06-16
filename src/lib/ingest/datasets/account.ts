import type { AccountInfo } from "@/types/models";
import type { RawAccountJson } from "@/types/raw";

import { parseCsv } from "../csv";
import { epochMs, yesNo } from "../normalize";
import type { VirtualFile } from "../provider";
import type { DatasetDescriptor } from "./descriptor";

/** marketplace → attribute → every value seen for it across the account files. */
type MarketplaceAttributes = Map<string, Map<string, string[]>>;

function push(buckets: MarketplaceAttributes, marketplace: string, attribute: string, value: string): void {
  let bucket = buckets.get(marketplace);
  if (!bucket) {
    bucket = new Map();
    buckets.set(marketplace, bucket);
  }
  const values = bucket.get(attribute);
  if (values) values.push(value);
  else bucket.set(attribute, [value]);
}

/** Old layout: { "<marketplace>": { "<Attribute>": "<value>" } } singletons. */
function readJson(text: string, buckets: MarketplaceAttributes): void {
  const json = JSON.parse(text) as RawAccountJson;
  for (const [marketplace, attributes] of Object.entries(json)) {
    if (typeof attributes !== "object" || attributes === null) continue;
    for (const [attribute, value] of Object.entries(attributes)) {
      if (typeof value === "string") push(buckets, marketplace, attribute, value);
    }
  }
}

/**
 * New (2026) layout: one CSV per account file, each a single row keyed by a
 * 'Marketplace' column. Every other column becomes an attribute; columns like
 * 'Account Details Creation Date' also feed the plain 'Creation Date' bucket so
 * "member since" stays the earliest creation timestamp across all the files.
 */
async function readCsv(file: VirtualFile, buckets: MarketplaceAttributes, warnings: string[]): Promise<void> {
  const { rows, warnings: csvWarnings } = parseCsv(await file.text());
  warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
  for (const row of rows) {
    const marketplace = row.Marketplace?.trim();
    if (!marketplace) continue;
    for (const [attribute, value] of Object.entries(row)) {
      if (attribute === "Marketplace" || typeof value !== "string") continue;
      push(buckets, marketplace, attribute, value);
      if (attribute !== "Creation Date" && attribute.endsWith("Creation Date")) {
        push(buckets, marketplace, "Creation Date", value);
      }
    }
  }
}

export const accountDataset: DatasetDescriptor = {
  key: "account",
  label: "Account attributes",
  // Old: JSON singletons. New (2026): CSV files under Account & Membership /
  // Preferences & Settings, each carrying a 'Marketplace' column.
  match: [
    /(AccountDetails|AccountCustomerAttribute|CustomerOnboardingAttributes|CustomerSegment)\.json$/i,
    /Account & Membership\/Account Details\.csv$/i,
    /Preferences & Settings\/(Customer Segment|Onboarding Preferences)\.csv$/i,
  ],

  async parse(files) {
    const warnings: string[] = [];
    const perMarketplace: MarketplaceAttributes = new Map();

    for (const file of files) {
      if (file.path.toLowerCase().endsWith(".csv")) {
        await readCsv(file, perMarketplace, warnings);
      } else {
        try {
          readJson(await file.text(), perMarketplace);
        } catch {
          warnings.push(`${file.path}: unreadable JSON — skipped`);
        }
      }
    }

    const account: AccountInfo[] = [...perMarketplace.entries()].map(([marketplace, attributes]) => {
      const first = (name: string): string | null => attributes.get(name)?.[0] ?? null;
      const creationDates = (attributes.get("Creation Date") ?? []).map((value) => epochMs(value)).filter((value): value is number => value !== null);
      return {
        marketplace,
        creationDate: creationDates.length > 0 ? Math.min(...creationDates) : null,
        region: first("Operational Region"),
        countryCode: first("Country Code"),
        customerSegment: first("Customer Segment"),
        appDownloaded: yesNo(first("App Downloaded")),
        hasLibraryContent: yesNo(first("Has Library Content")),
      };
    });

    return {
      patch: { account },
      rows: account.length,
      detail: account.length > 0 ? `marketplace${account.length === 1 ? "" : "s"}: ${account.map((a) => a.marketplace).join(", ")}` : undefined,
      warnings,
    };
  },
};
