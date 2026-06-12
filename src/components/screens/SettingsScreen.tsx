"use client";

import { useState } from "react";
import {
  useCategories,
  useBudgetTargets,
  useSettings,
  useExpenses,
  useCloudStatus,
} from "@/lib/spend-store";
import { generateId, type Category, type BudgetTarget, type Expense } from "@/lib/store";
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
import {
  Plus,
  Trash2,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { DailyUpdateReminderSettings } from "@/components/DailyUpdateReminderSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const [categories, setCategories] = useCategories();
  const [targets, setTargets] = useBudgetTargets();
  const [settings, setSettings] = useSettings();
  const [expenses, setExpenses] = useExpenses();
  const { theme, setTheme, resolved } = useTheme();
  const { cloud } = useCloudStatus();

  const [tempApiKey, setTempApiKey] = useState(settings.aiApiKey || "");
  const [tempModelName, setTempModelName] = useState(settings.aiModelName || "");

  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("📦");

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetPeriod, setTargetPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [targetAmount, setTargetAmount] = useState("");
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  // Category CRUD
  function addCategory() {
    if (!catName.trim()) {
      toast.error("Enter a category name");
      return;
    }
    const newCat: Category = {
      id: generateId(),
      name: catName.trim(),
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
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
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (editTargetId) {
      setTargets((prev) =>
        prev.map((t) => (t.id === editTargetId ? { ...t, period: targetPeriod, amount: amt } : t)),
      );
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Processing Excel file...");

    try {
      const xlsx = await import("xlsx");

      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve(e.target.result);
          } else {
            reject(new Error("Failed to read file as ArrayBuffer"));
          }
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsArrayBuffer(file);
      });

      const workbook = xlsx.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

      const newExpenses: Expense[] = [];

      jsonData.forEach((row) => {
        let dateStr = "";
        if (row.Date) {
          if (typeof row.Date === "number") {
            const jsDate = new Date(Math.round((row.Date - 25569) * 86400 * 1000));
            dateStr = jsDate.toISOString().split("T")[0];
          } else if (typeof row.Date === "string") {
            const parts = row.Date.split("-");
            if (parts.length === 3) {
              const [d, m, y] = parts;
              const months: Record<string, string> = {
                jan: "01",
                feb: "02",
                mar: "03",
                apr: "04",
                may: "05",
                jun: "06",
                jul: "07",
                aug: "08",
                sep: "09",
                oct: "10",
                nov: "11",
                dec: "12",
              };
              let month = m.padStart(2, "0");
              if (isNaN(Number(m))) {
                month = months[m.toLowerCase().substring(0, 3)] || "01";
              }
              const year = y.length === 2 ? `20${y}` : y;
              dateStr = `${year}-${month}-${d.padStart(2, "0")}`;
            }
          }
        }
        if (!dateStr) return;

        const note = row.Notes || "Imported Note";

        let categoryId = "other";
        const lowerNote = note.toLowerCase();
        const categoryMappings: Record<string, string[]> = {
          food: ["food", "lunch", "dinner", "breakfast", "grocery", "groceries", "drinks"],
          transport: [
            "transport",
            "taxi",
            "uber",
            "ola",
            "auto",
            "train",
            "flight",
            "bus",
            "fuel",
            "petrol",
          ],
          shopping: ["shopping", "clothes", "shoes", "amazon", "flipkart"],
          bills: ["bills", "utility", "recharge", "electricity", "water", "rent", "essential"],
          entertainment: ["entertainment", "movie", "cinema", "games", "netflix"],
          health: ["health", "doctor", "pharmacy", "medicine"],
          education: ["education", "school", "college", "books", "course"],
          salary: ["salary", "income", "bonus", "previous balance"],
          grooming: ["grooming", "gromming", "hair", "salon", "barber", "spa"],
        };

        for (const [catId, keywords] of Object.entries(categoryMappings)) {
          if (keywords.some((k) => lowerNote.includes(k))) {
            categoryId = catId;
            break;
          }
        }

        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === row.Category?.toLowerCase(),
        );
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        }

        let cashIn = row["Cash In"] || row["Cash in"] || row.CashIn;
        if (typeof cashIn === "string") cashIn = parseFloat(cashIn.replace(/,/g, ""));

        let cashOut = row["Cash Out"] || row["Cash out"] || row.CashOut;
        if (typeof cashOut === "string") cashOut = parseFloat(cashOut.replace(/,/g, ""));

        if (cashIn > 0) {
          newExpenses.push({
            id: generateId(),
            amount: cashIn,
            categoryId: categoryId === "other" ? "salary" : categoryId,
            note: note,
            date: dateStr,
            createdAt: new Date().toISOString(),
            type: "cash-in",
          });
        }

        if (cashOut > 0) {
          newExpenses.push({
            id: generateId(),
            amount: cashOut,
            categoryId: categoryId,
            note: note,
            date: dateStr,
            createdAt: new Date().toISOString(),
            type: "cash-out",
          });
        }
      });

      if (newExpenses.length > 0) {
        if (cloud) {
          toast.loading("Saving imported records to cloud database...", { id: toastId });
          await setExpenses((prev) => [...prev, ...newExpenses], true);
          toast.success(
            `Imported ${newExpenses.length} records successfully and synced to cloud!`,
            { id: toastId },
          );
        } else {
          setExpenses((prev) => [...prev, ...newExpenses]);
          toast.success(
            `Imported ${newExpenses.length} records successfully (saved on this device)!`,
            { id: toastId },
          );
        }
      } else {
        toast.error("No valid records found to import.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to import file.", { id: toastId });
    } finally {
      event.target.value = "";
    }
  };

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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Appearance
        </h2>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Currency
        </h2>
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

      {/* AI Configuration */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          AI Assistant Settings
        </h2>
        <div className="space-y-3 rounded-xl bg-card p-3 border border-border/50">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Gemini API Key (Optional overrides ENV)
            </label>
            <div className="relative">
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="h-10 text-sm pr-16"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-1 top-1 bottom-1 h-8 text-xs"
                onClick={() => {
                  setSettings((prev) => ({ ...prev, aiApiKey: tempApiKey }));
                  toast.success("API Key saved");
                }}
              >
                Save
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Model Name (Optional overrides ENV)
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="gemini-2.5-flash"
                value={tempModelName}
                onChange={(e) => setTempModelName(e.target.value)}
                className="h-10 text-sm pr-16"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-1 top-1 bottom-1 h-8 text-xs"
                onClick={() => {
                  setSettings((prev) => ({ ...prev, aiModelName: tempModelName }));
                  toast.success("Model Name saved");
                }}
              >
                Save
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            These credentials are saved locally in your browser. Leave blank to use server defaults.
          </p>
        </div>
      </section>

      <DailyUpdateReminderSettings />

      {/* Spending caps (same data as Notes tab) */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Spending caps
          </h2>
          <Button variant="ghost" size="sm" onClick={() => openTargetForm()} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {targets.length === 0 ? (
          <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No spending caps yet. Add one to track spending against a daily, monthly, or yearly
              limit. 🎯
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {targets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{t.period}</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.currency}
                    {t.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openTargetForm(t)}
                    className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Edit target"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTarget(t.id)}
                    className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                    aria-label="Delete target"
                  >
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowCatForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50"
            >
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

      {/* Import Data */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Import Data
        </h2>
        <div className="space-y-2">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
            id="excel-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="excel-upload">
            <div className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Import Excel Data</p>
                <p className="text-xs text-muted-foreground">Upload .xlsx or .csv files</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </label>
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
              <label className="text-sm font-medium text-foreground" htmlFor="cat-icon">
                Icon
              </label>
              <Input
                id="cat-icon"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                className="mt-1 h-12 text-2xl text-center"
                maxLength={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="cat-name">
                Name
              </label>
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Groceries"
                className="mt-1 h-12"
              />
            </div>
            <Button onClick={addCategory} className="w-full h-12 rounded-xl">
              Add Category
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Target sheet */}
      <Sheet open={showTargetForm} onOpenChange={setShowTargetForm}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editTargetId ? "Edit spending cap" : "Set spending cap"}</SheetTitle>
            <SheetDescription>
              How much you plan to spend per day, month, or year (not habit checklists).
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="target-period">
                Period
              </label>
              <Select
                value={targetPeriod}
                onValueChange={(v) => setTargetPeriod(v as "daily" | "monthly" | "yearly")}
              >
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
              <label className="text-sm font-medium text-foreground" htmlFor="target-amount">
                Amount ({settings.currency})
              </label>
              <Input
                id="target-amount"
                type="number"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-12 text-lg"
              />
            </div>
            <Button onClick={saveTarget} className="w-full h-12 rounded-xl">
              {editTargetId ? "Save changes" : "Save cap"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
