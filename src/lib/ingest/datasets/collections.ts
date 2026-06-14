import type { CollectionInfo, CollectionItem } from "@/types/models";
import type { RawCollectionRow } from "@/types/raw";

import { parseCsv } from "../csv";
import { epochMs, int, sentinel, yesNo } from "../normalize";
import type { DatasetDescriptor } from "./descriptor";

const SYSTEM_IDS = new Set(["PENDING", "PURCHASE", "WISHLIST", "ARCHIVE", "AYCL"]);

/**
 * The takeout ships two byte-identical Collections files with two row kinds:
 * collection headers (ASIN empty, carries totals) and item rows (ASIN set).
 * Rows are deduplicated across files by their full identity.
 */
export const collectionsDataset: DatasetDescriptor = {
  key: "collections",
  label: "Collections",
  match: /AudibleGlobalLibraryService\/datasets\/Collections[^/]*\/[^/]*\.csv$/i,

  async parse(files) {
    const warnings: string[] = [];
    const collections: CollectionInfo[] = [];
    const collectionItems: CollectionItem[] = [];
    const seen = new Set<string>();
    let rawRows = 0;

    for (const file of files) {
      const { rows, warnings: csvWarnings } = parseCsv(await file.text());
      warnings.push(...csvWarnings.map((warning) => `${file.path}: ${warning}`));
      for (const raw of rows) {
        rawRows += 1;
        const row = raw as RawCollectionRow;
        const id = sentinel(row.collection_id);
        if (id === null) continue;

        const asin = sentinel(row.ASIN);
        const identity = [id, asin, row.title_added_date, row.collection_creation_date].join("|");
        if (seen.has(identity)) continue;
        seen.add(identity);

        if (asin === null) {
          const type = sentinel(row.collection_type);
          collections.push({
            id,
            name: sentinel(row.collection_name),
            description: sentinel(row.collection_description),
            type,
            isSystem: type === "PermanentCollection" || SYSTEM_IDS.has(id),
            createdAt: epochMs(row.collection_creation_date),
            lastModified: epochMs(row.last_modified_date),
            isPublic: yesNo(row.is_public_collection),
            isArchived: yesNo(row.is_collection_archived),
            totalItems: int(row.total_items_in_collection),
          });
        } else {
          collectionItems.push({
            collectionId: id,
            collectionName: sentinel(row.collection_name),
            asin,
            productName: sentinel(row.product_name),
            addedAt: epochMs(row.title_added_date),
            deletedAt: epochMs(row.title_deletion_date),
            isDeleted: yesNo(row.is_title_deleted),
          });
        }
      }
    }

    return {
      patch: { collections, collectionItems },
      rows: collections.length + collectionItems.length,
      detail: `${collections.length} collections · ${collectionItems.length} items (from ${rawRows} raw rows)`,
      warnings,
    };
  },
};
