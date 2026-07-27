import AccountSelect from "@/components/Accounts/AccountSelect";
import DetailsInputs from "@/components/Customers/DetailsInputs";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import PaymentTypeSelector from "@/components/sellProduct/PaymentTypeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import FormInput from "@/components/ui/custom/FormInput";
import PopupForm from "@/components/ui/custom/PopupForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatExchangeRate,
  formatMoney as formatCurrencyAmount,
  shouldShowExchangeRate,
} from "@/lib/money";
import { getSupplierById } from "@/services/supplier";
import {
  handleSupplierReturn,
  paySupplierDebt,
} from "@/services/transaction";
import { parseDate } from "@/utils/parseDate";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatAmount = (value: unknown) =>
  toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatDualCurrency = (usd: unknown, syp?: unknown) => {
  const sypAmount = toNumber(syp);
  const usdText = formatCurrencyAmount(toNumber(usd), "USD");

  return sypAmount ? `${usdText} / ${formatCurrencyAmount(sypAmount, "SYP")}` : usdText;
};

const getPaymentStatusLabel = (status?: string) => {
  if (status === "cash") return "نقدي";
  if (status === "part") return "جزئي";
  if (status === "debt") return "دين";
  return "غير محدد";
};

const getSupplierPaymentMovementLabel = (payment: any) => {
  if (payment?.purchaseId && payment?.type === "expense") {
    return "تسديد فاتورة شراء";
  }

  if (toNumber(payment?.amount) < 0) return "دفع للمورد";
  return "دفعة من المورد";
};

export default function SupplierDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const supplierId = location.state;

  const [isOpen, setIsOpen] = useState(false);
  const [isOpenTo, setIsOpenTo] = useState(false);
  const [returnAmount, setReturnAmount] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isDebt, setIsDebt] = useState<"cash" | "part" | "debt">("cash");
  const [partValue, setPartValue] = useState(0);
  const [reason, setReason] = useState("");
  const [currency, setCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [payableAccountId, setPayableAccountId] = useState("");
  const [inventoryAccountId, setInventoryAccountId] = useState("");
  const [invoicePaymentOpenId, setInvoicePaymentOpenId] = useState<
    string | null
  >(null);
  const [invoicePaymentAmount, setInvoicePaymentAmount] = useState(0);
  const [invoicePaymentNote, setInvoicePaymentNote] = useState("");
  const [invoicePaymentCurrency, setInvoicePaymentCurrency] = useState("USD");
  const [invoicePaymentExchangeRate, setInvoicePaymentExchangeRate] =
    useState(1);

  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-details", supplierId],
    queryFn: () => getSupplierById(supplierId),
    enabled: !!supplierId,
  });

  useEffect(() => {
    if (data?.data) {
      setSupplier(data.data);
      setPaymentAccountId(data.data.defaultPaymentAccountId || "");
      setPayableAccountId(data.data.defaultPayableAccountId || "");
      setInventoryAccountId(data.data.defaultInventoryAccountId || "");
    }
  }, [data]);

  const resetPaymentForm = () => {
    setAmount("");
    setNote("");
    setCurrency("");
    setExchangeRate(1);
    setInvoicePaymentOpenId(null);
    setInvoicePaymentAmount(0);
    setInvoicePaymentNote("");
    setInvoicePaymentCurrency("USD");
    setInvoicePaymentExchangeRate(1);
  };

  const validateSupplierPaymentAccounts = () => {
    if (!paymentAccountId || !payableAccountId) {
      toast.error("الرجاء اختيار حساب الدفع وحساب الموردين");
      return false;
    }
    return true;
  };

  const validateSupplierReturnAccounts = () => {
    if (!inventoryAccountId) {
      toast.error("الرجاء اختيار حساب المخزون");
      return false;
    }

    if ((isDebt === "cash" || isDebt === "part") && !paymentAccountId) {
      toast.error("الرجاء اختيار حساب الدفع");
      return false;
    }

    if ((isDebt === "debt" || isDebt === "part") && !payableAccountId) {
      toast.error("الرجاء اختيار حساب الموردين");
      return false;
    }

    return true;
  };

  const paySupplierDebtMutation = useMutation({
    mutationFn: (dataToSend: any) => paySupplierDebt(dataToSend as any),
    onSuccess: () => {
      toast.success("تم إضافة الدفعة بنجاح!");
      resetPaymentForm();
      setIsOpen(false);
      setIsOpenTo(false);
      queryClient.invalidateQueries({
        queryKey: ["supplier-details"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-table"],
      });
      queryClient.invalidateQueries({ queryKey: ["payments-table"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إضافة الدفعة");
    },
  });

  const returnMutation = useMutation({
    mutationFn: (dataToSend: {
      productCode: string;
      productName?: string;
      supplierName?: string;
      supplierId: string;
      warehouse: string;
      qty: number;
      returnValue: number;
      referenceId: string;
      productId: string;
      returnType: "debt" | "cash" | "part";
      partValue: number;
      reason: string;
      inventoryAccountId?: string;
      payableAccountId?: string;
      paymentAccountId?: string;
    }) => handleSupplierReturn(dataToSend),
    onSuccess: () => {
      toast.success("تم الإرجاع بنجاح!");
      setReturnAmount("");
      setReason("");
      setPartValue(0);
      setOpenRowId(null);
      queryClient.invalidateQueries({
        queryKey: ["supplier-details"],
      });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إرجاع المنتج");
    },
  });

  const paymentsColumns = [
    { label: "المعرف", key: "id", hidden: true },
    { label: "نوع الحركة", key: "movementLabel" },
    { label: "الفاتورة", key: "invoiceReference" },
    { label: "المبلغ", key: "amountDisplay" },
    { label: "العملة", key: "currency" },
    { label: "الوصف", key: "note" },
    { label: "التاريخ", key: "date" },
  ];

  const purchasesColumns = [
    { label: "المعرف", key: "id", hidden: true },
    { label: "الكود", key: "code" },
    { label: "طريقة الدفع", key: "status" },
    { label: "الإجمالي", key: "totalPriceDisplay" },
    { label: "المدفوع", key: "paidAmountDisplay" },
    { label: "المتبقي", key: "remainingDebtDisplay" },
    { label: "دفعات الفاتورة", key: "invoicePaymentsDisplay" },
    { label: "العملة", key: "currency" },
    { label: "المنتجات", key: "productsString" },
    { label: "التاريخ", key: "date" },
  ];

  const supplierPurchases = useMemo(
    () =>
      [...(data?.data?.purchases || [])]
        .map((purchase) => {
          const totalPrice = toNumber(purchase.totalUSD ?? purchase.totalPrice);
          const remainingDebt = toNumber(
            purchase.remainingUSD ?? purchase.remainingDebt,
          );
          const totalSYP = toNumber(purchase.totalSYP);
          const paidSYP = toNumber(purchase.paidSYP);
          const remainingSYP = toNumber(purchase.remainingSYP);
          const invoicePayments = Array.isArray(purchase.invoicePayments)
            ? purchase.invoicePayments
            : [];
          const paidAmount =
            purchase.paidUSD !== undefined
              ? toNumber(purchase.paidUSD)
              : purchase.paidAmount !== undefined
                ? toNumber(purchase.paidAmount)
              : Math.max(totalPrice - remainingDebt, 0);
          const invoicePaymentsDisplay = invoicePayments.length
            ? invoicePayments
                .map(
                  (payment) => {
                    const exchangeRateText = shouldShowExchangeRate(payment)
                      ? ` (${formatExchangeRate(payment.exchangeRate)})`
                      : "";

                    return `${formatDualCurrency(
                      Math.abs(toNumber(payment.amountUSD ?? payment.amount)),
                      Math.abs(toNumber(payment.amountSYP)),
                    )}${exchangeRateText} - ${
                      payment.date
                        ? new Date(payment.date).toLocaleDateString("en-GB")
                        : ""
                    }`;
                  },
                )
                .join(" | ")
            : "-";
          const productsString =
            purchase.productsString ||
            (Array.isArray(purchase.products) && purchase.products.length > 0
              ? purchase.products
                  .map(
                    (product) =>
                      `${product.name} (${toNumber(product.quantity)})`,
                  )
                  .join(", ")
              : purchase.name || "-");

          return {
            ...purchase,
            status:
              purchase.paymentStatusLabel ||
              getPaymentStatusLabel(purchase.paymentStatus),
            totalPrice,
            totalPriceDisplay: formatDualCurrency(totalPrice, totalSYP),
            paidAmount,
            paidAmountDisplay: formatDualCurrency(paidAmount, paidSYP),
            remainingDebt,
            remainingDebtDisplay: formatDualCurrency(
              remainingDebt,
              remainingSYP,
            ),
            invoicePaymentsDisplay,
            currency: purchase.currency || "-",
            productsString,
          };
        })
        .sort((a, b) => parseDate(b.date) - parseDate(a.date)),
    [data],
  );

  const supplierPayments = useMemo(
    () =>
      [...(data?.data?.payments || [])]
        .map((payment) => ({
          ...payment,
          movementLabel: getSupplierPaymentMovementLabel(payment),
          invoiceReference: payment.purchaseId
            ? `فاتورة ${String(payment.purchaseId).slice(0, 8)}`
            : "-",
          amountDisplay: formatDualCurrency(
            Math.abs(toNumber(payment.amountUSD ?? payment.amount)),
            Math.abs(toNumber(payment.amountSYP)),
          ),
          currency: payment.currency || "-",
        }))
        .sort((a, b) => parseDate(b.date) - parseDate(a.date)),
    [data],
  );

  const purchasesSummary = useMemo(
    () => ({
      cash: supplierPurchases.filter(
        (purchase) => purchase.paymentStatus === "cash",
      ).length,
      part: supplierPurchases.filter(
        (purchase) => purchase.paymentStatus === "part",
      ).length,
      debt: supplierPurchases.filter(
        (purchase) => purchase.paymentStatus === "debt",
      ).length,
      remainingDebt: supplierPurchases.reduce(
        (sum, purchase) => sum + toNumber(purchase.remainingDebt),
        0,
      ),
      remainingDebtSYP: supplierPurchases.reduce(
        (sum, purchase) => sum + toNumber(purchase.remainingSYP),
        0,
      ),
    }),
    [supplierPurchases],
  );

  const getCurrentSupplierId = () =>
    String(supplier?.id || supplierId?.id || supplierId || "");

  const getPaymentAmountInBaseCurrency = (
    rawAmount: number,
    selectedCurrency: string,
    selectedExchangeRate: number,
  ) =>
    selectedCurrency === "USD"
      ? rawAmount
      : Number((rawAmount / selectedExchangeRate).toFixed(3));

  const submitGeneralSupplierPayment = (direction: "in" | "out") => {
    const amountNumber = toNumber(amount);

    if (!validateSupplierPaymentAccounts()) return;

    if (amountNumber <= 0) {
      toast.error("قيمة الدفعة يجب أن تكون أكبر من صفر");
      return;
    }

    if (!currency) {
      toast.error("الرجاء اختيار العملة");
      return;
    }

    if (currency !== "USD" && toNumber(exchangeRate) <= 0) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return;
    }

    const amountInBaseCurrency = getPaymentAmountInBaseCurrency(
      amountNumber,
      currency,
      exchangeRate,
    );
    const sign = direction === "out" ? -1 : 1;

    paySupplierDebtMutation.mutate({
      supplierId: getCurrentSupplierId(),
      amount: sign * amountInBaseCurrency,
      amountUSD: sign * amountInBaseCurrency,
      amountSYP: currency === "SYP" ? sign * amountNumber : 0,
      amountOriginal: sign * amountNumber,
      note,
      currency,
      paymentCurrency: currency as "USD" | "SYP",
      exchangeRate: currency === "USD" ? 1 : exchangeRate,
      amount_base: sign * amountNumber,
      paymentAccountId,
      payableAccountId,
    });
  };

  const openInvoicePayment = (purchase: any) => {
    const nextCurrency = purchase.paymentCurrency || purchase.currency || "USD";
    const nextExchangeRate =
      nextCurrency === "USD" ? 1 : toNumber(purchase.exchangeRate) || 1;
    const remainingDebt = toNumber(
      purchase.remainingUSD ?? purchase.remainingDebt,
    );

    setInvoicePaymentOpenId(purchase.id);
    setInvoicePaymentAmount(
      nextCurrency === "USD"
        ? remainingDebt
        : toNumber(purchase.remainingSYP) ||
          Number((remainingDebt * nextExchangeRate).toFixed(3)),
    );
    setInvoicePaymentNote(
      `تسديد فاتورة شراء ${String(purchase.code || purchase.id).slice(0, 12)}`,
    );
    setInvoicePaymentCurrency(nextCurrency);
    setInvoicePaymentExchangeRate(nextExchangeRate);
    setPaymentAccountId(supplier.defaultPaymentAccountId || paymentAccountId);
    setPayableAccountId(supplier.defaultPayableAccountId || payableAccountId);
  };

  const submitInvoicePayment = (purchase: any) => {
    const remainingDebt = toNumber(
      purchase.remainingUSD ?? purchase.remainingDebt,
    );
    const amountInBaseCurrency = getPaymentAmountInBaseCurrency(
      invoicePaymentAmount,
      invoicePaymentCurrency,
      invoicePaymentExchangeRate,
    );

    if (remainingDebt <= 0) {
      toast.error("هذه الفاتورة مسددة بالكامل");
      return;
    }

    if (amountInBaseCurrency <= 0 || amountInBaseCurrency > remainingDebt) {
      toast.error("قيمة الدفعة يجب أن تكون أكبر من صفر ولا تتجاوز المتبقي");
      return;
    }

    if (!paymentAccountId || !payableAccountId) {
      toast.error("الرجاء اختيار حساب الدفع وحساب الموردين");
      return;
    }

    if (
      invoicePaymentCurrency !== "USD" &&
      invoicePaymentExchangeRate <= 0
    ) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return;
    }

    paySupplierDebtMutation.mutate({
      supplierId: getCurrentSupplierId(),
      purchaseId: purchase.id,
      amount: -amountInBaseCurrency,
      amountUSD: -amountInBaseCurrency,
      amountSYP:
        invoicePaymentCurrency === "SYP" ? -invoicePaymentAmount : 0,
      amountOriginal: -invoicePaymentAmount,
      note:
        invoicePaymentNote ||
        `تسديد فاتورة شراء ${String(purchase.code || purchase.id).slice(
          0,
          12,
        )}`,
      currency: invoicePaymentCurrency,
      paymentCurrency: invoicePaymentCurrency as "USD" | "SYP",
      exchangeRate: invoicePaymentCurrency === "USD" ? 1 : invoicePaymentExchangeRate,
      amount_base: -invoicePaymentAmount,
      paymentAccountId,
      payableAccountId,
    });
  };

  const getInvoicePaymentMaxAmount = (purchase: any) =>
    invoicePaymentCurrency === "USD"
      ? toNumber(purchase.remainingUSD ?? purchase.remainingDebt)
      : Number(
          (
            toNumber(purchase.remainingSYP) ||
            toNumber(purchase.remainingUSD ?? purchase.remainingDebt) *
              toNumber(invoicePaymentExchangeRate)
          ).toFixed(3),
        );

  const handleReturn = async (e: React.FormEvent, row: any) => {
    e.preventDefault();

    if (!validateSupplierReturnAccounts()) {
      return;
    }

    try {
      const returnQty = Number(returnAmount);
      const rowPayPrice = toNumber(row.payPrice);

      if (!returnQty || returnQty <= 0) {
        toast.error("الرجاء إدخال كمية إرجاع صحيحة");
        return;
      }

      if (returnQty > Number(row.quantity || 0)) {
        toast.error("كمية الإرجاع أكبر من الكمية المتوفرة في الفاتورة");
        return;
      }

      const payload = {
        productCode: row.code,
        productName: row.name,
        supplierName: supplier.name,
        supplierId: getCurrentSupplierId(),
        warehouse: row.warehouse,
        qty: returnQty,
        returnType: isDebt,
        returnValue: returnQty * rowPayPrice,
        referenceId: row.id,
        productId: row.id,
        partValue,
        reason,
        inventoryAccountId,
        payableAccountId,
        paymentAccountId,
      };

      returnMutation.mutate(payload);
    } catch (error: any) {
      console.error(
        "خطأ أثناء الإرجاع:",
        error.response?.data || error.message,
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">بيانات المورد</h1>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="ml-2 w-4 h-4" /> رجوع
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <DetailsInputs
              customer={supplier}
              setCustomer={setSupplier}
              isSupplier={true}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PopupForm
                title="دفعة من المورد"
                trigger={
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      setIsOpen(true);
                      e.stopPropagation();
                    }}
                    variant="accent"
                    size="sm"
                  >
                    دفعة من المورد
                  </Button>
                }
                isOpen={isOpen}
                setIsOpen={setIsOpen}
              >
                <form
                  className="space-y-4 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitGeneralSupplierPayment("in");
                  }}
                >
                  <FormInput
                    label="قيمة الدفعة"
                    id="payment-amount-in"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <FormInput
                    label="ملاحظات"
                    id="note-in"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-full mt-6">
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
                    id="exchangeRate-in"
                    label="سعر الصرف"
                    value={currency === "USD" ? 1 : exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    disabled={currency === "USD"}
                  />
                  <AccountSelect
                    label="حساب الدفع"
                    value={paymentAccountId}
                    onChange={setPaymentAccountId}
                    filterType="payment"
                  />
                  <AccountSelect
                    label="حساب الموردين"
                    value={payableAccountId}
                    onChange={setPayableAccountId}
                    filterType="payable"
                  />
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={paySupplierDebtMutation.isPending}
                    loading={paySupplierDebtMutation.isPending}
                  >
                    دفعة من المورد
                  </Button>
                </form>
              </PopupForm>

              <PopupForm
                title="دفع للمورد"
                trigger={
                  <Button className="w-full" variant="destructive" size="sm">
                    دفع للمورد
                  </Button>
                }
                isOpen={isOpenTo}
                setIsOpen={setIsOpenTo}
              >
                <form
                  className="space-y-4 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitGeneralSupplierPayment("out");
                  }}
                >
                  <FormInput
                    label="قيمة الدفعة"
                    id="payment-amount-out"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <FormInput
                    label="ملاحظات"
                    id="note-out"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-full mt-6">
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
                    id="exchangeRate-out"
                    label="سعر الصرف"
                    value={currency === "USD" ? 1 : exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    disabled={currency === "USD"}
                  />
                  <AccountSelect
                    label="حساب الدفع"
                    value={paymentAccountId}
                    onChange={setPaymentAccountId}
                    filterType="payment"
                  />
                  <AccountSelect
                    label="حساب الموردين"
                    value={payableAccountId}
                    onChange={setPayableAccountId}
                    filterType="payable"
                  />
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={paySupplierDebtMutation.isPending}
                    loading={paySupplierDebtMutation.isPending}
                  >
                    دفع للمورد
                  </Button>
                </form>
              </PopupForm>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.data ? (
            <p className="text-muted-foreground text-center">
              لا توجد معاملات حالياً.
            </p>
          ) : (
            <CardContent className="grid grid-cols-1 gap-4">
              <DataTable
                title="الدفعات"
                columns={paymentsColumns}
                data={supplierPayments}
              />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير نقدية</p>
                  <p className="text-xl font-bold">{purchasesSummary.cash}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير جزئية</p>
                  <p className="text-xl font-bold">{purchasesSummary.part}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير دين</p>
                  <p className="text-xl font-bold">{purchasesSummary.debt}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">
                    إجمالي المتبقي
                  </p>
                  <p className="text-xl font-bold text-destructive">
                    {formatDualCurrency(
                      purchasesSummary.remainingDebt,
                      purchasesSummary.remainingDebtSYP,
                    )}
                  </p>
                </div>
              </div>

              <DataTable
                title="فواتير الشراء"
                description="يمكن معرفة المدفوع والمتبقي ودفعات كل فاتورة بشكل منفصل."
                columns={purchasesColumns}
                data={supplierPurchases}
                renderRowActions={(row) => (
                  <div className="flex gap-2">
                    <PopupForm
                      title="تسديد فاتورة شراء"
                      isOpen={invoicePaymentOpenId === row.id}
                      setIsOpen={(value) => {
                        if (!value) {
                          setInvoicePaymentOpenId(null);
                          return;
                        }

                        openInvoicePayment(row);
                      }}
                      trigger={
                        <Button
                          type="button"
                          variant="accent"
                          disabled={toNumber(row.remainingDebt) <= 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            openInvoicePayment(row);
                          }}
                        >
                          تسديد
                        </Button>
                      }
                    >
                      <form
                        className="space-y-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          submitInvoicePayment(row);
                        }}
                      >
                        <div className="rounded-md border p-3 text-sm">
                          <div className="flex justify-between">
                            <span>إجمالي الفاتورة</span>
                            <span>{formatDualCurrency(row.totalPrice, row.totalSYP)}</span>
                          </div>
                          {shouldShowExchangeRate(row) && (
                            <div className="flex justify-between">
                              <span>سعر الصرف</span>
                              <span>{formatExchangeRate(row.exchangeRate)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>المدفوع</span>
                            <span>{formatDualCurrency(row.paidAmount, row.paidSYP)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-destructive">
                            <span>المتبقي</span>
                            <span>
                              {formatDualCurrency(
                                row.remainingDebt,
                                row.remainingSYP,
                              )}
                            </span>
                          </div>
                        </div>

                        <FormInput
                          label="قيمة الدفعة"
                          id={`supplier-invoice-payment-${row.id}`}
                          type="number"
                          min={0}
                          max={getInvoicePaymentMaxAmount(row)}
                          value={invoicePaymentAmount}
                          onChange={(event) =>
                            setInvoicePaymentAmount(Number(event.target.value))
                          }
                        />

                        <FormInput
                          label="ملاحظات"
                          id={`supplier-invoice-payment-note-${row.id}`}
                          value={invoicePaymentNote}
                          onChange={(event) =>
                            setInvoicePaymentNote(event.target.value)
                          }
                        />

                        <Select
                          value={invoicePaymentCurrency}
                          onValueChange={(nextCurrency) => {
                            setInvoicePaymentCurrency(nextCurrency);
                            setInvoicePaymentExchangeRate(
                              nextCurrency === "USD"
                                ? 1
                                : invoicePaymentExchangeRate || 1,
                            );
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="العملة المدفوع بها" />
                          </SelectTrigger>
                          <SelectContent>
                            {["SYP", "USD"].map((currencyOption) => (
                              <SelectItem
                                key={currencyOption}
                                value={currencyOption}
                              >
                                {currencyOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormInput
                          id={`supplier-invoice-payment-exchange-${row.id}`}
                          label="سعر الصرف"
                          type="number"
                          value={
                            invoicePaymentCurrency === "USD"
                              ? 1
                              : invoicePaymentExchangeRate
                          }
                          disabled={invoicePaymentCurrency === "USD"}
                          onChange={(event) =>
                            setInvoicePaymentExchangeRate(
                              Number(event.target.value),
                            )
                          }
                        />

                        <AccountSelect
                          label="حساب الدفع"
                          value={paymentAccountId}
                          onChange={setPaymentAccountId}
                          filterType="payment"
                        />

                        <AccountSelect
                          label="حساب الموردين"
                          value={payableAccountId}
                          onChange={setPayableAccountId}
                          filterType="payable"
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={paySupplierDebtMutation.isPending}
                          loading={paySupplierDebtMutation.isPending}
                        >
                          تأكيد التسديد
                        </Button>
                      </form>
                    </PopupForm>

                    <PopupForm
                      title={`إرجاع منتج: ${row.code} - ${row.name || ""}`}
                      isOpen={openRowId === row.id.toString()}
                      setIsOpen={() => setOpenRowId(null)}
                      trigger={
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenRowId(row.id.toString());
                          }}
                        >
                          إرجاع
                        </Button>
                      }
                    >
                      <form
                        onSubmit={(e) => handleReturn(e, row)}
                        className="space-y-4"
                      >
                        <div>
                          <FormInput
                            label="الكمية"
                            id="return-quantity"
                            type="number"
                            value={returnAmount}
                            onChange={(e) => setReturnAmount(e.target.value)}
                          />
                          <p className="text-sm text-gray-500">
                            الكمية الأصلية: {row.quantity}
                            <br />
                            سعر الواحدة: {row.payPrice}
                          </p>
                        </div>

                        <p className="font-semibold">
                          المبلغ الإجمالي:{" "}
                          {toNumber(row.payPrice) * Number(returnAmount)}
                        </p>

                        <PaymentTypeSelector
                          value={isDebt}
                          onChange={setIsDebt}
                          partValue={partValue}
                          onPartValueChange={(v) => setPartValue(v)}
                        />

                        <FormInput
                          id="return-reason"
                          label="ملاحظات"
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />

                        <AccountSelect
                          label="حساب المخزون"
                          value={inventoryAccountId}
                          onChange={setInventoryAccountId}
                          filterType="inventory"
                        />
                        {(isDebt === "debt" || isDebt === "part") && (
                          <AccountSelect
                            label="حساب الموردين"
                            value={payableAccountId}
                            onChange={setPayableAccountId}
                            filterType="payable"
                          />
                        )}
                        {(isDebt === "cash" || isDebt === "part") && (
                          <AccountSelect
                            label="حساب الدفع"
                            value={paymentAccountId}
                            onChange={setPaymentAccountId}
                            filterType="payment"
                          />
                        )}

                        <div className="flex justify-end mt-2">
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={returnMutation.isPending}
                            loading={returnMutation.isPending}
                          >
                            تأكيد الإرجاع
                          </Button>
                        </div>
                      </form>
                    </PopupForm>
                  </div>
                )}
              />
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
