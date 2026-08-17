import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSells, type Sell } from "@/hooks/useSell";
import { formatMoney } from "@/lib/money";
import {
  getSaleTimestamp,
  isSaleOnDate,
  sortSalesByDateDesc,
} from "@/lib/salesDates";
import getAllCustomer from "@/services/customer";

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const formatDualCurrency = (usd: number, syp = 0) => {
  const usdText = formatMoney(usd, "USD");
  return syp ? `${usdText} / ${formatMoney(syp, "SYP")}` : usdText;
};

const getSaleId = (sale: Sell) => String(sale.id ?? sale.sellId ?? "");

const getSaleInvoiceLabel = (sale: Sell) => {
  const id = getSaleId(sale);
  const invoiceNumber = String(sale.invoiceNumber || sale.sellId || "");

  if (invoiceNumber) return invoiceNumber;
  if (!id) return "-";

  return id.length > 8 ? id.slice(0, 8) : id;
};

const getPaymentStatusLabel = (status?: string) => {
  if (status === "cash") return "نقدا";
  if (status === "part") return "جزئي";
  if (status === "debt") return "دين";
  return "غير محدد";
};

const getPaymentStatusVariant = (status?: string) => {
  if (status === "cash") return "default";
  if (status === "part") return "secondary";
  return "destructive";
};

const getProductsQuantity = (sale: Sell) => {
  if (Array.isArray(sale.products)) {
    return sale.products.reduce(
      (sum, product) => sum + toNumber(product.qty ?? product.quantity),
      0,
    );
  }

  return toNumber(sale.qty ?? sale.quantity);
};

const formatTimestamp = (timestamp: number) => {
  if (!timestamp) return "بدون تاريخ";

  return new Date(timestamp).toLocaleString("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TodaySales() {
  const navigate = useNavigate();
  const { data: sells, isLoading: sellsLoading } = useSells();
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers-summary"],
    queryFn: getAllCustomer,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const customersMap = useMemo(() => {
    return new Map(
      (customers || []).map((customer: any) => [
        String(customer.id || customer._id || ""),
        customer.name || "",
      ]),
    );
  }, [customers]);

  const todaySales = useMemo(() => {
    return sortSalesByDateDesc(
      (sells || []).filter((sale) => isSaleOnDate(sale)),
    );
  }, [sells]);

  const summary = useMemo(() => {
    const totalUSD = todaySales.reduce(
      (sum, sale) => sum + toNumber(sale.totalUSD ?? sale.totalPrice),
      0,
    );
    const totalSYP = todaySales.reduce(
      (sum, sale) => sum + toNumber(sale.totalSYP),
      0,
    );
    const pendingInvoices = todaySales.filter(
      (sale) => sale.paymentStatus === "part" || sale.paymentStatus === "debt",
    ).length;
    const lastSaleTimestamp = todaySales[0]
      ? getSaleTimestamp(todaySales[0])
      : 0;

    return {
      totalUSD,
      totalSYP,
      pendingInvoices,
      lastSaleTimestamp,
    };
  }, [todaySales]);

  const isLoading = sellsLoading || customersLoading;

  const getCustomerName = (sale: Sell) =>
    sale.customerName ||
    sale.customer?.name ||
    customersMap.get(String(sale.customerId || "")) ||
    "غير محدد";

  const openSaleDetails = (sale: Sell) => {
    const id = getSaleId(sale);

    if (id) {
      navigate("/sellDetails", { state: id });
    }
  };

  const summaryCards = [
    {
      title: "عدد فواتير اليوم",
      value: todaySales.length,
      description: "الفواتير المسجلة بتاريخ اليوم",
      icon: ReceiptText,
      color: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      title: "إجمالي مبيعات اليوم",
      value: formatDualCurrency(summary.totalUSD, summary.totalSYP),
      description: "محسوب من إجمالي الفواتير",
      icon: WalletCards,
      color: "border-sky-100 bg-sky-50 text-sky-700",
    },
    {
      title: "فواتير غير مسددة بالكامل",
      value: summary.pendingInvoices,
      description: "تشمل الجزئي والدين",
      icon: FileText,
      color: "border-amber-100 bg-amber-50 text-amber-700",
    },
    {
      title: "آخر عملية بيع",
      value: formatTimestamp(summary.lastSaleTimestamp),
      description: "حسب وقت تسجيل الفاتورة",
      icon: Clock3,
      color: "border-slate-200 bg-slate-50 text-slate-700",
    },
  ];

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="min-h-full rounded-xl bg-gradient-to-br from-slate-50 via-white to-slate-100 p-3 sm:p-4 md:rounded-3xl md:p-6"
      >
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-sm font-medium text-slate-500 shadow-sm">
              <CalendarDays size={16} />
              مبيعات اليوم
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
              آخر مبيعات اليوم
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
              عرض سريع لكل فواتير البيع المسجلة اليوم مع الإجمالي وحالة الدفع.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/home")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              رجوع
            </Button>

            <Button
              type="button"
              onClick={() => navigate("/sellProduct")}
              className="w-full sm:w-auto"
            >
              <ShoppingCart className="h-4 w-4" />
              فاتورة جديدة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-3 h-7 w-28 rounded-lg" />
                    ) : (
                      <div className="mt-2 break-words text-lg font-black text-slate-800 sm:text-xl">
                        {card.value}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-3 ${card.color}`}>
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium text-slate-400">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                تفاصيل مبيعات اليوم
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                اضغط على أي فاتورة لفتح التفاصيل.
              </p>
            </div>

            <Badge variant="secondary" className="w-fit">
              {new Date().toLocaleDateString("ar-SY", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : todaySales.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <ReceiptText size={24} />
              </div>
              <h3 className="font-bold text-slate-700">لا توجد مبيعات اليوم</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                ستظهر هنا فواتير البيع فور تسجيلها بتاريخ اليوم.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {todaySales.map((sale) => (
                  <button
                    key={getSaleId(sale)}
                    type="button"
                    onClick={() => openSaleDetails(sale)}
                    className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-black text-slate-800">
                          فاتورة #{getSaleInvoiceLabel(sale)}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {getCustomerName(sale)}
                        </div>
                      </div>

                      <Badge
                        variant={getPaymentStatusVariant(sale.paymentStatus)}
                      >
                        {getPaymentStatusLabel(sale.paymentStatus)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3 border-t pt-2">
                        <span className="text-slate-400">الإجمالي</span>
                        <span className="font-bold text-slate-700">
                          {formatDualCurrency(
                            toNumber(sale.totalUSD ?? sale.totalPrice),
                            toNumber(sale.totalSYP),
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-2">
                        <span className="text-slate-400">الكمية</span>
                        <span className="font-bold text-slate-700">
                          {getProductsQuantity(sale).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-2">
                        <span className="text-slate-400">التاريخ</span>
                        <span className="text-slate-500">
                          {formatTimestamp(getSaleTimestamp(sale))}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white md:block">
                <Table className="min-w-[820px] text-center">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">الفاتورة</TableHead>
                      <TableHead className="text-center">العميل</TableHead>
                      <TableHead className="text-center">الإجمالي</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">الدفع</TableHead>
                      <TableHead className="text-center">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {todaySales.map((sale) => (
                      <TableRow
                        key={getSaleId(sale)}
                        onClick={() => openSaleDetails(sale)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <TableCell className="font-bold">
                          #{getSaleInvoiceLabel(sale)}
                        </TableCell>
                        <TableCell>{getCustomerName(sale)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatDualCurrency(
                            toNumber(sale.totalUSD ?? sale.totalPrice),
                            toNumber(sale.totalSYP),
                          )}
                        </TableCell>
                        <TableCell>
                          {getProductsQuantity(sale).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPaymentStatusVariant(
                              sale.paymentStatus,
                            )}
                          >
                            {getPaymentStatusLabel(sale.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatTimestamp(getSaleTimestamp(sale))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
