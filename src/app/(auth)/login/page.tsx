import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your RelationIQ account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col justify-between p-12" style={{ backgroundColor: "#231f20" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "32px 32px" }}
          />
        </div>

        <div className="relative z-10">
          <Logo className="text-white" size="lg" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Your clients.<br />Your relationships.<br />Your growth.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              RelationIQ is the CRM built exclusively for MoneyKonnect financial advisors. Manage leads, track investments, and grow your book of business.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { value: "NRI Focus", label: "Built for NRI advisory" },
              { value: "Secure", label: "Enterprise grade" },
              { value: "Fast", label: "Optimized for India" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-sm font-semibold text-white">{stat.value}</div>
                <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">© 2024 RelationIQ by MoneyKonnect. Internal use only.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">Sign in to your RelationIQ account</p>
          </div>

          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
