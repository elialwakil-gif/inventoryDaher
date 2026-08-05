import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ConfirmForm from "@/components/ui/custom/ConfirmForm";
import { DataTable } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTrialTenant,
  deleteTrialTenant,
  getTrialTenants,
  type CreateTrialTenantResponse,
  type TrialTenantRecord,
} from "@/services/trials";

const DEFAULT_PASSWORD = "123123";

const toTenantId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatDate = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value || "-";

  return new Date(timestamp).toLocaleString("en-GB");
};

const getStatusLabel = (trial: TrialTenantRecord) => {
  const expiresTime = new Date(trial.expiresAt || "").getTime();
  const expired = Number.isFinite(expiresTime) && expiresTime <= Date.now();

  if (expired) return "منتهية";
  if (trial.status === "active") return "فعالة";
  return trial.status || "-";
};

const getRemainingDays = (expiresAt: string) => {
  const expiresTime = new Date(expiresAt || "").getTime();
  if (!Number.isFinite(expiresTime)) return "-";

  const days = Math.ceil((expiresTime - Date.now()) / (24 * 60 * 60 * 1000));
  return days > 0 ? `${days}` : "0";
};

export default function TrialTenantsPanel() {
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [durationDays, setDurationDays] = useState("14");
  const [createdTrial, setCreatedTrial] =
    useState<CreateTrialTenantResponse | null>(null);

  const {
    data: trials = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["trial-tenants"],
    queryFn: getTrialTenants,
  });

  const createMutation = useMutation({
    mutationFn: createTrialTenant,
    onSuccess: (data) => {
      setCreatedTrial(data);
      setCompanyName("");
      setUsername("");
      setPassword(DEFAULT_PASSWORD);
      setDurationDays("14");
      toast.success("تم إنشاء اليوزر التجريبي");
      queryClient.invalidateQueries({ queryKey: ["trial-tenants"] });
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrialTenant,
    onSuccess: () => {
      toast.success("تم حذف النسخة التجريبية");
      queryClient.invalidateQueries({ queryKey: ["trial-tenants"] });
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const rows = useMemo(
    () =>
      trials.map((trial) => ({
        id: trial.tenantId,
        companyName: trial.companyName,
        tenantId: trial.tenantId,
        adminUsername: trial.adminUsername,
        trialStatus: getStatusLabel(trial),
        remainingDays: getRemainingDays(trial.expiresAt),
        createdAt: trial.createdAt,
        expiresAt: formatDate(trial.expiresAt),
      })),
    [trials],
  );

  const columns = [
    { key: "companyName", label: "اسم الزبون", sortable: true },
    { key: "tenantId", label: "Tenant", sortable: true },
    { key: "adminUsername", label: "اسم الدخول", sortable: true },
    { key: "trialStatus", label: "الحالة", sortable: true },
    { key: "remainingDays", label: "أيام متبقية", sortable: true },
    { key: "createdAt", label: "تاريخ الإنشاء", sortable: true },
    { key: "expiresAt", label: "تاريخ الانتهاء", sortable: true },
  ];

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const tenantId = toTenantId(username);
    const trimmedCompanyName = companyName.trim() || tenantId;
    const trimmedPassword = password.trim() || DEFAULT_PASSWORD;
    const parsedDuration = Number(durationDays);

    if (!tenantId) {
      toast.error("يرجى إدخال اسم اليوزر التجريبي");
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      toast.error("مدة التجربة غير صحيحة");
      return;
    }

    createMutation.mutate({
      tenantId,
      companyCode: tenantId,
      companyName: trimmedCompanyName,
      username: tenantId,
      password: trimmedPassword,
      durationDays: Math.min(Math.ceil(parsedDuration), 90),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-lg">إضافة يوزر تجريبي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_160px_140px]"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="trial-company-name">اسم الزبون</Label>
              <Input
                id="trial-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Ammar Store"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial-username">اسم الدخول</Label>
              <Input
                id="trial-username"
                value={username}
                onChange={(event) => setUsername(toTenantId(event.target.value))}
                placeholder="ammar"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial-password">كلمة المرور</Label>
              <Input
                id="trial-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial-duration">الأيام</Label>
              <div className="flex gap-2">
                <Input
                  id="trial-duration"
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  className="min-w-0"
                />
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={createMutation.isPending}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  إضافة
                </Button>
              </div>
            </div>
          </form>

          {createdTrial ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
              <AlertTitle>بيانات الدخول الجديدة</AlertTitle>
              <AlertDescription>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <span className="block text-xs text-muted-foreground">
                      اسم الدخول
                    </span>
                    <strong dir="ltr" className="block truncate text-sm">
                      {createdTrial.username}
                    </strong>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <span className="block text-xs text-muted-foreground">
                      كلمة المرور
                    </span>
                    <strong dir="ltr" className="block truncate text-sm">
                      {createdTrial.password}
                    </strong>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <span className="block text-xs text-muted-foreground">
                      Tenant
                    </span>
                    <strong dir="ltr" className="block truncate text-sm">
                      {createdTrial.tenantId}
                    </strong>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    void copyText(
                      `username: ${createdTrial.username}\npassword: ${createdTrial.password}`,
                      "تم نسخ بيانات الدخول",
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  نسخ
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <DataTable
        title="اليوزرات التجريبية"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        defaultPageSize={5}
        titleButton={
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        }
        renderRowActions={(row) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                void copyText(
                  `username: ${row.adminUsername}\ntenant: ${row.tenantId}`,
                  "تم نسخ بيانات اليوزر",
                );
              }}
            >
              <Copy className="h-4 w-4" />
              نسخ الاسم
            </Button>
            <ConfirmForm
              title="حذف النسخة التجريبية"
              description={`هل تريد حذف بيانات ${row.tenantId}؟`}
              confirmText="حذف"
              loading={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(row.tenantId)}
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              }
            />
          </div>
        )}
      />
    </div>
  );
}
