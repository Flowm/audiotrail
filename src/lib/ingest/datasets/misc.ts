import type { CartItem, ContentReturn, DeviceActivation, Impression, MembershipEvent } from "@/types/models";
import type { RawCartRow, RawDeviceRow, RawImpressionRow, RawMembershipEventRow, RawReturnRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { epochMs, int, isoDate, num, sentinel } from "../normalize";
import type { VirtualFile } from "../provider";
import type { DatasetDescriptor, DatasetParseResult } from "./descriptor";

async function collectRows(files: VirtualFile[], warnings: string[]): Promise<Record<string, string>[]> {
  const all: Record<string, string>[] = [];
  for (const file of files) {
    const { rows, warnings: csvWarnings } = parseCsv(await file.text());
    warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
    all.push(...rows);
  }
  return all;
}

export const cartDataset: DatasetDescriptor = {
  key: "cart",
  label: "Cart history",
  match: /Audible\.CartHistory\/[^/]*\.csv$/i,

  async parse(files): Promise<DatasetParseResult> {
    const warnings: string[] = [];
    const cart: CartItem[] = (await collectRows(files, warnings)).map((raw) => {
      const row = raw as RawCartRow;
      return {
        addDate: isoDate(row["Add Date"]),
        productName: sentinel(row["Product Name"]),
        status: sentinel(row.Status),
      };
    });
    return { patch: { cart }, rows: cart.length, warnings };
  },
};

export const returnsDataset: DatasetDescriptor = {
  key: "returns",
  label: "Returns",
  match: /Audible\.ContentReturn\/[^/]*\.csv$/i,

  async parse(files): Promise<DatasetParseResult> {
    const warnings: string[] = [];
    const returns: ContentReturn[] = (await collectRows(files, warnings)).map((raw) => {
      const row = raw as RawReturnRow;
      return {
        orderCreationDate: isoDate(row["Order Creation Date"]),
        returnDate: isoDate(row["Return Close Date"]),
        productName: sentinel(row["Product Name"]),
        asin: sentinel(row.ASIN),
        price: num(row.Price),
        currency: sentinel(row["Currency Code"]),
        creditsRefunded: num(row["Credit Count"]),
        reason: sentinel(row["Return Reason"]),
      };
    });
    return { patch: { returns }, rows: returns.length, warnings };
  },
};

export const devicesDataset: DatasetDescriptor = {
  key: "devices",
  label: "Device activations",
  match: /Audible\.DeviceActivation\/.*\.csv$/i,

  async parse(files): Promise<DatasetParseResult> {
    const warnings: string[] = [];
    const devices: DeviceActivation[] = (await collectRows(files, warnings)).map((raw) => {
      const row = raw as RawDeviceRow;
      return {
        firstActivatedAt: epochMs(row["First Activation Date"]),
        lastActivatedAt: epochMs(row["Last Activation Date"]),
        manufacturer: sentinel(row["Player Manufacturer"]),
        model: sentinel(row["Player Model"]),
        playerType: sentinel(row["Player Type"]),
      };
    });
    devices.sort((a, b) => (a.firstActivatedAt ?? 0) - (b.firstActivatedAt ?? 0));
    return { patch: { devices }, rows: devices.length, warnings };
  },
};

export const impressionsDataset: DatasetDescriptor = {
  key: "impressions",
  label: "Adobe impressions",
  match: /Audible\.AdobeImpressions\/[^/]*\.csv$/i,

  async parse(files): Promise<DatasetParseResult> {
    const warnings: string[] = [];
    const impressions: Impression[] = (await collectRows(files, warnings)).map((raw) => {
      const row = raw as RawImpressionRow;
      return {
        eventDate: isoDate(row["Event Date"]),
        pageName: sentinel(row["Page Name"]),
        module: sentinel(row.Module),
        platform: sentinel(row.Platform),
        appVersion: sentinel(row["App Version"]),
      };
    });
    return { patch: { impressions }, rows: impressions.length, warnings };
  },
};

export const membershipEventsDataset: DatasetDescriptor = {
  key: "membershipEvents",
  label: "Membership events",
  match: /Audible\.MembershipEvent\/[^/]*\.csv$/i,

  async parse(files): Promise<DatasetParseResult> {
    const warnings: string[] = [];
    const membershipEvents: MembershipEvent[] = (await collectRows(files, warnings)).map((raw) => {
      const row = raw as RawMembershipEventRow;
      const flags: string[] = [];
      for (const [column, value] of Object.entries(row)) {
        if (column === "Event Count" || !column.endsWith(" Count")) continue;
        if ((int(value) ?? 0) > 0) flags.push(column.replace(/ Count$/, ""));
      }
      return {
        eventDate: isoDate(row["Event Date"]),
        businessEvent: sentinel(row["Business Event"]),
        action: sentinel(row.Action),
        flags,
      };
    });
    membershipEvents.sort((a, b) => ((a.eventDate ?? "") < (b.eventDate ?? "") ? -1 : 1));
    return { patch: { membershipEvents }, rows: membershipEvents.length, warnings };
  },
};
