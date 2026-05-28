import { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-glass">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Start your free trial</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your RelationIQ workspace in 30 seconds
            </p>
          </div>

          <Suspense fallback={<div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />}>
          <RegisterForm />
        </Suspense>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
