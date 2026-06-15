import { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-glass">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>
          </div>

          <Suspense fallback={<div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
