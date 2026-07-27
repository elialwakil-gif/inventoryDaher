import { DataTable } from "@/components/dashboard/DataTable";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useGetAccount } from "@/hooks/useAccount";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import getAllSells from "@/services/sells";
import { parseDate } from "@/utils/parseDate";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarIcon,
  DollarSign,
  Landmark,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";

const statementColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "code", label: "رمز الحساب", sortable: true },
  { key: "name", label: "اسم الحساب", sortable: true },
  { key: "category", label: "الفئة", sortable: true },
  { key: "currency", label: "العملة", sortable: true },
  { key: "debit", label: "مدين", sortable: true },
  { key: "credit", label: "دائن", sortable: true },
  { key: "netAmount", label: "صافي الفترة", sortable: true },
];

const normalizeAccounts = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.accounts)) return data.data.accounts;
  return [];
};

const normalizeEntries = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.journalEntries)) return data.journalEntries;
  return [];
};

const normalizeSells = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sells)) return data.sells;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.sells)) return data.data.sells;
  return [];
};

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDayStart = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();

const getDayEnd = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

export default function IncomeStatement() {
  const navigate = useNavigate();
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { data: accountsData, isLoading: accountsLoading } = useGetAccount();
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries();
  const { data: sellsData, isLoading: sellsLoading } = useQuery({
    queryKey: ["sells-table"],
    queryFn: getAllSells,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const accounts = useMemo(() => normalizeAccounts(accountsData), [accountsData]);
  const journalEntries = useMemo(
    () => normalizeEntries(entriesData),
    [entriesData],
  );
  const sells = useMemo(() => normalizeSells(sellsData), [sellsData]);

  const allCurrencies = useMemo(() => {
    const accountCurrencies = accounts
      .map((account: any) => String(account.currency || "").toUpperCase())
      .filter(Boolean);
    const sellCurrencies = sells
      .map((sell: any) => String(sell.currency || "").toUpperCase())
      .filter(Boolean);

    return Array.from(new Set([...accountCurrencies, ...sellCurrencies]));
  }, [accounts, sells]);

  const filteredEntries = useMemo(() => {
    const fromTime = dateRange?.from
      ? getDayStart(dateRange.from)
      : Number.NEGATIVE_INFINITY;
    const toTime = dateRange?.to
      ? getDayEnd(dateRange.to)
      : Number.POSITIVE_INFINITY;

    return journalEntries.filter((entry: any) => {
      const entryTime = parseDate(entry.date);
      return entryTime >= fromTime && entryTime <= toTime;
    });
  }, [dateRange, journalEntries]);

  const filteredSells = useMemo(() => {
    const fromTime = dateRange?.from
      ? getDayStart(dateRange.from)
      : Number.NEGATIVE_INFINITY;
    const toTime = dateRange?.to
      ? getDayEnd(dateRange.to)
      : Number.POSITIVE_INFINITY;

    return sells.filter((sell: any) => {
      const sellTime = parseDate(sell.date);
      return sellTime >= fromTime && sellTime <= toTime;
    });
  }, [dateRange, sells]);

  const accountMovements = useMemo(() => {
    const movementByAccount = new Map<string, { debit: number; credit: number }>();

    filteredEntries.forEach((entry: any) => {
      (entry.lines || []).forEach((line: any) => {
        const accountId = String(line.accountId || "");
        if (!accountId) return;

        const previous = movementByAccount.get(accountId) || {
          debit: 0,
          credit: 0,
        };

        movementByAccount.set(accountId, {
          debit: previous.debit + Number(line.debit || 0),
          credit: previous.credit + Number(line.credit || 0),
        });
      });
    });

    return movementByAccount;
  }, [filteredEntries]);

  const cogsAccountIds = useMemo(
    () =>
      new Set(
        accounts
          .filter(
            (account: any) =>
              account.type === "Expense" && account.category === "CostOfGoodsSold",
          )
          .map((account: any) => String(account.id)),
      ),
    [accounts],
  );

  const journalCogsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();

    accounts.forEach((account: any) => {
      if (!cogsAccountIds.has(String(account.id))) return;

      const movement = accountMovements.get(String(account.id)) || {
        debit: 0,
        credit: 0,
      };
      const amount = movement.debit - movement.credit;
      const currency = String(account.currency || "غير محددة").toUpperCase();

      totals.set(currency, (totals.get(currency) || 0) + amount);
    });

    return totals;
  }, [accountMovements, accounts, cogsAccountIds]);

  const derivedCogsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();

    filteredSells.forEach((sell: any) => {
      const currency = String(sell.priceCurrency || "USD").toUpperCase();
      const totalCost = (sell.products || []).reduce(
        (sum: number, product: any) =>
          sum + Number(product.qty || 0) * Number(product.payPrice || 0),
        0,
      );

      if (!totalCost) return;

      totals.set(currency, (totals.get(currency) || 0) + totalCost);
    });

    return totals;
  }, [filteredSells]);

  const derivedCogsRows = useMemo(() => {
    const rows: any[] = [];

    derivedCogsByCurrency.forEach((amount, currency) => {
      const journalAmount = Number(journalCogsByCurrency.get(currency) || 0);

      if (amount <= 0 || Math.abs(journalAmount) > 0.0001) {
        return;
      }

      const cogsAccount = accounts.find(
        (account: any) =>
          account.type === "Expense" &&
          account.category === "CostOfGoodsSold" &&
          String(account.currency || "غير محددة").toUpperCase() === currency,
      );

      rows.push({
        id: `derived-cogs-${currency}`,
        code: cogsAccount?.code || "AUTO-COGS",
        name: cogsAccount?.name || "تكلفة البضاعة المباعة",
        category: "CostOfGoodsSold",
        type: "Expense",
        currency,
        debit: formatNumber(amount),
        credit: formatNumber(0),
        netAmount: formatNumber(amount),
        netAmountRaw: amount,
        isDerivedFromSales: true,
      });
    });

    return rows;
  }, [accounts, derivedCogsByCurrency, journalCogsByCurrency]);

  const statementRows = useMemo(() => {
    const accountRows = accounts
      .filter(
        (account: any) => account.type === "Revenue" || account.type === "Expense",
      )
      .map((account: any) => {
        const movement = accountMovements.get(String(account.id)) || {
          debit: 0,
          credit: 0,
        };
        const netAmount =
          account.type === "Revenue"
            ? movement.credit - movement.debit
            : movement.debit - movement.credit;

        return {
          id: account.id,
          code: account.code || "-",
          name: account.name || "-",
          category: account.category || "-",
          type: account.type,
          currency: String(account.currency || "-").toUpperCase(),
          debit: formatNumber(movement.debit),
          credit: formatNumber(movement.credit),
          netAmount: formatNumber(netAmount),
          netAmountRaw: netAmount,
          isDerivedFromSales: false,
        };
      });

    return [...accountRows, ...derivedCogsRows];
  }, [accountMovements, accounts, derivedCogsRows]);

  const filteredRows = useMemo(() => {
    if (currencyFilter === "all") return statementRows;
    return statementRows.filter((row) => row.currency === currencyFilter);
  }, [currencyFilter, statementRows]);

  const revenueRows = filteredRows.filter((row) => row.type === "Revenue");
  const expenseRows = filteredRows.filter((row) => row.type === "Expense");
  const totalCostOfGoodsSold = expenseRows
    .filter((row) => row.category === "CostOfGoodsSold")
    .reduce((sum, row) => sum + Number(row.netAmountRaw || 0), 0);
  const totalRevenue = revenueRows.reduce(
    (sum, row) => sum + Number(row.netAmountRaw || 0),
    0,
  );
  const totalExpenses = expenseRows.reduce(
    (sum, row) => sum + Number(row.netAmountRaw || 0),
    0,
  );
  const operatingExpenses = totalExpenses - totalCostOfGoodsSold;
  const grossProfit = totalRevenue - totalCostOfGoodsSold;
  const netIncome = grossProfit - operatingExpenses;
  const usesDerivedCogs = derivedCogsRows.length > 0;
  const isLoading = accountsLoading || entriesLoading || sellsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">قائمة الدخل</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              قياس نتيجة النشاط خلال الفترة من خلال حسابات الإيرادات والمصروفات.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
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
                    "فلترة من/إلى"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
              onClick={() => setDateRange(undefined)}
              disabled={!dateRange?.from && !dateRange?.to}
            >
              مسح الفلتر
            </Button>

            <div className="w-full lg:w-56">
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملات</SelectItem>
                  {allCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="عدد حسابات الإيرادات"
                value={revenueRows.length}
                icon={ArrowUpCircle}
              />
              <StatsCard
                title="عدد حسابات المصروفات"
                value={expenseRows.length}
                icon={ArrowDownCircle}
              />
              <StatsCard
                title="إجمالي الإيرادات"
                value={formatNumber(totalRevenue)}
                icon={Landmark}
              />
              <StatsCard
                title="تكلفة البضاعة المباعة"
                value={formatNumber(totalCostOfGoodsSold)}
                icon={ArrowDownCircle}
              />
              <StatsCard
                title="إجمالي المصروفات"
                value={formatNumber(totalExpenses)}
                icon={DollarSign}
              />
              <StatsCard
                title="المصاريف التشغيلية"
                value={formatNumber(operatingExpenses)}
                icon={ArrowDownCircle}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">مجمل الربح</div>
                  <div
                    className={`mt-2 text-3xl font-bold ${
                      grossProfit >= 0 ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {grossProfit >= 0 ? "ربح " : "خسارة "}
                    {formatNumber(Math.abs(grossProfit))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">
                    صافي الربح / الخسارة
                  </div>
                  <div
                    className={`mt-2 text-3xl font-bold ${
                      netIncome >= 0 ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {netIncome >= 0 ? "ربح " : "خسارة "}
                    {formatNumber(Math.abs(netIncome))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* {usesDerivedCogs && (
              <Card className="border-amber-300 bg-amber-50/50">
                <CardContent className="pt-6 text-sm text-amber-900">
                  تم احتساب تكلفة البضاعة المباعة من فواتير البيع لأن الفترة
                  المختارة لا تحتوي على حركة مباشرة على حسابات تكلفة البضاعة في
                  القيود اليومية.
                </CardContent>
              </Card>
            )}

            <Card className="border-sky-300 bg-sky-50/50">
              <CardContent className="pt-6 text-sm text-sky-900">
                شراء البضاعة لا يزيد إجمالي المصروفات مباشرة في قائمة الدخل إذا
                كان القيد على حساب المخزون، لأن المخزون يُعامل كأصل. يظهر
                الأثر في المصروفات عند البيع ضمن تكلفة البضاعة المباعة، أو عند
                تسجيل العملية مباشرة على حساب مصروف.
              </CardContent>
            </Card>

            {Math.abs(operatingExpenses) < 0.0001 && (
              <Card className="border-emerald-300 bg-emerald-50/50">
                <CardContent className="pt-6 text-sm text-emerald-900">
                  تساوي مجمل الربح مع صافي الربح خلال هذه الفترة لأن المصاريف
                  التشغيلية المسجلة تساوي صفرًا. البيع بالدين يغيّر حساب
                  العملاء ولا يغيّر الربح بحد ذاته، وشراء المخزون يرفع الأصل
                  حتى يتم البيع.
                </CardContent>
              </Card>
            )} */}

            {/* <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {dateRange?.from ? (
                  <>
                    تم احتساب قائمة الدخل للحركات الواقعة بين{" "}
                    {format(dateRange.from, "yyyy-MM-dd")} و{" "}
                    {dateRange.to
                      ? format(dateRange.to, "yyyy-MM-dd")
                      : format(dateRange.from, "yyyy-MM-dd")}
                    .
                  </>
                ) : (
                  <>تم احتساب قائمة الدخل باستخدام جميع القيود اليومية المتاحة.</>
                )}
              </CardContent>
            </Card> */}

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    title=""
                    columns={statementColumns}
                    data={revenueRows}
                    defaultPageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                    onRowClick={(row) => navigate(`/general-ledger/${row.id}`)}
                    getRowClassName={() => "cursor-pointer hover:bg-muted/50"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    title=""
                    columns={statementColumns}
                    data={expenseRows}
                    defaultPageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                    onRowClick={(row) => {
                      if (!row.isDerivedFromSales) {
                        navigate(`/general-ledger/${row.id}`);
                      }
                    }}
                    getRowClassName={(row) =>
                      row.isDerivedFromSales
                        ? "bg-amber-50/30"
                        : "cursor-pointer hover:bg-muted/50"
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
