import AccountSelect from "@/components/Accounts/AccountSelect";
import AddCustomerForm from "@/components/Customers/AddCustomerForm";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ProductsTable from "@/components/sellProduct/ProductsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FormInput from "@/components/ui/custom/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvoiceDraftSync } from "@/hooks/useInvoiceDraftSync";
import { useOfflineSalesSync } from "@/hooks/useOfflineSalesSync";
import { buildInvoiceMoney, formatExchangeRate, formatMoney } from "@/lib/money";
import getAllCustomer from "@/services/customer";
import { InvoicePaymentStatus } from "@/services/invoiceDraft";
import { markQuotationConverted } from "@/services/quotations";
import { enqueueOfflineSale } from "@/services/offlineSales";
import getAllProducts from "@/services/products";
import { sell, sellProducts } from "@/services/transaction";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getAvailableQuantity = (product?: any) =>
  Math.max(
    toNumber(product?.quantity) - toNumber(product?.reservedQuantity),
    0,
  );

const normalizeLookupValue = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const findCurrentProductForSale = (
  selectedProduct: any,
  currentProducts: any[] = [],
) => {
  const selectedId = String(selectedProduct?.id || "");
  const selectedCode = normalizeLookupValue(selectedProduct?.code);
  const selectedWarehouse = normalizeLookupValue(selectedProduct?.warehouse);
  const matchesWarehouse = (product: any) =>
    !selectedWarehouse ||
    normalizeLookupValue(product?.warehouse) === selectedWarehouse;
  const codeMatches = currentProducts.filter(
    (product) =>
      selectedCode && normalizeLookupValue(product?.code) === selectedCode,
  );

  return (
    currentProducts.find(
      (product) =>
        String(product?.id || "") === selectedId && matchesWarehouse(product),
    ) ||
    currentProducts.find(
      (product) =>
        selectedCode &&
        normalizeLookupValue(product?.code) === selectedCode &&
        matchesWarehouse(product),
    ) ||
    currentProducts.find(
      (product) => selectedId && String(product?.id || "") === selectedId,
    ) ||
    (codeMatches.length === 1 ? codeMatches[0] : undefined)
  );
};

const getRequestErrorMessage = (error: unknown) => {
  const responseData = (error as any)?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    (error as Error)?.message ||
    "حدث خطأ أثناء إنشاء الفاتورة"
  );
};

const isOfflineRequestError = (error: unknown) => {
  const requestError = error as any;

  if (requestError?.response) {
    return false;
  }

  if (requestError?.isNetworkError === true) {
    return true;
  }

  const errorCode = String(requestError?.code || "");
  const errorMessage = String(requestError?.message || "");

  return (
    errorCode === "ERR_NETWORK" ||
    errorCode === "ECONNABORTED" ||
    /network error|timeout|failed to fetch/i.test(errorMessage)
  );
};

export default function SellProduct() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const sourceQuotationIdRef = useRef<string | null>(null);
  const quotationAppliedRef = useRef(false);

  const {
    draft,
    isConnected,
    isLoading,
    isSyncing,
    lastSyncedAt,
    syncError,
    patchDraft,
    clearDraft,
  } = useInvoiceDraftSync();

  const queryClient = useQueryClient();
  const {
    isOnline,
    pendingSalesCount,
    isSyncingOfflineSales,
    clearOfflineSales,
    refreshPendingSalesCount,
    syncOfflineSales,
  } = useOfflineSalesSync(queryClient);

  const selectedProducts = draft.products;
  const discountAmount = draft.discountAmount ?? draft.discount;
  const discountPercent = draft.discountPercent ?? "";
  const paymentStatus = draft.paymentStatus;
  const partValue = draft.partValue;
  const currency = draft.currency;
  const exchangeRate = draft.exchangeRate;
  const paymentAccountId = draft.paymentAccountId;
  const receivableAccountId = draft.receivableAccountId;
  const salesAccountId = draft.salesAccountId;

  const amount = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + product.sellPrice * product.qty,
        0,
      ),
    [selectedProducts],
  );

  const saleMoney = useMemo(
    () =>
      buildInvoiceMoney({
        subtotalUSD: amount,
        paymentStatus,
        currency: currency || "USD",
        exchangeRate,
        partValue,
        discountAmountUSD: toNumber(discountAmount),
        discountPercent: toNumber(discountPercent),
      }),
    [
      amount,
      currency,
      discountAmount,
      discountPercent,
      exchangeRate,
      partValue,
      paymentStatus,
    ],
  );
  const finalAmount = saleMoney.totalUSD;
  const canReachServer = isOnline || isConnected;

  useEffect(() => {
    const quotation = (location.state as any)?.quotation;

    if (!quotation || quotationAppliedRef.current) {
      return;
    }

    quotationAppliedRef.current = true;
    sourceQuotationIdRef.current = quotation.id || null;

    patchDraft(
      {
        customerId: quotation.customerId || "",
        products: Array.isArray(quotation.products)
            ? quotation.products.map((product: any) => ({
              ...product,
              qty: toNumber(product.qty),
              sellPrice: toNumber(product.sellPrice),
              selectedPriceType: "custom",
            }))
          : [],
        discount:
          quotation.discount === undefined || quotation.discount === null
            ? ""
            : String(quotation.discount),
        discountAmount:
          quotation.discountAmountUSD === undefined ||
          quotation.discountAmountUSD === null
            ? quotation.discount === undefined || quotation.discount === null
              ? ""
              : String(quotation.discount)
            : String(quotation.discountAmountUSD),
        discountPercent:
          quotation.discountPercent === undefined ||
          quotation.discountPercent === null
            ? ""
            : String(quotation.discountPercent),
        currency: quotation.currency || "USD",
        exchangeRate:
          quotation.currency === "USD"
            ? 1
            : toNumber(quotation.exchangeRate) || 1,
      },
      { immediate: true },
    );
  }, [location.state, patchDraft]);

  const sellProductMutation = useMutation({
    mutationFn: (dataToSend: sell) => sellProducts({ newSell: dataToSend }),
    onSuccess: async (result) => {
      toast.success("تم إنشاء الفاتورة بنجاح");
      if (sourceQuotationIdRef.current) {
        await markQuotationConverted(
          sourceQuotationIdRef.current,
          result?.data?.id,
        );
        queryClient.invalidateQueries({ queryKey: ["quotations-table"] });
        sourceQuotationIdRef.current = null;
      }
      await clearDraft();
      await refreshPendingSalesCount();
      queryClient.invalidateQueries({ queryKey: ["sells-table"] });
      queryClient.invalidateQueries({ queryKey: ["products-table"] });
    },
    onError: async (error, dataToSend) => {
      console.error("Sell invoice error:", {
        error,
        response: (error as any)?.response?.data,
        sale: dataToSend,
      });

      if (isOfflineRequestError(error)) {
        await enqueueOfflineSale(dataToSend);
        await clearDraft({ localOnly: true });
        await refreshPendingSalesCount();
        queryClient.invalidateQueries({ queryKey: ["products-table"] });
        toast.success("تم حفظ الفاتورة محليا وسيتم إرسالها عند عودة الإنترنت");
        return;
      }

      toast.error(getRequestErrorMessage(error));
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-table"],
    queryFn: getAllProducts,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-table"],
    queryFn: getAllCustomer,
  });

  useEffect(() => {
    if (!Array.isArray(products) || !products.length || !selectedProducts.length) {
      return;
    }

    let changed = false;
    const reconciledProducts = selectedProducts.map((product) => {
      const currentProduct = findCurrentProductForSale(product, products);

      if (!currentProduct) {
        return product;
      }

      const nextProduct = {
        ...product,
        id: currentProduct.id || product.id,
        warehouse: currentProduct.warehouse || product.warehouse,
        quantity: toNumber(currentProduct.quantity),
        reservedQuantity: toNumber(currentProduct.reservedQuantity),
        payPrice:
          currentProduct.payPrice === undefined
            ? product.payPrice
            : toNumber(currentProduct.payPrice),
        wholesalePrice:
          currentProduct.wholesalePrice === undefined
            ? product.wholesalePrice
            : toNumber(currentProduct.wholesalePrice),
        superWholesalePrice:
          currentProduct.superWholesalePrice === undefined
            ? product.superWholesalePrice
            : toNumber(currentProduct.superWholesalePrice),
        updatedDate: currentProduct.updatedDate || product.updatedDate,
      };

      changed =
        changed ||
        nextProduct.id !== product.id ||
        nextProduct.warehouse !== product.warehouse ||
        toNumber(nextProduct.quantity) !== toNumber(product.quantity) ||
        toNumber(nextProduct.reservedQuantity) !==
          toNumber(product.reservedQuantity);

      return nextProduct;
    });

    if (changed) {
      patchDraft({ products: reconciledProducts }, { immediate: true });
    }
  }, [patchDraft, products, selectedProducts]);

  const customerColumns = [
    { key: "id", label: "الرمز", sortable: true, hidden: true },
    { key: "name", label: "الاسم", sortable: true },
    { key: "number", label: "الرقم", sortable: true },
  ];

  const toggleRowSelection = (row: any) => {
    const isSelected = String(draft.customerId) === String(row.id);
    const nextCustomerId = isSelected ? "" : String(row.id);

    patchDraft({ customerId: nextCustomerId }, { immediate: true });
  };

  const setPaymentStatus = (nextStatus: InvoicePaymentStatus) => {
    patchDraft({ paymentStatus: nextStatus }, { immediate: true });
  };

  const validateAccounts = () => {
    if (!salesAccountId) {
      toast.error("الرجاء اختيار حساب المبيعات");
      return false;
    }

    if (!currency) {
      toast.error("الرجاء اختيار العملة المدفوعة");
      return false;
    }

    if (
      currency !== "USD" &&
      (!exchangeRate || exchangeRate <= 0)
    ) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return false;
    }

    if (paymentStatus === "part" && Number(partValue || 0) <= 0) {
      toast.error("الرجاء إدخال قيمة الدفعة");
      return false;
    }

    if (
      (paymentStatus === "cash" || paymentStatus === "part") &&
      !paymentAccountId
    ) {
      toast.error("الرجاء اختيار حساب القبض");
      return false;
    }

    if (
      (paymentStatus === "debt" || paymentStatus === "part") &&
      !receivableAccountId
    ) {
      toast.error("الرجاء اختيار حساب العملاء");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!draft.customerId) {
      toast.error("الرجاء التأكد من اختيار زبون");
      return;
    }

    if (!selectedProducts.length) {
      toast.error("الرجاء اختيار منتج واحد على الأقل");
      return;
    }

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      toast.error("قيمة الفاتورة يجب أن تكون أكبر من صفر");
      return;
    }

    if (toNumber(discountPercent) < 0 || toNumber(discountPercent) > 100) {
      toast.error("نسبة الحسم يجب أن تكون بين 0 و 100");
      return;
    }

    if (toNumber(discountAmount) < 0) {
      toast.error("مبلغ الحسم لا يمكن أن يكون سالبا");
      return;
    }

    if (saleMoney.discountUSD >= amount) {
      toast.error("الحسم يجب أن يكون أقل من مجموع الفاتورة");
      return;
    }

    if (
      selectedProducts.some(
        (product) =>
          toNumber(product.qty) <= 0 || toNumber(product.sellPrice) <= 0,
      )
    ) {
      toast.error("كل الكميات وأسعار البيع يجب أن تكون أكبر من صفر");
      return;
    }

    if (!Array.isArray(products) || products.length === 0) {
      toast.error("تعذر التحقق من كميات المنتجات الحالية");
      return;
    }

    const unavailableProduct = selectedProducts.find((selectedProduct) => {
      const currentProduct = findCurrentProductForSale(
        selectedProduct,
        products,
      );

      if (!currentProduct) {
        return true;
      }

      return (
        toNumber(selectedProduct.qty) > getAvailableQuantity(currentProduct)
      );
    });

    if (unavailableProduct) {
      const currentProduct = findCurrentProductForSale(
        unavailableProduct,
        products,
      );
      const availableQuantity = currentProduct
        ? getAvailableQuantity(currentProduct)
        : 0;

      toast.error(
        `الكمية المطلوبة من ${unavailableProduct.name} غير متوفرة. المتاح حالياً: ${availableQuantity}`,
      );
      return;
    }

    if (!validateAccounts()) {
      return;
    }

    if (paymentStatus === "part" && saleMoney.paidUSD >= finalAmount) {
      toast.error("الدفعة الجزئية يجب أن تكون أقل من إجمالي الفاتورة");
      return;
    }

    const saleData: sell = {
      customerId: draft.customerId,
      totalPrice: finalAmount,
      products: selectedProducts.map((product) => {
        const currentProduct = findCurrentProductForSale(product, products);

        return {
          ...product,
          id: currentProduct?.id || product.id,
          warehouse: currentProduct?.warehouse || product.warehouse,
          quantity: currentProduct
            ? toNumber(currentProduct.quantity)
            : product.quantity === undefined
              ? undefined
              : toNumber(product.quantity),
          reservedQuantity:
            currentProduct?.reservedQuantity === undefined
              ? product.reservedQuantity
              : toNumber(currentProduct.reservedQuantity),
          qty: toNumber(product.qty),
          sellPrice: toNumber(product.sellPrice),
          payPrice:
            product.payPrice === undefined ? undefined : toNumber(product.payPrice),
        };
      }),
      paymentStatus,
      remainingDebt: saleMoney.remainingUSD,
      paymentAccountId:
        paymentStatus === "debt" ? undefined : paymentAccountId,
      receivableAccountId:
        paymentStatus === "cash" ? undefined : receivableAccountId,
      salesAccountId,
      currency: saleMoney.paymentCurrency,
      paymentCurrency: saleMoney.paymentCurrency,
      priceCurrency: saleMoney.priceCurrency,
      exchangeRate: saleMoney.exchangeRate,
      amount_base: saleMoney.totalOriginal,
      subtotalUSD: saleMoney.subtotalUSD,
      totalUSD: saleMoney.totalUSD,
      totalSYP: saleMoney.totalSYP,
      totalOriginal: saleMoney.totalOriginal,
      paidUSD: saleMoney.paidUSD,
      paidSYP: saleMoney.paidSYP,
      paidOriginal: saleMoney.paidOriginal,
      remainingUSD: saleMoney.remainingUSD,
      remainingSYP: saleMoney.remainingSYP,
      remainingOriginal: saleMoney.remainingOriginal,
      discountType: saleMoney.discountType,
      discountPercent: saleMoney.discountPercent,
      discountPercentUSD: saleMoney.discountPercentUSD,
      discountAmountUSD: saleMoney.discountAmountUSD,
      discountUSD: saleMoney.discountUSD,
      discountSYP: saleMoney.discountSYP,
      discountOriginal: saleMoney.discountOriginal,
      partValue: saleMoney.paidOriginal,
      discount: saleMoney.discountUSD,
    };

    sellProductMutation.mutate(saleData);
  };

  return (
    <DashboardLayout>
      <Card className="overflow-hidden" dir="rtl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">بيع المنتجات</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant={
                    !canReachServer
                      ? "destructive"
                      : isConnected
                        ? "default"
                        : "outline"
                  }
                  className="gap-1"
                >
                  {canReachServer ? (
                    <Wifi className="h-3.5 w-3.5" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5" />
                  )}
                  {!canReachServer
                    ? "بدون اتصال"
                    : isConnected
                      ? "متصل لحظيا"
                      : "الاتصال متاح"}
                </Badge>

                {pendingSalesCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    فواتير محلية: {pendingSalesCount}
                  </Badge>
                )}

                {pendingSalesCount > 0 && isOnline && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void syncOfflineSales()}
                    disabled={isSyncingOfflineSales}
                    loading={isSyncingOfflineSales}
                    className="h-7 px-2 text-xs"
                  >
                    إرسال الآن
                  </Button>
                )}

                {pendingSalesCount > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void clearOfflineSales()}
                    disabled={isSyncingOfflineSales}
                    loading={isSyncingOfflineSales}
                    className="h-7 px-2 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    تفريغ الفواتير المحلية
                  </Button>
                )}

                {isSyncing && (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    جاري المزامنة
                  </Badge>
                )}

                {isLoading && <span>تحميل مسودة الفاتورة...</span>}

                {lastSyncedAt && !isLoading && (
                  <span className="text-muted-foreground">
                    آخر تحديث:{" "}
                    {lastSyncedAt.toLocaleTimeString("ar-SY", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                )}

                {syncError && (
                  <span className="text-destructive">{syncError}</span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void clearDraft().then(() => {
                  toast.success("تم تفريغ المسودة");
                });
              }}
              disabled={sellProductMutation.isPending}
              className="w-full md:w-auto"
            >
              تفريغ المسودة
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 p-3 sm:p-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <DataTable
              title="الزبائن"
              titleButton={
                <AddCustomerForm
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  className="mb-2 w-full"
                />
              }
              columns={customerColumns || []}
              data={customers || []}
              onRowClick={(row) => toggleRowSelection(row)}
              getRowClassName={(row) =>
                String(row.id) === String(draft.customerId)
                  ? "bg-green-50 hover:bg-green-100"
                  : ""
              }
            />
          </div>

          <div className="md:col-span-2">
            <ProductsTable
              products={products}
              selectedProducts={selectedProducts}
              onChange={(selected) =>
                patchDraft({ products: selected }, { immediate: true })
              }
            />
          </div>

          <form className="mt-2 grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-2">
            <FormInput
              label="حسم نسبة %"
              id="discount-percent"
              type="text"
              value={discountPercent}
              onChange={(event) =>
                patchDraft({ discountPercent: event.target.value })
              }
            />

            <FormInput
              label="حسم مبلغ"
              id="discount-amount"
              type="text"
              value={discountAmount}
              onChange={(event) =>
                patchDraft({
                  discountAmount: event.target.value,
                  discount: event.target.value,
                })
              }
            />

            <FormInput
              label="السعر النهائي"
              id="final-amount"
              type="text"
              value={finalAmount.toString()}
              onChange={() => {}}
            />

            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <Button
                onClick={() => setPaymentStatus("cash")}
                className="col-span-1 h-11"
                variant={paymentStatus === "cash" ? "default" : "outline"}
                type="button"
              >
                نقدا
              </Button>
              <Button
                onClick={() => setPaymentStatus("part")}
                className="col-span-1 h-11"
                variant={paymentStatus === "part" ? "default" : "outline"}
                type="button"
              >
                جزئي
              </Button>
              <Button
                onClick={() => setPaymentStatus("debt")}
                className="col-span-1 h-11"
                variant={paymentStatus === "debt" ? "default" : "outline"}
                type="button"
              >
                دين
              </Button>
            </div>

            {paymentStatus === "part" && (
              <FormInput
                id="partPayment"
                label="قيمة الدفعة"
                value={partValue}
                onChange={(event) =>
                  patchDraft({ partValue: event.target.value })
                }
              />
            )}

            <>
              <>
                <Select
                  value={currency}
                  onValueChange={(nextCurrency) =>
                    patchDraft({
                      currency: nextCurrency,
                      exchangeRate:
                        nextCurrency === "USD" ? 1 : exchangeRate || 1,
                    })
                  }
                >
                  <SelectTrigger className="mt-6 h-11 w-full">
                    <SelectValue placeholder="العملة المدفوع بها" />
                  </SelectTrigger>
                  <SelectContent>
                    {["SYP", "USD"].map((currencyOption) => (
                      <SelectItem key={currencyOption} value={currencyOption}>
                        {currencyOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FormInput
                  id="exchangeRate"
                  label="سعر الصرف"
                  value={currency === "USD" ? 1 : exchangeRate}
                  onChange={(event) =>
                    patchDraft({ exchangeRate: Number(event.target.value) })
                  }
                  disabled={currency === "USD"}
                />
              </>
            </>

            <div className="rounded-md border bg-muted/30 p-3 text-sm md:col-span-2">
              <div className="grid gap-1 sm:grid-cols-3">
                <span>الإجمالي: {formatMoney(saleMoney.totalUSD, "USD")}</span>
                <span>المدفوع: {formatMoney(saleMoney.paidUSD, "USD")}</span>
                <span>المتبقي: {formatMoney(saleMoney.remainingUSD, "USD")}</span>
              </div>
              {saleMoney.paymentCurrency === "SYP" && (
                <div className="mt-1 grid gap-1 sm:grid-cols-3">
                  <span>الإجمالي: {formatMoney(saleMoney.totalSYP, "SYP")}</span>
                  <span>المدفوع: {formatMoney(saleMoney.paidSYP, "SYP")}</span>
                  <span>المتبقي: {formatMoney(saleMoney.remainingSYP, "SYP")}</span>
                </div>
              )}
              {saleMoney.paymentCurrency === "SYP" && (
                <div className="mt-1 text-muted-foreground">
                  سعر الصرف المعتمد: {formatExchangeRate(saleMoney.exchangeRate)}
                </div>
              )}
            </div>

            <AccountSelect
              label="حساب المبيعات"
              value={salesAccountId}
              onChange={(value) =>
                patchDraft({ salesAccountId: value }, { immediate: true })
              }
              filterType="sales"
            />

            {(paymentStatus === "cash" || paymentStatus === "part") && (
              <AccountSelect
                label="حساب القبض"
                value={paymentAccountId}
                onChange={(value) =>
                  patchDraft({ paymentAccountId: value }, { immediate: true })
                }
                filterType="payment"
              />
            )}

            {(paymentStatus === "debt" || paymentStatus === "part") && (
              <AccountSelect
                label="حساب العملاء"
                value={receivableAccountId}
                onChange={(value) =>
                  patchDraft(
                    { receivableAccountId: value },
                    { immediate: true },
                  )
                }
                filterType="receivable"
              />
            )}

            <Button
              className="h-11 w-full md:col-span-2"
              variant="accent"
              disabled={sellProductMutation.isPending || isSyncingOfflineSales}
              loading={sellProductMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              إتمام عملية البيع
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
