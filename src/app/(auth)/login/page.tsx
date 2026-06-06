import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign In — MoneyKonnect CRM",
  description: "Sign in to MoneyKonnect CRM",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0f0f1a" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-14">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Purple glow top right */}
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
            style={{ backgroundColor: "#7c3aed" }} />
          {/* Teal glow bottom left */}
          <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
            style={{ backgroundColor: "#3fd1b8" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px"
            }} />
          {/* Wave/mesh SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3fd1b8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path d="M0,300 C200,200 400,400 600,250 C700,180 750,300 800,280 L800,600 L0,600 Z"
              fill="url(#wave1)" opacity="0.3" />
            <path d="M0,400 C150,300 350,500 550,350 C680,270 750,380 800,360 L800,600 L0,600 Z"
              fill="url(#wave1)" opacity="0.15" />
            {/* Mesh lines */}
            {[0,1,2,3,4].map(i => (
              <line key={i} x1={i*200} y1="0" x2={i*200+100} y2="600"
                stroke="#3fd1b8" strokeWidth="0.5" opacity="0.3" />
            ))}
            {[0,1,2,3].map(i => (
              <line key={i} x1="0" y1={i*150+50} x2="800" y2={i*150+100}
                stroke="#7c3aed" strokeWidth="0.5" opacity="0.2" />
            ))}
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
            <Image src="/mk-logo.jpeg" alt="MoneyKonnect" width={40} height={40} />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight">MoneyKonnect</p>
            <p className="text-xs" style={{ color: "#3fd1b8" }}>CRM Platform</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
            style={{ borderColor: "#3fd1b8", color: "#3fd1b8", backgroundColor: "rgba(63,209,184,0.08)" }}>
            Simplify. Systematize. Scale.
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white leading-tight">
              One CRM.<br />
              <span style={{ color: "#3fd1b8" }}>Endless</span><br />
              possibilities.
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mt-4">
              All the tools you need to manage relationships, drive growth, and stay ahead.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { title: "Unified Database", desc: "One source of truth for all your clients." },
              { title: "Smart Automation", desc: "Save time and focus on what matters." },
              { title: "Actionable Insights", desc: "Make data-driven decisions with ease." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(63,209,184,0.1)", border: "1px solid rgba(63,209,184,0.2)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3fd1b8" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: "862+", label: "Clients" },
              { value: "₹439Cr", label: "AUM Tracked" },
              { value: "99.9%", label: "Uptime" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center border"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">© 2025 MoneyKonnect CRM by Tayal Capital. Internal use only.</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle right panel bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 blur-[80px]"
            style={{ backgroundColor: "#3fd1b8" }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Image src="/mk-logo.jpeg" alt="MoneyKonnect" width={36} height={36} className="rounded-xl" />
            <p className="font-bold text-white">MoneyKonnect CRM</p>
          </div>

          {/* Login card */}
          <div className="rounded-2xl p-8 border"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.4)"
            }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-white/40 mt-1.5 text-sm">Sign in to MoneyKonnect CRM</p>
            </div>

            <Suspense fallback={
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#3fd1b8", borderTopColor: "transparent" }} />
              </div>
            }>
              <LoginForm />
            </Suspense>

            {/* Security badges */}
            <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-3 gap-2">
              {[
                { label: "Bank-grade Security" },
                { label: "Encrypted Client Data" },
                { label: "Role-based Access" },
              ].map((b) => (
                <div key={b.label} className="text-center">
                  <p className="text-2xs text-white/25 leading-tight">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
