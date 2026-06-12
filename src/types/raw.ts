/**
 * All-string row shapes as they come out of papaparse (header: true).
 * Every field is optional — a malformed row may miss any column.
 * Key names mirror the CSV headers exactly (post header-trim).
 */

export interface RawListeningRow {
  'Start Date'?: string
  'End Date'?: string
  'Event Duration Milliseconds'?: string
  'Start Position Milliseconds'?: string
  'End Position Milliseconds'?: string
  'Product Name'?: string
  ASIN?: string
  'Book Length Milliseconds'?: string
  'Delivery Type'?: string
  'Narration Speed'?: string
  Bookmark?: string
  'Audio Type'?: string
  'Asin Owned'?: string
  'Listening Mode'?: string
  Store?: string
  'App Version'?: string
  'Local Timezone'?: string
}

export interface RawLibraryRow {
  ASIN?: string
  title?: string
  product_name?: string
  subtitle?: string
  length_in_minutes?: string
  authors?: string
  audiobook_narrator?: string
  purchase_date?: string
  last_updated?: string
  is_finished?: string
  ownership?: string
  available_in_library?: string
  language?: string
  publisher?: string
  book_series_info?: string
  content_delivery_type?: string
  acquisition_method?: string
  format_type?: string
  plan_tier?: string
  is_adult_product?: string
  has_next_title_in_series?: string
  marketplace?: string
}

export interface RawPurchaseRow {
  'Order Place Date'?: string
  'Order Fulfill Date'?: string
  'Order ID'?: string
  Status?: string
  Type?: string
  'Preorder Desc'?: string
  'Sale Type Desc'?: string
  'Regular Price'?: string
  Discount?: string
  'Consumed Credit'?: string
  'Price Paid Member'?: string
  Tax?: string
  Currency?: string
  'Product Name'?: string
  ASIN?: string
  Action?: string
}

export interface RawCreditRow {
  'Issue Date'?: string
  'Credit Reason'?: string
  Plan?: string
  'Consumed Status'?: string
  'Credit Status'?: string
  'Consumed Date'?: string
  'Expire Date'?: string
  'Consumed Order'?: string
  'Consumed Credit'?: string
  'Original Credit Revenue'?: string
}

export interface RawBillingRow {
  'Tax Create Date'?: string
  'Billing Period End Date'?: string
  'Billing Period Start Date'?: string
  'Base Amount'?: string
  Tax?: string
  'Total Amount'?: string
  Currency?: string
  Type?: string
  Plan?: string
  'Plan Billing Freq'?: string
  'Plan Billing Fee'?: string
  'Offer Name'?: string
  'Offer Type'?: string
  'Tax Reason'?: string
  Status?: string
}

export interface RawWishlistRow {
  'Add Date'?: string
  'Delete Date'?: string
  'Product Name'?: string
  ASIN?: string
  Status?: string
}

export interface RawCollectionRow {
  collection_id?: string
  collection_name?: string
  collection_description?: string
  collection_type?: string
  collection_creation_date?: string
  last_modified_date?: string
  is_public_collection?: string
  is_collection_archived?: string
  total_items_in_collection?: string
  ASIN?: string
  product_name?: string
  title_added_date?: string
  title_deletion_date?: string
  is_title_deleted?: string
}

export interface RawSearchSessionRow {
  keywords?: string
  partition_date?: string
  first_search_gmt_time?: string
  last_search_gmt_time?: string
  search_count?: string
  click_count?: string
  add_count?: string
  order_count?: string
  consume_count?: string
  abandonments?: string
  paid_purchased?: string
  clicked?: string
  added?: string
  max_total_found?: string
  search_type?: string
  operating_system_name?: string
  site_variant?: string
  query_length?: string
  spelling_correction?: string
  first_clicked_asin?: string
  first_clicked_product_name?: string
  first_purchased_asin?: string
  first_purchase_product_name?: string
}

export interface RawSearchHitRow {
  search_date?: string
  keywords?: string
  ASIN?: string
  product_name?: string
  position?: string
  page?: string
  total_found?: string
  total_displayed?: string
  clicked?: string
  added?: string
  purchased?: string
  num_clicks?: string
  num_adds?: string
  num_purchases?: string
  is_organic_result?: string
  is_sponsored_result?: string
  device_type?: string
  operating_system_name?: string
  search_type?: string
}

export interface RawPlaybackRow {
  Time?: string
  Sequence?: string
  'Activity Type'?: string
  'Audio Output Method'?: string
  'Playback State'?: string
  'Consumption Method'?: string
  ASIN?: string
  'App Version'?: string
  'Operating System'?: string
}

export interface RawCartRow {
  'Add Date'?: string
  'Product Name'?: string
  Status?: string
}

export interface RawReturnRow {
  'Order Creation Date'?: string
  'Return Close Date'?: string
  'Product Name'?: string
  ASIN?: string
  Price?: string
  'Currency Code'?: string
  'Credit Count'?: string
  'Return Reason'?: string
}

export interface RawDeviceRow {
  'First Activation Date'?: string
  'Last Activation Date'?: string
  'Player Manufacturer'?: string
  'Player Model'?: string
  'Player Type'?: string
}

export interface RawImpressionRow {
  'Event Date'?: string
  'Page Name'?: string
  Module?: string
  Platform?: string
  'App Version'?: string
}

export interface RawMembershipEventRow {
  'Event Date'?: string
  'Business Event'?: string
  Action?: string
  [countColumn: string]: string | undefined
}

/** Account JSON singletons: { "<marketplace>": { "<Attribute>": "<value>" } } */
export type RawAccountJson = Record<string, Record<string, string>>
