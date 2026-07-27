import { DataTable } from "@/components/dashboard/DataTable";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import getAllCustomer from "@/services/customer";
import getAllSells from "@/services/sells";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Boxes,
  CalendarIcon,
  FileText,
  Package,
  ReceiptText,
  TrendingUp,
  UserRound,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";

interface SellProduct {
  id?: string;
  productId?: string;
  name?: string;
  code?: string;
  category?: string;
  warehouse?: string;
  qty?: number | string;
  quantity?: number | string;
  payPrice?: number | string;
  sellPrice?: number | string;
  totalPrice?: number | string;
  unit?: string;
}

interface SellRecord {
  id?: string;
  customerId?: string;
  customerName?: string;
  customer?: {
    name?: string;
  };
  totalPrice?: number | string;
  totalUSD?: number | string;
  totalSYP?: number | string;
  amount_base?: number | string;
  paymentStatus?: string;
  currency?: string;
  priceCurrency?: string;
  paymentCurrency?: string;
  exchangeRate?: number | string;
  date?: string;
  createdAt?: string;
  products?: SellProduct[];
}

interface CustomerRecord {
  id: string;
  name: string;
}

interface ProfitLine {
  id: string;
  invoiceId: string;
  date: string;
  sortTime: number;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  warehouse: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  revenueSYP: number;
  costSYP: number;
  profitSYP: number;
  exchangeDifference: number;
  currency: string;
}

const summaryColumns = [
  { key: "metric", label: "المؤشر", sortable: true },
  { key: "value", label: "القيمة", sortable: true },
];

const productColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "productName", label: "المنتج", sortable: true },
  { key: "productCode", label: "الكود", sortable: true },
  { key: "category", label: "التصنيف", sortable: true },
  { key: "quantity", label: "الكمية", sortable: true },
  { key: "revenue", label: "إجمالي البيع", sortable: true },
  { key: "cost", label: "إجمالي التكلفة", sortable: true },
  { key: "profit", label: "الربح", sortable: true },
  { key: "profitSYP", label: "الربح SYP", sortable: true },
  { key: "exchangeDifference", label: "فرق الصرف", sortable: true },
  { key: "profitMargin", label: "نسبة الربح", sortable: true },
];

const invoiceColumns = [
  { key: "id", label: "رقم الفاتورة", sortable: true },
  { key: "date", label: "التاريخ", sortable: true },
  { key: "customerName", label: "العميل", sortable: true },
  { key: "itemsCount", label: "عدد المواد", sortable: true },
  { key: "quantity", label: "الكمية", sortable: true },
  { key: "revenue", label: "قيمة البيع", sortable: true },
  { key: "cost", label: "التكلفة", sortable: true },
  { key: "profit", label: "الربح", sortable: true },
  { key: "profitSYP", label: "الربح SYP", sortable: true },
  { key: "exchangeDifference", label: "فرق الصرف", sortable: true },
  { key: "profitMargin", label: "نسبة الربح", sortable: true },
];

const customerColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "customerName", label: "العميل", sortable: true },
  { key: "invoicesCount", label: "عدد الفواتير", sortable: true },
  { key: "quantity", label: "الكمية", sortable: true },
  { key: "revenue", label: "إجمالي المبيعات", sortable: true },
  { key: "cost", label: "إجمالي التكلفة", sortable: true },
  { key: "profit", label: "إجمالي الربح", sortable: true },
  { key: "profitSYP", label: "إجمالي الربح SYP", sortable: true },
  { key: "exchangeDifference", label: "فرق الصرف", sortable: true },
  { key: "averageProfit", label: "متوسط ربح الفاتورة", sortable: true },
  { key: "profitMargin", label: "نسبة الربح", sortable: true },
];

const warehouseColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "warehouse", label: "المستودع", sortable: true },
  { key: "invoicesCount", label: "عدد الفواتير", sortable: true },
  { key: "quantity", label: "الكمية", sortable: true },
  { key: "revenue", label: "إجمالي البيع", sortable: true },
  { key: "cost", label: "إجمالي التكلفة", sortable: true },
  { key: "profit", label: "الربح", sortable: true },
  { key: "profitSYP", label: "الربح SYP", sortable: true },
  { key: "exchangeDifference", label: "فرق الصرف", sortable: true },
  { key: "profitMargin", label: "نسبة الربح", sortable: true },
];

const emptyValue = "غير محدد";

const toNumber = (value: unknown) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatPercent = (value: number) => `${round2(value)}%`;

const normalizeSells = (data: any): SellRecord[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sells)) return data.sells;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.sells)) return data.data.sells;
  return [];
};

const normalizeCustomers = (data: any): CustomerRecord[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeCurrency = (currency?: string) =>
  (currency || "USD").toUpperCase();

const normalizeDateText = (value: string) =>
  value
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace("،", ",")
    .replace("ص", "AM")
    .replace("م", "PM")
    .trim();

const parseProfitDate = (value?: string) => {
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

const getDayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    .getTime();

const getDayEnd = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    .getTime();

const getProfitMargin = (profit: number, revenue: number) =>
  revenue ? (profit / revenue) * 100 : 0;

const getCustomerName = (
  sell: SellRecord,
  customersMap: Record<string, string>,
) =>
  sell.customerName ||
  sell.customer?.name ||
  customersMap[String(sell.customerId || "")] ||
  sell.customerId ||
  emptyValue;

const getProductQuantity = (product: SellProduct) =>
  toNumber(product.qty) || toNumber(product.quantity);

export default function ProfitAnalysis() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["profit-analysis"],
    queryFn: async () => {
      const [sells, customers] = await Promise.all([
        getAllSells(),
        getAllCustomer(),
      ]);

      return {
        sells: normalizeSells(sells),
        customers: normalizeCustomers(customers),
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const customersMap = useMemo(
    () =>
      Object.fromEntries(
        (data?.customers || []).map((customer) => [customer.id, customer.name]),
      ),
    [data?.customers],
  );

  const currencies = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.sells || []).map((sell) =>
            normalizeCurrency(sell.priceCurrency || "USD"),
          ),
        ),
      ),
    [data?.sells],
  );

  const profitLines = useMemo<ProfitLine[]>(() => {
    return (data?.sells || []).flatMap((sell) => {
      const products = Array.isArray(sell.products) ? sell.products : [];
      const invoiceTotal = toNumber(sell.totalUSD ?? sell.totalPrice);
      const grossProductsTotal = products.reduce((sum, product) => {
        const quantity = getProductQuantity(product);
        return sum + quantity * toNumber(product.sellPrice);
      }, 0);
      const date = sell.date || sell.createdAt || "";
      const customerName = getCustomerName(sell, customersMap);
      const currency = normalizeCurrency(sell.priceCurrency || "USD");
      const paymentCurrency = normalizeCurrency(sell.paymentCurrency || sell.currency);
      const exchangeRate = paymentCurrency === "SYP" ? toNumber(sell.exchangeRate) || 1 : 1;
      const invoiceTotalSYP = toNumber(sell.totalSYP);

      return products.map((product, index) => {
        const quantity = getProductQuantity(product);
        const listRevenue = quantity * toNumber(product.sellPrice);
        const revenue =
          invoiceTotal > 0 && grossProductsTotal > 0
            ? (listRevenue / grossProductsTotal) * invoiceTotal
            : listRevenue || toNumber(product.totalPrice);
        const cost = quantity * toNumber(product.payPrice);
        const profit = revenue - cost;
        const revenueShare =
          invoiceTotal > 0 && revenue > 0 ? revenue / invoiceTotal : 0;
        const revenueSYP =
          paymentCurrency === "SYP"
            ? invoiceTotalSYP > 0
              ? invoiceTotalSYP * revenueShare
              : revenue * exchangeRate
            : 0;
        const costSYP = paymentCurrency === "SYP" ? cost * exchangeRate : 0;
        const profitSYP = revenueSYP - costSYP;
        const exchangeDifference =
          paymentCurrency === "SYP" && exchangeRate > 0
            ? revenueSYP / exchangeRate - revenue
            : 0;

        return {
          id: `${sell.id || "invoice"}-${product.productId || product.id || index}`,
          invoiceId: sell.id || emptyValue,
          date,
          sortTime: parseProfitDate(date),
          customerId: sell.customerId || emptyValue,
          customerName,
          productId: product.productId || product.id || product.code || emptyValue,
          productName: product.name || emptyValue,
          productCode: product.code || emptyValue,
          category: product.category || emptyValue,
          warehouse: product.warehouse || emptyValue,
          quantity,
          revenue,
          cost,
          profit,
          revenueSYP,
          costSYP,
          profitSYP,
          exchangeDifference,
          currency,
        };
      });
    });
  }, [customersMap, data?.sells]);

  const filteredLines = useMemo(() => {
    let items = profitLines;

    if (currencyFilter !== "all") {
      items = items.filter((line) => line.currency === currencyFilter);
    }

    if (dateRange?.from && dateRange?.to) {
      const fromTime = getDayStart(dateRange.from);
      const toTime = getDayEnd(dateRange.to);

      items = items.filter(
        (line) => line.sortTime >= fromTime && line.sortTime <= toTime,
      );
    }

    return items;
  }, [currencyFilter, dateRange, profitLines]);

  const totals = useMemo(() => {
    const invoiceIds = new Set(filteredLines.map((line) => line.invoiceId));
    const products = new Set(filteredLines.map((line) => line.productId));
    const customers = new Set(filteredLines.map((line) => line.customerId));
    const warehouses = new Set(filteredLines.map((line) => line.warehouse));
    const revenue = filteredLines.reduce((sum, line) => sum + line.revenue, 0);
    const cost = filteredLines.reduce((sum, line) => sum + line.cost, 0);
    const profit = revenue - cost;
    const profitSYP = filteredLines.reduce((sum, line) => sum + line.profitSYP, 0);
    const exchangeDifference = filteredLines.reduce(
      (sum, line) => sum + line.exchangeDifference,
      0,
    );

    return {
      invoiceCount: invoiceIds.size,
      productCount: products.size,
      customerCount: customers.size,
      warehouseCount: warehouses.size,
      quantity: filteredLines.reduce((sum, line) => sum + line.quantity, 0),
      revenue,
      cost,
      profit,
      profitSYP,
      exchangeDifference,
      profitMargin: getProfitMargin(profit, revenue),
    };
  }, [filteredLines]);

  const productRows = useMemo(() => {
    const rows = new Map<string, any>();

    filteredLines.forEach((line) => {
      const key = line.productId || line.productCode || line.productName;
      const previous = rows.get(key) || {
        id: key,
        productName: line.productName,
        productCode: line.productCode,
        category: line.category,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profitSYP: 0,
        exchangeDifference: 0,
      };

      previous.quantity += line.quantity;
      previous.revenue += line.revenue;
      previous.cost += line.cost;
      previous.profit += line.profit;
      previous.profitSYP += line.profitSYP;
      previous.exchangeDifference += line.exchangeDifference;
      rows.set(key, previous);
    });

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        quantity: round2(row.quantity),
        revenue: round2(row.revenue),
        cost: round2(row.cost),
        profit: round2(row.profit),
        profitSYP: round2(row.profitSYP),
        exchangeDifference: round2(row.exchangeDifference),
        profitMargin: formatPercent(getProfitMargin(row.profit, row.revenue)),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredLines]);

  const invoiceRows = useMemo(() => {
    const rows = new Map<string, any>();

    filteredLines.forEach((line) => {
      const previous = rows.get(line.invoiceId) || {
        id: line.invoiceId,
        date: line.date,
        customerName: line.customerName,
        itemsCount: 0,
        itemIds: new Set<string>(),
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profitSYP: 0,
        exchangeDifference: 0,
        sortTime: line.sortTime,
      };

      previous.itemIds.add(line.productId);
      previous.itemsCount = previous.itemIds.size;
      previous.quantity += line.quantity;
      previous.revenue += line.revenue;
      previous.cost += line.cost;
      previous.profit += line.profit;
      previous.profitSYP += line.profitSYP;
      previous.exchangeDifference += line.exchangeDifference;
      previous.sortTime = Math.max(previous.sortTime, line.sortTime);
      rows.set(line.invoiceId, previous);
    });

    return Array.from(rows.values())
      .map((row) => ({
        id: row.id,
        date: row.date,
        customerName: row.customerName,
        itemsCount: row.itemsCount,
        quantity: round2(row.quantity),
        revenue: round2(row.revenue),
        cost: round2(row.cost),
        profit: round2(row.profit),
        profitSYP: round2(row.profitSYP),
        exchangeDifference: round2(row.exchangeDifference),
        profitMargin: formatPercent(getProfitMargin(row.profit, row.revenue)),
        sortTime: row.sortTime,
      }))
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [filteredLines]);

  const customerRows = useMemo(() => {
    const rows = new Map<string, any>();

    filteredLines.forEach((line) => {
      const previous = rows.get(line.customerId) || {
        id: line.customerId,
        customerName: line.customerName,
        invoiceIds: new Set<string>(),
        invoicesCount: 0,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profitSYP: 0,
        exchangeDifference: 0,
      };

      previous.invoiceIds.add(line.invoiceId);
      previous.invoicesCount = previous.invoiceIds.size;
      previous.quantity += line.quantity;
      previous.revenue += line.revenue;
      previous.cost += line.cost;
      previous.profit += line.profit;
      previous.profitSYP += line.profitSYP;
      previous.exchangeDifference += line.exchangeDifference;
      rows.set(line.customerId, previous);
    });

    return Array.from(rows.values())
      .map((row) => ({
        id: row.id,
        customerName: row.customerName,
        invoicesCount: row.invoicesCount,
        quantity: round2(row.quantity),
        revenue: round2(row.revenue),
        cost: round2(row.cost),
        profit: round2(row.profit),
        profitSYP: round2(row.profitSYP),
        exchangeDifference: round2(row.exchangeDifference),
        averageProfit: round2(row.invoicesCount ? row.profit / row.invoicesCount : 0),
        profitMargin: formatPercent(getProfitMargin(row.profit, row.revenue)),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredLines]);

  const warehouseRows = useMemo(() => {
    const rows = new Map<string, any>();

    filteredLines.forEach((line) => {
      const previous = rows.get(line.warehouse) || {
        id: line.warehouse,
        warehouse: line.warehouse,
        invoiceIds: new Set<string>(),
        invoicesCount: 0,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profitSYP: 0,
        exchangeDifference: 0,
      };

      previous.invoiceIds.add(line.invoiceId);
      previous.invoicesCount = previous.invoiceIds.size;
      previous.quantity += line.quantity;
      previous.revenue += line.revenue;
      previous.cost += line.cost;
      previous.profit += line.profit;
      previous.profitSYP += line.profitSYP;
      previous.exchangeDifference += line.exchangeDifference;
      rows.set(line.warehouse, previous);
    });

    return Array.from(rows.values())
      .map((row) => ({
        id: row.id,
        warehouse: row.warehouse,
        invoicesCount: row.invoicesCount,
        quantity: round2(row.quantity),
        revenue: round2(row.revenue),
        cost: round2(row.cost),
        profit: round2(row.profit),
        profitSYP: round2(row.profitSYP),
        exchangeDifference: round2(row.exchangeDifference),
        profitMargin: formatPercent(getProfitMargin(row.profit, row.revenue)),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredLines]);

  const summaryRows = useMemo(
    () => [
      { metric: "إجمالي المبيعات", value: formatAmount(totals.revenue) },
      { metric: "تكلفة البضاعة المباعة", value: formatAmount(totals.cost) },
      { metric: "مجمل الربح", value: formatAmount(totals.profit) },
      { metric: "مجمل الربح SYP", value: formatAmount(totals.profitSYP) },
      { metric: "فرق سعر الصرف", value: formatAmount(totals.exchangeDifference) },
      { metric: "نسبة الربح", value: formatPercent(totals.profitMargin) },
      { metric: "عدد الفواتير", value: totals.invoiceCount },
      { metric: "عدد المنتجات", value: totals.productCount },
      { metric: "عدد العملاء", value: totals.customerCount },
      { metric: "عدد المستودعات", value: totals.warehouseCount },
    ],
    [totals],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">تحليل الأرباح</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              تحليل الربح حسب المنتج والفاتورة والعميل والمستودع من فواتير البيع.
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
                    "فترة من/إلى"
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
              مسح التاريخ
            </Button>

            <div className="w-full lg:w-48">
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger>
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
            </div>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="إجمالي المبيعات"
                value={formatAmount(totals.revenue)}
                icon={ReceiptText}
              />
              <StatsCard
                title="تكلفة البضاعة"
                value={formatAmount(totals.cost)}
                icon={Package}
              />
              <StatsCard
                title="مجمل الربح"
                value={formatAmount(totals.profit)}
                icon={TrendingUp}
              />
              <StatsCard
                title="مجمل الربح SYP"
                value={formatAmount(totals.profitSYP)}
                icon={TrendingUp}
              />
              <StatsCard
                title="فرق سعر الصرف"
                value={formatAmount(totals.exchangeDifference)}
                icon={FileText}
              />
              <StatsCard
                title="نسبة الربح"
                value={formatPercent(totals.profitMargin)}
                icon={FileText}
              />
              <StatsCard
                title="الفواتير"
                value={totals.invoiceCount.toLocaleString("en-US")}
                icon={ReceiptText}
              />
              <StatsCard
                title="المنتجات"
                value={totals.productCount.toLocaleString("en-US")}
                icon={Boxes}
              />
              <StatsCard
                title="العملاء"
                value={totals.customerCount.toLocaleString("en-US")}
                icon={UserRound}
              />
              <StatsCard
                title="المستودعات"
                value={totals.warehouseCount.toLocaleString("en-US")}
                icon={Warehouse}
              />
            </div>

            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="summary">ملخص الأرباح</TabsTrigger>
                <TabsTrigger value="products">حسب المنتج</TabsTrigger>
                <TabsTrigger value="invoices">حسب الفاتورة</TabsTrigger>
                <TabsTrigger value="customers">حسب العميل</TabsTrigger>
                <TabsTrigger value="warehouses">حسب المستودع</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <DataTable
                  title="ملخص الأرباح"
                  columns={summaryColumns}
                  data={summaryRows}
                  searchable={false}
                  defaultPageSize={10}
                />
              </TabsContent>

              <TabsContent value="products">
                <DataTable
                  title="الربح حسب المنتج"
                  columns={productColumns}
                  data={productRows}
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </TabsContent>

              <TabsContent value="invoices">
                <DataTable
                  title="الربح حسب الفاتورة"
                  columns={invoiceColumns}
                  data={invoiceRows}
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </TabsContent>

              <TabsContent value="customers">
                <DataTable
                  title="الربح حسب العميل"
                  columns={customerColumns}
                  data={customerRows}
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </TabsContent>

              <TabsContent value="warehouses">
                <DataTable
                  title="الربح حسب المستودع"
                  columns={warehouseColumns}
                  data={warehouseRows}
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
