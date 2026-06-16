"use client";

import { useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  Plus,
  HelpCircle,
  Menu,
  X,
  Heart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mock interactive calculator state for demo
  const [demoAmount, setDemoAmount] = useState("12.50");
  const [demoCategory, setDemoCategory] = useState("Coffee");
  const [demoExpenses, setDemoExpenses] = useState([
    { id: 1, amount: 4.25, category: "Snacks", date: "Just now" },
    { id: 2, amount: 15.0, category: "Transport", date: "2 mins ago" },
  ]);

  const handleAddDemoExpense = () => {
    if (!demoAmount || isNaN(Number(demoAmount))) return;
    setDemoExpenses([
      {
        id: Date.now(),
        amount: parseFloat(demoAmount),
        category: demoCategory,
        date: "Just now",
      },
      ...demoExpenses.slice(0, 2),
    ]);
    setDemoAmount("");
  };

  const features = [
    {
      icon: Wallet,
      title: "Smart Expense Tracking",
      description: "Quickly log cash-in and cash-out with tags, categories, and custom notes.",
    },
    {
      icon: TrendingUp,
      title: "Dynamic Budget Targets",
      description: "Set daily, monthly, or yearly spending caps to keep your savings on track.",
    },
    {
      icon: Calendar,
      title: "Streak Heatmaps",
      description: "Visualize your financial consistency day by day with custom habit heatmaps.",
    },
    {
      icon: ShieldCheck,
      title: "Offline-First Sync",
      description:
        "Your data stays stored locally and syncs automatically with Supabase secure cloud.",
    },
  ];

  const faqs = [
    {
      question: "Is SpendWise really free?",
      answer:
        "Yes! The core expense tracking, habit tracking, and database sync features are entirely free. No hidden costs.",
    },
    {
      question: "How does the offline mode work?",
      answer:
        "We store all your transactions locally on your device first. If you lose internet connection, you can keep logging data, and it will automatically reconcile once you are back online.",
    },
    {
      question: "Is my financial data secure?",
      answer:
        "Absolutely. We do not store bank logins or passwords. Your data is encrypted and synced directly to your personal Supabase instance.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-[120px] pointer-events-none" />

      {/* Floating Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">SpendWise</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#demo"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Interactive Demo
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setAuthOpen(true)}
              className="text-sm font-medium"
            >
              Log In
            </Button>
            <Button
              onClick={() => setAuthOpen(true)}
              className="rounded-xl font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-border/55 text-foreground hover:bg-muted focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-5 duration-200">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Interactive Demo
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              FAQ
            </a>
            <hr className="border-border/60" />
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthOpen(true);
                }}
                className="w-full rounded-xl"
              >
                Log In
              </Button>
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthOpen(true);
                }}
                className="w-full rounded-xl"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6 animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          Offline-First Personal Budgeting App
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl max-w-4xl mx-auto leading-[1.1]">
          Take Control of Your Spending,{" "}
          <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            One Penny
          </span>{" "}
          at a Time.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Log daily expenses, visualize habit streaks, and hit your target budgets with an elegant,
          responsive tracker designed to stay out of your way.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            size="lg"
            onClick={() => setAuthOpen(true)}
            className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
          >
            Get Started For Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <a href="#demo" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-base"
            >
              Try Interactive Demo
            </Button>
          </a>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-border/30"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to build better money habits
          </h2>
          <p className="mt-4 text-muted-foreground">
            SpendWise simplifies finance with a visual-first approach, zero unnecessary clutter, and
            immediate cloud response.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-border/40 bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section
        id="demo"
        className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 border-t border-border/30"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-chart-2/10 px-3 py-1 text-xs font-semibold text-chart-2 mb-4">
              <Flame className="h-3.5 w-3.5" />
              Interactive Preview
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Try logging an expense right now!</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Experience the fast, micro-interaction flows of SpendWise directly from the landing
              page. Try entering a transaction to see how instantly the ledger updates.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-muted-foreground">
                  Minimalist forms require fewer keystrokes.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-muted-foreground">
                  Auto-saved local ledger states prevent data loss.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive UI Demo Block */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-6">
            <h3 className="text-base font-semibold text-foreground border-b border-border/40 pb-3 flex items-center justify-between">
              <span>Quick Ledger Demo</span>
              <span className="text-xs text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-full">
                Interactive
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={demoCategory}
                  onChange={(e) => setDemoCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option>Coffee</option>
                  <option>Snacks</option>
                  <option>Transport</option>
                  <option>Subscriptions</option>
                  <option>Dinner</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Amount ($)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={demoAmount}
                    onChange={(e) => setDemoAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    onClick={handleAddDemoExpense}
                    className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Recent Activity Ledger</p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {demoExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30 hover:bg-muted transition-colors animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{exp.category}</span>
                      <span className="text-[10px] text-muted-foreground">{exp.date}</span>
                    </div>
                    <span className="text-sm font-bold text-destructive">
                      -${exp.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 border-t border-border/30"
      >
        <div className="text-center mb-12">
          <HelpCircle className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-2 text-muted-foreground">Got questions? We&apos;ve got answers.</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground">{faq.question}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Conversion CTA */}
      <footer className="border-t border-border/40 bg-muted/20 py-16 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Start making smarter financial choices today.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join thousands tracking their budget with SpendWise.
          </p>
          <Button
            onClick={() => setAuthOpen(true)}
            className="mt-6 rounded-xl font-semibold shadow-md px-6 py-5 h-auto"
          >
            Get Started (Free)
          </Button>

          <div className="mt-12 flex justify-center items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-8">
            <span>SpendWise © {new Date().getFullYear()}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for better
              habits
            </span>
          </div>
        </div>
      </footer>

      {/* Auth Screen Modal Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          <AuthScreen />
        </DialogContent>
      </Dialog>
    </div>
  );
}
