"use client";

import { useState, useMemo } from "react";
import { useExpenses, useCategories, useSettings } from "@/lib/spend-store";
import { formatCurrency, todayStr, generateId, type Expense } from "@/lib/store";
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
import { Trash2, Pencil, Search, SlidersHorizontal, X } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export function ExpensesScreen() {
  const [expenses, setExpenses] = useExpenses();
  const [categories] = useCategories();
  const [settings] = useSettings();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<"cash-in" | "cash-out">("cash-out");

  // Form state
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cash-in" | "cash-out">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = searchQuery !== "" || filterType !== "all" || filterCategory !== "all";

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Search Query filter (matches note or category name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const noteMatch = exp.note?.toLowerCase().includes(query) || false;
        const cat = catMap.get(exp.categoryId);
        const categoryMatch = cat?.name.toLowerCase().includes(query) || false;
        if (!noteMatch && !categoryMatch) {
          return false;
        }
      }

      // 2. Type filter
      if (filterType !== "all" && exp.type !== filterType) {
        return false;
      }

      // 3. Category filter
      if (filterCategory !== "all" && exp.categoryId !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, filterType, filterCategory, catMap]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filtered],
  );

  function resetForm() {
    setAmount("");
    setCategoryId("");
    setNote("");
    setDate(todayStr());
    setEditingId(null);
  }

  function openAdd(type: "cash-in" | "cash-out") {
    resetForm();
    setExpenseType(type);
    setShowForm(true);
  }

  function openEdit(exp: Expense) {
    setEditingId(exp.id);
    setAmount(String(exp.amount));
    setCategoryId(exp.categoryId);
    setNote(exp.note);
    setDate(exp.date);
    setExpenseType(exp.type || "cash-out");
    setShowForm(true);
  }

  function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }

    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, amount: amt, categoryId, note: note.trim(), date, type: expenseType }
            : e,
        ),
      );
      toast.success("Expense updated");
    } else {
      const newExp: Expense = {
        id: generateId(),
        amount: amt,
        categoryId,
        note: note.trim(),
        date,
        createdAt: new Date().toISOString(),
        type: expenseType,
      };
      setExpenses((prev) => [newExp, ...prev]);
      toast.success("Expense added");
    }
    setShowForm(false);
    resetForm();
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success("Expense deleted");
  }

  // catMap moved to top

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    sorted.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return Array.from(map.entries());
  }, [sorted]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-36">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Expenses</h1>
      </header>

      {expenses.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search note or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 rounded-xl bg-card border-border/50 focus-visible:ring-1 focus-visible:ring-primary/25"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 w-10 rounded-xl relative border-border/50 hover:bg-muted/50 ${
                showFilters || hasActiveFilters ? "border-primary/50 bg-primary/5 text-primary" : ""
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-card p-3 border border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Type
                </label>
                <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-background border-border/50 focus:ring-1">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="cash-in">Cash In</SelectItem>
                    <SelectItem value="cash-out">Cash Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Category
                </label>
                <Select value={filterCategory} onValueChange={(val: any) => setFilterCategory(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-background border-border/50 focus:ring-1">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="col-span-2 flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setFilterCategory("all");
                    }}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-3">📝</span>
          <p className="text-muted-foreground text-sm">
            No expenses yet. Tap <strong>Cash In</strong> or <strong>Cash Out</strong> below to log
            your first one!
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <span className="text-3xl mb-2">🔍</span>
          <p className="text-sm font-semibold text-foreground">No matching expenses</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            We couldn&apos;t find any expenses matching your current filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
              setFilterCategory("all");
            }}
            className="mt-4 text-xs font-semibold rounded-lg border-border/50"
          >
            Clear Search & Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateStr, items]) => {
            const d = new Date(dateStr + "T12:00:00");
            const label =
              dateStr === todayStr()
                ? "Today"
                : d.toLocaleDateString("default", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
            return (
              <div key={dateStr}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {label}
                </p>
                <div className="space-y-2">
                  {items.map((exp) => {
                    const cat = catMap.get(exp.categoryId);
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm border border-border/50"
                      >
                        <span className="text-lg">{cat?.icon || "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {cat?.name || "Unknown"}
                          </p>
                          {exp.note && (
                            <p className="text-xs text-muted-foreground truncate">{exp.note}</p>
                          )}
                        </div>
                        <span
                          className={`text-sm font-semibold ${exp.type === "cash-in" ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {exp.type === "cash-in" ? "+" : "−"}
                          {formatCurrency(exp.amount, settings.currency)}
                        </span>
                        <button
                          onClick={() => openEdit(exp)}
                          className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Edit expense"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="min-h-[44px] min-w-[32px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit sheet */}
      <Sheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit Expense" : expenseType === "cash-in" ? "Cash In" : "Cash Out"}
            </SheetTitle>
            <SheetDescription>
              {editingId ? "Update the details below." : "Log a new expense in seconds."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-amount">
                Amount ({settings.currency})
              </label>
              <Input
                id="exp-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 text-lg h-12"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-category">
                Category
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1 h-12" id="exp-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-note">
                Note (optional)
              </label>
              <Input
                id="exp-note"
                placeholder="Coffee with Sarah..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-date">
                Date
              </label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-12"
              />
            </div>
            <Button
              onClick={handleSave}
              className={`w-full h-12 text-base rounded-xl text-white ${
                expenseType === "cash-in"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {editingId
                ? "Save Changes"
                : expenseType === "cash-in"
                  ? "Add Cash In"
                  : "Add Cash Out"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-2">
          <Button
            onClick={() => openAdd("cash-in")}
            className="min-h-[44px] flex-1 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowDownLeft className="h-4 w-4 shrink-0" /> Cash In
          </Button>
          <Button
            onClick={() => openAdd("cash-out")}
            className="min-h-[44px] flex-1 gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" /> Cash Out
          </Button>
        </div>
      </div>
    </div>
  );
}
