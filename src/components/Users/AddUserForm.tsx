import { ReactNode, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  allPagePermissions,
  AppPermission,
  assignablePagePermissions,
  getUserPermissions,
} from "@/config/permissions";
import {
  addUser,
  InventoryUserRecord,
  updateUser,
} from "@/services/users";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PopupForm from "@/components/ui/custom/PopupForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddUserFormProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  user?: InventoryUserRecord | null;
  trigger?: ReactNode;
}

const defaultUserPermissions: AppPermission[] = [
  "home",
  "dashboard",
  "products",
];
const defaultDriverPermissions: AppPermission[] = ["driver-sales"];

const normalizeFormPermissions = (user?: InventoryUserRecord | null) => {
  const permissions = getUserPermissions(user || null);

  return permissions.filter((permission): permission is AppPermission =>
    allPagePermissions.includes(permission as AppPermission),
  );
};

export default function AddUserForm({
  isOpen,
  setIsOpen,
  user,
  trigger,
}: AddUserFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(user);
  const userId = user?.id || user?._id || user?.username || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [permissions, setPermissions] = useState<AppPermission[]>(
    defaultUserPermissions,
  );

  const selectedPermissions = role === "admin" ? allPagePermissions : permissions;

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole("user");
    setPermissions(defaultUserPermissions);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!user) {
      resetForm();
      return;
    }

    setUsername(user.username || "");
    setPassword("");
    setRole(user.role || "user");
    setPermissions(
      user.role === "admin"
        ? allPagePermissions
        : normalizeFormPermissions(user),
    );
  }, [isOpen, user]);

  const addUserMutation = useMutation({
    mutationFn: addUser,
    onSuccess: () => {
      toast.success("تمت إضافة المستخدم بنجاح");
      resetForm();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-table"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إضافة المستخدم");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (payload: {
      role: string;
      permissions: AppPermission[];
      password?: string;
    }) => updateUser(userId, payload),
    onSuccess: () => {
      toast.success("تم تعديل المستخدم بنجاح");
      resetForm();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-table"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء تعديل المستخدم");
    },
  });

  const handleRoleChange = (nextRole: string) => {
    setRole(nextRole);

    if (nextRole === "admin") {
      setPermissions(allPagePermissions);
      return;
    }

    if (nextRole === "driver") {
      setPermissions(defaultDriverPermissions);
      return;
    }

    if (role === "admin") {
      setPermissions(defaultUserPermissions);
    }
  };

  const togglePermission = (permission: AppPermission, checked: boolean) => {
    setPermissions((current) =>
      checked
        ? Array.from(new Set([...current, permission]))
        : current.filter((item) => item !== permission),
    );
  };

  const selectAll = () => setPermissions(allPagePermissions);
  const clearAll = () => setPermissions([]);
  const isPending = addUserMutation.isPending || updateUserMutation.isPending;

  return (
    <PopupForm
      title={isEditing ? "تعديل مستخدم" : "إضافة مستخدم"}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        trigger || (
          <Button type="button" className="w-full">
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </Button>
        )
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();

          if (!username.trim()) {
            toast.error("يرجى إدخال اسم المستخدم");
            return;
          }

          if (!isEditing && !password.trim()) {
            toast.error("يرجى إدخال كلمة المرور");
            return;
          }

          if (role !== "admin" && selectedPermissions.length === 0) {
            toast.error("يرجى تحديد صفحة واحدة على الأقل");
            return;
          }

          if (isEditing) {
            const payload: {
              role: string;
              permissions: AppPermission[];
              password?: string;
            } = {
              role,
              permissions: selectedPermissions,
            };

            if (password.trim()) {
              payload.password = password;
            }

            updateUserMutation.mutate(payload);
            return;
          }

          addUserMutation.mutate({
            username: username.trim(),
            password,
            role,
            permissions: selectedPermissions,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="user-username">اسم المستخدم</Label>
          <Input
            id="user-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            disabled={isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-password">
            {isEditing ? "كلمة المرور الجديدة" : "كلمة المرور"}
          </Label>
          <Input
            id="user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={isEditing ? "اتركها فارغة إذا لا تريد تغييرها" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label>الدور</Label>
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>الصفحات المسموحة</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                سيتم إظهار هذه الصفحات فقط للمستخدم بعد تسجيل الدخول.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={role === "admin"}
              >
                <CheckCheck className="h-4 w-4" />
                الكل
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={role === "admin"}
              >
                <XCircle className="h-4 w-4" />
                مسح
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {assignablePagePermissions.map((item) => (
              <label
                key={item.permission}
                htmlFor={`permission-${item.permission}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition hover:bg-accent"
              >
                <Checkbox
                  id={`permission-${item.permission}`}
                  checked={selectedPermissions.includes(item.permission)}
                  disabled={role === "admin"}
                  onCheckedChange={(checked) =>
                    togglePermission(item.permission, checked === true)
                  }
                />
                <span className="truncate">{item.name}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isPending}
          disabled={isPending}
        >
          {isEditing ? "حفظ التعديل" : "إضافة"}
        </Button>
      </form>
    </PopupForm>
  );
}
