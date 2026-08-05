import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddUserForm from "@/components/Users/AddUserForm";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TrialTenantsPanel from "@/components/Trials/TrialTenantsPanel";
import { Button } from "@/components/ui/button";
import ConfirmForm from "@/components/ui/custom/ConfirmForm";
import {
  assignablePagePermissions,
  getUserPermissions,
} from "@/config/permissions";
import {
  deleteUser,
  getAllUsers,
  InventoryUserRecord,
} from "@/services/users";

function formatPermissions(user: InventoryUserRecord, labels: Map<string, string>) {
  if (user.role === "admin") return "كل الصفحات";

  const permissions = getUserPermissions(user);

  if (permissions.length === 0) return "لا توجد صفحات";

  return permissions.map((permission) => labels.get(permission) || permission).join(", ");
}

function getStoredUsername() {
  try {
    const storedUser = localStorage.getItem("InventoryUser");
    const user = storedUser ? JSON.parse(storedUser) : null;

    return user?.username || "";
  } catch {
    return "";
  }
}

function getStoredTenantId() {
  try {
    const storedUser = localStorage.getItem("InventoryUser");
    const user = storedUser ? JSON.parse(storedUser) : null;

    return (
      user?.tenantId ||
      user?.companyCode ||
      localStorage.getItem("InventoryTenantId") ||
      "default"
    );
  } catch {
    return localStorage.getItem("InventoryTenantId") || "default";
  }
}

export default function Users() {
  const queryClient = useQueryClient();
  const [addIsOpen, setAddIsOpen] = useState(false);
  const [editIsOpen, setEditIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InventoryUserRecord | null>(
    null,
  );
  const currentUsername = getStoredUsername();
  const currentTenantId = getStoredTenantId();
  const canManageTrials =
    currentUsername === "and" && currentTenantId === "default";

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users-table"],
    queryFn: getAllUsers,
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["users-table"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء حذف المستخدم");
    },
  });

  const permissionLabels = useMemo(
    () =>
      new Map(
        assignablePagePermissions.map((item) => [
          item.permission,
          item.name,
        ]),
      ),
    [],
  );

  const userRows = useMemo(
    () =>
      users.map((user) => ({
        id: user.id || user._id || user.username,
        username: user.username,
        role: user.role,
        permissionsSummary: formatPermissions(user, permissionLabels),
        createdAt: user.createdAt || "",
        originalUser: user,
      })),
    [permissionLabels, users],
  );

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users],
  );

  const userColumns = [
    { key: "id", label: "المعرف", sortable: true, hidden: true },
    { key: "username", label: "اسم المستخدم", sortable: true },
    { key: "role", label: "الدور", sortable: true },
    { key: "permissionsSummary", label: "الصفحات", sortable: true },
    { key: "createdAt", label: "تاريخ الإنشاء", sortable: true },
  ];

  return (
    <DashboardLayout>
      {canManageTrials ? <TrialTenantsPanel /> : null}

      <DataTable
        title="المستخدمون"
        description={
          isError
            ? "تعذر جلب المستخدمين. تأكد من توفر endpoint /api/users في السيرفر."
            : "إدارة المستخدمين وتعديل الصفحات وكلمات المرور."
        }
        titleButton={
          <AddUserForm isOpen={addIsOpen} setIsOpen={setAddIsOpen} />
        }
        columns={userColumns}
        data={userRows}
        isLoading={isLoading}
        defaultPageSize={10}
        renderRowActions={(row) => {
          const rowUser = row.originalUser as InventoryUserRecord;
          const isCurrentUser = row.username === currentUsername;
          const isLastAdmin = row.role === "admin" && adminCount <= 1;
          const deleteDisabled = isCurrentUser || isLastAdmin;

          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedUser(rowUser);
                  setEditIsOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                تعديل
              </Button>

              <ConfirmForm
                title="حذف المستخدم"
                description={
                  deleteDisabled
                    ? "لا يمكن حذف هذا المستخدم."
                    : `هل تريد حذف المستخدم ${row.username}؟`
                }
                confirmText="حذف"
                disabled={deleteDisabled}
                loading={deleteUserMutation.isPending}
                onConfirm={() => deleteUserMutation.mutate(row.id)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteDisabled}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                }
              />
            </div>
          );
        }}
      />

      <AddUserForm
        isOpen={editIsOpen}
        setIsOpen={(value) => {
          setEditIsOpen(value);

          if (!value) {
            setSelectedUser(null);
          }
        }}
        user={selectedUser}
        trigger={<span className="hidden" />}
      />
    </DashboardLayout>
  );
}
