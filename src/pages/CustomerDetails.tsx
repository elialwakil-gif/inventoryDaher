import CustomerPaymentForm from "@/components/Customers/CustomerPaymentForm";
import AccountSelect from "@/components/Accounts/AccountSelect";
import DetailsInputs from "@/components/Customers/DetailsInputs";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import CustomerPDF, { Operations } from "@/components/pdf/CustomerPDF";
import PdfDocument from "@/components/pdf/PdfDocument";
import PaymentTypeSelector from "@/components/sellProduct/PaymentTypeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import FormInput from "@/components/ui/custom/FormInput";
import PopupForm from "@/components/ui/custom/PopupForm";
import {
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
import { getCustomerById } from "@/services/customer";
import { handleCustomerReturn, payCustomerDebt } from "@/services/transaction";
import { parseDate } from "@/utils/parseDate";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import { Select } from "@radix-ui/react-select";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
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

const getPaymentMovementLabel = (payment: any) => {
  const note = String(payment?.note || "");

  if (payment?.sellId && payment?.type === "income") return "تسديد فاتورة";
  if (note.includes("كامل")) return "دفعة بيع نقدي";
  if (note.includes("دفعة من ثمن بيع")) return "دفعة بيع جزئي";
  if (toNumber(payment?.amount) < 0) return "دفعة للزبون";
  return "تحصيل دين";
};

export default function CustomerDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const customerId = location.state;
  const [isOpenTo, setIsOpenTo] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const [openReturnId, setOpenReturnId] = useState(null);
  const [returnAmounts, setReturnAmounts] = useState<{
    [productId: string]: string;
  }>({});
  const [isDebt, setIsDebt] = useState<"cash" | "part" | "debt">("cash");
  const [partValue, setPartValue] = useState(0);
  const [reason, setReason] = useState("");
  const [currency, setCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [receivableAccountId, setReceivableAccountId] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");
  const [invoicePaymentOpenId, setInvoicePaymentOpenId] = useState<string | null>(null);
  const [invoicePaymentAmount, setInvoicePaymentAmount] = useState(0);
  const [invoicePaymentNote, setInvoicePaymentNote] = useState("");
  const [invoicePaymentCurrency, setInvoicePaymentCurrency] = useState("USD");
  const [invoicePaymentExchangeRate, setInvoicePaymentExchangeRate] = useState(1);

  const payCustomerDebtMutation = useMutation({
    mutationFn: (dataToSend: any) => payCustomerDebt(dataToSend as any),
    onSuccess: () => {
      toast.success("تم إضافة الدفعة بنجاح!");
      setAmount(0);
      setNote("");
      setInvoicePaymentOpenId(null);
      setInvoicePaymentAmount(0);
      setInvoicePaymentNote("");
      setInvoicePaymentCurrency("USD");
      setInvoicePaymentExchangeRate(1);
      setCurrency("");
      setExchangeRate(1);
      setIsOpen(false);
      setIsOpenTo(false);
      queryClient.invalidateQueries({ queryKey: ["customer-details"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إضافة الدفعة");
    },
  });

  const returnMutation = useMutation({
    mutationFn: (dataToSend: {
      productCode?: string;
      productName?: string;
      customerName?: string;
      customerId: string;
      warehouse?: string;
      qty?: number;
      returnValue?: number;
      referenceId: string;
      returnType: "cash" | "debt" | "part";
      partValue: number;
      productId?: string;
      products?: Array<{
        productCode?: string;
        code?: string;
        productId?: string;
        warehouse: string;
        qty: number;
      }>;
      reason: string;
      paymentAccountId?: string;
      receivableAccountId?: string;
      salesAccountId?: string;
    }) => handleCustomerReturn(dataToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-details"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء الإرجاع");
    },
  });

  const [customer, setCustomer] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ["customer-details", customerId],
    queryFn: () => getCustomerById(customerId),
    enabled: !!customerId,
  });

  useEffect(() => {
    if (data?.data) {
      setCustomer(data.data);
      setPaymentAccountId(data.data.defaultPaymentAccountId || "");
      setReceivableAccountId(data.data.defaultReceivableAccountId || "");
      setSalesAccountId(data.data.defaultSalesAccountId || "");
    }
  }, [data]);

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
    { label: "طريقة الدفع", key: "status" },
    { label: "الإجمالي", key: "totalPriceDisplay" },
    { label: "المدفوع", key: "paidAmountDisplay" },
    { label: "المتبقي", key: "remainingDebtDisplay" },
    { label: "دفعات الفاتورة", key: "invoicePaymentsDisplay" },
    { label: "العملة", key: "currency" },
    { label: "المنتجات", key: "productsString" },
    { label: "التاريخ", key: "date" },
  ];

  const customerSales = useMemo(
    () =>
      data
        ? (data.data.purchases || [])
            .filter(
              (purchase) =>
                Array.isArray(purchase.products) &&
                purchase.products.length > 0,
            )
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

                        return `${formatDualCurrency(payment.amountUSD ?? payment.amount, payment.amountSYP)}${exchangeRateText} - ${
                          payment.date
                            ? new Date(payment.date).toLocaleDateString("en-GB")
                            : ""
                        }`;
                      },
                    )
                    .join(" | ")
                : "-";

              return {
                ...purchase,
                status:
                  purchase.paymentStatusLabel ||
                  getPaymentStatusLabel(purchase.paymentStatus),
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
                productsString:
                  purchase.productsString ||
                  purchase.products
                    .map((p) => `${p.name} (${toNumber(p.qty)})`)
                    .join(", "),
              };
            })
            .sort((a, b) => parseDate(b.date) - parseDate(a.date))
        : [],
    [data],
  );

  const customerPayments = useMemo(
    () =>
      [...(data?.data.payments ?? [])]
        .map((payment) => ({
          ...payment,
          movementLabel: getPaymentMovementLabel(payment),
          invoiceReference: payment.sellId
            ? `فاتورة ${String(payment.sellId).slice(0, 8)}`
            : "-",
          amountDisplay: formatDualCurrency(
            payment.amountUSD ?? payment.amount,
            payment.amountSYP,
          ),
          currency: payment.currency || "-",
        }))
        .sort((a, b) => parseDate(b.date) - parseDate(a.date)),
    [data],
  );

  const salesSummary = useMemo(
    () => ({
      cash: customerSales.filter((sale) => sale.paymentStatus === "cash").length,
      part: customerSales.filter((sale) => sale.paymentStatus === "part").length,
      debt: customerSales.filter((sale) => sale.paymentStatus === "debt").length,
      remainingDebt: customerSales.reduce(
        (sum, sale) => sum + toNumber(sale.remainingDebt),
        0,
      ),
      remainingDebtSYP: customerSales.reduce(
        (sum, sale) => sum + toNumber(sale.remainingSYP),
        0,
      ),
    }),
    [customerSales],
  );

  const operations: Operations[] = [
    ...(data?.data?.purchases
      ?.filter((p) => Array.isArray(p.products) && p.products.length > 0)
      .map((p) => ({
        details: p?.products.map((prod) => prod.name).join(", "),
        date: p?.date,
        toTheCustoemr: p?.totalPrice ?? 0,
        fromCustomer: 0,
      })) ?? []),
    ...(data?.data?.payments ?? []).map((p) => ({
      details: p?.note,
      date: p?.date,
      toTheCustoemr: 0,
      fromCustomer: p?.amount,
    })),
  ];

  operations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const getCurrentCustomerId = () =>
    String(customer?.id || customerId?.id || customerId || "");

  const openInvoicePayment = (sale: any) => {
    const nextCurrency = sale.paymentCurrency || sale.currency || "USD";
    const nextExchangeRate =
      nextCurrency === "USD" ? 1 : toNumber(sale.exchangeRate) || 1;
    const remainingDebt = toNumber(sale.remainingUSD ?? sale.remainingDebt);

    setInvoicePaymentOpenId(sale.id);
    setInvoicePaymentAmount(
      nextCurrency === "USD"
        ? remainingDebt
        : toNumber(sale.remainingSYP) ||
          Number((remainingDebt * nextExchangeRate).toFixed(3)),
    );
    setInvoicePaymentNote(`تسديد فاتورة ${String(sale.id).slice(0, 8)}`);
    setInvoicePaymentCurrency(nextCurrency);
    setInvoicePaymentExchangeRate(nextExchangeRate);
    setPaymentAccountId(customer.defaultPaymentAccountId || paymentAccountId);
    setReceivableAccountId(
      customer.defaultReceivableAccountId || receivableAccountId,
    );
  };

  const submitInvoicePayment = (sale: any) => {
    const remainingDebt = toNumber(sale.remainingUSD ?? sale.remainingDebt);
    const amountInBaseCurrency =
      invoicePaymentCurrency === "USD"
        ? invoicePaymentAmount
        : Number((invoicePaymentAmount / invoicePaymentExchangeRate).toFixed(3));

    if (remainingDebt <= 0) {
      toast.error("هذه الفاتورة مسددة بالكامل");
      return;
    }

    if (amountInBaseCurrency <= 0 || amountInBaseCurrency > remainingDebt) {
      toast.error("قيمة الدفعة يجب أن تكون أكبر من صفر ولا تتجاوز المتبقي");
      return;
    }

    if (!paymentAccountId || !receivableAccountId) {
      toast.error("الرجاء اختيار حساب القبض وحساب العملاء");
      return;
    }

    if (
      invoicePaymentCurrency !== "USD" &&
      invoicePaymentExchangeRate <= 0
    ) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return;
    }

    payCustomerDebtMutation.mutate({
      customerId: getCurrentCustomerId(),
      sellId: sale.id,
      amount: amountInBaseCurrency,
      amountUSD: amountInBaseCurrency,
      amountSYP: invoicePaymentCurrency === "SYP" ? invoicePaymentAmount : 0,
      amountOriginal: invoicePaymentAmount,
      note: invoicePaymentNote || `تسديد فاتورة ${String(sale.id).slice(0, 8)}`,
      currency: invoicePaymentCurrency,
      paymentCurrency: invoicePaymentCurrency as "USD" | "SYP",
      exchangeRate: invoicePaymentExchangeRate,
      amount_base: invoicePaymentAmount,
      paymentAccountId,
      receivableAccountId,
    });
  };

  const getInvoicePaymentMaxAmount = (sale: any) =>
    invoicePaymentCurrency === "USD"
      ? toNumber(sale.remainingUSD ?? sale.remainingDebt)
      : Number(
          (
            (toNumber(sale.remainingSYP) ||
              toNumber(sale.remainingUSD ?? sale.remainingDebt) *
                toNumber(invoicePaymentExchangeRate))
          ).toFixed(3),
        );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">بيانات الزبون</h1>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="ml-2 w-4 h-4" /> رجوع
          </Button>
        </div>

        {/* معلومات أساسية */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <DetailsInputs customer={customer} setCustomer={setCustomer} />

            <div className="grid grid-cols-3 gap-4">
              <Button>
                <PDFDownloadLink
                  document={
                    <PdfDocument>
                      <CustomerPDF
                        customerName={customer.name}
                        balance={0}
                        operations={operations}
                      />
                    </PdfDocument>
                  }
                  fileName={`فاتورة_${customer.name}_.pdf`}
                >
                  {({ loading }) =>
                    loading ? (
                      "جاري إنشاء الفاتورة..."
                    ) : (
                      <div className="flex items-center justify-center">
                        <FileText className="w-4 h-4 ml-2" />
                        تصدير الفاتورة PDF
                      </div>
                    )
                  }
                </PDFDownloadLink>
              </Button>
              <CustomerPaymentForm
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                customerData={customer}
              />
              {/* إضافة دفعة */}
              <PopupForm
                title="دفع للزبون"
                trigger={
                  <Button
                    onClick={(e) => {
                      setIsOpenTo(true);
                      e.stopPropagation();
                    }}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    دفع للزبون
                  </Button>
                }
                isOpen={isOpenTo}
                setIsOpen={setIsOpenTo}
              >
                <form
                  className="space-y-4 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!paymentAccountId || !receivableAccountId) {
                      toast.error("يرجى تحديد حساب الدفع وحساب العملاء");
                      return;
                    }
                    payCustomerDebtMutation.mutate({
                      customerId: customerId.id,
                      amount:
                        currency == "USD"
                          ? -amount
                          : -Number((amount / exchangeRate).toFixed(1)),
                      amountUSD:
                        currency == "USD"
                          ? -amount
                          : -Number((amount / exchangeRate).toFixed(1)),
                      amountSYP: currency === "SYP" ? -amount : 0,
                      amountOriginal: -amount,
                      note,
                      currency: currency,
                      paymentCurrency: currency as "USD" | "SYP",
                      exchangeRate: exchangeRate,
                      amount_base: -amount,
                      paymentAccountId,
                      receivableAccountId,
                    });
                  }}
                >
                  <FormInput
                    label="قيمة الدفعة"
                    id="payment-amount"
                    type="number"
                    value={amount.toString()}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  <FormInput
                    label="ملاحظات"
                    id="note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <AccountSelect
                    label="حساب الدفع"
                    value={paymentAccountId}
                    onChange={setPaymentAccountId}
                    filterType="payment"
                  />
                  <AccountSelect
                    label="حساب العملاء"
                    value={receivableAccountId}
                    onChange={setReceivableAccountId}
                    filterType="receivable"
                  />

                  {!(isDebt == "debt") && (
                    <>
                      {" "}
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="w-full mt-6">
                          <SelectValue placeholder="العملة المدفوع بها" />
                        </SelectTrigger>
                        <SelectContent>
                          {["SYP", "USD"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormInput
                        id="exchangeRate"
                        label="سعر الصرف"
                        value={currency == "USD" ? 1 : exchangeRate}
                        onChange={(e) =>
                          setExchangeRate(Number(e.target.value))
                        }
                        disabled={currency === "USD"}
                      />
                    </>
                  )}

                  <Button
                    className="w-full"
                    type="submit"
                    disabled={payCustomerDebtMutation.isPending}
                    loading={payCustomerDebtMutation.isPending}
                  >
                    اضافة دفعة
                  </Button>
                </form>
              </PopupForm>
            </div>
          </CardContent>
        </Card>

        {/* الدفعات و المشتريات */}
        <Card className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.data ? (
            <p className="text-muted-foreground text-center">
              لا توجد معاملات حالياً.
            </p>
          ) : (
            <CardContent className="space-y-4 md:space-y-0 grid grid-cols-1 gap-4">
              <DataTable
                title="الدفعات"
                columns={paymentsColumns}
                data={customerPayments}
              />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير نقدية</p>
                  <p className="text-xl font-bold">{salesSummary.cash}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير جزئية</p>
                  <p className="text-xl font-bold">{salesSummary.part}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">فواتير دين</p>
                  <p className="text-xl font-bold">{salesSummary.debt}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">إجمالي المتبقي</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatDualCurrency(
                      salesSummary.remainingDebt,
                      salesSummary.remainingDebtSYP,
                    )}
                  </p>
                </div>
              </div>

              <DataTable
                title="فواتير البيع"
                description="يمكن تمييز الفاتورة من طريقة الدفع: نقدي، دين، أو جزئي، مع المدفوع والمتبقي لكل فاتورة."
                columns={purchasesColumns}
                data={customerSales}
                renderRowActions={(row) => (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate(`/sellDetails`, { state: row.id });
                      }}
                    >
                      تفاصيل
                    </Button>

                    <PopupForm
                      title="تسديد فاتورة"
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
                          id={`invoice-payment-${row.id}`}
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
                          id={`invoice-payment-note-${row.id}`}
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
                          id={`invoice-payment-exchange-${row.id}`}
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
                          label="حساب القبض"
                          value={paymentAccountId}
                          onChange={setPaymentAccountId}
                          filterType="payment"
                        />

                        <AccountSelect
                          label="حساب العملاء"
                          value={receivableAccountId}
                          onChange={setReceivableAccountId}
                          filterType="receivable"
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={payCustomerDebtMutation.isPending}
                          loading={payCustomerDebtMutation.isPending}
                        >
                          تأكيد التسديد
                        </Button>
                      </form>
                    </PopupForm>

                    <PopupForm
                      title={`إرجاع منتجات الفاتورة`}
                      isOpen={openReturnId === row.id}
                      setIsOpen={() => setOpenReturnId(null)}
                      trigger={
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenReturnId(row.id);
                          }}
                        >
                          إرجاع
                        </Button>
                      }
                    >
                      <form
                        className="space-y-4"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!salesAccountId || !receivableAccountId) {
                            toast.error(
                              "يرجى تحديد حساب المبيعات وحساب العملاء",
                            );
                            return;
                          }

                          if (isDebt !== "debt" && !paymentAccountId) {
                            toast.error("يرجى تحديد حساب الدفع");
                            return;
                          }

                          const productsToReturn = row.products
                            .filter(
                              (p) => (Number(returnAmounts[p.id]) || 0) > 0,
                            )
                            .map((p) => ({
                              productId: p.id,
                              productCode: p.code,
                              productName: p.name,
                              customerName: customer.name,
                              customerId: row.customerId,
                              warehouse: p.warehouse,
                              qty: Number(returnAmounts[p.id]),
                              returnValue:
                                Number(returnAmounts[p.id]) * p.sellPrice,
                              referenceId: row.id,
                              partValue: partValue,
                              returnType: isDebt,
                              reason: reason,
                              paymentAccountId,
                              receivableAccountId,
                              salesAccountId,
                            }));

                          if (!productsToReturn.length) {
                            toast.error("يرجى تحديد كمية إرجاع واحدة على الأقل");
                            return;
                          }

                          const totalReturnValue = productsToReturn.reduce(
                            (sum, prod) => sum + prod.returnValue,
                            0,
                          );

                          if (isDebt === "part" && partValue > totalReturnValue) {
                            toast.error("قيمة الدفع الجزئي أكبر من قيمة الإرجاع");
                            return;
                          }

                          if (
                            isDebt === "part" &&
                            (partValue <= 0 || partValue >= totalReturnValue)
                          ) {
                            toast.error("قيمة الدفع الجزئي يجب أن تكون أكبر من صفر وأقل من قيمة الإرجاع");
                            return;
                          }

                          try {
                            await returnMutation.mutateAsync({
                              customerId: row.customerId,
                              customerName: customer.name,
                              referenceId: row.id,
                              returnValue: totalReturnValue,
                              partValue,
                              returnType: isDebt,
                              reason,
                              paymentAccountId,
                              receivableAccountId,
                              salesAccountId,
                              products: productsToReturn.map((prod) => ({
                                productId: prod.productId,
                                productCode: prod.productCode,
                                warehouse: prod.warehouse,
                                qty: prod.qty,
                              })),
                            });
                            toast.success("تم تسجيل الإرجاع بنجاح!");
                            setOpenReturnId(null);
                            setReturnAmounts({});
                          } catch (error) {
                            console.error(error);
                          }
                        }}
                      >
                        <div className="max-h-96 overflow-y-auto mt-4 border-2 rounded-md ">
                          {row.products.map((product) => (
                            <div
                              key={product.id}
                              className="border p-2 rounded-md"
                            >
                              <p className="font-semibold">{product.name}</p>
                              <p>الكمية الأصلية: {product.qty}</p>
                              <p>سعر الوحدة: {product.sellPrice}</p>
                              <p>المستودع: {product.warehouse}</p>
                              <FormInput
                                id={`return-${product.id}`}
                                label="كمية الإرجاع"
                                value={(
                                  returnAmounts[product.id] || 0
                                ).toString()}
                                onChange={(e) => {
                                  let qty = e.target.value;

                                  // التأكد من عدم تجاوز الحد الأعلى والأدنى
                                  if (qty > product.qty) qty = product.qty;

                                  setReturnAmounts((prev) => ({
                                    ...prev,
                                    [product.id]: qty,
                                  }));
                                }}
                              />
                              <p>
                                المبلغ:{" "}
                                {(Number(returnAmounts[product.id]) || 0) *
                                  product.sellPrice}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="font-bold">
                          المجموع الكلي:{" "}
                          {row.products.reduce(
                            (sum, p) =>
                              sum +
                              (Number(returnAmounts[p.id]) || 0) * p.sellPrice,
                            0,
                          )}
                        </p>

                        <PaymentTypeSelector
                          value={isDebt}
                          onChange={setIsDebt}
                          partValue={partValue}
                          onPartValueChange={(v) => setPartValue(v)}
                        />

                        <FormInput
                          id={`return-reason`}
                          label="ملاحظات"
                          type="text"
                          value={reason}
                          onChange={(e) => {
                            setReason(e.target.value);
                          }}
                        />
                        <AccountSelect
                          label="حساب المبيعات"
                          value={salesAccountId}
                          onChange={setSalesAccountId}
                          filterType="sales"
                        />
                        <AccountSelect
                          label="حساب العملاء"
                          value={receivableAccountId}
                          onChange={setReceivableAccountId}
                          filterType="receivable"
                        />
                        {isDebt !== "debt" && (
                          <AccountSelect
                            label="حساب الدفع"
                            value={paymentAccountId}
                            onChange={setPaymentAccountId}
                            filterType="payment"
                          />
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={returnMutation.isPending}
                          loading={returnMutation.isPending}
                        >
                          تأكيد الإرجاع
                        </Button>
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
