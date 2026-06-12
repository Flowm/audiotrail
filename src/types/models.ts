declare const isoDateBrand: unique symbol

/**
 * Date-only string 'YYYY-MM-DD'. Kept as a branded string (never a Date) so
 * daily granularity survives JSON round-trips with zero timezone pitfalls.
 * Construct via `isoDate()` in lib/ingest/normalize.
 */
export type IsoDate = string & { readonly [isoDateBrand]: true }

/** One row of Listening.csv — a single listening session/event on one day. */
export interface ListeningSession {
  /** Folder name under Audible.Listening/, e.g. 'Account Holder'. */
  profile: string
  startDate: IsoDate
  endDate: IsoDate | null
  /** Wall-clock listening time of the session. */
  durationMs: number
  startPositionMs: number | null
  endPositionMs: number | null
  productName: string
  asin: string | null
  bookLengthMs: number | null
  /** 'Download' | 'Streaming' */
  deliveryType: string | null
  /** '0.00' anomalies are normalized to null. */
  narrationSpeed: number | null
  /** 'FullTitle' | 'Preview' | 'CatalogSample' — only FullTitle feeds book stats. */
  audioType: string | null
  /** 'Online' | 'Offline' */
  listeningMode: string | null
  appVersion: string | null
  timezone: string | null
}

export interface SeriesRef {
  asin: string | null
  title: string
}

/** A library title merged across the per-marketplace Library files. */
export interface LibraryItem {
  asin: string
  title: string
  subtitle: string | null
  lengthMinutes: number | null
  authors: string[]
  narrators: string[]
  purchaseDate: number | null
  lastUpdated: number | null
  isFinished: boolean | null
  /** 'Active' | 'Revoked' (returned). */
  ownership: string | null
  availableInLibrary: boolean | null
  /** Lowercase ISO 639-1, e.g. 'en', 'de'. */
  language: string | null
  publisher: string | null
  /** A book can belong to several series (e.g. a saga and its universe). */
  series: SeriesRef[]
  /** 'SinglePartBook' | 'MultiPartBook' */
  contentDeliveryType: string | null
  acquisitionMethod: string | null
  formatType: string | null
  /** e.g. 'AccessViaMusic' marks Plus-catalog access. */
  planTier: string | null
  isAdultProduct: boolean | null
  hasNextInSeries: boolean | null
  marketplaces: string[]
}

/** One order line from PurchaseHistory. */
export interface Purchase {
  orderPlaceDate: IsoDate
  orderFulfillDate: IsoDate | null
  /** 'D01-XXXXXXX-XXXXXXX' — joins Credit.consumedOrderId. */
  orderId: string
  /** 'Completed' | 'Pending preorder' */
  status: string | null
  /** 'CREDIT' | 'CASH' */
  type: string | null
  preorder: boolean
  /** 'AL' | 'ALOP' (credit packs) | 'ALC' */
  saleType: string | null
  regularPrice: number | null
  discount: number | null
  /** 1.00 ⟺ paid with a credit. */
  consumedCredit: number | null
  /** Effective member cost in EUR. */
  pricePaid: number | null
  tax: number | null
  currency: string | null
  productName: string | null
  asin: string | null
  /** Purchase channel free text ('mobile Store Anon iPhone'). */
  channel: string | null
}

/** One credit's lifecycle. */
export interface Credit {
  issueDate: IsoDate
  /** 'New Annual' | 'New Monthly' | 'Stock Up' | 'Returned' | 'Loyalty Reward' | 'Trial' */
  reason: string | null
  plan: string | null
  /** 'consumed' | 'pre-order' | 'pre-order consumed'; null ⟺ never used. */
  consumedStatus: string | null
  /** Credit Status 'Active' (true) / 'Inactive' (false). */
  isActive: boolean | null
  consumedDate: IsoDate | null
  expireDate: IsoDate | null
  consumedOrderId: string | null
  consumed: boolean
  /** EUR value at issuance (0 for Trial credits). */
  valueEur: number | null
}

/** One (attempted) membership billing. */
export interface BillingEvent {
  billingDate: IsoDate
  periodStart: IsoDate | null
  periodEnd: IsoDate | null
  baseAmount: number | null
  tax: number | null
  totalAmount: number | null
  currency: string | null
  /** 'Charge' (real money) | 'Vet' (0 € verification). */
  type: string | null
  plan: string | null
  billingFreqMonths: number | null
  planFee: number | null
  offerName: string | null
  offerType: string | null
  taxReason: string | null
  status: string | null
}

export interface WishlistItem {
  addDate: IsoDate
  deleteDate: IsoDate | null
  productName: string | null
  asin: string | null
  /** 'Wishlist Item Added' | 'Wishlist Item Purchased' | 'Wishlist Item Deleted' */
  status: string | null
}

export interface CollectionInfo {
  /** System id ('PENDING', 'WISHLIST', …) or UUID for user collections. */
  id: string
  name: string | null
  description: string | null
  /** 'PermanentCollection' | 'UserCollection' */
  type: string | null
  isSystem: boolean
  createdAt: number | null
  lastModified: number | null
  isPublic: boolean | null
  isArchived: boolean | null
  totalItems: number | null
}

export interface CollectionItem {
  collectionId: string
  collectionName: string | null
  asin: string
  productName: string | null
  addedAt: number | null
  deletedAt: number | null
  isDeleted: boolean | null
}

/** One aggregated search session (Tommy_Group). Has real time-of-day. */
export interface SearchSession {
  keywords: string | null
  date: IsoDate | null
  firstSearchAt: number | null
  lastSearchAt: number | null
  searchCount: number
  clickCount: number
  addCount: number
  orderCount: number
  consumeCount: number
  abandonments: number
  paidPurchases: number
  clicked: boolean | null
  added: boolean | null
  maxTotalFound: number | null
  /** 'kw' (keyword) | 'br' (browse). */
  searchType: string | null
  os: string | null
  siteVariant: string | null
  queryLength: number | null
  spellingCorrection: string | null
  firstClickedAsin: string | null
  firstClickedName: string | null
  firstPurchasedAsin: string | null
  firstPurchasedName: string | null
}

/** One (search, result-ASIN) pair (Tommy_ASIN). */
export interface SearchHit {
  searchAt: number | null
  keywords: string | null
  asin: string | null
  productName: string | null
  /** Rank in the result list (1-based). */
  position: number | null
  page: number | null
  totalFound: number | null
  totalDisplayed: number | null
  clicked: boolean
  added: boolean
  purchased: boolean
  isOrganic: boolean | null
  isSponsored: boolean | null
  deviceType: string | null
  os: string | null
  searchType: string | null
}

/** One playback telemetry event (recent ~27-day sample only). */
export interface PlaybackEvent {
  time: number
  sequence: number | null
  activityType: string | null
  /** 'BluetoothA2DP' | 'BuiltInSpeaker' | 'AirPlay' | … */
  audioOutput: string | null
  playbackState: string | null
  consumptionMethod: string | null
  asin: string | null
  appVersion: string | null
  os: string | null
}

export interface CartItem {
  addDate: IsoDate | null
  productName: string | null
  status: string | null
}

export interface ContentReturn {
  orderCreationDate: IsoDate | null
  returnDate: IsoDate | null
  productName: string | null
  asin: string | null
  price: number | null
  currency: string | null
  creditsRefunded: number | null
  reason: string | null
}

export interface DeviceActivation {
  firstActivatedAt: number | null
  lastActivatedAt: number | null
  manufacturer: string | null
  model: string | null
  playerType: string | null
}

export interface Impression {
  eventDate: IsoDate | null
  pageName: string | null
  module: string | null
  platform: string | null
  appVersion: string | null
}

export interface MembershipEvent {
  eventDate: IsoDate | null
  businessEvent: string | null
  action: string | null
  /** Names of the count columns that were ≥ 1, e.g. 'New Trial Count'. */
  flags: string[]
}

/** Merged account JSON singletons, one per marketplace. */
export interface AccountInfo {
  marketplace: string
  /** Earliest 'Creation Date' across the account files — "member since". */
  creationDate: number | null
  region: string | null
  countryCode: string | null
  customerSegment: string | null
  appDownloaded: boolean | null
  hasLibraryContent: boolean | null
}
