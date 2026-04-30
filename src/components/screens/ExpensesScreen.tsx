import { useState, useMemo } from "react";
import {
  useExpenses,
  useCategories,
  useSettings,
  formatCurrency,
  todayStr,
  generateId,
  type Expense,
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
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export function ExpensesScreen() {
  const [expenses, setExpenses] = useExpenses();
  const [categories] = useCategories();
  const [settings] = useSettings();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses],
  );

  function resetForm() {
    setAmount("");
    setCategoryId("");
    setNote("");
    setDate(todayStr());
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(exp: Expense) {
    setEditingId(exp.id);
    setAmount(String(exp.amount));
    setCategoryId(exp.categoryId);
    setNote(exp.note);
    setDate(exp.date);
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
            ? { ...e, amount: amt, categoryId, note: note.trim(), date }
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

  const getCat = (id: string) => categories.find((c) => c.id === id);

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
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Expenses</h1>
        <Button onClick={openAdd} size="sm" className="gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </header>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-3">📝</span>
          <p className="text-muted-foreground text-sm">
            No expenses yet. Tap <strong>Add</strong> to log your first one!
          </p>
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          {grouped.map(([dateStr, items]) => {
            const d = new Date(dateStr + "T12:00:00");
            const label =
              dateStr === todayStr()
                ? "Today"
                : d.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={dateStr}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {label}
                </p>
                <div className="space-y-2">
                  {items.map((exp) => {
                    const cat = getCat(exp.categoryId);
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
                        <span className="text-sm font-semibold text-foreground">
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
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Expense" : "Add Expense"}</SheetTitle>
            <SheetDescription>
              {editingId ? "Update the details below." : "Log a new expense in seconds."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-amount">Amount ({settings.currency})</label>
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
              <label className="text-sm font-medium text-foreground" htmlFor="exp-category">Category</label>
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
              <label className="text-sm font-medium text-foreground" htmlFor="exp-note">Note (optional)</label>
              <Input
                id="exp-note"
                placeholder="Coffee with Sarah..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="exp-date">Date</label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-12"
              />
            </div>
            <Button onClick={handleSave} className="w-full h-12 text-base rounded-xl">
              {editingId ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}