import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  Banknote,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/useProducts";
import { useSells } from "@/hooks/useSell";
import getAllCustomer from "@/services/customer";
import getAllPayments from "@/services/payments";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const formatDualCurrency = (usd: number, syp = 0) => {
  const usdText = `${formatCurrency(usd)} USD`;
  return syp ? `${usdText} / ${formatCurrency(syp)} SYP` : usdText;
};

export default function Home() {
  const navigate = useNavigate();

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: sells, isLoading: sellsLoading } = useSells();

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers-summary"],
    queryFn: getAllCustomer,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments-summary"],
    queryFn: getAllPayments,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const loading =
    productsLoading || sellsLoading || customersLoading || paymentsLoading;

  const stats = useMemo(() => {
    const productsCount = products?.length ?? 0;
    const salesCount = sells?.length ?? 0;
    const customersCount = customers?.length ?? 0;

    const totalSalesUSD = sells
      ? sells.reduce(
          (sum, sell) => sum + toNumber(sell.totalUSD ?? sell.totalPrice),
          0,
        )
      : 0;
    const totalSalesSYP = sells
      ? sells.reduce((sum, sell) => sum + toNumber(sell.totalSYP), 0)
      : 0;

    const totalExpensesUSD = payments
      ? payments
          .filter((payment: any) => payment.type === "expense")
          .reduce(
            (sum: number, payment: any) =>
              sum + Math.abs(toNumber(payment.amountUSD ?? payment.amount)),
            0,
          )
      : 0;
    const totalExpensesSYP = payments
      ? payments
          .filter((payment: any) => payment.type === "expense")
          .reduce(
            (sum: number, payment: any) =>
              sum + Math.abs(toNumber(payment.amountSYP)),
            0,
          )
      : 0;

    const totalIncomeUSD = payments
      ? payments
          .filter((payment: any) => payment.type === "income")
          .reduce(
            (sum: number, payment: any) =>
              sum + Math.abs(toNumber(payment.amountUSD ?? payment.amount)),
            0,
          )
      : 0;
    const totalIncomeSYP = payments
      ? payments
          .filter((payment: any) => payment.type === "income")
          .reduce(
            (sum: number, payment: any) =>
              sum + Math.abs(toNumber(payment.amountSYP)),
            0,
          )
      : 0;

    return [
      {
        title: "إجمالي المبيعات",
        value: formatDualCurrency(totalSalesUSD, totalSalesSYP),
        icon: TrendingUp,
        trendIcon: ArrowUpRight,
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        iconBg: "bg-emerald-100",
      },
      {
        title: "إجمالي المصاريف",
        value: formatDualCurrency(totalExpensesUSD, totalExpensesSYP),
        icon: TrendingDown,
        trendIcon: ArrowDownRight,
        color: "bg-rose-50 text-rose-700 border-rose-100",
        iconBg: "bg-rose-100",
      },
      {
        title: "صافي الصندوق",
        value: formatDualCurrency(
          totalIncomeUSD - totalExpensesUSD,
          totalIncomeSYP - totalExpensesSYP,
        ),
        icon: Wallet,
        trendIcon: ArrowUpRight,
        color: "bg-sky-50 text-sky-700 border-sky-100",
        iconBg: "bg-sky-100",
      },
      {
        title: "العملاء",
        value: customersCount,
        icon: Users,
        trendIcon: ArrowUpRight,
        color: "bg-violet-50 text-violet-700 border-violet-100",
        iconBg: "bg-violet-100",
      },
      {
        title: "المنتجات",
        value: productsCount,
        icon: Package,
        trendIcon: ArrowUpRight,
        color: "bg-amber-50 text-amber-700 border-amber-100",
        iconBg: "bg-amber-100",
      },
      {
        title: "الفواتير",
        value: salesCount,
        icon: FileText,
        trendIcon: ArrowUpRight,
        color: "bg-slate-50 text-slate-700 border-slate-100",
        iconBg: "bg-slate-100",
      },
    ];
  }, [customers, payments, products, sells]);

  const lastOperations = useMemo(() => {
    const paymentOperations = (payments || []).map((payment: any) => ({
      id: payment.id || `${payment.type}-${payment.date}`,
      label:
        payment.type === "expense"
          ? "مصروف"
          : payment.type === "income"
            ? "قبض من عميل"
            : "دفعة",
      amount: Math.abs(toNumber(payment.amountUSD ?? payment.amount)),
      amountSYP: Math.abs(toNumber(payment.amountSYP)),
      sign: payment.type === "expense" ? -1 : 1,
      date: payment.date || "",
    }));

    const sellOperations = (sells || []).map((sell: any) => ({
      id: sell.id ?? `sell-${sell.date}`,
      label: "فاتورة بيع",
      amount: toNumber(sell.totalUSD ?? sell.totalPrice),
      amountSYP: toNumber(sell.totalSYP),
      sign: 1,
      date: sell.date || "",
    }));

    return [...paymentOperations, ...sellOperations]
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      )
      .slice(0, 4);
  }, [payments, sells]);

  const quickActions = [
    {
      title: "إضافة فاتورة",
      icon: Receipt,
      path: "/sellProduct",
      className: "from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600",
    },
    {
      title: "إضافة قبض",
      icon: Banknote,
      path: "/financialStatement",
      className:
        "from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600",
    },
    {
      title: "إضافة مصروف",
      icon: Plus,
      path: "/financialStatement",
      className: "from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600",
    },
    {
      title: "تقرير اليوم",
      icon: BarChart3,
      path: "/dashboard",
      className:
        "from-slate-800 to-slate-600 hover:from-slate-900 hover:to-slate-700",
    },
  ];

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="min-h-screen rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6"
      >
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-sm font-medium text-slate-500 shadow-sm">
              نظام المحاسبة
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">
              لوحة التحكم
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
              أهلاً بك، يمكنك متابعة ملخص المبيعات والمصاريف والعمليات من هنا.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 px-5 py-3 text-sm text-slate-500 shadow-sm backdrop-blur-xl">
            {new Date().toLocaleDateString("ar-SY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item, index) => {
            const Icon = item.icon;
            const TrendIcon = item.trendIcon;

            return (
              <div
                key={index}
                className="group rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>

                    {loading ? (
                      <div className="mt-3 h-8 w-28 animate-pulse rounded-xl bg-slate-200" />
                    ) : (
                      <h2 className="mt-2 text-2xl font-black text-slate-800">
                        {item.value}
                      </h2>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl border p-4 shadow-inner ${item.color}`}
                  >
                    <Icon size={30} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className={`rounded-full p-1 ${item.iconBg}`}>
                    <TrendIcon size={14} />
                  </span>
                  <span>تحديث تلقائي من بيانات النظام</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  آخر العمليات
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  أحدث عمليات البيع والقبض والمصاريف
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                <FileText size={22} />
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    </div>
                    <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
                  </div>
                ))
              ) : lastOperations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  لا توجد عمليات حتى الآن.
                </div>
              ) : (
                lastOperations.map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition hover:bg-slate-50 hover:shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {operation.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {operation.date || "بدون تاريخ"}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-black ${
                        operation.sign > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {operation.sign > 0 ? "+" : "-"}
                      {formatDualCurrency(operation.amount, operation.amountSYP)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  اختصارات سريعة
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  نفّذ العمليات الأساسية بسرعة
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                <BarChart3 size={22} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigate(action.path)}
                    className={`group flex items-center justify-between rounded-2xl bg-gradient-to-br px-4 py-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] ${action.className}`}
                  >
                    <span className="font-bold">{action.title}</span>

                    <span className="rounded-xl bg-white/20 p-2 transition group-hover:bg-white/30">
                      <Icon size={22} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-700">ملاحظة</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                جميع الأرقام يتم حسابها من بيانات المنتجات، المبيعات، العملاء
                والدفعات الموجودة في النظام.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
