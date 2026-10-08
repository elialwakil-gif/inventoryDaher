/** Normalizes user input and legacy warehouse labels without changing saved names. */
export function normalizeProductSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type SearchableProduct = {
  name?: unknown;
  code?: unknown;
  warehouse?: unknown;
  warehouseId?: unknown;
  quantity?: unknown;
  reservedQuantity?: unknown;
};
type SearchWarehouse = { id: string; name: string };

export function availableLoadQuantity(product: SearchableProduct): number {
  const quantity = Number(product.quantity);
  const reserved = Number(product.reservedQuantity ?? 0);
  return Math.max(
    (Number.isFinite(quantity) ? quantity : 0) -
      (Number.isFinite(reserved) ? reserved : 0),
    0,
  );
}

export function productBelongsToWarehouse(
  product: SearchableProduct,
  warehouse: SearchWarehouse,
): boolean {
  const stored = product.warehouse;
  const embedded =
    stored && typeof stored === "object"
      ? (stored as { id?: unknown; name?: unknown })
      : null;
  const explicitId = product.warehouseId ?? embedded?.id;
  if (
    explicitId !== undefined &&
    explicitId !== null &&
    String(explicitId).trim()
  ) {
    return String(explicitId).trim() === String(warehouse.id).trim();
  }
  const legacy = embedded?.name ?? stored;
  return (
    String(legacy ?? "").trim() === String(warehouse.id).trim() ||
    normalizeProductSearch(legacy) === normalizeProductSearch(warehouse.name)
  );
}

export function filterVehicleLoadProducts<T extends SearchableProduct>(
  products: T[],
  warehouse: SearchWarehouse | undefined,
  search: string,
): T[] {
  if (!warehouse) return [];
  const terms = normalizeProductSearch(search).split(" ").filter(Boolean);
  return products.filter((product) => {
    if (
      !productBelongsToWarehouse(product, warehouse) ||
      availableLoadQuantity(product) <= 0
    )
      return false;
    const text = `${normalizeProductSearch(product.name)} ${normalizeProductSearch(product.code)}`;
    return terms.every((term) => text.includes(term));
  });
}
