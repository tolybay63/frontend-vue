import { db } from './db';

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 часа

async function getCachedOrFetch(tableName, fetchFn) {
  const meta = await db.cacheMeta.get(tableName);
  const now = Date.now();

  // Кэш свежий — возвращаем из IndexedDB
  if (meta && meta.expiresAt > now) {
    const cached = await db[tableName].toArray();
    if (cached.length > 0) return cached;
  }

  // Пробуем загрузить из сети
  if (navigator.onLine) {
    try {
      const data = await fetchFn();

      // Сохраняем в IndexedDB
      await db[tableName].clear();
      if (data.length > 0) {
        await db[tableName].bulkPut(data);
      }
      await db.cacheMeta.put({
        key: tableName,
        updatedAt: now,
        expiresAt: now + CACHE_TTL,
      });
      return data;
    } catch (e) {
      console.warn(`Не удалось загрузить ${tableName}, пробуем кэш`, e);
    }
  }

  // Фолбэк — устаревший кэш
  const stale = await db[tableName].toArray();
  if (stale.length > 0) return stale;

  throw new Error(`Нет данных для ${tableName} (офлайн, кэш пуст)`);
}

export const cachedLoadMaterials = () =>
  getCachedOrFetch('materials', () =>
    import('../api/repairs/repairApi').then(m => m.loadMaterials()));

export const cachedLoadUnits = () =>
  getCachedOrFetch('units', () =>
    import('../api/repairs/repairApi').then(m => m.loadUnits()));

export const cachedLoadTasks = (objWork) =>
  getCachedOrFetch('tasks', () =>
    import('../api/repairs/repairApi').then(m => m.loadTasks(objWork)));

export const cachedLoadPositions = () =>
  getCachedOrFetch('positions', () =>
    import('../api/repairs/repairApi').then(m => m.loadPositions()));

export const cachedLoadEquipmentTypes = () =>
  getCachedOrFetch('equipmentTypes', () =>
    import('../api/repairs/repairApi').then(m => m.loadEquipmentTypes()));

export const cachedLoadToolTypes = () =>
  getCachedOrFetch('toolTypes', () =>
    import('../api/repairs/repairApi').then(m => m.loadToolTypes()));

export const cachedLoadExternalServices = () =>
  getCachedOrFetch('externalServices', () =>
    import('../api/repairs/repairApi').then(m => m.loadExternalServices()));
