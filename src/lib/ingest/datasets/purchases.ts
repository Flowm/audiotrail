import type { Purchase } from "@/types/models";
import type { RawPurchaseRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { isoDate, num, sentinel } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

export const purchasesDataset: DatasetDescriptor = {
  key: "purchases",
  label: "Purchases",
  match: [/Audible\.PurchaseHistory\/[^/]*\.csv$/i, /Account & Membership\/Purchase History\.csv$/i],

  async parse(files) {
    const warnings: string[] = [];
    const purchases: Purchase[] = [];
    let skipped = 0;

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
      for (const raw of rows) {
        const row = raw as RawPurchaseRow;
        const orderPlaceDate = isoDate(row["Order Place Date"]);
        const orderId = sentinel(row["Order ID"]);
        if (orderPlaceDate === null || orderId === null) {
          skipped += 1;
          continue;
        }
        purchases.push({
          orderPlaceDate,
          orderFulfillDate: isoDate(row["Order Fulfill Date"]),
          orderId,
          status: sentinel(row.Status),
          type: sentinel(row.Type),
          preorder: sentinel(row["Preorder Desc"]) === "PRE-ORDER",
          saleType: sentinel(row["Sale Type Desc"]),
          regularPrice: num(row["Regular Price"]),
          discount: num(row.Discount),
          consumedCredit: num(row["Consumed Credit"]),
          pricePaid: num(row["Price Paid Member"]),
          tax: num(row.Tax),
          currency: sentinel(row.Currency),
          productName: sentinel(row["Product Name"]),
          asin: sentinel(row.ASIN),
          channel: sentinel(row.Action),
        });
      }
    }

    if (skipped > 0) warnings.push(`skipped ${skipped} row(s) without order id/date`);
    purchases.sort((a, b) => (a.orderPlaceDate < b.orderPlaceDate ? -1 : 1));
    return { patch: { purchases }, rows: purchases.length, warnings };
  },
};
