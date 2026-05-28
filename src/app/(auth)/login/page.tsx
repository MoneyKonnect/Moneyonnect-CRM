import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your RelationIQ account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-purple-950 flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-purple-500/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Logo className="text-white" size="lg" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Testimonial cards */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 border-white/10 bg-white/5 backdrop-blur-lg">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  AK
                </div>
                <div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    "RelationIQ transformed how I manage my 400+ client relationships. The NRI tracking alone saves me 5 hours a week."
                  </p>
                  <p className="text-white/50 text-xs mt-2">Arjun Kumar — Wealth Advisor, Mumbai</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 border-white/10 bg-white/5 backdrop-blur-lg ml-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  PS
                </div>
                <div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    "The pipeline view and automated follow-ups increased my conversion rate by 40%. Incredible product."
                  </p>
                  <p className="text-white/50 text-xs mt-2">Priya Sharma — Financial Planner, Delhi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "2,400+", label: "Advisors" },
              { value: "₹12K Cr", label: "AUM tracked" },
              { value: "98%", label: "Satisfaction" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-white/50 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">
            © 2024 RelationIQ. Built for financial professionals.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sign in to your RelationIQ account
            </p>
          </div>

          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <LoginForm />
        </Suspense>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Start free trial
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
