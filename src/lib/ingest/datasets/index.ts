import { accountDataset } from './account'
import { billingsDataset } from './billings'
import { collectionsDataset } from './collections'
import { creditsDataset } from './credits'
import { libraryDataset } from './library'
import { listeningDataset } from './listening'
import {
  cartDataset,
  devicesDataset,
  impressionsDataset,
  membershipEventsDataset,
  returnsDataset,
} from './misc'
import { playbackDataset } from './playback'
import { purchasesDataset } from './purchases'
import { searchHitsDataset, searchSessionsDataset } from './search'
import { wishlistDataset } from './wishlist'

import type { DatasetDescriptor } from './descriptor'

/** Parse order = display order in the load report. */
export const DATASETS: DatasetDescriptor[] = [
  listeningDataset,
  libraryDataset,
  purchasesDataset,
  creditsDataset,
  billingsDataset,
  wishlistDataset,
  collectionsDataset,
  searchSessionsDataset,
  searchHitsDataset,
  playbackDataset,
  cartDataset,
  returnsDataset,
  devicesDataset,
  impressionsDataset,
  membershipEventsDataset,
  accountDataset,
]
