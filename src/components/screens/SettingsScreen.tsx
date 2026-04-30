import { useState } from "react";
import {
  useCategories,
  useBudgetTargets,
  useSettings,
  useExpenses,
  generateId,
  type Category,
  type BudgetTarget,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import { Plus, Trash2, Sun, Moon, Monitor, ChevronRight, FileSpreadsheet, Bell, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const [categories, setCategories] = useCategories();
  const [targets, setTargets] = useBudgetTargets();
  const [settings, setSettings] = useSettings();
  const [expenses] = useExpenses();
  const { theme, setTheme, resolved } = useTheme();

  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("📦");

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetPeriod, setTargetPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [targetAmount, setTargetAmount] = useState("");
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  // Category CRUD
  function addCategory() {
    if (!catName.trim()) { toast.error("Enter a category name"); return; }
    const newCat: Category = {
      id: generateId(),
      name: catName.trim(),
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
      icon: catIcon,
    };
    setCategories((prev) => [...prev, newCat]);
    setCatName("");
    setCatIcon("📦");
    setShowCatForm(false);
    toast.success("Category added");
  }

  function deleteCategory(id: string) {
    const used = expenses.some((e) => e.categoryId === id);
    if (used) {
      toast.error("This category has expenses. Reassign them before deleting.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted");
  }

  // Target CRUD
  function openTargetForm(existing?: BudgetTarget) {
    if (existing) {
      setEditTargetId(existing.id);
      setTargetPeriod(existing.period);
      setTargetAmount(String(existing.amount));
    } else {
      setEditTargetId(null);
      setTargetPeriod("daily");
      setTargetAmount("");
    }
    setShowTargetForm(true);
  }

  function saveTarget() {
    const amt = parseFloat(targetAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    if (editTargetId) {
      setTargets((prev) => prev.map((t) => t.id === editTargetId ? { ...t, period: targetPeriod, amount: amt } : t));
      toast.success("Target updated");
    } else {
      // Replace if same period exists
      setTargets((prev) => {
        const filtered = prev.filter((t) => t.period !== targetPeriod);
        return [...filtered, { id: generateId(), period: targetPeriod, amount: amt }];
      });
      toast.success("Target set");
    }
    setShowTargetForm(false);
  }

  function deleteTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    toast.success("Target removed");
  }

  const themeOptions: { value: "light" | "dark" | "system"; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  const currencyOptions = ["$", "€", "£", "¥", "₹", "₿"];

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6">Settings</h1>

      {/* Theme */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h2>
        <div className="flex gap-2 rounded-xl bg-card p-1.5 border border-border/50">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                theme === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Currency */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Currency</h2>
        <div className="flex gap-2 flex-wrap">
          {currencyOptions.map((c) => (
            <button
              key={c}
              onClick={() => setSettings((prev) => ({ ...prev, currency: c }))}
              className={cn(
                "min-h-[44px] min-w-[44px] rounded-xl border text-sm font-semibold transition-colors",
                settings.currency === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/50 hover:border-primary/50",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Budget Targets */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Budget Targets</h2>
          <Button variant="ghost" size="sm" onClick={() => openTargetForm()} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {targets.length === 0 ? (
          <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No targets set yet. Add one to start tracking your budget! 🎯
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{t.period}</p>
                  <p className="text-xs text-muted-foreground">{settings.currency}{t.amount.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openTargetForm(t)} className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Edit target">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteTarget(t.id)} className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-destructive" aria-label="Delete target">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categories</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowCatForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50">
              <span className="text-lg">{cat.icon}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Phase 2 stubs */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Coming Soon</h2>
        <div className="space-y-2">
          {[
            { icon: FileSpreadsheet, label: "Reports & Export", desc: "Download Excel, PDF, and CSV" },
            { icon: Bell, label: "Notifications", desc: "Reminders and budget alerts" },
            { icon: Search, label: "Search & Filter", desc: "Find expenses by date and category" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50 opacity-60">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* Add category sheet */}
      <Sheet open={showCatForm} onOpenChange={setShowCatForm}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>New Category</SheetTitle>
            <SheetDescription>Create a custom spending category.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="cat-icon">Icon</label>
              <Input id="cat-icon" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} className="mt-1 h-12 text-2xl text-center" maxLength={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="cat-name">Name</label>
              <Input id="cat-name" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Groceries" className="mt-1 h-12" />
            </div>
            <Button onClick={addCategory} className="w-full h-12 rounded-xl">Add Category</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Target sheet */}
      <Sheet open={showTargetForm} onOpenChange={setShowTargetForm}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editTargetId ? "Edit Target" : "Set Budget Target"}</SheetTitle>
            <SheetDescription>Define a spending limit for a time period.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="target-period">Period</label>
              <Select value={targetPeriod} onValueChange={(v) => setTargetPeriod(v as "daily" | "monthly" | "yearly")}>
                <SelectTrigger className="mt-1 h-12" id="target-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="target-amount">Amount ({settings.currency})</label>
              <Input id="target-amount" type="number" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0.00" className="mt-1 h-12 text-lg" />
            </div>
            <Button onClick={saveTarget} className="w-full h-12 rounded-xl">
              {editTargetId ? "Save Changes" : "Set Target"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}