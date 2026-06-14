import type {
  AccountInfo,
  BillingEvent,
  CartItem,
  CollectionInfo,
  CollectionItem,
  ContentReturn,
  Credit,
  DeviceActivation,
  Impression,
  LibraryItem,
  ListeningSession,
  MembershipEvent,
  PlaybackEvent,
  Purchase,
  SearchHit,
  SearchSession,
  WishlistItem,
} from "./models";

export const DATASET_KEYS = [
  "listening",
  "library",
  "purchases",
  "credits",
  "billings",
  "wishlist",
  "collections",
  "searchSessions",
  "searchHits",
  "playback",
  "cart",
  "returns",
  "devices",
  "impressions",
  "membershipEvents",
  "account",
] as const;

export type DatasetKey = (typeof DATASET_KEYS)[number];

/** Everything parsed from one takeout. Missing datasets stay empty arrays. */
export interface TakeoutBundle {
  /** Listening profile names, ordered by row count (main profile first). */
  profiles: string[];
  listening: ListeningSession[];
  library: LibraryItem[];
  purchases: Purchase[];
  credits: Credit[];
  billings: BillingEvent[];
  wishlist: WishlistItem[];
  collections: CollectionInfo[];
  collectionItems: CollectionItem[];
  searchSessions: SearchSession[];
  searchHits: SearchHit[];
  playback: PlaybackEvent[];
  cart: CartItem[];
  returns: ContentReturn[];
  devices: DeviceActivation[];
  impressions: Impression[];
  membershipEvents: MembershipEvent[];
  account: AccountInfo[];
}

export function emptyBundle(): TakeoutBundle {
  return {
    profiles: [],
    listening: [],
    library: [],
    purchases: [],
    credits: [],
    billings: [],
    wishlist: [],
    collections: [],
    collectionItems: [],
    searchSessions: [],
    searchHits: [],
    playback: [],
    cart: [],
    returns: [],
    devices: [],
    impressions: [],
    membershipEvents: [],
    account: [],
  };
}

export type DatasetStatusKind = "loaded" | "missing" | "error";

export interface DatasetStatus {
  key: DatasetKey;
  label: string;
  status: DatasetStatusKind;
  rows: number;
  /** Human extra like '2 profiles' or '3 files merged'. */
  detail: string | null;
  files: string[];
  warnings: string[];
  error: string | null;
}

export interface LoadReport {
  generatedAt: number;
  durationMs: number;
  /** Files found inside the zip (directories excluded). */
  entryCount: number;
  recognizedFileCount: number;
  ignoredPaths: string[];
  datasets: DatasetStatus[];
}

export interface IngestProgress {
  stage: "unzip" | "parse";
  datasetLabel: string | null;
  index: number;
  total: number;
}

/** Hard ingestion failure (unreadable zip / nothing recognizable inside). */
export class TakeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TakeoutError";
  }
}
