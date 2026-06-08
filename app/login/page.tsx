import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-lg shadow-brand-200">
            🍡
          </div>
          <h1 className="text-2xl font-bold text-brand-900">Marshmallow CRM</h1>
          <p className="mt-1 text-sm text-brand-700/70">
            Sign in to manage your customers
          </p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>

        <div className="mt-6 rounded-lg bg-brand-100/60 p-4 text-xs text-brand-800">
          <p className="font-semibold">Demo logins</p>
          <p className="mt-1">Owner — owner@marshmallow.crm / owner123</p>
          <p>Employee — employee@marshmallow.crm / staff123</p>
        </div>
      </div>
    </div>
  );
}
