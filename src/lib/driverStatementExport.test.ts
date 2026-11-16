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
      salesGrossAmount: 100,
      discountsAmount: 10,
      salesNetAmount: 90,
      costAmount: 60,
      profitAmount: 30,
      returnsAmount: 0,
      outstandingDebtAmount: 40,
      cashOpeningAmount: 20,
      cashClosingAmount: 60,
      cashOpeningByCurrency: { SYP: 0 },
      cashClosingByCurrency: { SYP: 500000 },
      collectionsAmount: 50,
      remittancesAmount: 10,
      advancesAmount: 0,
      expensesAmount: 0,
      refundedAmount: 0,
      commissionEarnedAmount: 5,
      commissionPaidAmount: 0,
      commissionOpeningAmount: 2,
      commissionClosingAmount: 7,
      unknownCollectionsAmount: 0,
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
        currency: "SYP",
        grossAmount: 100,
        discount: 10,
        netAmount: 90,
        costAmount: 60,
        profitAmount: 30,
        returnsAmount: 0,
        remainingDebtAmount: 40,
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
        amount: 500000,
        commissionRate: 10,
        commissionAmount: 5,
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
      costAmount: 0,
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
      البيان: "العمولة المتبقية ل.س",
      القيمة: 7,
    });
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "النقد آخر الفترة SYP فعلي",
      القيمة: 500000,
    });
    expect(sheets["التحصيلات"][0]).toMatchObject({
      العملة: "SYP",
      المبلغ_بالليرة: 500000,
      النسبة: 10,
      العمولة_بالليرة: 5,
    });
  });
  it("keeps product detail tied to the same filtered invoices and includes reconciliation notes", () => {
    const sheets = driverStatementExportSheets(report);
    expect(sheets["الفواتير"]).toHaveLength(1);
    expect(sheets["أصناف المبيعات"]).toEqual([
      expect.objectContaining({
        الفاتورة: "sale1",
        الكمية: 2,
        إجمالي_التكلفة_بالليرة: 60,
        إجمالي_البيع_بالليرة: 100,
      }),
    ]);
    expect(sheets["الملخص"]).toContainEqual({
      البيان: "ملاحظة البيانات",
      القيمة: "تحصيلات قديمة تحتاج مطابقة",
    });
  });
});
