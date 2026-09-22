// Pure dataset accessors — no Vue dependency (mirrors every other game's
// composables/<game>/dataset-shaped module).
import { COUNTRIES, DATASET_VERSION } from '../../constants/flags/countries.js'

export { DATASET_VERSION }

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export function getCountry(code) {
  return BY_CODE.get(code)
}

export function getCountriesInRegion(region) {
  return COUNTRIES.filter((c) => c.region === region)
}

export function getDatasetTotal() {
  return COUNTRIES.length
}
