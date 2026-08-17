// src/pages/SignUp.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async () => {
    // حفظ البيانات في قاعدة بيانات أو API
    toast.success("Account created!");
    navigate("/login");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 px-3 py-6 dark:bg-gray-900 sm:px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-8">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        <Input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <Button className="w-full" onClick={handleSignUp}>Create Account</Button>
      </div>
    </div>
  );
}
