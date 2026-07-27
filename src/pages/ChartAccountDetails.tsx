import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/ui/custom/Loading";
import { useGetAccountDetails } from "@/hooks/useAccount";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const accountColumns = [
  { key: "name", label: "الحقل" },
  { key: "value", label: "القيمة" },
];

const paymentsColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "amount", label: "المبلغ", sortable: true },
  { key: "amountUSD", label: "USD", sortable: true },
  { key: "amountSYP", label: "SYP", sortable: true },
  { key: "amountOriginal", label: "المبلغ الأصلي", sortable: true },
  { key: "currency", label: "العملة", sortable: true },
  { key: "date", label: "التاريخ", sortable: true },
  { key: "note", label: "الملاحظات", sortable: true },
  { key: "type", label: "النوع", sortable: true },
];

const purchasesColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "name", label: "المادة", sortable: true },
  { key: "code", label: "الكود", sortable: true },
  { key: "quantity", label: "الكمية", sortable: true },
  { key: "totalPrice", label: "الإجمالي", sortable: true },
  { key: "paymentStatus", label: "حالة الدفع", sortable: true },
  { key: "date", label: "التاريخ", sortable: true },
];

const sellsColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "customerId", label: "الزبون", sortable: true },
  { key: "totalPrice", label: "الإجمالي", sortable: true },
  { key: "paymentStatus", label: "حالة الدفع", sortable: true },
  { key: "remainingDebt", label: "المتبقي", sortable: true },
  { key: "currency", label: "العملة", sortable: true },
  { key: "date", label: "التاريخ", sortable: true },
];

const customersColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "name", label: "الاسم", sortable: true },
  { key: "phone", label: "الهاتف", sortable: true },
  { key: "address", label: "العنوان", sortable: true },
];

const suppliersColumns = [
  { key: "id", label: "المعرف", hidden: true },
  { key: "name", label: "الاسم", sortable: true },
  { key: "phone", label: "الهاتف", sortable: true },
  { key: "address", label: "العنوان", sortable: true },
];

const labelMap: Record<string, string> = {
  id: "المعرف",
  name: "الاسم",
  code: "الرمز",
  type: "النوع",
  category: "الفئة",
  openingBalance: "الرصيد الافتتاحي",
  currentBalance: "الرصيد الحالي",
  openingBalanceUSD: "الرصيد الافتتاحي USD",
  openingBalanceSYP: "الرصيد الافتتاحي SYP",
  currentBalanceUSD: "الرصيد الحالي USD",
  currentBalanceSYP: "الرصيد الحالي SYP",
  currency: "العملة",
  description: "الوصف",
  createdAt: "تاريخ الإنشاء",
  updatedAt: "آخر تحديث",
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ChartAccountDetails() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { data, isLoading, error } = useGetAccountDetails(id);

  const account = data?.account ?? data?.data?.account ?? null;
  const relatedData = data?.relatedData ?? data?.data?.relatedData ?? {};

  const accountInfo = account
    ? Object.entries(account).map(([key, value]) => ({
        name: labelMap[key] || key,
        value: formatValue(value),
      }))
    : [];

  const payments = Array.isArray(relatedData.payments) ? relatedData.payments : [];
  const purchases = Array.isArray(relatedData.purchases) ? relatedData.purchases : [];
  const sells = Array.isArray(relatedData.sells) ? relatedData.sells : [];
  const customers = Array.isArray(relatedData.customers) ? relatedData.customers : [];
  const suppliers = Array.isArray(relatedData.suppliers) ? relatedData.suppliers : [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <Loading />
      </DashboardLayout>
    );
  }

  if (error || !account) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              رجوع
            </Button>
            <CardTitle>تفاصيل الحساب</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            تعذر جلب تفاصيل الحساب.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">تفاصيل الحساب</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              title="البيانات الأساسية"
              columns={accountColumns}
              data={accountInfo}
              searchable={false}
              defaultPageSize={accountInfo.length || 10}
              pageSizeOptions={[10, 20, 50]}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DataTable
            className="w-full"
            title="الدفعات المرتبطة"
            columns={paymentsColumns}
            data={payments}
          />

          <DataTable
            className="w-full"
            title="المشتريات المرتبطة"
            columns={purchasesColumns}
            data={purchases}
          />

          <DataTable
            className="w-full"
            title="المبيعات المرتبطة"
            columns={sellsColumns}
            data={sells}
          />

          <DataTable
            className="w-full"
            title="العملاء المرتبطون"
            columns={customersColumns}
            data={customers}
          />

          <DataTable
            className="w-full xl:col-span-2"
            title="الموردون المرتبطون"
            columns={suppliersColumns}
            data={suppliers}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
