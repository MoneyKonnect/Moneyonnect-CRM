"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveRiskProfile } from "@/actions/intelligence";

const RISK_QUESTIONS = [
  {
    id: "q1",
    question: "What is your primary investment objective?",
    weight: 10,
    options: [
      { label: "Preserve capital — I cannot afford to lose money", score: 5 },
      { label: "Generate steady income with minimal risk", score: 15 },
      { label: "Balance between growth and stability", score: 25 },
      { label: "Grow my wealth over time, willing to accept volatility", score: 35 },
      { label: "Maximum growth — I can handle significant ups and downs", score: 45 },
    ],
  },
  {
    id: "q2",
    question: "If your investment fell 20% in a month, what would you do?",
    weight: 15,
    options: [
      { label: "Sell everything immediately to stop further losses", score: 5 },
      { label: "Sell some to reduce exposure", score: 15 },
      { label: "Hold and wait for recovery", score: 25 },
      { label: "Hold and review after 3 months", score: 35 },
      { label: "Buy more — this is a great opportunity", score: 45 },
    ],
  },
  {
    id: "q3",
    question: "What is your investment time horizon?",
    weight: 10,
    options: [
      { label: "Less than 1 year", score: 5 },
      { label: "1–3 years", score: 15 },
      { label: "3–5 years", score: 25 },
      { label: "5–10 years", score: 35 },
      { label: "More than 10 years", score: 45 },
    ],
  },
  {
    id: "q4",
    question: "What percentage of your monthly income do you save or invest?",
    weight: 10,
    options: [
      { label: "Less than 5%", score: 5 },
      { label: "5–10%", score: 15 },
      { label: "10–20%", score: 25 },
      { label: "20–30%", score: 35 },
      { label: "More than 30%", score: 45 },
    ],
  },
  {
    id: "q5",
    question: "How would you describe your current financial situation?",
    weight: 10,
    options: [
      { label: "I have significant debts and limited savings", score: 5 },
      { label: "I have some debts but manageable savings", score: 15 },
      { label: "I have minimal debt and a reasonable emergency fund", score: 25 },
      { label: "I am debt-free with solid savings and emergency fund", score: 35 },
      { label: "I am financially very secure with multiple income sources", score: 45 },
    ],
  },
  {
    id: "q6",
    question: "How much investment experience do you have?",
    weight: 10,
    options: [
      { label: "None — I am new to investing", score: 5 },
      { label: "FD and savings accounts only", score: 15 },
      { label: "Some mutual funds and bonds", score: 25 },
      { label: "Experienced with equity mutual funds and stocks", score: 35 },
      { label: "Advanced — options, futures, PMS, AIF", score: 45 },
    ],
  },
  {
    id: "q7",
    question: "What best describes your reaction to market news?",
    weight: 5,
    options: [
      { label: "I panic and want to withdraw everything", score: 5 },
      { label: "I get worried and reduce exposure", score: 15 },
      { label: "I monitor but stay put", score: 25 },
      { label: "I stay calm — markets recover", score: 35 },
      { label: "I look for buying opportunities", score: 45 },
    ],
  },
];

const RISK_RESULTS = {
  CONSERVATIVE: {
    label: "Conservative",
    emoji: "🛡️",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    description: "You prioritize capital preservation over growth. Suitable products: FD, SCSS, Debt funds, Government bonds.",
    allocation: { equity: 10, debt: 70, gold: 10, liquid: 10 },
  },
  MODERATE: {
    label: "Moderate",
    emoji: "⚖️",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    description: "You seek balance between growth and stability. Suitable: Balanced funds, Hybrid funds, Large-cap equity, Debt mix.",
    allocation: { equity: 40, debt: 40, gold: 10, liquid: 10 },
  },
  AGGRESSIVE: {
    label: "Aggressive",
    emoji: "🚀",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    description: "You can tolerate volatility for higher long-term returns. Suitable: Equity funds, Mid-cap, ELSS, PMS consideration.",
    allocation: { equity: 70, debt: 15, gold: 5, liquid: 10 },
  },
  VERY_AGGRESSIVE: {
    label: "Very Aggressive",
    emoji: "⚡",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    description: "Maximum growth focus with high risk tolerance. Suitable: Small-cap, Thematic, Sectoral funds, Direct equity, AIF.",
    allocation: { equity: 85, debt: 5, gold: 5, liquid: 5 },
  },
};

interface RiskProfileQuizProps {
  clientId: string;
  clientName: string;
  existingProfile?: any;
  onComplete?: () => void;
}

export function RiskProfileQuiz({ clientId, clientName, existingProfile, onComplete }: RiskProfileQuizProps) {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<string | null>(existingProfile?.riskResult || null);
  const [totalScore, setTotalScore] = useState(existingProfile?.score || 0);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"quiz" | "result">(existingProfile ? "result" : "quiz");

  const question = RISK_QUESTIONS[currentQ];
  const totalQuestions = RISK_QUESTIONS.length;
  const progress = ((currentQ) / totalQuestions) * 100;

  const selectAnswer = (optionScore: number, optionLabel: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: { score: optionScore, label: optionLabel, question: question.question } }));
  };

  const nextQuestion = () => {
    if (currentQ < totalQuestions - 1) setCurrentQ(q => q + 1);
    else submitQuiz();
  };

  const prevQuestion = () => { if (currentQ > 0) setCurrentQ(q => q - 1); };

  const submitQuiz = async () => {
    const score = Math.round(Object.values(answers).reduce((sum, a: any) => sum + a.score, 0) / totalQuestions);
    let riskResult: string;
    if (score <= 15) riskResult = "CONSERVATIVE";
    else if (score <= 25) riskResult = "MODERATE";
    else if (score <= 35) riskResult = "AGGRESSIVE";
    else riskResult = "VERY_AGGRESSIVE";

    setSaving(true);
    const res = await saveRiskProfile(clientId, answers, score);
    if (res.success) {
      setResult(riskResult);
      setTotalScore(score);
      setMode("result");
      toast.success("Risk profile saved!");
      router.refresh();
      onComplete?.();
    } else toast.error("Failed to save risk profile");
    setSaving(false);
  };

  const reset = () => {
    setAnswers({});
    setCurrentQ(0);
    setMode("quiz");
    setResult(null);
  };

  if (mode === "result" && result) {
    const cfg = RISK_RESULTS[result as keyof typeof RISK_RESULTS];
    return (
      <div className={cn("rounded-xl border-2 p-6 space-y-4", cfg.border, cfg.bg)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{cfg.emoji}</span>
              <div>
                <p className="text-lg font-bold text-foreground">{cfg.label} Investor</p>
                <p className="text-xs text-muted-foreground">Score: {totalScore}/45</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{cfg.description}</p>
          </div>
          <button onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Allocation chart */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Allocation</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {[
              { label: "Equity", value: cfg.allocation.equity, color: "bg-brand-500" },
              { label: "Debt", value: cfg.allocation.debt, color: "bg-blue-500" },
              { label: "Gold", value: cfg.allocation.gold, color: "bg-amber-500" },
              { label: "Liquid", value: cfg.allocation.liquid, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
            ))}
          </div>
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "Equity", value: cfg.allocation.equity, color: "bg-brand-500" },
              { label: "Debt", value: cfg.allocation.debt, color: "bg-blue-500" },
              { label: "Gold", value: cfg.allocation.gold, color: "bg-amber-500" },
              { label: "Liquid", value: cfg.allocation.liquid, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                <span className="text-xs text-muted-foreground">{item.label}: <strong>{item.value}%</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedAnswer = answers[question?.id];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-400" />
            <p className="text-sm font-semibold text-foreground">Risk Profile — {clientName}</p>
          </div>
          <span className="text-xs text-muted-foreground">{currentQ + 1} / {totalQuestions}</span>
        </div>

        {/* Question */}
        <p className="text-base font-medium text-foreground leading-relaxed">{question?.question}</p>

        {/* Options */}
        <div className="space-y-2">
          {question?.options.map((option) => {
            const isSelected = selectedAnswer?.score === option.score;
            return (
              <button
                key={option.score}
                onClick={() => selectAnswer(option.score, option.label)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm",
                  isSelected
                    ? "border-brand-500 bg-brand-500/10 text-foreground font-medium"
                    : "border-border hover:border-brand-500/40 hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                    isSelected ? "border-brand-500 bg-brand-500" : "border-muted-foreground/40"
                  )}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  {option.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={prevQuestion} disabled={currentQ === 0}>
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Button
            size="sm"
            className="h-8 bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
            onClick={nextQuestion}
            disabled={!selectedAnswer || saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : currentQ === totalQuestions - 1 ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Submit</>
            ) : (
              <>Next <ChevronRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
