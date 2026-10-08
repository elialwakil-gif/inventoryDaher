import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDriverStatement, recordDriverCollection } from "./driverStatements";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: api }));

describe("driver finance API", () => {
  beforeEach(() => vi.resetAllMocks());
  it("keeps authenticated server permission and debt validation messages visible", async () => {
    api.get.mockRejectedValue({
      response: {
        status: 403,
        data: { error: "ليس لديك صلاحية لهذه العملية" },
      },
    });
    await expect(
      getDriverStatement({ driverId: "another-driver" }),
    ).rejects.toThrow("ليس لديك صلاحية لهذه العملية");
    api.post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: "قيمة التحصيل أكبر من المتبقي في الفاتورة" },
      },
    });
    await expect(
      recordDriverCollection({
        requestId: "request-123",
        driverId: "d1",
        sellId: "s1",
        customerId: "c1",
        amountOriginal: 100000,
        currency: "SYP",
        exchangeRate: 10000,
        paymentAccountId: "cash",
        receivableAccountId: "ar",
      }),
    ).rejects.toThrow("قيمة التحصيل أكبر من المتبقي");
  });
  it("accepts the server statement and preserves its filtered snapshots", async () => {
    const statement = {
      sales: [],
      collections: [],
      filters: {
        driverId: "d1",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-08",
        vehicleId: "v1",
      },
      summary: { commissionEarnedUSD: 20 },
    };
    api.get.mockResolvedValue({ data: statement });
    expect(await getDriverStatement(statement.filters)).toBe(statement);
    api.get.mockResolvedValue({ data: { data: statement } });
    expect(await getDriverStatement(statement.filters)).toBe(statement);
  });
  it("rejects HTML or an outdated server response instead of crashing the report page", async () => {
    api.get.mockResolvedValue({ data: "<!doctype html><html></html>" });
    await expect(getDriverStatement()).rejects.toThrow("صيغة البيان المالي غير صحيحة");
  });
});
