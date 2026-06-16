import type { Credit } from "@/types/models";
import type { RawCreditRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { isoDate, num, orderId, sentinel } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

export const creditsDataset: DatasetDescriptor = {
  key: "credits",
  label: "Credits",
  match: [/Audible\.Credits\/[^/]*\.csv$/i, /Account & Membership\/Credits History\.csv$/i],

  async parse(files) {
    const warnings: string[] = [];
    const credits: Credit[] = [];
    let skipped = 0;

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
      for (const raw of rows) {
        const row = raw as RawCreditRow;
        const issueDate = isoDate(row["Issue Date"]);
        if (issueDate === null) {
          skipped += 1;
          continue;
        }
        const creditStatus = sentinel(row["Credit Status"]);
        credits.push({
          issueDate,
          reason: sentinel(row["Credit Reason"]),
          plan: sentinel(row.Plan),
          consumedStatus: sentinel(row["Consumed Status"]),
          isActive: creditStatus === null ? null : creditStatus === "Active",
          consumedDate: isoDate(row["Consumed Date"]),
          expireDate: isoDate(row["Expire Date"]),
          consumedOrderId: orderId(row["Consumed Order"]),
          consumed: num(row["Consumed Credit"]) === 1,
          valueEur: num(row["Original Credit Revenue"]),
        });
      }
    }

    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without an issue date`);
    credits.sort((a, b) => (a.issueDate < b.issueDate ? -1 : 1));
    return { patch: { credits }, rows: credits.length, warnings };
  },
};
