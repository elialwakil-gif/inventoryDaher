import { describe, expect, it } from "vitest";
import {
  filterVehicleLoadProducts,
  normalizeProductSearch,
  productBelongsToWarehouse,
} from "./vehicleProductSearch";

describe("vehicle loading product search", () => {
  const warehouse = { id: "main", name: "المستودع الأول" };
  const products = [
    {
      name: "أرزّ   أبيض",
      code: "AB-123",
      warehouse: " المستودع الاول ",
      quantity: 12,
      reservedQuantity: 2,
    },
    {
      name: "أرز أبيض",
      code: "AB-456",
      warehouseId: "other",
      warehouse: warehouse.name,
      quantity: 20,
    },
    {
      name: "سكر",
      code: "S-12",
      warehouse: "main",
      quantity: 3,
      reservedQuantity: 3,
    },
  ];
  it("normalizes Arabic letters, marks, spacing, and digits", () => {
    expect(normalizeProductSearch("  إِبـرة  ١٢۳ ")).toBe("ابرة 123");
    expect(filterVehicleLoadProducts(products, warehouse, "ارز ابيض")).toEqual([
      products[0],
    ]);
    expect(filterVehicleLoadProducts(products, warehouse, "ab-١٢٣")).toEqual([
      products[0],
    ]);
  });
  it("resolves legacy warehouse names and ids while explicit ids prevent cross-warehouse loading", () => {
    expect(productBelongsToWarehouse({ warehouse: "main" }, warehouse)).toBe(
      true,
    );
    expect(
      productBelongsToWarehouse(
        { warehouse: { id: "main", name: "old" } },
        warehouse,
      ),
    ).toBe(true);
    expect(productBelongsToWarehouse(products[1], warehouse)).toBe(false);
  });
  it("requires a warehouse and excludes fully reserved stock", () => {
    expect(filterVehicleLoadProducts(products, undefined, "ارز")).toEqual([]);
    expect(filterVehicleLoadProducts(products, warehouse, "سكر")).toEqual([]);
    expect(filterVehicleLoadProducts(products, warehouse, "")).toEqual([
      products[0],
    ]);
  });
  it("shows all matches including matches beyond the previous 12-result limit", () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      ...products[0],
      code: `A${index}`,
    }));
    expect(filterVehicleLoadProducts(many, warehouse, "ارز")).toHaveLength(20);
  });
});
