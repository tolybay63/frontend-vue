import Dexie from 'dexie';

export const db = new Dexie('service360-offline');

db.version(1).stores({
  // Очередь синхронизации мутаций
  syncQueue: '++id, url, rpcMethod, status, createdAt, syncedAt',

  // Кэш справочников
  materials: 'value, label',
  units: 'value, label',
  tasks: 'value, label',
  positions: 'value, label',
  equipmentTypes: 'value, label',
  toolTypes: 'value, label',
  externalServices: 'value, label',
  events: 'value, label',
  criticalityLevels: 'value, label',

  // Метаданные свежести кэша
  cacheMeta: 'key, updatedAt, expiresAt',
});
