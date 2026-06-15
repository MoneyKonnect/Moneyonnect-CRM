import { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-glass">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a new password for your account.
            </p>
          </div>

          <Suspense fallback={<div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
