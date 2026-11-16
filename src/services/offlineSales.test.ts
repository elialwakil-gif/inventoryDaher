import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  pending: [] as any[],
  send: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/offlineStore", () => ({
  getPendingSales: async () => mocks.pending,
  isBrowserOnline: () => true,
  removePendingSale: mocks.remove,
  updatePendingSale: mocks.update,
  addPendingSale: vi.fn(),
  clearPendingSales: vi.fn(),
  getOfflineCache: vi.fn(),
  removeOfflineCache: vi.fn(),
  setOfflineCache: vi.fn(),
}));
vi.mock("@/services/transaction", () => ({ sellProducts: mocks.send }));
import { syncPendingOfflineSales } from "./offlineSales";
beforeEach(() => {
  mocks.pending = [];
  mocks.send.mockReset();
  mocks.remove.mockReset();
  mocks.update.mockReset();
});
it("keeps pre-migration sales for review and never submits them as lira", async () => {
  mocks.pending = [
    {
      id: "old",
      sale: { currency: "SYP", totalPrice: 10, exchangeRate: 10000 },
      attempts: 0,
    },
  ];
  const result = await syncPendingOfflineSales();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(result.failed).toBe(1);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ id: "old", attempts: 1 }),
  );
});
it("submits sales recorded under the lira schema without changing amounts", async () => {
  const sale = { currency: "SYP", totalPrice: 50000 };
  mocks.pending = [{ id: "new", sale, attempts: 0, moneySchema: "syp-v1" }];
  await syncPendingOfflineSales();
  expect(mocks.send).toHaveBeenCalledWith({ newSell: sale });
  expect(mocks.remove).toHaveBeenCalledWith("new");
});
it("continues syncing new lira sales while an old sale waits for review", async () => {
  const sale = { currency: "SYP", totalPrice: 50000 };
  mocks.pending = [
    { id: "old", sale, attempts: 0 },
    { id: "new", sale, attempts: 0, moneySchema: "syp-v1" },
  ];
  const result = await syncPendingOfflineSales();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.remove).toHaveBeenCalledWith("new");
  expect(mocks.remove).not.toHaveBeenCalledWith("old");
  expect(result.failed).toBe(1);
  expect(result.synced).toBe(1);
});
