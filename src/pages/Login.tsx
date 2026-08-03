// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import userLogin from "@/services/auth";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";
import { getFirstAccessibleNavigationPath } from "@/config/permissions";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    try {
      setLoading(true);

      const res = await userLogin({ username, password });

      if (res?.user) {
        localStorage.setItem("InventoryUser", JSON.stringify(res.user));
        const token = res?.token || res?.accessToken || res?.user?.token;

        if (token) {
          localStorage.setItem("auth_token", token);
        } else {
          localStorage.removeItem("auth_token");
        }

        navigate(getFirstAccessibleNavigationPath(res.user), { replace: true });
        toast.success("تم تسجيل الدخول بنجاح");
      } else {
        toast.error(res?.error || "فشل تسجيل الدخول");
      }
    } catch (error) {
      toast.error((error as Error)?.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-200 to-gray-100 px-4">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/20 space-y-6 transition-all duration-300">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Daher-Net
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            تسجيل الدخول إلى حسابك
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-9 h-11 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
            size="lg"
            variant="accent"
          >
            تسجيل الدخول
          </Button>
        </form>

        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} Inventory Management System
        </div>
      </Card>
    </div>
  );
}
