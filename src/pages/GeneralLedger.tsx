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
  ArrowLeft,
  BookOpenText,
  CalendarIcon,
  Scale,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useNavigate, useParams } from "react-router-dom";

const ledgerColumns = [
  { key: "date", label: "التاريخ", sortable: true },
  { key: "description", label: "الوصف", sortable: true },
  { key: "referenceType", label: "نوع المرجع", sortable: true },
  { key: "referenceId", label: "المرجع", sortable: true },
  { key: "note", label: "ملاحظات", sortable: true },
  { key: "debit", label: "مدين", sortable: true },
  { key: "credit", label: "دائن", sortable: true },
  { key: "runningBalanceLabel", label: "الرصيد الجاري", sortable: true },
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

const formatBalanceLabel = (type: string, balance: number) => {
  if (balance === 0) return "0.00";

  const isDebitNature = debitNatureTypes.has(type);

  if (isDebitNature) {
    return balance >= 0
      ? `مدين ${formatNumber(balance)}`
      : `دائن ${formatNumber(Math.abs(balance))}`;
  }

  return balance >= 0
    ? `دائن ${formatNumber(balance)}`
    : `مدين ${formatNumber(Math.abs(balance))}`;
};

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

export default function GeneralLedger() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { data: accountsData, isLoading: accountsLoading } = useGetAccount();
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries();

  const accounts = useMemo(() => normalizeAccounts(accountsData), [accountsData]);
  const journalEntries = useMemo(
    () => normalizeEntries(entriesData),
    [entriesData],
  );

  useEffect(() => {
    if (id) {
      setSelectedAccountId(id);
      return;
    }

    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(String(accounts[0].id));
    }
  }, [id, accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account: any) => String(account.id) === String(selectedAccountId),
      ) || null,
    [accounts, selectedAccountId],
  );

  const ledgerData = useMemo(() => {
    if (!selectedAccount) {
      return {
        rows: [],
        periodDebit: 0,
        periodCredit: 0,
        openingBalanceForPeriod: 0,
      };
    }

    const baseOpeningBalance = Number(selectedAccount.openingBalance ?? 0);
    const fromTime = dateRange?.from
      ? getDayStart(dateRange.from)
      : Number.NEGATIVE_INFINITY;
    const toTime = dateRange?.to
      ? getDayEnd(dateRange.to)
      : Number.POSITIVE_INFINITY;

    const accountLines = journalEntries
      .flatMap((entry: any) =>
        (entry.lines || [])
          .filter(
            (line: any) =>
              String(line.accountId || "") === String(selectedAccount.id),
          )
          .map((line: any, index: number) => ({
            id: `${entry.id || entry.referenceId || "entry"}-${index}`,
            entryId: entry.id || "",
            date: entry.date || "-",
            sortDate: parseDate(entry.date),
            description: entry.description || "-",
            referenceType: entry.referenceType || "-",
            referenceId: entry.referenceId || "-",
            note: line.note || "-",
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            isOpening: false,
          })),
      )
      .sort((a, b) => a.sortDate - b.sortDate);

    const priorLines = accountLines.filter((line) => line.sortDate < fromTime);
    const periodLines = accountLines.filter(
      (line) => line.sortDate >= fromTime && line.sortDate <= toTime,
    );

    const openingBalanceForPeriod = priorLines.reduce((balance, line) => {
      return debitNatureTypes.has(selectedAccount.type)
        ? balance + line.debit - line.credit
        : balance - line.debit + line.credit;
    }, baseOpeningBalance);

    let runningBalance = openingBalanceForPeriod;

    const rows = [
      {
        id: "opening-balance",
        entryId: "",
        date: "-",
        description: dateRange?.from ? "رصيد افتتاحي للفترة" : "رصيد افتتاحي",
        referenceType: "-",
        referenceId: "-",
        note: selectedAccount.description || "-",
        debit: 0,
        credit: 0,
        isOpening: true,
        runningBalanceLabel: formatBalanceLabel(
          selectedAccount.type,
          runningBalance,
        ),
      },
    ];

    periodLines.forEach((line) => {
      runningBalance = debitNatureTypes.has(selectedAccount.type)
        ? runningBalance + line.debit - line.credit
        : runningBalance - line.debit + line.credit;

      rows.push({
        ...line,
        runningBalanceLabel: formatBalanceLabel(
          selectedAccount.type,
          runningBalance,
        ),
      });
    });

    return {
      rows,
      periodDebit: periodLines.reduce((sum, line) => sum + line.debit, 0),
      periodCredit: periodLines.reduce((sum, line) => sum + line.credit, 0),
      openingBalanceForPeriod,
    };
  }, [dateRange, journalEntries, selectedAccount]);

  const ledgerRows = ledgerData.rows;
  const totalDebit = ledgerData.periodDebit;
  const totalCredit = ledgerData.periodCredit;
  const openingBalance = ledgerData.openingBalanceForPeriod;
  const closingBalance = selectedAccount
    ? debitNatureTypes.has(selectedAccount.type)
      ? openingBalance + totalDebit - totalCredit
      : openingBalance - totalDebit + totalCredit
    : 0;

  const isLoading = accountsLoading || entriesLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              متابعة الحركة التفصيلية لكل حساب من الرصيد الافتتاحي حتى الرصيد
              الجاري.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
              <ArrowLeft className="ml-2 h-4 w-4" />
              رجوع
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal sm:w-auto">
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

            <div className="w-full sm:w-72">
              <Select
                value={selectedAccountId}
                onValueChange={(value) => {
                  setSelectedAccountId(value);
                  navigate(`/general-ledger/${value}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} ({account.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : !selectedAccount ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              لم يتم العثور على الحساب المطلوب.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatsCard
                title="رمز الحساب"
                value={selectedAccount.code || "-"}
                icon={BookOpenText}
              />
              <StatsCard
                title="الرصيد الافتتاحي"
                value={formatNumber(openingBalance)}
                icon={Wallet}
                description={selectedAccount.currency}
              />
              <StatsCard
                title="إجمالي المدين"
                value={formatNumber(totalDebit)}
                icon={Scale}
                description={selectedAccount.currency}
              />
              <StatsCard
                title="إجمالي الدائن"
                value={formatNumber(totalCredit)}
                icon={Scale}
                description={selectedAccount.currency}
              />
              <StatsCard
                title="الرصيد الختامي"
                value={formatBalanceLabel(selectedAccount.type, closingBalance)}
                icon={Wallet}
                description={selectedAccount.currency}
              />
            </div>

            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {dateRange?.from ? (
                  <>
                    يتم عرض حركة الحساب ضمن الفترة المحددة فقط، بينما يتم احتساب
                    الرصيد الافتتاحي بعد ترحيل الحركات السابقة لبداية الفترة.
                  </>
                ) : (
                  <>يتم عرض جميع حركات الحساب منذ الرصيد الافتتاحي.</>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>بيانات الحساب</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <span className="font-medium">اسم الحساب:</span>{" "}
                  {selectedAccount.name}
                </div>
                <div>
                  <span className="font-medium">النوع:</span>{" "}
                  {getTypeLabel(selectedAccount.type)}
                </div>
                <div>
                  <span className="font-medium">الفئة:</span>{" "}
                  {selectedAccount.category || "-"}
                </div>
                <div>
                  <span className="font-medium">العملة:</span>{" "}
                  {selectedAccount.currency || "-"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حركة الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  title=""
                  columns={ledgerColumns}
                  data={ledgerRows}
                  defaultPageSize={20}
                  pageSizeOptions={[10, 20, 50, 100]}
                  renderRowActions={(row) =>
                    row.isOpening ? null : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate("/journal-entries", {
                            state: {
                              focusEntryId: row.entryId,
                              focusReferenceId: row.referenceId,
                              focusDate: row.date,
                            },
                          });
                        }}
                      >
                        عرض القيد
                      </Button>
                    )
                  }
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
