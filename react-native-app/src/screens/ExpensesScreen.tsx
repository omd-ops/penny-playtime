import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react-native";
import { useExpenses, useCategories, useSettings } from "../lib/spend-provider";
import { formatCurrency, todayStr, type Expense } from "../lib/store";
import { AddExpenseSheet } from "../components/AddExpenseSheet";
import * as Haptics from "expo-haptics";

interface ScreenProps {
  isDark: boolean;
}

export function ExpensesScreen({ isDark }: ScreenProps) {
  const [expenses, setExpenses] = useExpenses();
  const [categories] = useCategories();
  const [settings] = useSettings();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseType, setExpenseType] = useState<"cash-in" | "cash-out">("cash-out");

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [expenses]);

  const handleOpenAdd = (type: "cash-in" | "cash-out") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpenseType(type);
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpenseType(exp.type || "cash-out");
    setEditingExpense(exp);
    setShowForm(true);
  };

  const handleSave = (saved: Expense) => {
    if (editingExpense) {
      setExpenses((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    } else {
      setExpenses((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const getCat = (catId: string) => categories.find((c) => c.id === catId);

  // Group by date
  const groupedExpenses = useMemo(() => {
    const map = new Map<string, Expense[]>();
    sortedExpenses.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return Array.from(map.entries());
  }, [sortedExpenses]);

  const themeColors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    cardBg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Transactions</Text>
        </View>

        {groupedExpenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: themeColors.subText }]}>
              No cash logs logged yet.{"\n"}Tap Cash In or Cash Out below to start!
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {groupedExpenses.map(([dateStr, items]) => {
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
                <View key={dateStr} style={styles.dateGroup}>
                  <Text style={[styles.dateLabel, { color: themeColors.subText }]}>
                    {label.toUpperCase()}
                  </Text>
                  <View style={styles.itemsCard}>
                    {items.map((exp, idx) => {
                      const cat = getCat(exp.categoryId);
                      const isDebit = exp.type !== "cash-in";
                      const isLast = idx === items.length - 1;
                      return (
                        <View
                          key={exp.id}
                          style={[
                            styles.expenseItem,
                            {
                              backgroundColor: themeColors.cardBg,
                              borderColor: themeColors.border,
                              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                            },
                          ]}
                        >
                          <Text style={styles.expenseIcon}>
                            {cat?.icon || "📦"}
                          </Text>
                          <View style={styles.expenseInfo}>
                            <Text style={[styles.expenseName, { color: themeColors.text }]}>
                              {cat?.name || "Unknown"}
                            </Text>
                            {exp.note ? (
                              <Text style={[styles.expenseNote, { color: themeColors.subText }]}>
                                {exp.note}
                              </Text>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.expenseAmount,
                              { color: isDebit ? "#ef4444" : "#10b981" },
                            ]}
                          >
                            {isDebit ? "−" : "+"}{formatCurrency(exp.amount, settings.currency)}
                          </Text>
                          
                          <TouchableOpacity
                            onPress={() => handleOpenEdit(exp)}
                            style={styles.actionBtn}
                          >
                            <Pencil size={15} color={themeColors.subText} />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => handleDelete(exp.id)}
                            style={styles.actionBtn}
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Pinned Bottom Nav buttons */}
      <View style={[styles.bottomDock, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.dockBtn, { backgroundColor: "#10b981" }]}
          onPress={() => handleOpenAdd("cash-in")}
        >
          <ArrowDownLeft size={16} color="#ffffff" style={styles.dockIcon} />
          <Text style={styles.dockBtnText}>Cash In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dockBtn, { backgroundColor: "#ef4444" }]}
          onPress={() => handleOpenAdd("cash-out")}
        >
          <ArrowUpRight size={16} color="#ffffff" style={styles.dockIcon} />
          <Text style={styles.dockBtnText}>Cash Out</Text>
        </TouchableOpacity>
      </View>

      <AddExpenseSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        categories={categories}
        currency={settings.currency}
        isDark={isDark}
        expenseType={expenseType}
        editingExpense={editingExpense}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  listContainer: {
    gap: 20,
  },
  dateGroup: {
    gap: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  itemsCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  expenseIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  expenseNote: {
    fontSize: 11,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 10,
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  bottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  dockBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dockIcon: {
    marginRight: 6,
  },
  dockBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
