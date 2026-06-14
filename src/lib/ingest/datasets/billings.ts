import type { BillingEvent } from "@/types/models";
import type { RawBillingRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { int, isoDate, num, sentinel } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

export const billingsDataset: DatasetDescriptor = {
  key: "billings",
  label: "Membership billings",
  match: /Audible\.MembershipBillings\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = [];
    const billings: BillingEvent[] = [];
    let skipped = 0;

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
      for (const raw of rows) {
        const row = raw as RawBillingRow;
        const billingDate = isoDate(row["Tax Create Date"]);
        if (billingDate === null) {
          skipped += 1;
          continue;
        }
        billings.push({
          billingDate,
          periodStart: isoDate(row["Billing Period Start Date"]),
          periodEnd: isoDate(row["Billing Period End Date"]),
          baseAmount: num(row["Base Amount"]),
          tax: num(row.Tax),
          totalAmount: num(row["Total Amount"]),
          currency: sentinel(row.Currency),
          type: sentinel(row.Type),
          plan: sentinel(row.Plan),
          billingFreqMonths: int(row["Plan Billing Freq"]),
          planFee: num(row["Plan Billing Fee"]),
          offerName: sentinel(row["Offer Name"]),
          offerType: sentinel(row["Offer Type"]),
          taxReason: sentinel(row["Tax Reason"]),
          status: sentinel(row.Status),
        });
      }
    }

    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without a billing date`);
    billings.sort((a, b) => (a.billingDate < b.billingDate ? -1 : 1));
    return { patch: { billings }, rows: billings.length, warnings };
  },
};
