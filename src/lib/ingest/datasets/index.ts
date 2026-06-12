import { accountDataset } from './account'
import { libraryDataset } from './library'
import { listeningDataset } from './listening'

import type { DatasetDescriptor } from './descriptor'

/** Parse order = display order in the load report. */
export const DATASETS: DatasetDescriptor[] = [listeningDataset, libraryDataset, accountDataset]
