import { db } from './db';
import { ref } from 'vue';
import axios from 'axios';

export const pendingCount = ref(0);

// Загрузить начальный счётчик
db.syncQueue
  .where('status')
  .equals('pending')
  .count()
  .then(count => {
    pendingCount.value = count;
  });

export async function enqueueRequest(url, rpcMethod, params) {
  const id = await db.syncQueue.add({
    url,
    rpcMethod,
    params,
    status: 'pending',
    createdAt: Date.now(),
    syncedAt: null,
    errorMessage: null,
    retryCount: 0,
  });

  pendingCount.value = await db.syncQueue.where('status').equals('pending').count();
  return id;
}

export async function getPendingRequests() {
  return db.syncQueue.where('status').equals('pending').sortBy('createdAt');
}

export async function replayQueue(onProgress) {
  const pending = await getPendingRequests();
  const results = { synced: 0, failed: 0 };

  for (const item of pending) {
    try {
      await db.syncQueue.update(item.id, { status: 'syncing' });

      await axios.post(
        item.url,
        { method: item.rpcMethod, params: item.params },
        { withCredentials: true, headers: { 'X-Offline-Sync': 'true' } }
      );

      await db.syncQueue.update(item.id, {
        status: 'synced',
        syncedAt: Date.now(),
      });
      results.synced++;
    } catch (error) {
      await db.syncQueue.update(item.id, {
        status: 'pending',
        retryCount: (item.retryCount || 0) + 1,
        errorMessage: error.message || 'Unknown error',
      });
      results.failed++;
    }

    if (onProgress) onProgress(results);
  }

  pendingCount.value = await db.syncQueue.where('status').equals('pending').count();
  return results;
}

export async function clearSyncedItems(olderThanMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - olderThanMs;
  await db.syncQueue
    .where('status')
    .equals('synced')
    .and(item => item.syncedAt < cutoff)
    .delete();
}
