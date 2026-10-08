import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { Download, FileText, Plus, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import AccountSelect from "@/components/Accounts/AccountSelect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PopupForm from "@/components/ui/custom/PopupForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  driverMovementLabel,
  driverStatementExportSheets,
} from "@/lib/driverStatementExport";
import {
  getDriverStatement,
  recordDriverCollection,
  recordDriverMovement,
  type DriverMovementPayload,
} from "@/services/driverStatements";
import type {
  DriverSale,
  DriverStatement,
  DriverStockItem,
} from "@/types/driverFinance";

const number = (value: unknown) =>
  Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const money = (value: unknown) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} USD`;
const dateLabel = (value: string) =>
  value
    ? new Date(value).toLocaleString("ar-SY", { timeZone: "Asia/Damascus" })
    : "—";
function currentDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Damascus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function storedUser(): {
  role?: string;
  id?: string;
  username?: string;
  _id?: string;
} {
  try {
    return JSON.parse(localStorage.getItem("InventoryUser") || "{}");
  } catch {
    return {};
  }
}
const requestId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `driver-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ReportTable({
  title,
  headers,
  rows,
  description,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  description?: string;
}) {
  return (
    <Card className="driver-report-table break-inside-avoid">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/40">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-3 font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, index) => (
                  <tr key={index} className="border-t align-top">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-3">
                        {cell ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="p-6 text-center text-muted-foreground"
                  >
                    لا توجد حركات ضمن المرشحات المختارة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  emphasized = false,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <Card className={emphasized ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-xl font-semibold" dir="ltr">
          {value}
        </p>
        {detail && (
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SourceReference({
  report,
  id,
}: {
  report: DriverStatement;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const payment = report.collections.find((row) => row.id === id);
  const cash = report.cashMovements.find((row) => row.referenceId === id);
  const commission = report.commissionRows.find(
    (row) => row.referenceId === id,
  );
  const stock = report.stockMovements.filter((row) => row.referenceId === id);
  const returned = report.returns.find((row) => row.id === id);
  const settlement = report.settlements.find((row) => row.id === id);
  return (
    <PopupForm
      title="تفاصيل السند المسجل"
      isOpen={open}
      setIsOpen={setOpen}
      trigger={
        <Button variant="link" className="h-auto p-0 text-sm">
          {id.slice(-8)}
        </Button>
      }
    >
      <div dir="rtl" className="space-y-3 text-sm">
        <p className="break-all" dir="ltr">
          {id}
        </p>
        <p>
          التاريخ:{" "}
          {dateLabel(
            payment?.date ||
              cash?.date ||
              commission?.date ||
              returned?.date ||
              settlement?.date ||
              "",
          )}
        </p>
        <p>
          السائق:{" "}
          {payment?.driverName ||
            cash?.driverName ||
            returned?.driverName ||
            settlement?.driverName ||
            report.driver?.username ||
            "غير محدد"}
        </p>
        {payment && (
          <>
            <p>الزبون: {payment.customerName}</p>
            <p>
              المبلغ: {number(payment.amountOriginal)} {payment.currency} —{" "}
              {money(payment.amountUSD)}
            </p>
            <p>سعر الصرف المحفوظ: {number(payment.exchangeRate)}</p>
            <p>
              نسبة التحصيل المحفوظة:{" "}
              {payment.commissionRate === null
                ? "غير محدد"
                : `${payment.commissionRate}%`}{" "}
              — العمولة: {money(payment.commissionUSD)}
            </p>
            {payment.sellId && <p>الفاتورة: {payment.sellId}</p>}
          </>
        )}
        {cash && (
          <>
            <p>الحركة: {driverMovementLabel(cash.type)}</p>
            <p>
              أثر الحركة على النقد: {number(cash.amountOriginal)}{" "}
              {cash.currency} — {money(cash.amountUSD)}
            </p>
            <p>رصيد السائق بعد الحركة: {money(cash.balanceUSD)}</p>
            <p>
              النقد الفعلي: {number(cash.balanceByCurrency.USD)} USD +{" "}
              {number(cash.balanceByCurrency.SYP)} SYP
            </p>
          </>
        )}
        {commission && (
          <>
            <p>أثر الحركة على مستحقات السائق: {money(commission.amountUSD)}</p>
            <p>المستحق بعد الحركة: {money(commission.balanceUSD)}</p>
          </>
        )}
        {returned && (
          <>
            <p>الزبون: {returned.customerName}</p>
            <p>
              المرتجع: {returned.productName} — {number(returned.qty)} وحدة
            </p>
            <p>
              قيمة المرتجع: {money(returned.returnValue)} — رد نقدي{" "}
              {money(returned.cashRefundUSD)} — تخفيض الدين{" "}
              {money(returned.receivableCreditUSD)}
            </p>
          </>
        )}
        {settlement && (
          <>
            <p>الزبون: {settlement.customerName}</p>
            <p>
              تسوية{" "}
              {settlement.goodsDirection === "receive" ? "باستلام" : "بتسليم"}{" "}
              بضاعة: {money(settlement.amountUSD)}
            </p>
            {settlement.items.map((item, i) => (
              <p key={i}>
                {item.name} — {number(item.quantity)} ×{" "}
                {money(item.settlementPriceUSD)}
              </p>
            ))}
          </>
        )}
        {stock.length > 0 && (
          <div className="space-y-1 rounded border p-3">
            {stock.map((row) => (
              <p key={row.id}>
                {row.productName} ({row.code}): {number(row.quantity)} — الرصيد{" "}
                {number(row.balance)}
              </p>
            ))}
          </div>
        )}
        {(payment?.note || cash?.note) && (
          <p>الملاحظات: {payment?.note || cash?.note}</p>
        )}
      </div>
    </PopupForm>
  );
}

type ActionType = "collection" | DriverMovementPayload["type"];
const actionLabels: Record<ActionType, string> = {
  collection: "تحصيل من زبون",
  remittance: "تسليم نقد للإدارة",
  commission_payout: "صرف مستحقات السائق",
  advance: "سلفة نقدية للسائق",
  expense: "مصروف من عهدة السائق",
  opening: "تسجيل رصيد افتتاحي",
};

function DriverActionForm({
  report,
  onSaved,
  admin,
}: {
  report: DriverStatement;
  onSaved: () => Promise<void>;
  admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ActionType>("collection");
  const [submissionId, setSubmissionId] = useState(requestId);
  const [sellId, setSellId] = useState("");
  const [vehicleId, setVehicleId] = useState(report.filters.vehicleId || "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "SYP">("USD");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [receivableAccountId, setReceivableAccountId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [payoutSource, setPayoutSource] = useState<"driver_cash" | "treasury">(
    "treasury",
  );
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [openingCommission, setOpeningCommission] = useState("0");
  const [openingStock, setOpeningStock] = useState<DriverStockItem[]>([]);
  const driverId = report.driver?.id || "";
  const invoices = useQuery({
    queryKey: ["driver-collection-invoices", driverId],
    queryFn: () =>
      getDriverStatement({
        driverId,
        dateFrom: "1970-01-01",
        dateTo: currentDate(),
      }),
    enabled: open && action === "collection" && Boolean(driverId),
  });
  const availableInvoices = (invoices.data?.outstandingInvoices || []).filter(
    (sale) => sale.remainingDebtUSD > 0,
  );
  const invoice = availableInvoices.find((sale) => sale.id === sellId);
  const vehicleStock = report.currentStock.products.filter(
    (item) => item.vehicleId === vehicleId,
  );

  const reset = () => {
    setSubmissionId(requestId());
    setSellId("");
    setAmount("");
    setDate("");
    setNote("");
    setCurrency("USD");
    setExchangeRate("1");
    setPaymentAccountId("");
    setReceivableAccountId("");
    setSourceAccountId("");
    setDestinationAccountId("");
    setExpenseAccountId("");
    setOpeningCommission("0");
    setOpeningStock([]);
    setVehicleId(report.filters.vehicleId || "");
    setPayoutSource("treasury");
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!driverId) throw new Error("اختر سائقًا محددًا لتسجيل الحركة");
      const numericAmount = Number(amount);
      const rate = currency === "USD" ? 1 : Number(exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0)
        throw new Error("أدخل سعر صرف صحيحًا");
      if (
        !Number.isFinite(numericAmount) ||
        (action !== "opening" && (!amount.trim() || numericAmount <= 0))
      )
        throw new Error("أدخل مبلغًا موجبًا");
      const base = {
        requestId: submissionId,
        driverId,
        vehicleId: vehicleId || undefined,
        amountOriginal: numericAmount,
        currency,
        exchangeRate: rate,
        ...(admin && date ? { date: new Date(date).toISOString() } : {}),
        note: note.trim(),
      };
      if (action === "collection") {
        if (!invoice) throw new Error("اختر فاتورة لها مبلغ متبقٍ");
        if (!paymentAccountId || !receivableAccountId)
          throw new Error("اختر حساب القبض وحساب العملاء");
        if (numericAmount / rate > invoice.remainingDebtUSD + 0.00001)
          throw new Error("التحصيل أكبر من الدين المتبقي في الفاتورة");
        return recordDriverCollection({
          ...base,
          vehicleId: invoice.vehicleId,
          sellId: invoice.id,
          customerId: invoice.customerId,
          paymentAccountId,
          receivableAccountId,
        });
      }
      if (action !== "opening" && !sourceAccountId)
        throw new Error("اختر الحساب المصدر للحركة");
      if (
        (action === "remittance" || action === "advance") &&
        !destinationAccountId
      )
        throw new Error("اختر الحساب المستلم للحركة");
      if (
        (action === "expense" || action === "commission_payout") &&
        !expenseAccountId
      )
        throw new Error("اختر حساب المصروف أو عمولة السائق");
      if (action === "opening" && !note.trim())
        throw new Error("دوّن مصدر مطابقة الرصيد الافتتاحي في الملاحظات");
      if (action === "opening" && !Number.isFinite(Number(openingCommission)))
        throw new Error("رصيد العمولة الافتتاحي غير صحيح");
      if (
        openingStock.some(
          (item) =>
            !Number.isFinite(item.quantity) ||
            item.quantity < 0 ||
            !Number.isFinite(item.costUSD) ||
            item.costUSD < 0,
        )
      )
        throw new Error("تأكد من كميات وتكلفة العهدة الافتتاحية");
      if (openingStock.length && !vehicleId)
        throw new Error("اختر السيارة لعهدة البضاعة");
      return recordDriverMovement({
        ...base,
        type: action,
        sourceAccountId,
        destinationAccountId,
        expenseAccountId,
        payoutSource,
        ...(action === "opening"
          ? {
              openingCashOriginal: numericAmount,
              openingCommissionUSD: Number(openingCommission),
              stock: openingStock,
            }
          : {}),
      });
    },
    onSuccess: async () => {
      toast.success("تم تسجيل الحركة وتحديث البيان");
      setOpen(false);
      reset();
      await onSaved();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <PopupForm
      title={actionLabels[action]}
      isOpen={open}
      setIsOpen={(value) => {
        if (!save.isPending && (!value || driverId)) {
          if (value && !open) reset();
          setOpen(value);
        }
      }}
      trigger={
        <Button disabled={!driverId} className="gap-2">
          <Plus className="h-4 w-4" />
          تسجيل حركة
        </Button>
      }
    >
      <form
        dir="rtl"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <p className="rounded-md border bg-muted/30 p-3 text-sm">
          السائق: <strong>{report.driver?.username}</strong> — نسبة التحصيل:{" "}
          {report.driver?.commissionRate ?? 0}%
        </p>
        <div className="space-y-2">
          <Label>نوع الحركة</Label>
          <Select
            value={action}
            onValueChange={(value) => {
              reset();
              setAction(value as ActionType);
            }}
            disabled={save.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(actionLabels)
                .filter(([key]) => admin || key === "collection")
                .map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {action === "collection" ? (
          <>
            <div className="space-y-2">
              <Label>فاتورة الزبون</Label>
              <Select
                value={sellId}
                onValueChange={(value) => {
                  setSellId(value);
                  const selectedInvoice = availableInvoices.find(
                    (sale) => sale.id === value,
                  );
                  setPaymentAccountId(selectedInvoice?.paymentAccountId || "");
                  setReceivableAccountId(
                    selectedInvoice?.receivableAccountId || "",
                  );
                }}
                disabled={invoices.isFetching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر فاتورة لها دين متبقٍ" />
                </SelectTrigger>
                <SelectContent>
                  {availableInvoices.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.customerName} — {sale.id.slice(-8)} — المتبقي{" "}
                      {money(sale.remainingDebtUSD)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {invoices.isFetching && (
              <p role="status" className="text-sm">
                جارٍ جلب جميع فواتير السائق…
              </p>
            )}
            {invoices.isError && (
              <div role="alert" className="text-sm text-destructive">
                {(invoices.error as Error).message}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invoices.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            )}
            {!invoices.isFetching &&
              !invoices.isError &&
              !availableInvoices.length && (
                <p className="text-sm text-muted-foreground">
                  لا توجد فواتير لها دين متبقٍ لهذا السائق.
                </p>
              )}
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
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>السيارة المرتبطة (اختياري للحركات النقدية)</Label>
              <Select
                value={vehicleId || "all"}
                onValueChange={(value) => {
                  setVehicleId(value === "all" ? "" : value);
                  setOpeningStock([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">بدون سيارة محددة</SelectItem>
                  {report.vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {action === "commission_payout" && (
              <div className="space-y-2">
                <Label>مصدر صرف العمولة</Label>
                <Select
                  value={payoutSource}
                  onValueChange={(value) =>
                    setPayoutSource(value as typeof payoutSource)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treasury">خزينة الإدارة</SelectItem>
                    <SelectItem value="driver_cash">
                      النقد الموجود بعهدة السائق
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {action !== "opening" && (
              <AccountSelect
                label={
                  action === "advance" ||
                  (action === "commission_payout" &&
                    payoutSource === "treasury")
                    ? "حساب الخزينة الدافع"
                    : "حساب النقد بعهدة السائق"
                }
                value={sourceAccountId}
                onChange={setSourceAccountId}
                filterType="payment"
              />
            )}
            {(action === "remittance" || action === "advance") && (
              <AccountSelect
                label={
                  action === "remittance"
                    ? "حساب خزينة الإدارة المستلم"
                    : "حساب النقد بعهدة السائق المستلم"
                }
                value={destinationAccountId}
                onChange={setDestinationAccountId}
                filterType="payment"
              />
            )}
            {(action === "expense" || action === "commission_payout") && (
              <AccountSelect
                label={
                  action === "expense"
                    ? "حساب المصروف"
                    : "حساب مصروف عمولة السائق"
                }
                value={expenseAccountId}
                onChange={setExpenseAccountId}
                filterType="expense"
              />
            )}
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="driver-action-amount">
              {action === "opening"
                ? "رصيد النقد الافتتاحي بالعملة المختارة"
                : "المبلغ بالعملة المختارة"}
            </Label>
            <Input
              id="driver-action-amount"
              type="number"
              step="any"
              min={action === "opening" ? undefined : "0.01"}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>العملة</Label>
            <Select
              value={currency}
              onValueChange={(value) => {
                setCurrency(value as typeof currency);
                if (value === "USD") setExchangeRate("1");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">دولار USD</SelectItem>
                <SelectItem value="SYP">ليرة سورية SYP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {currency === "SYP" && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-action-rate">عدد الليرات لكل دولار</Label>
              <Input
                id="driver-action-rate"
                type="number"
                min="0.000001"
                step="any"
                value={exchangeRate}
                onChange={(event) => setExchangeRate(event.target.value)}
              />
            </div>
          )}
          {admin && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-action-date">
                {action === "opening" ? "تاريخ ووقت رصيد البداية (فارغ = الآن)" : "تاريخ الحركة (فارغ = الآن)"}
              </Label>
              <Input
                id="driver-action-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          )}
        </div>
        {action === "opening" && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              أدخل الأرصدة المؤكدة في تاريخ ووقت بداية السجل؛ تُحسب الأرصدة بعدها
              من الحركات اللاحقة. عهدة البضاعة الافتتاحية توثق الكميات الموجودة
              فعليًا في ذلك التاريخ. إدخالها يوثق العهدة المالية؛ تحميل البضاعة
              الفعلي يُسجل من صفحة السيارات.
            </p>
            <Label htmlFor="opening-commission">
              رصيد العمولة الافتتاحي بالدولار (المستحق للسائق)
            </Label>
            <Input
              id="opening-commission"
              type="number"
              step="any"
              value={openingCommission}
              onChange={(event) => setOpeningCommission(event.target.value)}
            />
            {vehicleId && (
              <>
                <Label>إضافة صنف من مخزون السيارة للعهدة الافتتاحية</Label>
                <Select
                  value=""
                  onValueChange={(productId) => {
                    const item = vehicleStock.find(
                      (product) => product.productId === productId,
                    );
                    if (
                      item &&
                      !openingStock.some(
                        (product) => product.productId === productId,
                      )
                    )
                      setOpeningStock((current) => [
                        ...current,
                        {
                          productId: item.productId,
                          productName: item.productName,
                          code: item.code,
                          quantity: item.quantity,
                          costUSD: item.costUSD,
                        },
                      ]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصنف" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleStock
                      .filter(
                        (item) =>
                          !openingStock.some(
                            (stock) => stock.productId === item.productId,
                          ),
                      )
                      .map((item) => (
                        <SelectItem key={item.productId} value={item.productId}>
                          {item.productName} ({item.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {openingStock.map((item, index) => (
              <div
                key={item.productId}
                className="space-y-2 rounded border p-2"
              >
                <p className="text-sm">{item.productName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>الكمية عند البداية</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={(event) =>
                        setOpeningStock((current) =>
                          current.map((stock, i) =>
                            i === index
                              ? {
                                  ...stock,
                                  quantity: Number(event.target.value),
                                }
                              : stock,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>تكلفة الوحدة USD</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.costUSD}
                      onChange={(event) =>
                        setOpeningStock((current) =>
                          current.map((stock, i) =>
                            i === index
                              ? {
                                  ...stock,
                                  costUSD: Number(event.target.value),
                                }
                              : stock,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOpeningStock((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  حذف الصنف
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="driver-action-note">الملاحظات / مرجع السند</Label>
          <Input
            id="driver-action-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {action === "collection" && (
          <p className="text-sm text-muted-foreground">
            تحتسب العمولة من المبلغ المقبوض وفق نسبة السائق السارية بتاريخ
            التحصيل، وتُحفظ مع السند.
          </p>
        )}
        <Button
          type="submit"
          loading={save.isPending}
          disabled={
            save.isPending ||
            (action === "collection" &&
              (invoices.isFetching || invoices.isError || !invoice))
          }
          className="w-full"
        >
          حفظ الحركة
        </Button>
      </form>
    </PopupForm>
  );
}

export default function DriverStatements() {
  const user = useMemo(storedUser, []);
  const admin = user.role === "admin";
  const today = useMemo(currentDate, []);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(today);
  const queryClient = useQueryClient();
  const validDates = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const filters = { driverId, vehicleId, dateFrom, dateTo };
  const query = useQuery({
    queryKey: ["driver-statements", filters],
    queryFn: () => getDriverStatement(filters),
    enabled: validDates,
  });
  const report = query.data;
  const contentRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({
    contentRef,
    documentTitle: `بيان السائق-${report?.driver?.username || "الجميع"}-${dateFrom}-${dateTo}`,
    pageStyle:
      "@page { size: A3 landscape; margin: 10mm; } @media print { body { direction: rtl; font-size: 10px; } .driver-report-table { break-inside: auto; } .overflow-x-auto { overflow: visible !important; } th,td { padding: 5px !important; } thead { display: table-header-group; } tr { break-inside: avoid; } }",
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["driver-statements"] }),
      queryClient.invalidateQueries({
        queryKey: ["driver-collection-invoices"],
      }),
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] }),
      queryClient.invalidateQueries({ queryKey: ["vehicles-table"] }),
      queryClient.invalidateQueries({ queryKey: ["customers-table"] }),
      queryClient.invalidateQueries({ queryKey: ["sells-table"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["get-payments-table"] }),
    ]);
  };
  const exportExcel = () => {
    if (!report) return;
    const workbook = XLSX.utils.book_new();
    Object.entries(driverStatementExportSheets(report)).forEach(
      ([name, rows]) =>
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(
            rows.length
              ? rows
              : [{ ملاحظة: "لا توجد بيانات في الفترة المختارة" }],
          ),
          name,
        ),
    );
    XLSX.writeFile(
      workbook,
      `بيان-السائق-${report.driver?.username || "الجميع"}-${report.filters.dateFrom}-${report.filters.dateTo}.xlsx`,
    );
  };
  const invoiceLink = (sale: Pick<DriverSale, "id">) =>
    admin ? (
      <Link
        className="text-primary underline"
        to="/sellDetails"
        state={sale.id}
      >
        {sale.id.slice(-8)}
      </Link>
    ) : (
      sale.id.slice(-8)
    );
  const customerLink = (id: string | undefined, name: string) =>
    admin && id ? (
      <Link
        className="text-primary underline"
        to="/CustomerDetails"
        state={{ id }}
      >
        {name || id}
      </Link>
    ) : (
      name || id || "—"
    );
  const reference = (id: string, type?: string) => {
    const sale = report?.sales.find((row) => row.id === id);
    if (sale || type === "sell" || type === "sale") return invoiceLink({ id });
    const collection = report?.collections.find((row) => row.id === id);
    return report &&
      (collection ||
        report.cashMovements.some((row) => row.referenceId === id) ||
        report.stockMovements.some((row) => row.referenceId === id)) ? (
      <SourceReference report={report} id={id} />
    ) : (
      id.slice(-8)
    );
  };
  const s = report?.summary;
  return (
    <DashboardLayout>
      <div className="space-y-5" dir="rtl">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5" />
                  البيان المالي للسائقين
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  المبيعات والتحصيلات وعهدة النقد والبضاعة ومستحقات كل سائق خلال
                  الفترة المختارة.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => query.refetch()}
                  disabled={query.isFetching}
                >
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportExcel}
                  disabled={!report || query.isFetching}
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => print()}
                  disabled={!report || query.isFetching}
                >
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>السائق</Label>
                {admin ? (
                  <Select
                    value={driverId || "all"}
                    onValueChange={(value) => {
                      setDriverId(value === "all" ? "" : value);
                      setVehicleId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع السائقين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع السائقين</SelectItem>
                      {(report?.drivers || []).map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.username} — {driver.commissionRate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    disabled
                    value={
                      report?.driver?.username ||
                      user.username ||
                      "بياني المالي"
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>السيارة</Label>
                <Select
                  value={vehicleId || "all"}
                  onValueChange={(value) =>
                    setVehicleId(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع السيارات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع السيارات</SelectItem>
                    {(report?.vehicles || []).map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-report-from">من تاريخ</Label>
                <Input
                  id="driver-report-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-report-to">إلى تاريخ</Label>
                <Input
                  id="driver-report-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
            {!validDates && (
              <p role="alert" className="text-sm text-destructive">
                حدد فترة صحيحة؛ تاريخ البداية يجب أن يسبق تاريخ النهاية.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDateFrom(today);
                    setDateTo(today);
                  }}
                >
                  اليوم
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDateFrom(`${today.slice(0, 7)}-01`);
                    setDateTo(today);
                  }}
                >
                  هذا الشهر
                </Button>
              </div>
              {report && (
                <DriverActionForm
                  key={`${report.driver?.id || "all"}-${report.filters.vehicleId}`}
                  report={report}
                  admin={admin}
                  onSaved={refresh}
                />
              )}
            </div>
            {admin && !report?.driver && (
              <p className="text-xs text-muted-foreground">
                اختر سائقًا محددًا لتسجيل تحصيل أو تسليم أو صرف عمولة.
              </p>
            )}
          </CardContent>
        </Card>
        {query.isFetching && (
          <p
            role="status"
            className="rounded-md border p-4 text-sm text-muted-foreground"
          >
            جارٍ إعداد البيان المالي…
          </p>
        )}
        {query.isError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 p-4"
          >
            <p className="text-destructive">{(query.error as Error).message}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => query.refetch()}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
        {report && s && (
          <div ref={contentRef} className="space-y-5" dir="rtl">
            <div className="rounded-lg border bg-card p-4">
              <h1 className="text-lg font-semibold">
                بيان {report.driver?.username || "جميع السائقين"}
              </h1>
              <p className="mt-1 text-sm">
                الفترة: {report.filters.dateFrom} إلى {report.filters.dateTo} —
                السيارة:{" "}
                {report.vehicles.find(
                  (vehicle) => vehicle.id === report.filters.vehicleId,
                )?.name || "جميع السيارات"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                تاريخ إعداد البيان: {dateLabel(report.generatedAt)}
                {report.driver &&
                  ` — نسبة السائق الحالية: ${report.driver.commissionRate}%`}
              </p>
            </div>
            {report.warnings.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <strong>ملاحظات مطابقة البيانات</strong>
                {report.warnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="صافي مبيعات الفترة"
                value={money(s.salesNetUSD)}
                detail={`${s.salesCount} فاتورة — حسم ${money(s.discountsUSD)} — مرتجعات ${money(s.returnsUSD)}`}
              />
              <SummaryCard
                label="التحصيل النقدي الفعلي"
                value={money(s.collectionsUSD)}
                detail={`رد نقدي: ${money(s.refundedUSD)}`}
              />
              <SummaryCard
                label="دين الزبائن المتبقي"
                value={money(s.outstandingDebtUSD)}
                detail="المتبقي على جميع فواتير السائق حتى نهاية الفترة"
              />
              <SummaryCard
                label="المسلّم للإدارة"
                value={money(s.remittancesUSD)}
              />
              <SummaryCard
                label="النقد المتبقي مع السائق آخر الفترة"
                value={money(s.cashClosingUSD)}
                detail={
                  <>
                    {number(s.cashClosingByCurrency.USD)} USD فعلي +{" "}
                    {number(s.cashClosingByCurrency.SYP)} SYP فعلي
                  </>
                }
                emphasized
              />
              <SummaryCard
                label="عمولة التحصيل خلال الفترة"
                value={money(s.commissionEarnedUSD)}
                detail="تُحفظ نسبة كل تحصيل وقت القبض"
              />
              <SummaryCard
                label="العمولة المصروفة خلال الفترة"
                value={money(s.commissionPaidUSD)}
              />
              <SummaryCard
                label="العمولة المتبقية المستحقة للسائق"
                value={money(s.commissionClosingUSD)}
                detail={`رصيد بداية الفترة: ${money(s.commissionOpeningUSD)}`}
                emphasized
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="رصيد النقد بداية الفترة"
                value={money(s.cashOpeningUSD)}
                detail={`${number(s.cashOpeningByCurrency.USD)} USD + ${number(s.cashOpeningByCurrency.SYP)} SYP`}
              />
              <SummaryCard
                label="سلف ومصروفات الفترة"
                value={`${money(s.advancesUSD)} / ${money(s.expensesUSD)}`}
                detail="السلفة وارد للعهدة والمصروف صادر منها"
              />
              <SummaryCard
                label="ربح البضاعة المباعة"
                value={money(s.profitUSD)}
                detail={`التكلفة ${money(s.costUSD)} — ربح البضاعة مستقل عن عمولة التحصيل`}
              />
              <SummaryCard
                label="البضاعة المتبقية آخر الفترة"
                value={`${number(report.stockBalances.reduce((sum, row) => sum + row.closingQuantity, 0))} وحدة`}
                detail={`قيمتها بالتكلفة: ${money(report.stockBalances.reduce((sum, row) => sum + row.closingQuantity * row.costUSD, 0))}`}
              />
            </div>
            <p className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              القيم الإجمالية بالدولار تعتمد سعر الصرف المحفوظ لكل حركة. أرصدة
              النقد الفعلية بالدولار والليرة معروضة كل بعملتها. عهدة آخر الفترة
              تُستخرج من سجل الحركات والأرصدة الافتتاحية؛ المخزون الحالي ظاهر
              بتاريخ مستقل أدناه.
            </p>
            <ReportTable
              title="تفاصيل فواتير المبيعات"
              headers={[
                "الفاتورة / التاريخ",
                "الزبون / السيارة / السائق",
                "قبل الحسم USD",
                "الحسم USD",
                "الصافي USD",
                "التكلفة USD",
                "ربح البضاعة USD",
                "المرتجع USD",
                "الدين المتبقي USD",
              ]}
              rows={report.sales.map((sale) => [
                <>
                  {invoiceLink(sale)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateLabel(sale.date)}
                  </p>
                </>,
                <>
                  {customerLink(sale.customerId, sale.customerName)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sale.vehicleName || "—"}
                    {` — ${sale.driverName || "غير محدد"}`}
                  </p>
                </>,
                number(sale.grossUSD),
                number(sale.discountUSD),
                number(sale.netUSD),
                number(sale.costUSD),
                number(sale.profitUSD),
                number(sale.returnsUSD),
                number(sale.remainingDebtUSD),
              ])}
            />
            <ReportTable
              title="الأصناف المباعة بالتفصيل"
              description="أسعار وتكاليف الوحدة المحفوظة في الفاتورة؛ إجماليات الحسم والمرتجعات تظهر في جدول الفواتير."
              headers={[
                "الفاتورة",
                "الزبون",
                "السائق",
                "الصنف / الكود",
                "الكمية",
                "تكلفة الوحدة USD",
                "سعر البيع USD",
                "إجمالي التكلفة USD",
                "إجمالي البيع USD",
                "المستودع",
              ]}
              rows={report.sales.flatMap((sale) =>
                sale.products.map((item) => [
                  invoiceLink(sale),
                  sale.customerName,
                  sale.driverName,
                  <>
                    {item.name}
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  </>,
                  number(item.qty),
                  number(item.payPrice),
                  number(item.sellPrice),
                  number(item.qty * item.payPrice),
                  number(item.qty * item.sellPrice),
                  item.warehouse,
                ]),
              )}
            />
            <ReportTable
              title="ديون جميع فواتير السائق حتى نهاية الفترة"
              description="يشمل الفواتير السابقة للفترة المختارة التي بقي منها دين؛ لا يعاد احتسابها ضمن مبيعات الفترة."
              headers={[
                "الفاتورة",
                "التاريخ",
                "السائق",
                "الزبون",
                "السيارة",
                "المبلغ المتبقي USD",
              ]}
              rows={report.outstandingInvoices.map((sale) => [
                invoiceLink(sale),
                dateLabel(sale.date),
                sale.driverName,
                customerLink(sale.customerId, sale.customerName),
                sale.vehicleName,
                number(sale.remainingDebtUSD),
              ])}
            />
            <ReportTable
              title="تفاصيل المرتجعات خلال الفترة"
              headers={[
                "السند / التاريخ",
                "الفاتورة",
                "السائق",
                "الزبون",
                "الصنف / الكود",
                "الكمية المرتجعة",
                "قيمة المرتجع USD",
                "رد نقدي USD",
                "تخفيض الدين USD",
              ]}
              rows={report.returns.map((row) => [
                <>
                  <SourceReference report={report} id={row.id} />
                  <p className="text-xs text-muted-foreground">
                    {dateLabel(row.date)}
                  </p>
                </>,
                invoiceLink({ id: row.sellId }),
                row.driverName,
                row.customerName,
                <>
                  {row.productName}
                  <p className="text-xs text-muted-foreground">{row.code}</p>
                </>,
                number(row.qty),
                number(row.returnValue),
                number(row.cashRefundUSD),
                number(row.receivableCreditUSD),
              ])}
            />
            <ReportTable
              title="تسويات فواتير السائق بالبضاعة"
              description="قيمة التسوية تقلل أو تزيد حساب الزبون حسب اتجاهها، وحصة السائق تتبع التحصيل النقدي المسجل."
              headers={[
                "السند / التاريخ",
                "الفاتورة",
                "السائق / الزبون",
                "الاتجاه",
                "الصنف / الكود",
                "الكمية",
                "سعر التسوية USD",
                "قيمة الصنف USD",
              ]}
              rows={report.settlements.flatMap((row) =>
                row.items.map((item) => [
                  <>
                    <SourceReference report={report} id={row.id} />
                    <p className="text-xs text-muted-foreground">
                      {dateLabel(row.date)}
                    </p>
                  </>,
                  row.sellId ? invoiceLink({ id: row.sellId }) : "على الحساب",
                  <>
                    {row.driverName}
                    <p className="text-xs text-muted-foreground">
                      {row.customerName}
                    </p>
                  </>,
                  row.goodsDirection === "receive"
                    ? "استلام بضاعة"
                    : "تسليم بضاعة",
                  <>
                    {item.name}
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  </>,
                  number(item.quantity),
                  number(item.settlementPriceUSD),
                  number(item.lineTotalUSD),
                ]),
              )}
            />
            <ReportTable
              title="التحصيلات والردود النقدية"
              headers={[
                "السند / التاريخ",
                "الزبون / الفاتورة",
                "السائق",
                "الحركة",
                "المبلغ بعملته",
                "سعر الصرف",
                "المقابل USD",
                "نسبة السائق",
                "العمولة USD",
                "ملاحظات",
              ]}
              rows={report.collections
                .filter((row) => row.settlementMethod === "cash")
                .map((row) => [
                  <>
                    <SourceReference report={report} id={row.id} />
                    <p className="text-xs text-muted-foreground">
                      {dateLabel(row.date)}
                    </p>
                  </>,
                  <>
                    {customerLink(row.customerId, row.customerName)}
                    {row.sellId && <p>{invoiceLink({ id: row.sellId })}</p>}
                  </>,
                  row.driverName || "غير محدد",
                  row.isRefund ? "رد نقدي" : "تحصيل",
                  `${number(row.amountOriginal)} ${row.currency}`,
                  number(row.exchangeRate),
                  number(row.amountUSD),
                  row.commissionRate === null
                    ? "غير محدد"
                    : `${row.commissionRate}%`,
                  number(row.commissionUSD),
                  row.note,
                ])}
            />
            <ReportTable
              title="كشف حركة النقد بالتسلسل"
              description="الرصيد بعد كل حركة يتضمن رصيد بداية الفترة."
              headers={[
                "التاريخ",
                "السند",
                "السائق",
                "نوع الحركة",
                "المبلغ بعملته",
                "المقابل USD",
                "رصيد السائق USD",
                "الدولار الفعلي",
                "الليرة الفعلية",
                "ملاحظات",
              ]}
              rows={report.cashMovements.map((row) => [
                dateLabel(row.date),
                reference(row.referenceId, row.referenceType),
                row.driverName || report.driver?.username,
                driverMovementLabel(row.type),
                `${number(row.amountOriginal)} ${row.currency}`,
                number(row.amountUSD),
                number(row.balanceUSD),
                number(row.balanceByCurrency.USD),
                number(row.balanceByCurrency.SYP),
                row.note,
              ])}
            />
            <ReportTable
              title="كشف مستحقات السائق والعمولات"
              headers={[
                "التاريخ",
                "السند",
                "السائق",
                "الحركة",
                "التحصيل المؤهل USD",
                "النسبة المحفوظة",
                "العمولة / الصرف USD",
                "المستحق المتبقي USD",
              ]}
              rows={report.commissionRows.map((row) => [
                dateLabel(row.date),
                reference(row.referenceId, row.referenceType),
                row.driverName || report.driver?.username,
                driverMovementLabel(row.type),
                number(row.basisUSD),
                row.rate === null ? "—" : `${row.rate}%`,
                number(row.amountUSD),
                number(row.balanceUSD),
              ])}
            />
            <ReportTable
              title="عهدة البضاعة أول وآخر الفترة"
              headers={[
                "السيارة",
                "السائق",
                "الصنف / الكود",
                "أول الفترة",
                "الوارد",
                "الصادر",
                "آخر الفترة",
                "تكلفة الوحدة USD",
                "قيمة آخر الفترة USD",
              ]}
              rows={report.stockBalances.map((row) => [
                report.vehicles.find((v) => v.id === row.vehicleId)?.name ||
                  row.vehicleId,
                row.driverName || report.driver?.username,
                <>
                  {row.productName}
                  <p className="text-xs text-muted-foreground">{row.code}</p>
                </>,
                number(row.openingQuantity),
                number(row.incomingQuantity),
                number(row.outgoingQuantity),
                number(row.closingQuantity),
                number(row.costUSD),
                number(row.closingQuantity * row.costUSD),
              ])}
            />
            <ReportTable
              title="سجل تحميل وبيع ومرتجعات وتحويلات البضاعة"
              headers={[
                "التاريخ",
                "السند",
                "الحركة",
                "السيارة",
                "السائق",
                "الصنف / الكود",
                "الكمية (+ وارد / − صادر)",
                "تكلفة الوحدة USD",
                "الرصيد",
              ]}
              rows={report.stockMovements.map((row) => [
                dateLabel(row.date),
                reference(row.referenceId, row.referenceType),
                driverMovementLabel(row.type),
                report.vehicles.find((v) => v.id === row.vehicleId)?.name ||
                  row.vehicleId,
                row.driverName || report.driver?.username,
                <>
                  {row.productName}
                  <p className="text-xs text-muted-foreground">{row.code}</p>
                </>,
                number(row.quantity),
                number(row.costUSD),
                number(row.balance),
              ])}
            />
            <ReportTable
              title="المخزون الحالي في السيارات"
              description={`حتى ${dateLabel(report.currentStock.asOf)} — الكمية ${number(report.currentStock.quantity)} — التكلفة ${money(report.currentStock.costUSD)}`}
              headers={[
                "السيارة",
                "الصنف / الكود",
                "الكمية الحالية",
                "تكلفة الوحدة USD",
                "القيمة الحالية USD",
              ]}
              rows={report.currentStock.products.map((row) => [
                row.warehouse,
                <>
                  {row.productName}
                  <p className="text-xs text-muted-foreground">{row.code}</p>
                </>,
                number(row.quantity),
                number(row.costUSD),
                number(row.quantity * row.costUSD),
              ])}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
