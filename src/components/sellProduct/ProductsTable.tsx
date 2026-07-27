import React, { useEffect, useMemo, useRef, useState } from "react";
import QrScannerButton from "@/components/Products/QrScannerButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, ProductPriceType } from "@/services/transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

type SelectedProduct = Product & { qty: number; selectedPriceType?: ProductPriceType };

const priceTypeOptions: Array<{
  value: Exclude<ProductPriceType, "custom">;
  label: string;
}> = [
  { value: "sellPrice", label: "سعر المبيع" },
  { value: "wholesalePrice", label: "سعر الجملة" },
  { value: "superWholesalePrice", label: "سعر جملة الجملة" },
  { value: "payPrice", label: "سعر الشراء" },
];

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getProductPrice = (
  product: Partial<Product>,
  priceType: ProductPriceType,
) => {
  if (priceType === "custom") return toNumber(product.sellPrice);

  return toNumber(product[priceType], toNumber(product.sellPrice));
};

const getAvailableQuantity = (product?: Product) =>
  Math.max(
    toNumber(product?.quantity) - toNumber(product?.reservedQuantity),
    0,
  );

interface ProductsTableProps {
  products: Product[];
  selectedProducts?: SelectedProduct[];
  onChange: (selected: SelectedProduct[]) => void;
  setAmount?: any;
  enforceStock?: boolean;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products = [],
  selectedProducts: controlledSelectedProducts,
  onChange,
  setAmount,
  enforceStock = true,
}) => {
  const [search, setSearch] = useState("");
  const [internalSelectedProducts, setInternalSelectedProducts] = useState<
    SelectedProduct[]
  >([]);
  const [defaultPriceType, setDefaultPriceType] =
    useState<Exclude<ProductPriceType, "custom">>("sellPrice");
  const isControlled = controlledSelectedProducts !== undefined;
  const selectedProducts = controlledSelectedProducts || internalSelectedProducts;
  const selectedProductsRef = useRef<SelectedProduct[]>(selectedProducts);

  useEffect(() => {
    selectedProductsRef.current = selectedProducts;
  }, [selectedProducts]);

  const commitSelectedProducts = (
    updater:
      | SelectedProduct[]
      | ((currentProducts: SelectedProduct[]) => SelectedProduct[]),
  ) => {
    const resolveNextProducts = (currentProducts: SelectedProduct[]) =>
      typeof updater === "function" ? updater(currentProducts) : updater;

    if (isControlled) {
      const nextProducts = resolveNextProducts(selectedProductsRef.current);
      selectedProductsRef.current = nextProducts;
      onChange(nextProducts);
      return;
    }

    setInternalSelectedProducts((currentProducts) => {
      const nextProducts = resolveNextProducts(currentProducts);
      selectedProductsRef.current = nextProducts;
      onChange(nextProducts);
      return nextProducts;
    });
  };

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p?.code?.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const updateQty = (id: string, qty: number) => {
    const nextQty = toNumber(qty);
    const availableQuantity = getAvailableQuantity(
      products.find((p) => p.id === id),
    );

    if (nextQty <= 0) {
      toast.error("الكمية يجب أن تكون أكبر من صفر");
      return;
    }

    if (enforceStock && nextQty > availableQuantity) {
      toast.error("الكمية المطلوبة غير متوفرة في المخزون");
      return;
    }

    commitSelectedProducts((current) => {
      const newSelected = current
        .map((p) => (p.id === id ? { ...p, qty: nextQty } : p))
        .filter((p) => p.qty > 0);
      return newSelected;
    });
  };

  const addProduct = (product: Product) => {
    const availableQuantity = getAvailableQuantity(product);

    if (enforceStock && availableQuantity <= 0) {
      toast.error("الكمية المطلوبة غير متوفرة في المخزون");
      return;
    }

    commitSelectedProducts((current) => {
      const exists = current.find((p) => p.id === product.id);

      if (exists) {
        const nextQty = exists.qty + 1;
        if (enforceStock && nextQty > availableQuantity) {
          toast.error("الكمية المطلوبة غير متوفرة في المخزون");
          return current;
        }

        const newSelected = current.map((p) =>
          p.id === product.id ? { ...p, qty: nextQty } : p,
        );
        return newSelected;
      }

      const newSelected = [
        ...current,
        {
          ...product,
          qty: 1,
          selectedPriceType: defaultPriceType,
          sellPrice: getProductPrice(product, defaultPriceType),
        },
      ];
      return newSelected;
    });
  };

  const handleQrScan = (code: string) => {
    setSearch(code);

    const product = products.find(
      (p) => p?.code?.trim().toLowerCase() === code.trim().toLowerCase(),
    );

    if (!product) {
      toast.error("لم يتم العثور على منتج بهذا الرمز");
      return false;
    }

    addProduct(product);
    toast.success("تمت إضافة المنتج من رمز QR");
    return true;
  };

  const updatePrice = (id: string, price: number) => {
    const nextPrice = toNumber(price);

    if (nextPrice <= 0) {
      toast.error("سعر البيع يجب أن يكون أكبر من صفر");
      return;
    }

    commitSelectedProducts((current) =>
      current
        .map((p) =>
          p.id === id
            ? { ...p, sellPrice: nextPrice, selectedPriceType: "custom" }
            : p,
        )
        .filter((p) => p.qty > 0),
    );
  };

  const updatePriceType = (id: string, priceType: ProductPriceType) => {
    commitSelectedProducts((current) =>
      current.map((p) => {
        if (p.id !== id) return p;

        const sourceProduct = products.find((product) => product.id === id) || p;

        return {
          ...p,
          selectedPriceType: priceType,
          sellPrice: getProductPrice(sourceProduct, priceType),
        };
      }),
    );
  };

  const removeProduct = (id: string) => {
    commitSelectedProducts((current) => current.filter((p) => p.id !== id));
  };

  const total = selectedProducts.reduce((sum, p) => sum + p.sellPrice * p.qty, 0);

  useEffect(() => {
    setAmount?.(total);
  }, [setAmount, total]);

  return (
    <div className="rounded-lg bg-white p-3 shadow sm:p-4" dir="rtl">
      <h3 className="mb-3 text-lg font-bold">اختيار المنتجات</h3>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr_auto]">
        <Select
          value={defaultPriceType}
          onValueChange={(value) =>
            setDefaultPriceType(value as Exclude<ProductPriceType, "custom">)
          }
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="نوع السعر" />
          </SelectTrigger>
          <SelectContent>
            {priceTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="ابحث عن المنتج بالاسم أو الكود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11"
        />
        <QrScannerButton
          onScan={handleQrScan}
          className="h-11 w-full sm:w-auto"
        />
      </div>

      {search && filteredProducts.length > 0 && (
        <div className="mb-4 max-h-64 overflow-y-auto rounded-md border">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full flex-col gap-1 border-b p-3 text-right text-sm last:border-b-0 hover:bg-gray-100 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => addProduct(p)}
            >
              <span className="font-medium">
                {p.name} ({p.code}) - ${getProductPrice(p, defaultPriceType)}
              </span>
              <span className="text-muted-foreground">
                {p.warehouse} | المتاح: {getAvailableQuantity(p)}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <>
          <div className="space-y-3 md:hidden">
            {selectedProducts.map((p) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.code} | {p.warehouse}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeProduct(p.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span>نوع السعر</span>
                    <Select
                      value={p.selectedPriceType || "custom"}
                      onValueChange={(value) =>
                        updatePriceType(p.id, value as ProductPriceType)
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priceTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">سعر مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>السعر</span>
                    <Input
                      type="number"
                      min={0}
                      value={p.sellPrice}
                      onChange={(e) => updatePrice(p.id, Number(e.target.value))}
                      className="h-10"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>الكمية</span>
                    <Input
                      type="number"
                      min={1}
                      value={p.qty}
                      onChange={(e) => updateQty(p.id, Number(e.target.value))}
                      className="h-10"
                    />
                  </label>
                </div>
                <p className="mt-3 text-left font-bold">
                  ${(p.sellPrice * p.qty).toFixed(2)}
                </p>
              </div>
            ))}
            <div className="rounded-md border bg-muted/40 p-3 text-left font-bold">
              الإجمالي: ${total.toFixed(2)}
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2">المنتج</th>
                  <th className="border p-2">الكود</th>
                  <th className="border p-2">نوع السعر</th>
                  <th className="border p-2">السعر</th>
                  <th className="border p-2">الكمية</th>
                  <th className="border p-2">المجموع</th>
                  <th className="border p-2">حذف</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="border p-2">{p.name}</td>
                    <td className="border p-2">{p.code}</td>
                    <td className="border p-2">
                      <Select
                        value={p.selectedPriceType || "custom"}
                        onValueChange={(value) =>
                          updatePriceType(p.id, value as ProductPriceType)
                        }
                      >
                        <SelectTrigger className="h-10 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priceTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">سعر مخصص</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        min={0}
                        value={p.sellPrice}
                        onChange={(e) => updatePrice(p.id, Number(e.target.value))}
                        className="w-24"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        min={1}
                        value={p.qty}
                        onChange={(e) => updateQty(p.id, Number(e.target.value))}
                        className="w-24"
                      />
                    </td>
                    <td className="border p-2">
                      ${(p.sellPrice * p.qty).toFixed(2)}
                    </td>
                    <td className="border p-2 text-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProduct(p.id)}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border p-2 text-right font-bold">
                    الإجمالي
                  </td>
                  <td colSpan={2} className="border p-2 font-bold">
                    ${total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductsTable;
