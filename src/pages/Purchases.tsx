import AccountSelect from "@/components/Accounts/AccountSelect";
import SupplierSelect from "@/components/Products/SupplierSelect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import QrScannerButton from "@/components/Products/QrScannerButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildInvoiceMoney, formatExchangeRate, formatMoney } from "@/lib/money";
import { queryKeys } from "@/lib/queryKeys";
import getAllProducts from "@/services/products";
import { Product, purchaseInvoice } from "@/services/transaction";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Search, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type SelectedPurchaseProduct = Product & {
  qty: number;
  purchasePayPrice: number;
  purchaseWholesalePrice: number;
  purchaseSuperWholesalePrice: number;
  purchaseSellPrice: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium leading-none">{label}</label>
      {children}
    </div>
  );
}

export default function Purchases() {
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [supplierId, setSupplierId] = useState<string | number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    SelectedPurchaseProduct[]
  >([]);
  const [paymentStatus, setPaymentStatus] = useState<"cash" | "part" | "debt">(
    "cash",
  );
  const [partValue, setPartValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [inventoryAccountId, setInventoryAccountId] = useState("");
  const [payableAccountId, setPayableAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");

  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products,
    queryFn: getAllProducts,
  });

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return products
      .filter((product: Product) => {
        return (
          product.name?.toLowerCase().includes(term) ||
          product.code?.toLowerCase().includes(term)
        );
      })
      .slice(0, 20);
  }, [products, search]);

  const totalPrice = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) =>
          sum + toNumber(product.purchasePayPrice) * toNumber(product.qty),
        0,
      ),
    [selectedProducts],
  );

  const purchaseMoney = useMemo(
    () =>
      buildInvoiceMoney({
        totalUSD: totalPrice,
        paymentStatus,
        currency,
        exchangeRate,
        partValue,
      }),
    [currency, exchangeRate, partValue, paymentStatus, totalPrice],
  );

  const mutation = useMutation({
    mutationFn: purchaseInvoice,
    onSuccess: () => {
      toast.success("تم تثبيت فاتورة الشراء بنجاح");
      setSupplierId(null);
      setSearch("");
      setSelectedProducts([]);
      setPaymentStatus("cash");
      setPartValue("");
      setCurrency("USD");
      setExchangeRate(1);
      setInventoryAccountId("");
      setPayableAccountId("");
      setPaymentAccountId("");
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries });
      queryClient.invalidateQueries({ queryKey: ["payments-table"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-table"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-details"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "تعذر تثبيت فاتورة الشراء");
    },
  });

  const addProduct = (product: Product) => {
    setSelectedProducts((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...current,
        {
          ...product,
          qty: 1,
          purchasePayPrice: toNumber(product.payPrice),
          purchaseWholesalePrice: toNumber(product.wholesalePrice, toNumber(product.sellPrice)),
          purchaseSuperWholesalePrice: toNumber(
            product.superWholesalePrice,
            toNumber(product.wholesalePrice, toNumber(product.sellPrice)),
          ),
          purchaseSellPrice: toNumber(product.sellPrice),
        },
      ];
    });
    setSearch("");
  };

  const handleQrScan = (code: string) => {
    setSearch(code);

    const product = products.find(
      (item: Product) =>
        item?.code?.trim().toLowerCase() === code.trim().toLowerCase(),
    );

    if (!product) {
      toast.error("لم يتم العثور على منتج بهذا الرمز");
      return false;
    }

    addProduct(product);
    toast.success("تمت إضافة المنتج من رمز QR");
    return true;
  };

  const updateSelectedProduct = (
    id: string,
    key:
      | "qty"
      | "purchasePayPrice"
      | "purchaseWholesalePrice"
      | "purchaseSuperWholesalePrice"
      | "purchaseSellPrice",
    value: number,
  ) => {
    setSelectedProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, [key]: value } : product,
      ),
    );
  };

  const removeProduct = (id: string) => {
    setSelectedProducts((current) =>
      current.filter((product) => product.id !== id),
    );
  };

  const validateForm = () => {
    if (!supplierId) {
      toast.error("الرجاء اختيار المورد");
      return false;
    }

    if (!selectedProducts.length) {
      toast.error("الرجاء إضافة منتج واحد على الأقل");
      return false;
    }

    if (selectedProducts.some((product) => toNumber(product.qty) <= 0)) {
      toast.error("كل الكميات يجب أن تكون أكبر من صفر");
      return false;
    }

    if (
      selectedProducts.some(
        (product) =>
          toNumber(product.purchasePayPrice) <= 0 ||
          toNumber(product.purchaseWholesalePrice) <= 0 ||
          toNumber(product.purchaseSuperWholesalePrice) <= 0 ||
          toNumber(product.purchaseSellPrice) <= 0,
      )
    ) {
      toast.error("كل أسعار المنتج يجب أن تكون أكبر من صفر");
      return false;
    }

    if (!inventoryAccountId) {
      toast.error("الرجاء اختيار حساب المخزون");
      return false;
    }

    if (!payableAccountId) {
      toast.error("الرجاء اختيار حساب الموردين");
      return false;
    }

    if (paymentStatus !== "debt" && !paymentAccountId) {
      toast.error("الرجاء اختيار حساب الدفع");
      return false;
    }

    if (!currency) {
      toast.error("الرجاء اختيار العملة");
      return false;
    }

    if (currency === "SYP" && toNumber(exchangeRate) <= 0) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return false;
    }

    if (paymentStatus === "part" && toNumber(partValue) <= 0) {
      toast.error("الرجاء إدخال قيمة الدفعة");
      return false;
    }

    if (paymentStatus === "part" && purchaseMoney.paidUSD >= totalPrice) {
      toast.error("الدفعة الجزئية يجب أن تكون أقل من إجمالي الفاتورة");
      return false;
    }

    return true;
  };

  const submitInvoice = () => {
    if (!validateForm()) return;

    mutation.mutate({
      newPurchase: {
        supplierId,
        name: "فاتورة شراء متعددة",
        code: `PINV-${Date.now()}`,
        warehouse: Array.from(
          new Set(selectedProducts.map((product) => product.warehouse)),
        ).join(", "),
        quantity: selectedProducts.reduce(
          (sum, product) => sum + toNumber(product.qty),
          0,
        ),
        payPrice: 0,
        totalPrice,
        paymentStatus,
        remainingDebt: purchaseMoney.remainingUSD,
        currency: purchaseMoney.paymentCurrency,
        paymentCurrency: purchaseMoney.paymentCurrency,
        priceCurrency: purchaseMoney.priceCurrency,
        exchangeRate: purchaseMoney.exchangeRate,
        amount_base: purchaseMoney.totalOriginal,
        totalUSD: purchaseMoney.totalUSD,
        totalSYP: purchaseMoney.totalSYP,
        totalOriginal: purchaseMoney.totalOriginal,
        paidUSD: purchaseMoney.paidUSD,
        paidSYP: purchaseMoney.paidSYP,
        paidOriginal: purchaseMoney.paidOriginal,
        remainingUSD: purchaseMoney.remainingUSD,
        remainingSYP: purchaseMoney.remainingSYP,
        remainingOriginal: purchaseMoney.remainingOriginal,
        partValue: purchaseMoney.paidOriginal,
        inventoryAccountId,
        payableAccountId,
        paymentAccountId:
          paymentStatus === "debt" ? undefined : paymentAccountId,
        products: selectedProducts.map((product) => ({
          id: product.id,
          name: product.name,
          code: product.code,
          category: product.category,
          warehouse: product.warehouse,
          quantity: toNumber(product.qty),
          payPrice: toNumber(product.purchasePayPrice),
          wholesalePrice: toNumber(product.purchaseWholesalePrice),
          superWholesalePrice: toNumber(product.purchaseSuperWholesalePrice),
          sellPrice: toNumber(product.purchaseSellPrice),
          unit: product.unit,
          alertQuantity: product.alertQuantity,
          lineTotal: toNumber(product.qty) * toNumber(product.purchasePayPrice),
        })),
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PackagePlus className="h-5 w-5" />
              فاتورة شراء متعددة المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-3 sm:p-6">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
              <FieldBlock label="المورد">
                <SupplierSelect
                  isOpen={supplierModalOpen}
                  setIsOpen={setSupplierModalOpen}
                  supplierId={supplierId}
                  setSupplierId={setSupplierId}
                  className="h-10"
                  withDataTable
                />
              </FieldBlock>

              <AccountSelect
                label="حساب المخزون"
                value={inventoryAccountId}
                onChange={setInventoryAccountId}
                filterType="inventory"
              />

              <AccountSelect
                label="حساب الموردين"
                value={payableAccountId}
                onChange={setPayableAccountId}
                filterType="payable"
              />
            </div>

            <div className="relative space-y-1.5">
              <label className="block text-sm font-medium leading-none">
                المنتجات
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث عن المنتج بالاسم أو الكود"
                    className="h-11 pr-9"
                  />
                </div>
                <QrScannerButton
                  onScan={handleQrScan}
                  className="h-11 w-full sm:w-auto"
                />
              </div>

              {filteredProducts.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border bg-background shadow-lg">
                  {filteredProducts.map((product: Product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-right text-sm last:border-b-0 hover:bg-accent"
                      onClick={() => addProduct(product)}
                    >
                      <span>
                        {product.name} ({product.code})
                      </span>
                      <span className="text-muted-foreground">
                        {product.warehouse} | {product.quantity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 md:hidden">
              {selectedProducts.length === 0 ? (
                <div className="rounded-md border p-6 text-center text-muted-foreground">
                  لم تتم إضافة منتجات بعد
                </div>
              ) : (
                selectedProducts.map((product) => (
                  <div key={product.id} className="rounded-md border p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.code} | {product.warehouse}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => removeProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                      <FieldBlock label="الكمية">
                        <Input
                          type="number"
                          min={1}
                          value={product.qty}
                          onChange={(event) =>
                            updateSelectedProduct(
                              product.id,
                              "qty",
                              toNumber(event.target.value),
                            )
                          }
                          className="h-10"
                        />
                      </FieldBlock>
                      <FieldBlock label="سعر الشراء">
                        <Input
                          type="number"
                          min={0}
                          value={product.purchasePayPrice}
                          onChange={(event) =>
                            updateSelectedProduct(
                              product.id,
                              "purchasePayPrice",
                              toNumber(event.target.value),
                            )
                          }
                          className="h-10"
                        />
                      </FieldBlock>
                      <FieldBlock label="سعر الجملة">
                        <Input
                          type="number"
                          min={0}
                          value={product.purchaseWholesalePrice}
                          onChange={(event) =>
                            updateSelectedProduct(
                              product.id,
                              "purchaseWholesalePrice",
                              toNumber(event.target.value),
                            )
                          }
                          className="h-10"
                        />
                      </FieldBlock>
                      <FieldBlock label="سعر جملة الجملة">
                        <Input
                          type="number"
                          min={0}
                          value={product.purchaseSuperWholesalePrice}
                          onChange={(event) =>
                            updateSelectedProduct(
                              product.id,
                              "purchaseSuperWholesalePrice",
                              toNumber(event.target.value),
                            )
                          }
                          className="h-10"
                        />
                      </FieldBlock>
                      <FieldBlock label="سعر البيع">
                        <Input
                          type="number"
                          min={0}
                          value={product.purchaseSellPrice}
                          onChange={(event) =>
                            updateSelectedProduct(
                              product.id,
                              "purchaseSellPrice",
                              toNumber(event.target.value),
                            )
                          }
                          className="h-10"
                        />
                      </FieldBlock>
                    </div>
                    <p className="mt-3 text-left font-bold">
                      {(
                        toNumber(product.qty) *
                        toNumber(product.purchasePayPrice)
                      ).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-md border md:block">
              <table className="w-full min-w-[1080px] border-collapse text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">المنتج</th>
                    <th className="p-2 text-right">الكود</th>
                    <th className="p-2 text-right">المستودع</th>
                    <th className="p-2 text-right">الكمية</th>
                    <th className="p-2 text-right">سعر الشراء</th>
                    <th className="p-2 text-right">سعر الجملة</th>
                    <th className="p-2 text-right">سعر جملة الجملة</th>
                    <th className="p-2 text-right">سعر البيع</th>
                    <th className="p-2 text-right">المجموع</th>
                    <th className="p-2 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.length === 0 ? (
                    <tr>
                      <td
                        className="p-6 text-center text-muted-foreground"
                        colSpan={10}
                      >
                        لم تتم إضافة منتجات بعد
                      </td>
                    </tr>
                  ) : (
                    selectedProducts.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="p-2">{product.name}</td>
                        <td className="p-2">{product.code}</td>
                        <td className="p-2">{product.warehouse}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            value={product.qty}
                            onChange={(event) =>
                              updateSelectedProduct(
                                product.id,
                                "qty",
                                toNumber(event.target.value),
                              )
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={product.purchasePayPrice}
                            onChange={(event) =>
                              updateSelectedProduct(
                                product.id,
                                "purchasePayPrice",
                                toNumber(event.target.value),
                              )
                            }
                            className="w-28"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={product.purchaseWholesalePrice}
                            onChange={(event) =>
                              updateSelectedProduct(
                                product.id,
                                "purchaseWholesalePrice",
                                toNumber(event.target.value),
                              )
                            }
                            className="w-28"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={product.purchaseSuperWholesalePrice}
                            onChange={(event) =>
                              updateSelectedProduct(
                                product.id,
                                "purchaseSuperWholesalePrice",
                                toNumber(event.target.value),
                              )
                            }
                            className="w-28"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={product.purchaseSellPrice}
                            onChange={(event) =>
                              updateSelectedProduct(
                                product.id,
                                "purchaseSellPrice",
                                toNumber(event.target.value),
                              )
                            }
                            className="w-28"
                          />
                        </td>
                        <td className="p-2 font-medium">
                          {(
                            toNumber(product.qty) *
                            toNumber(product.purchasePayPrice)
                          ).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button
                type="button"
                className="h-10"
                variant={paymentStatus === "cash" ? "default" : "outline"}
                onClick={() => setPaymentStatus("cash")}
              >
                نقدا
              </Button>
              <Button
                type="button"
                className="h-10"
                variant={paymentStatus === "part" ? "default" : "outline"}
                onClick={() => setPaymentStatus("part")}
              >
                جزئي
              </Button>
              <Button
                type="button"
                className="h-10"
                variant={paymentStatus === "debt" ? "default" : "outline"}
                onClick={() => setPaymentStatus("debt")}
              >
                دين
              </Button>
            </div>

            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <>
                <>
                  <FieldBlock label="العملة">
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="SYP">SYP</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label="سعر الصرف">
                    <Input
                      type="number"
                      value={currency === "USD" ? 1 : exchangeRate}
                      disabled={currency === "USD"}
                      onChange={(event) =>
                        setExchangeRate(toNumber(event.target.value))
                      }
                      placeholder="سعر الصرف"
                      className="h-10"
                    />
                  </FieldBlock>

                  {paymentStatus !== "debt" && (
                  <AccountSelect
                    label="حساب الدفع"
                    value={paymentAccountId}
                    onChange={setPaymentAccountId}
                    filterType="payment"
                  />
                  )}
                </>
              </>

              {paymentStatus === "part" && (
                <FieldBlock label="قيمة الدفعة">
                  <Input
                    type="number"
                    value={partValue}
                    onChange={(event) => setPartValue(event.target.value)}
                    placeholder="قيمة الدفعة"
                    className="h-10"
                  />
                </FieldBlock>
              )}
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-3">
                <span>الإجمالي: {formatMoney(purchaseMoney.totalUSD, "USD")}</span>
                <span>المدفوع: {formatMoney(purchaseMoney.paidUSD, "USD")}</span>
                <span>المتبقي: {formatMoney(purchaseMoney.remainingUSD, "USD")}</span>
              </div>
              {purchaseMoney.paymentCurrency === "SYP" && (
                <div className="mt-1 grid gap-1 sm:grid-cols-3">
                  <span>الإجمالي: {formatMoney(purchaseMoney.totalSYP, "SYP")}</span>
                  <span>المدفوع: {formatMoney(purchaseMoney.paidSYP, "SYP")}</span>
                  <span>المتبقي: {formatMoney(purchaseMoney.remainingSYP, "SYP")}</span>
                </div>
              )}
              {purchaseMoney.paymentCurrency === "SYP" && (
                <div className="mt-1 text-muted-foreground">
                  سعر الصرف المعتمد: {formatExchangeRate(purchaseMoney.exchangeRate)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-lg font-bold">
                إجمالي الفاتورة: {totalPrice.toFixed(2)}
              </div>
              <Button
                type="button"
                variant="accent"
                disabled={mutation.isPending}
                loading={mutation.isPending}
                onClick={submitInvoice}
              >
                تثبيت فاتورة الشراء
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
