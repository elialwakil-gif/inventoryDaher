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
import { parseDate } from "@/utils/parseDate";
import { format } from "date-fns";
import {
  AlertTriangle,
  BookOpenText,
  CalendarIcon,
  Scale,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const trialBalanceColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "code", label: "رمز الحساب", sortable: true },
  { key: "name", label: "اسم الحساب", sortable: true },
  { key: "typeLabel", label: "النوع", sortable: true },
  { key: "category", label: "الفئة", sortable: true },
  { key: "currency", label: "العملة", sortable: true },
  { key: "openingBalance", label: "الرصيد الافتتاحي", sortable: true },
  { key: "totalMovementDebit", label: "إجمالي الحركات المدينة", sortable: true },
  { key: "totalMovementCredit", label: "إجمالي الحركات الدائنة", sortable: true },
  { key: "closingBalance", label: "الرصيد الختامي", sortable: true },
  { key: "debit", label: "مدين", sortable: true },
  { key: "credit", label: "دائن", sortable: true },
];

const debitNatureTypes = new Set(["Asset", "Expense"]);

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

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    Asset: "أصل",
    Liability: "التزام",
    Equity: "حقوق ملكية",
    Revenue: "إيراد",
    Expense: "مصروف",
  };

  return typeLabels[type] || type || "-";
};

const splitBalance = (type: string, balance: number) => {
  const isDebitNature = debitNatureTypes.has(type);

  if (isDebitNature) {
    return balance >= 0
      ? { debit: balance, credit: 0 }
      : { debit: 0, credit: Math.abs(balance) };
  }

  return balance >= 0
    ? { debit: 0, credit: balance }
    : { debit: Math.abs(balance), credit: 0 };
};

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

export default function TrialBalance() {
  const navigate = useNavigate();
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined);
  const { data: accountsData, isLoading: accountsLoading } = useGetAccount();
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries();

  const accounts = useMemo(() => normalizeAccounts(accountsData), [accountsData]);
  const journalEntries = useMemo(
    () => normalizeEntries(entriesData),
    [entriesData],
  );

  const allCurrencies = useMemo(() => {
    const currencies = accounts
      .map((account: any) => String(account.currency || "").toUpperCase())
      .filter(Boolean);

    return Array.from(new Set(currencies));
  }, [accounts]);

  const filteredJournalEntries = useMemo(() => {
    if (!asOfDate) return journalEntries;

    const asOfTime = getDayEnd(asOfDate);
    return journalEntries.filter((entry: any) => {
      const entryTime = parseDate(entry.date);
      return entryTime > 0 && entryTime <= asOfTime;
    });
  }, [asOfDate, journalEntries]);

  const tableRows = useMemo(() => {
    const movementByAccount = new Map<string, { debit: number; credit: number }>();

    filteredJournalEntries.forEach((entry: any) => {
      (entry.lines || []).forEach((line: any) => {
        const accountId = String(line.accountId || "");
        if (!accountId) return;

        const previousMovement = movementByAccount.get(accountId) || {
          debit: 0,
          credit: 0,
        };

        movementByAccount.set(accountId, {
          debit: previousMovement.debit + Number(line.debit || 0),
          credit: previousMovement.credit + Number(line.credit || 0),
        });
      });
    });

    return accounts.map((account: any) => {
      const openingBalance = Number(account.openingBalance ?? 0);
      const movement = movementByAccount.get(String(account.id)) || {
        debit: 0,
        credit: 0,
      };
      const calculatedBalance = debitNatureTypes.has(account.type)
        ? openingBalance + movement.debit - movement.credit
        : openingBalance - movement.debit + movement.credit;
      const { debit, credit } = splitBalance(account.type, calculatedBalance);

      return {
        id: account.id,
        code: account.code || "-",
        name: account.name || "-",
        type: account.type || "-",
        typeLabel: getTypeLabel(account.type),
        category: account.category || "-",
        currency: String(account.currency || "-").toUpperCase(),
        openingBalance: formatNumber(openingBalance),
        movementDebitRaw: movement.debit,
        movementCreditRaw: movement.credit,
        closingDebitRaw: debit,
        closingCreditRaw: credit,
        totalMovementDebit: formatNumber(movement.debit),
        totalMovementCredit: formatNumber(movement.credit),
        closingBalance: formatNumber(calculatedBalance),
        debit,
        credit,
      };
    });
  }, [accounts, filteredJournalEntries]);

  const filteredRows = useMemo(() => {
    if (currencyFilter === "all") {
      return tableRows;
    }

    return tableRows.filter((row) => row.currency === currencyFilter);
  }, [currencyFilter, tableRows]);

  const totalDebit = filteredRows.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0,
  );
  const totalCredit = filteredRows.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0,
  );
  const difference = totalDebit - totalCredit;
  const activeAccounts = filteredRows.filter(
    (row) => Number(row.debit) > 0 || Number(row.credit) > 0,
  ).length;
  const totalMovementDebit = filteredRows.reduce(
    (sum, row) => sum + Number(row.movementDebitRaw || 0),
    0,
  );
  const totalMovementCredit = filteredRows.reduce(
    (sum, row) => sum + Number(row.movementCreditRaw || 0),
    0,
  );
  const totalClosingDebit = filteredRows.reduce(
    (sum, row) => sum + Number(row.closingDebitRaw || 0),
    0,
  );
  const totalClosingCredit = filteredRows.reduce(
    (sum, row) => sum + Number(row.closingCreditRaw || 0),
    0,
  );

  const isLoading = accountsLoading || entriesLoading;
  const showMixedCurrencyNotice =
    currencyFilter === "all" && allCurrencies.length > 1;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">ميزان المراجعة</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              عرض أرصدة الحسابات في عمودي المدين والدائن للتحقق من توازن النظام
              المحاسبي.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal sm:w-auto">
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {asOfDate ? format(asOfDate, "yyyy-MM-dd") : "حتى تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={asOfDate}
                  onSelect={setAsOfDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              onClick={() => setAsOfDate(undefined)}
              disabled={!asOfDate}
            >
              مسح التاريخ
            </Button>

            <div className="w-full sm:w-56">
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatsCard
                title="إجمالي الحسابات"
                value={filteredRows.length}
                icon={BookOpenText}
              />
              <StatsCard
                title="الحسابات النشطة"
                value={activeAccounts}
                icon={Wallet}
              />
              <StatsCard
                title="كل الحركات المدينة"
                value={formatNumber(totalMovementDebit)}
                icon={Scale}
              />
              <StatsCard
                title="كل الحركات الدائنة"
                value={formatNumber(totalMovementCredit)}
                icon={Scale}
              />
              <StatsCard
                title="الأرصدة الختامية المدينة"
                value={formatNumber(totalClosingDebit)}
                icon={Wallet}
              />
              <StatsCard
                title="الأرصدة الختامية الدائنة"
                value={formatNumber(totalClosingCredit)}
                icon={Wallet}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">
                    إجمالي الدائن
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {formatNumber(totalCredit)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">فرق التوازن</div>
                  <div
                    className={`mt-2 text-3xl font-bold ${
                      difference === 0 ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {formatNumber(Math.abs(difference))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {asOfDate ? (
                  <>
                    تم احتساب ميزان المراجعة حتى تاريخ{" "}
                    {format(asOfDate, "yyyy-MM-dd")} اعتمادًا على الرصيد
                    الافتتاحي وحركة القيود اليومية حتى هذا التاريخ.
                  </>
                ) : (
                  <>يتم احتساب ميزان المراجعة باستخدام جميع القيود اليومية المتاحة.</>
                )}
              </CardContent>
            </Card>

            {showMixedCurrencyNotice && (
              <Card className="border-amber-300 bg-amber-50/50">
                <CardContent className="flex items-start gap-3 pt-6 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    يوجد أكثر من عملة في الحسابات. للحصول على ميزان مراجعة أدق،
                    يفضل اختيار عملة واحدة من الفلتر بدل جمع الأرصدة معًا.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>جدول ميزان المراجعة</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  title=""
                  columns={trialBalanceColumns}
                  data={filteredRows}
                  defaultPageSize={20}
                  pageSizeOptions={[10, 20, 50, 100]}
                  onRowClick={(row) => navigate(`/general-ledger/${row.id}`)}
                  getRowClassName={() => "cursor-pointer hover:bg-muted/50"}
                />
              </CardContent>
            </Card>

            {difference !== 0 && (
              <Card>
                <CardContent className="pt-6 text-sm text-destructive">
                  ميزان المراجعة غير متوازن حاليًا. الفرق بين المدين والدائن هو{" "}
                  {formatNumber(Math.abs(difference))}.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
