import { ChartContainer } from "@/components/dashboard/ChartContainer";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatsCard } from "@/components/dashboard/StatsCard";
import AddBalanceForm from "@/components/FinancialStatement/AddBalanceForm";
import TakeBalanceForm from "@/components/FinancialStatement/TakeBalanceForm";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CardHeader, Card, CardContent } from "@/components/ui/card";
import getAllCustomer from "@/services/customer";
import { getPaymentsByMonth } from "@/services/payments";
import getAllProducts from "@/services/products";
import getAllSells from "@/services/sells";
import getAllSupplier from "@/services/supplier";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowDown, ArrowUp, Users } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenPay, setIsOpenPay] = useState(false);
  const [balanceDate, setBalanceDate] = useState<{
    month: string;
    year: string;
  }>({
    month: dayjs().format("M"),
    year: dayjs().format("YYYY"),
  });

  // ✅ Query Keys تشمل الشهر والسنة
  const { data: sells, isLoading: sellsLoading } = useQuery({
    queryKey: ["sells-table", balanceDate.month, balanceDate.year],
    queryFn: () => getAllSells(),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments-table", balanceDate.month, balanceDate.year],
    queryFn: () => getPaymentsByMonth(balanceDate),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products-table"],
    queryFn: getAllProducts,
  });

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ["supplier-table"],
    queryFn: getAllSupplier,
  });

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer-table"],
    queryFn: getAllCustomer,
  });

  const pieData = Object.values(products || {}).reduce(
    (acc: Record<string, number>, product: any) => {
      const warehouseName = product?.warehouse;
      const quantity = Number(product?.quantity || 0);

      if (!warehouseName) {
        return acc;
      }

      if (!acc[warehouseName]) acc[warehouseName] = 0;
      acc[warehouseName] += quantity;
      return acc;
    },
    {},
  );

  const pieChartData = Object.entries(pieData)
    ?.slice(0, 5)
    ?.map(([name, value]) => ({
      name,
      value,
    }));

  const groupedObject =
    payments?.reduce(
      (acc: Record<string, { income: number; expense: number }>, p) => {
        const day = dayjs(p.date).format("YYYY-MM-DD");

        if (!acc[day]) {
          acc[day] = { income: 0, expense: 0 };
        }

        const amount = Number(p.amountUSD ?? p.amount) || 0;

        if (amount >= 0) {
          acc[day].income += amount; // قبض
        } else {
          acc[day].expense += Math.abs(amount); // دفع
        }

        return acc;
      },
      {},
    ) || {};

  const groupedSorted = Object.entries(groupedObject)
    .map(([date, values]: any) => ({
      date,
      ...values,
    }))
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  const groupedSortedObject = groupedSorted.reduce(
    (acc, item) => {
      acc[item.date] = {
        income: item.income,
        expense: item.expense,
      };
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>,
  );

  // ✅ تحويلها لمصفوفة
  const chartData = Object.entries(
    groupedSortedObject as Record<string, { income: number; expense: number }>,
  ).map(([day, { income, expense }]) => ({
    day,
    income: Number(income.toFixed(3) || 0),
    expense: Number(expense.toFixed(3)) || 0,
  }));

  // ✅ supplierMap لتسريع البحث
  const supplierMap =
    supplier?.reduce((acc: Record<string, string>, s: any) => {
      acc[s.id] = s.name;
      return acc;
    }, {}) || {};

  const paymentsWithSupplier =
    payments?.map((p: any) => ({
      ...p,
      supplierName: supplierMap[p.supplierId] || "",
    })) || [];

  const paymentsColumns = [
    { label: "المعرف", key: "id", hidden: true },
    { label: "المبلغ", key: "amount" },
    { label: "الوصف", key: "note" },
    { label: "التاريخ", key: "date" },
    { label: "المورد", key: "supplierName" },
  ];

  const totalIncome = chartData?.reduce((sum, d) => sum + d.income, 0);
  const todayIncome = chartData
    ?.filter((d) => d.day === dayjs().format("YYYY-MM-DD"))
    .reduce((sum, d) => sum + d.income, 0);
  const totalExpense = chartData?.reduce((sum, d) => sum + d.expense, 0);
  const todayExpense = chartData
    ?.filter((d) => d.day === dayjs().format("YYYY-MM-DD"))
    .reduce((sum, d) => sum + d.expense, 0);
  const totalCustomerBalance = customer?.reduce((sum, d) => sum + d.balance, 0);

  // ✅ جلب آخر العمليات
  const lastPayments = [...(paymentsWithSupplier || [])].reverse().slice(0, 5);
  const lastCustomers = [...(customer || [])].reverse().slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div dir="rtl" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="">
            <StatsCard
              onClick={() => {}}
              title="إجمالي المقبوضات"
              description={`اليوم: ${todayIncome.toFixed(3)}`}
              value={totalIncome.toFixed(3) || 0}
              icon={ArrowDown}
              className="rounded-br-none"
              loading={paymentsLoading}
            />

            <AddBalanceForm
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              className="rounded-t-none"
            />
          </div>
          <div>
            <StatsCard
              onClick={() => {}}
              title="إجمالي المصروفات"
              description={`اليوم: ${todayExpense.toFixed(3)}`}
              value={totalExpense.toFixed(3) || 0}
              icon={ArrowUp}
              className="rounded-br-none"
              loading={paymentsLoading}
            />
            <TakeBalanceForm
              isOpen={isOpenPay}
              setIsOpen={setIsOpenPay}
              className="rounded-t-none"
            />
          </div>
          <StatsCard
            onClick={() => {}}
            title="إجمالي ارصدة العملاء"
            value={totalCustomerBalance || 0}
            icon={Users}
            loading={supplierLoading}
          />
        </div>
        {/* ✅ Chart */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <h2 className="font-bold text-2xl">الحركة المالية الشهرية</h2>
            {/* ✅ Date Filter */}
            <div className="my-4">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DemoContainer components={["DatePicker"]}>
                  <DatePicker
                    views={["month", "year"]}
                    value={dayjs(`${balanceDate.year}-${balanceDate.month}-01`)}
                    onChange={(newValue) => {
                      if (newValue) {
                        setBalanceDate({
                          month: newValue.format("M"),
                          year: newValue.format("YYYY"),
                        });
                      }
                    }}
                  />
                </DemoContainer>
              </LocalizationProvider>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartContainer
              title="المقبوضات و المصروفات"
              data={chartData ? (chartData as any[]) : []}
              type="area"
              dataKey="expense"
              dataKey2="income"
              dataName="day"
            />

            <ChartContainer
              title="توزيع المنتجات حسب المخازن"
              data={pieChartData ? (pieChartData as any[]) : []}
              type="pie"
              dataKey="value"
              desc={productsLoading ? "جاري التحميل..." : "بحسب الكميات الحالية"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-bold text-2xl">
              آخر العمليات المالية والمبيعات
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataTable
              title="آخر العمليات المالية"
              data={lastPayments}
              columns={paymentsColumns}
              defaultPageSize={5}
              pageSizeOptions={[5]}
              isLoading={paymentsLoading}
            />

            {/* <DataTable
              title="ابرز العملاء"
              data={lastCustomers.map((customer: any) => ({
                ...customer,
                products: customer.products?.length ?? 0,
              }))}
              columns={[
                { label: "المعرف", key: "id", hidden: true },
                { label: "الاسم", key: "name" },
                { label: "التاريخ", key: "date" },
                { label: "عدد المنتجات", key: "products" },
              ]}
              defaultPageSize={5}
              pageSizeOptions={[5]}
              isLoading={customerLoading}
            /> */}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
