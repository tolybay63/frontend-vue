import {
  cachedLoadMaterials,
  cachedLoadUnits,
  cachedLoadPositions,
  cachedLoadEquipmentTypes,
  cachedLoadToolTypes,
  cachedLoadExternalServices,
} from './referenceDataCache';

export async function prefetchAllReferenceData() {
  const tasks = [
    cachedLoadMaterials(),
    cachedLoadUnits(),
    cachedLoadPositions(),
    cachedLoadEquipmentTypes(),
    cachedLoadToolTypes(),
    cachedLoadExternalServices(),
  ];

  const results = await Promise.allSettled(tasks);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`${failed.length} справочник(ов) не удалось закэшировать`, failed);
  }
}
