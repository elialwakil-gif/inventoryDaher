import {
  addPendingSale,
  clearPendingSales,
  getOfflineCache,
  getPendingSales,
  isBrowserOnline,
  removeOfflineCache,
  removePendingSale,
  setOfflineCache,
  updatePendingSale,
} from "@/lib/offlineStore";
import { sellProducts, type Product, type sell } from "@/services/transaction";

export const offlineCacheKeys = {
  products: "products-table",
  customers: "customers-table",
  accounts: "accounts-table",
  invoiceDraft: "invoice-draft",
};

const getSaleProductKey = (product: { id: string; warehouse?: string }) =>
  `${product.id}::${product.warehouse || ""}`;

export const reserveOfflineSaleProducts = async (sale: sell) => {
  const cachedProducts =
    (await getOfflineCache<Product[]>(offlineCacheKeys.products)) || [];

  if (!cachedProducts.length) {
    return;
  }

  const soldQuantities = sale.products.reduce<Record<string, number>>(
    (quantities, product) => {
      const key = getSaleProductKey(product);
      quantities[key] = (quantities[key] || 0) + Number(product.qty || 0);
      return quantities;
    },
    {},
  );

  const nextProducts = cachedProducts.map((product) => {
    const soldQuantity = soldQuantities[getSaleProductKey(product)] || 0;

    if (!soldQuantity) {
      return product;
    }

    return {
      ...product,
      quantity: Math.max(Number(product.quantity || 0) - soldQuantity, 0),
    };
  });

  await setOfflineCache(offlineCacheKeys.products, nextProducts);
};

export const enqueueOfflineSale = async (sale: sell) => {
  const record = await addPendingSale<sell>(sale);
  await reserveOfflineSaleProducts(sale);
  return record;
};

export const getPendingOfflineSalesCount = async () => {
  const pendingSales = await getPendingSales<sell>();
  return pendingSales.length;
};

export const clearPendingOfflineSales = async () => {
  await clearPendingSales();
  await removeOfflineCache(offlineCacheKeys.products);
  await removeOfflineCache(`${offlineCacheKeys.products}:table`);
};

const isRetryableSyncError = (error: any) => {
  if (!isBrowserOnline()) {
    return true;
  }

  return !error?.response;
};

export const syncPendingOfflineSales = async () => {
  if (!isBrowserOnline()) {
    return { synced: 0, failed: 0, pending: await getPendingOfflineSalesCount() };
  }

  const pendingSales = await getPendingSales<sell>();
  let synced = 0;
  let failed = 0;

  for (const record of pendingSales) {
    try {
      await sellProducts({ newSell: record.sale });
      await removePendingSale(record.id);
      synced += 1;
    } catch (error: any) {
      failed += 1;

      await updatePendingSale({
        ...record,
        attempts: record.attempts + 1,
        lastError:
          error?.response?.data?.message ||
          error?.message ||
          "تعذر إرسال الفاتورة",
      });

      if (isRetryableSyncError(error)) {
        break;
      }
    }
  }

  return {
    synced,
    failed,
    pending: await getPendingOfflineSalesCount(),
  };
};
