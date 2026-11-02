import rawData from "./data.json";
import rawFixtures from "./fixtures.json";
import { createDataIndex, type DataIndex } from "@/domain/dataIndex";
import { datasetSchema, fixturesSchema } from "@/domain/schemas";
import type { Dataset, Fixtures } from "@/domain/types";

/**
 * The canonical dataset, validated once at module load. A schema failure here
 * is a build-time/boot-time error by design: the dashboard must never render
 * numbers from a dataset it does not understand.
 */
export const dataset: Dataset = datasetSchema.parse(rawData);
export const dataIndex: DataIndex = createDataIndex(dataset);
export const fixtures: Fixtures = fixturesSchema.parse(rawFixtures);
