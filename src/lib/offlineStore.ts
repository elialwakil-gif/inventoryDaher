const DB_NAME = "inventory-offline-db";
const DB_VERSION = 1;
const CACHE_STORE = "cache";
const PENDING_SALES_STORE = "pendingSales";

export interface CacheRecord<T = unknown> {
  key: string;
  data: T;
  updatedAt: string;
}

export interface PendingSaleRecord<T = unknown> {
  id: string;
  sale: T;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const openOfflineDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(PENDING_SALES_STORE)) {
        db.createObjectStore(PENDING_SALES_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runStoreRequest = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openOfflineDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const isBrowserOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

export const setOfflineCache = async <T>(key: string, data: T) => {
  await runStoreRequest(CACHE_STORE, "readwrite", (store) =>
    store.put({
      key,
      data,
      updatedAt: new Date().toISOString(),
    } satisfies CacheRecord<T>),
  );

  return data;
};

export const getOfflineCache = async <T>(key: string) => {
  const record = await runStoreRequest<CacheRecord<T> | undefined>(
    CACHE_STORE,
    "readonly",
    (store) => store.get(key),
  );

  return record?.data;
};

export const addPendingSale = async <T>(sale: T) => {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const record: PendingSaleRecord<T> = {
    id,
    sale,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  await runStoreRequest(PENDING_SALES_STORE, "readwrite", (store) =>
    store.add(record),
  );

  return record;
};

export const getPendingSales = async <T>() =>
  runStoreRequest<PendingSaleRecord<T>[]>(
    PENDING_SALES_STORE,
    "readonly",
    (store) => store.getAll(),
  );

export const removePendingSale = async (id: string) =>
  runStoreRequest(PENDING_SALES_STORE, "readwrite", (store) =>
    store.delete(id),
  );

export const updatePendingSale = async <T>(record: PendingSaleRecord<T>) =>
  runStoreRequest(PENDING_SALES_STORE, "readwrite", (store) =>
    store.put(record),
  );

export const clearPendingSales = async () =>
  runStoreRequest(PENDING_SALES_STORE, "readwrite", (store) => store.clear());

export const removeOfflineCache = async (key: string) =>
  runStoreRequest(CACHE_STORE, "readwrite", (store) => store.delete(key));
