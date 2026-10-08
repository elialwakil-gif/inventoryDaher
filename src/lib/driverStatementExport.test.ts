import { describe, expect, it } from "vitest";
import { driverStatementExportSheets } from "./driverStatementExport";
import type { DriverStatement } from "@/types/driverFinance";

describe("driver statement export", () => {
  const report: DriverStatement = {
    driver: { id: "d1", username: "Driver One", commissionRate: 10 },
    drivers: [],
    vehicles: [{ id: "v1", name: "السيارة 1" }],
    filters: {
      driverId: "d1",
      vehicleId: "v1",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-08",
    },
    summary: {
      salesCount: 1,
      salesGrossUSD: 100,
      discountsUSD: 10,
      salesNetUSD: 90,
      costUSD: 60,
      profitUSD: 30,
      returnsUSD: 0,
      outstandingDebtUSD: 40,
      cashOpeningUSD: 20,
      cashClosingUSD: 60,
      cashOpeningByCurrency: { USD: 20, SYP: 0 },
      cashClosingByCurrency: { USD: 10, SYP: 500000 },
      collectionsUSD: 50,
      remittancesUSD: 10,
      advancesUSD: 0,
      expensesUSD: 0,
      refundedUSD: 0,
      commissionEarnedUSD: 5,
      commissionPaidUSD: 0,
      commissionOpeningUSD: 2,
      commissionClosingUSD: 7,
      unknownCollectionsUSD: 0,
    },
    sales: [
      {
        id: "sale1",
        driverId: "d1",
        driverName: "Driver One",
        date: "2026-10-03",
        customerId: "c1",
        customerName: "زبون",
        vehicleId: "v1",
        vehicleName: "السيارة 1",
        currency: "USD",
        exchangeRate: 1,
        grossUSD: 100,
        discountUSD: 10,
        netUSD: 90,
        costUSD: 60,
        profitUSD: 30,
        returnsUSD: 0,
        remainingDebtUSD: 40,
        products: [
          {
            id: "p1",
            code: "A",
            name: "صنف",
            qty: 2,
            payPrice: 30,
            sellPrice: 50,
            warehouse: "السيارة 1",
          },
        ],
        paymentStatus: "part",
      },
    ],
    collections: [
      {
        id: "receipt1",
        date: "2026-10-03",
        sellId: "sale1",
        customerName: "زبون",
        driverId: "d1",
        driverName: "Driver One",
        currency: "SYP",
        exchangeRate: 10000,
        amountOriginal: 500000,
        amountUSD: 50,
        commissionRate: 10,
        commissionUSD: 5,
        commissionOriginal: 50000,
        isRefund: false,
        collectionSource: "driver",
        settlementMethod: "cash",
        note: "",
      },
    ],
    outstandingInvoices: [],
    returns: [],
    settlements: [],
    cashMovements: [],
    commissionRows: [],
    stockBalances: [],
    stockMovements: [],
    currentStock: {
      asOf: "2026-10-08T09:00:00Z",
      products: [],
      quantity: 0,
      costUSD: 0,
    },
    generatedAt: "2026-10-08T09:00:00Z",
    warnings: ["تحصيلات قديمة تحتاج مطابقة"],
  };

  it("exports filtered financial totals and original currency without recomputing collection commission", () => {
    const sheets = driverStatementExportSheets(report);
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "إلى تاريخ",
      القيمة: "2026-10-08",
    });
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "العمولة المتبقية USD",
      القيمة: 7,
    });
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "النقد آخر الفترة SYP فعلي",
      القيمة: 500000,
    });
    expect(sheets["التحصيلات"][0]).toMatchObject({
      المبلغ_الأصلي: 500000,
      العملة: "SYP",
      المقابل_USD: 50,
      النسبة: 10,
      العمولة_USD: 5,
    });
  });
  it("keeps product detail tied to the same filtered invoices and includes reconciliation notes", () => {
    const sheets = driverStatementExportSheets(report);
    expect(sheets["الفواتير"]).toHaveLength(1);
    expect(sheets["أصناف المبيعات"]).toEqual([
      expect.objectContaining({
        الفاتورة: "sale1",
        الكمية: 2,
        إجمالي_التكلفة_USD: 60,
        إجمالي_البيع_USD: 100,
      }),
    ]);
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "ملاحظة البيانات",
      القيمة: "تحصيلات قديمة تحتاج مطابقة",
    });
  });
});
