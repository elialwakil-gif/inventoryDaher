import { DataTable } from "@/components/dashboard/DataTable";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Loading from "@/components/ui/custom/Loading";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddBalanceForm from "@/components/FinancialStatement/AddBalanceForm";
import TakeBalanceForm from "@/components/FinancialStatement/TakeBalanceForm";
import getAllCustomer from "@/services/customer";
import getAllPayments, { Payment } from "@/services/payments";
import getAllPurchases from "@/services/purchases";
import getAllReturn from "@/services/return";
import getAllSells from "@/services/sells";
import getAllSupplier from "@/services/supplier";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarIcon,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";

interface PurchaseRecord {
  id?: string;
  supplierId?: string;
  name?: string;
  code?: string;
  totalPrice?: number | string;
  totalUSD?: number | string;
  totalOriginal?: number | string;
  amount_base?: number | string;
  paymentStatus?: string;
  remainingDebt?: number | string;
  currency?: string;
  paymentCurrency?: string;
  date?: string;
}

interface SellProduct {
  name?: string;
}

interface SellRecord {
  id?: string;
  customerId?: string;
  totalPrice?: number | string;
  totalUSD?: number | string;
  totalOriginal?: number | string;
  amount_base?: number | string;
  paymentStatus?: string;
  remainingDebt?: number | string;
  currency?: string;
  paymentCurrency?: string;
  date?: string;
  products?: SellProduct[];
}

interface ReturnRecord {
  id?: string;
  customerId?: string;
  supplierId?: string;
  customerName?: string;
  supplierName?: string;
  productName?: string;
  name?: string;
  code?: string;
  productCode?: string;
  referenceId?: string;
  sellId?: string | number;
  purchaseId?: string | number;
  returnValue?: number | string;
  totalPrice?: number | string;
  amount_base?: number | string;
  currency?: string;
  reason?: string;
  returnSource?: "customer" | "supplier" | string;
  date?: string;
  createdDate?: string;
  createdAt?: string;
}

interface PartyRecord {
  id: string;
  name: string;
}

interface FinancialOperation {
  id: string;
  operationType: "purchase" | "sell" | "payment" | "return";
  operationLabel: string;
  subType: string;
  reference: string;
  description: string;
  partyName: string;
  amount: number;
  amountUSD: number;
  amountSYP: number;
  amountDisplay: string;
  originalAmount: number;
  currency: string;
  effect: "داخل" | "خارج" | "ذمم" | "-";
  date: string;
  status: string;
  note: string;
  sortTime: number;
}

const operationsColumns = [
  { label: "المعرف", key: "id", hidden: true },
  { label: "نوع العملية", key: "operationLabel", sortable: true },
  { label: "التصنيف", key: "subType", sortable: true },
  { label: "المرجع", key: "reference", sortable: true },
  { label: "الأثر", key: "effect", sortable: true },
  { label: "الطرف", key: "partyName", sortable: true },
  { label: "الوصف", key: "description", sortable: true },
  { label: "المبلغ", key: "amountDisplay", sortable: true },
  { label: "المبلغ الأصلي", key: "originalAmount", sortable: true },
  { label: "العملة", key: "currency", sortable: true },
  { label: "الحالة", key: "status", sortable: true },
  { label: "ملاحظات", key: "note", sortable: true },
  { label: "التاريخ", key: "date", sortable: true },
];

const toNumber = (value: unknown) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatDualAmount = (usd: number, syp: number) =>
  syp
    ? `${formatAmount(usd)} USD / ${formatAmount(syp)} SYP`
    : `${formatAmount(usd)} USD`;

const formatDisplayAmount = (
  usd: number,
  syp: number,
  mode: "dual" | "USD" | "SYP",
) => {
  if (mode === "USD") return `${formatAmount(usd)} USD`;
  if (mode === "SYP") return `${formatAmount(syp)} SYP`;
  return formatDualAmount(usd, syp);
};

const normalizeCurrency = (currency?: string) =>
  (currency || "USD").toUpperCase();

const getOperationAmount = (
  currency: string | undefined,
  amount: unknown,
  amountBase?: unknown,
) => {
  const normalizedCurrency = normalizeCurrency(currency);
  return normalizedCurrency === "USD"
    ? toNumber(amount)
    : toNumber(amountBase ?? amount);
};

const normalizeDateText = (value: string) =>
  value
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace("،", ",")
    .replace("ص", "AM")
    .replace("م", "PM")
    .trim();

const parseFinancialDate = (value?: string) => {
  if (!value) return 0;

  if (!Number.isNaN(Number(value))) return Number(value);

  const nativeDate = Date.parse(value);
  if (!Number.isNaN(nativeDate)) return nativeDate;

  const normalized = normalizeDateText(value);
  const match = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (!match) return 0;

  const [, day, month, year, hour, minute, second = "0", period] = match;
  let parsedHour = Number(hour);

  if (period?.toUpperCase() === "PM" && parsedHour < 12) parsedHour += 12;
  if (period?.toUpperCase() === "AM" && parsedHour === 12) parsedHour = 0;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    parsedHour,
    Number(minute),
    Number(second),
  ).getTime();
};

const getPaymentSubTypeLabel = (type: string) => {
  if (type === "income") return "تحصيل";
  if (type === "expense") return "صرف";
  if (type === "return") return "مرتجع";
  return type || "-";
};

const getStatusLabel = (status?: string) => {
  if (status === "cash") return "نقدي";
  if (status === "part") return "جزئي";
  if (status === "debt") return "آجل";
  return status || "-";
};

const getPartyName = ({
  customerId,
  supplierId,
  customersMap,
  suppliersMap,
}: {
  customerId?: string;
  supplierId?: string;
  customersMap: Record<string, string>;
  suppliersMap: Record<string, string>;
}) => {
  if (customerId) return customersMap[customerId] || customerId;
  if (supplierId) return suppliersMap[supplierId] || supplierId;
  return "-";
};

const getReturnDate = (item: ReturnRecord) =>
  item.createdDate || item.date || item.createdAt || "";

const isSupplierReturn = (item: ReturnRecord) =>
  item.returnSource === "supplier" || Boolean(item.supplierId || item.supplierName);

export default function FinancialStatement() {
  const [isOpenPay, setIsOpenPay] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<"dual" | "USD" | "SYP">(
    "dual",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["financial-operations"],
    queryFn: async () => {
      const [payments, purchases, sells, returns, customers, suppliers] =
        await Promise.all([
          getAllPayments(),
          getAllPurchases(),
          getAllSells(),
          getAllReturn(),
          getAllCustomer(),
          getAllSupplier(),
        ]);

      return {
        payments: (payments || []) as Payment[],
        purchases: (purchases || []) as PurchaseRecord[],
        sells: (sells || []) as SellRecord[],
        returns: (returns || []) as ReturnRecord[],
        customers: (customers || []) as PartyRecord[],
        suppliers: (suppliers || []) as PartyRecord[],
      };
    },
  });

  const customersMap = useMemo(
    () =>
      Object.fromEntries(
        (data?.customers || []).map((customer) => [customer.id, customer.name]),
      ),
    [data?.customers],
  );

  const suppliersMap = useMemo(
    () =>
      Object.fromEntries(
        (data?.suppliers || []).map((supplier) => [supplier.id, supplier.name]),
      ),
    [data?.suppliers],
  );

  const operations = useMemo<FinancialOperation[]>(() => {
    const payments = (data?.payments || []).map((payment) => {
      const currency = normalizeCurrency(
        payment.paymentCurrency || payment.currency,
      );
      const amount = Math.abs(toNumber(payment.amountUSD ?? payment.amount));
      const amountSYP = Math.abs(toNumber(payment.amountSYP));

      return {
        id: payment.id || `payment-${payment.date || payment.amount}`,
        operationType: "payment" as const,
        operationLabel: "دفعة",
        subType: getPaymentSubTypeLabel(payment.type),
        reference: payment.id || "-",
        description: payment.note || "حركة مالية",
        partyName: getPartyName({
          customerId: payment.customerId,
          supplierId: payment.supplierId,
          customersMap,
          suppliersMap,
        }),
        amount,
        amountUSD: amount,
        amountSYP,
        amountDisplay: "",
        originalAmount: Math.abs(
          toNumber(payment.amountOriginal ?? payment.amount_base ?? payment.amount),
        ),
        currency,
        effect:
          payment.type === "income"
            ? "داخل"
            : payment.type === "expense"
              ? "خارج"
              : "-",
        date: payment.date || "",
        status: "-",
        note: payment.note || "-",
        sortTime: parseFinancialDate(payment.date),
      };
    });

    const purchases = (data?.purchases || []).map((purchase) => {
      const currency = normalizeCurrency(
        purchase.paymentCurrency || purchase.currency,
      );
      const amount = toNumber(purchase.totalUSD ?? purchase.totalPrice);
      const amountSYP = toNumber(purchase.totalSYP);
      const status = getStatusLabel(purchase.paymentStatus);

      return {
        id: purchase.id || `purchase-${purchase.date || purchase.code}`,
        operationType: "purchase" as const,
        operationLabel: "شراء",
        subType: "فاتورة شراء",
        reference: purchase.id || purchase.code || "-",
        description: `شراء ${purchase.name || purchase.code || purchase.id || ""}`.trim(),
        partyName: getPartyName({
          supplierId: purchase.supplierId,
          customersMap,
          suppliersMap,
        }),
        amount,
        amountUSD: amount,
        amountSYP,
        amountDisplay: "",
        originalAmount: toNumber(
          purchase.totalOriginal ?? purchase.amount_base ?? purchase.totalPrice,
        ),
        currency,
        effect: purchase.paymentStatus === "cash" ? "خارج" : "ذمم",
        date: purchase.date || "",
        status,
        note:
          purchase.remainingDebt != null
            ? `المتبقي ${formatAmount(toNumber(purchase.remainingDebt))}`
            : "-",
        sortTime: parseFinancialDate(purchase.date),
      };
    });

    const sells = (data?.sells || []).map((sell) => {
      const currency = normalizeCurrency(sell.paymentCurrency || sell.currency);
      const amount = toNumber(sell.totalUSD ?? sell.totalPrice);
      const amountSYP = toNumber(sell.totalSYP);
      const status = getStatusLabel(sell.paymentStatus);

      return {
        id: sell.id || `sell-${sell.date}`,
        operationType: "sell" as const,
        operationLabel: "بيع",
        subType: "فاتورة بيع",
        reference: sell.id || "-",
        description:
          sell.products && sell.products.length > 0
            ? `بيع ${sell.products
                .map((product) => product.name)
                .filter(Boolean)
                .join(", ")}`
            : `بيع ${sell.id || ""}`.trim(),
        partyName: getPartyName({
          customerId: sell.customerId,
          customersMap,
          suppliersMap,
        }),
        amount,
        amountUSD: amount,
        amountSYP,
        amountDisplay: "",
        originalAmount: toNumber(
          sell.totalOriginal ?? sell.amount_base ?? sell.totalPrice,
        ),
        currency,
        effect: sell.paymentStatus === "cash" ? "داخل" : "ذمم",
        date: sell.date || "",
        status,
        note:
          sell.remainingDebt != null
            ? `المتبقي ${formatAmount(toNumber(sell.remainingDebt))}`
            : "-",
        sortTime: parseFinancialDate(sell.date),
      };
    });

    const returns = (data?.returns || []).map((item) => {
      const supplierReturn = isSupplierReturn(item);
      const date = getReturnDate(item);
      const currency = normalizeCurrency(item.currency);
      const amount = getOperationAmount(
        item.currency,
        item.returnValue ?? item.totalPrice,
        item.amount_base,
      );
      const amountSYP =
        currency === "SYP"
          ? Math.abs(toNumber(item.amountSYP ?? item.amount_base ?? item.returnValue ?? item.totalPrice))
          : 0;
      const partyName = supplierReturn
        ? item.supplierName ||
          getPartyName({
            supplierId: item.supplierId,
            customersMap,
            suppliersMap,
          })
        : item.customerName ||
          getPartyName({
            customerId: item.customerId,
            customersMap,
            suppliersMap,
          });

      return {
        id: item.id || `return-${date || item.referenceId}`,
        operationType: "return" as const,
        operationLabel: "مرتجع",
        subType: supplierReturn ? "مرتجع مورد" : "مرتجع عميل",
        reference:
          item.invoiceNumber ||
          item.referenceId ||
          item.sellId?.toString() ||
          item.purchaseId?.toString() ||
          "-",
        description: `${supplierReturn ? "مرتجع إلى مورد" : "مرتجع من عميل"} ${
          item.productName || item.name || item.code || ""
        }`.trim(),
        partyName,
        amount,
        amountUSD: amount,
        amountSYP,
        amountDisplay: "",
        originalAmount: toNumber(item.returnValue ?? item.totalPrice),
        currency,
        effect: supplierReturn ? "داخل" : "خارج",
        date,
        status: "-",
        note: item.reason || "-",
        sortTime: parseFinancialDate(date),
      };
    });

    return [...payments, ...purchases, ...sells, ...returns].sort(
      (a, b) => b.sortTime - a.sortTime,
    );
  }, [
    customersMap,
    data?.payments,
    data?.purchases,
    data?.returns,
    data?.sells,
    suppliersMap,
  ]);

  const currencies = useMemo(
    () => Array.from(new Set(operations.map((operation) => operation.currency))),
    [operations],
  );

  const filteredOperations = useMemo(() => {
    let items = operations;

    if (selectedType !== "all") {
      items = items.filter((operation) => operation.operationType === selectedType);
    }

    if (selectedCurrency !== "all") {
      items = items.filter((operation) => operation.currency === selectedCurrency);
    }

    if (dateRange?.from && dateRange?.to) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);

      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);

      items = items.filter((operation) => {
        if (!operation.sortTime) return false;
        return operation.sortTime >= from.getTime() && operation.sortTime <= to.getTime();
      });
    }

    return items;
  }, [dateRange, operations, selectedCurrency, selectedType]);

  const operationsCount = filteredOperations.length;

  const displayedOperations = useMemo(
    () =>
      filteredOperations.map((operation) => ({
        ...operation,
        amountDisplay: formatDisplayAmount(
          operation.amountUSD,
          operation.amountSYP,
          displayCurrency,
        ),
      })),
    [displayCurrency, filteredOperations],
  );

  const purchasesTotal = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "purchase")
        .reduce((sum, operation) => sum + operation.amount, 0),
    [filteredOperations],
  );
  const purchasesTotalSYP = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "purchase")
        .reduce((sum, operation) => sum + operation.amountSYP, 0),
    [filteredOperations],
  );

  const sellsTotal = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "sell")
        .reduce((sum, operation) => sum + operation.amount, 0),
    [filteredOperations],
  );
  const sellsTotalSYP = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "sell")
        .reduce((sum, operation) => sum + operation.amountSYP, 0),
    [filteredOperations],
  );

  const returnsTotal = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "return")
        .reduce((sum, operation) => sum + operation.amount, 0),
    [filteredOperations],
  );
  const returnsTotalSYP = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "return")
        .reduce((sum, operation) => sum + operation.amountSYP, 0),
    [filteredOperations],
  );

  const cashInTotal = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "payment")
        .filter((operation) => operation.effect === "داخل")
        .reduce((sum, operation) => sum + operation.amount, 0),
    [filteredOperations],
  );
  const cashInTotalSYP = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "payment")
        .filter((operation) => operation.effect === "داخل")
        .reduce((sum, operation) => sum + operation.amountSYP, 0),
    [filteredOperations],
  );

  const cashOutTotal = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "payment")
        .filter((operation) => operation.effect === "خارج")
        .reduce((sum, operation) => sum + operation.amount, 0),
    [filteredOperations],
  );
  const cashOutTotalSYP = useMemo(
    () =>
      filteredOperations
        .filter((operation) => operation.operationType === "payment")
        .filter((operation) => operation.effect === "خارج")
        .reduce((sum, operation) => sum + operation.amountSYP, 0),
    [filteredOperations],
  );

  const netCashMovement = cashInTotal - cashOutTotal;
  const netCashMovementSYP = cashInTotalSYP - cashOutTotalSYP;

  return (
    <DashboardLayout>
      <div dir="rtl" className="space-y-6">
        {isLoading ? (
          <Loading />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="عدد العمليات"
              value={operationsCount.toLocaleString("en-US")}
              icon={ReceiptText}
            />
            <StatsCard
              title="إجمالي المبيعات"
              value={formatDualAmount(sellsTotal, sellsTotalSYP)}
              icon={Wallet}
            />
            <StatsCard
              title="إجمالي المشتريات"
              value={formatDualAmount(purchasesTotal, purchasesTotalSYP)}
              icon={ShoppingCart}
            />
            <StatsCard
              title="إجمالي المرتجعات"
              value={formatDualAmount(returnsTotal, returnsTotalSYP)}
              icon={RotateCcw}
            />
            <StatsCard
              title="الداخل"
              value={formatDualAmount(cashInTotal, cashInTotalSYP)}
              icon={ArrowUpCircle}
            />
            <StatsCard
              title="الخارج"
              value={formatDualAmount(cashOutTotal, cashOutTotalSYP)}
              icon={ArrowDownCircle}
            />
            <StatsCard
              title="صافي الحركة"
              value={formatDualAmount(netCashMovement, netCashMovementSYP)}
              icon={ReceiptText}
              description={netCashMovement >= 0 ? "فائض حركة" : "عجز حركة"}
            />
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <h1 className="mb-4 text-2xl font-bold">العمليات المالية</h1>
              <div className="flex flex-wrap gap-2">
                <AddBalanceForm isOpen={isOpen} setIsOpen={setIsOpen} />
                <TakeBalanceForm isOpen={isOpenPay} setIsOpen={setIsOpenPay} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="نوع العملية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="purchase">شراء</SelectItem>
                  <SelectItem value="sell">بيع</SelectItem>
                  <SelectItem value="payment">دفعات</SelectItem>
                  <SelectItem value="return">مرتجعات</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملات</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={displayCurrency}
                onValueChange={(value) =>
                  setDisplayCurrency(value as "dual" | "USD" | "SYP")
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="طريقة العرض" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual">USD / SYP</SelectItem>
                  <SelectItem value="USD">USD فقط</SelectItem>
                  <SelectItem value="SYP">SYP فقط</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[260px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "yyyy-MM-dd")} -{" "}
                          {format(dateRange.to, "yyyy-MM-dd")}
                        </>
                      ) : (
                        format(dateRange.from, "yyyy-MM-dd")
                      )
                    ) : (
                      <span>اختر المدة</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                onClick={() => {
                  setDateRange(undefined);
                  setSelectedType("all");
                  setSelectedCurrency("all");
                  setDisplayCurrency("dual");
                }}
              >
                مسح الفلاتر
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <DataTable
              title=""
              columns={operationsColumns}
              data={displayedOperations}
              isLoading={isLoading}
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
