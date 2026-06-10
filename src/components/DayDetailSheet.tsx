import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Check, Plus, Trash2 } from "lucide-react-native";
import type { Category, DayFlag, DayGoal, Expense } from "../lib/store";
import { formatCurrency, getBudgetStatus } from "../lib/store";
import { BudgetBar } from "./BudgetBar";
import { StatusBadge } from "./StatusBadge";
import * as Haptics from "expo-haptics";

interface DayDetailSheetProps {
  date: string | null;
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  categories: Category[];
  dayFlags: DayFlag[];
  setDayFlags: React.Dispatch<React.SetStateAction<DayFlag[]>>;
  dayGoals: DayGoal[];
  setDayGoals: React.Dispatch<React.SetStateAction<DayGoal[]>>;
  dailyLimit?: number;
  currency: string;
  isDark: boolean;
}

const DEFAULT_LABEL = "Done today's habits (gym, wake time, …)";

export function DayDetailSheet({
  date,
  visible,
  onClose,
  expenses,
  categories,
  dayFlags,
  setDayFlags,
  dayGoals,
  setDayGoals,
  dailyLimit,
  currency,
  isDark,
}: DayDetailSheetProps) {
  const [habitNote, setHabitNote] = useState(DEFAULT_LABEL);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  const filteredExpenses = date ? expenses.filter((e) => e.date === date) : [];
  const totalDebits = filteredExpenses
    .filter((e) => e.type !== "cash-in")
    .reduce((s, e) => s + e.amount, 0);
  const totalCredits = filteredExpenses
    .filter((e) => e.type === "cash-in")
    .reduce((s, e) => s + e.amount, 0);

  const flag = date ? dayFlags.find((f) => f.date === date) : undefined;
  const goals = date ? dayGoals.filter((g) => g.date === date) : [];

  useEffect(() => {
    if (visible && flag) {
      setHabitNote(flag.label || DEFAULT_LABEL);
    } else {
      setHabitNote(DEFAULT_LABEL);
    }
  }, [flag, visible]);

  if (!date) return null;

  const handleToggleHabit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDayFlags((prev) => {
      const exists = prev.find((f) => f.date === date);
      const customLabel = habitNote.trim() !== DEFAULT_LABEL && habitNote.trim() !== "" ? habitNote.trim() : undefined;
      if (exists) {
        return prev.map((f) => (f.date === date ? { ...f, metTarget: !f.metTarget, label: customLabel } : f));
      }
      return [
        ...prev,
        {
          date,
          metTarget: true,
          label: customLabel,
        },
      ];
    });
  };

  const handleUpdateHabitLabel = (text: string) => {
    setHabitNote(text);
    setDayFlags((prev) => {
      const exists = prev.find((f) => f.date === date);
      const customLabel = text.trim() !== DEFAULT_LABEL && text.trim() !== "" ? text.trim() : undefined;
      if (exists) {
        return prev.map((f) => (f.date === date ? { ...f, label: customLabel } : f));
      }
      return prev;
    });
  };

  const handleAddGoal = () => {
    const title = newGoalTitle.trim();
    if (!title) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newGoal: DayGoal = {
      id: Math.random().toString(36).slice(2, 10),
      date,
      title,
      done: false,
    };
    setDayGoals((prev) => [...prev, newGoal]);
    setNewGoalTitle("");
  };

  const handleToggleGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDayGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
  };

  const handleDeleteGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDayGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const getCat = (catId: string) => categories.find((c) => c.id === catId);

  // Formatted date header
  const d = new Date(date + "T12:00:00");
  const formattedDate = d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const themeColors = {
    bg: isDark ? "#1e293b" : "#ffffff",
    cardBg: isDark ? "#334155" : "#f1f5f9",
    border: isDark ? "#475569" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.sheetContainer, { backgroundColor: themeColors.bg }]}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                {formattedDate}
              </Text>
              <Text style={[styles.headerSubtitle, { color: themeColors.subText }]}>
                Day Snapshot
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Summary cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: themeColors.cardBg }]}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Debits</Text>
                <Text style={[styles.statValue, { color: "#ef4444" }]}>
                  -{formatCurrency(totalDebits, currency)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeColors.cardBg }]}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Credits</Text>
                <Text style={[styles.statValue, { color: "#10b981" }]}>
                  +{formatCurrency(totalCredits, currency)}
                </Text>
              </View>
            </View>

            {/* Daily spending vs budget limit */}
            {dailyLimit && dailyLimit > 0 ? (
              <View style={styles.budgetGroup}>
                <View style={styles.budgetHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Daily Budget Limit
                  </Text>
                  <StatusBadge status={getBudgetStatus(totalDebits, dailyLimit)} isDark={isDark} />
                </View>
                <BudgetBar spent={totalDebits} limit={dailyLimit} currency={currency} isDark={isDark} />
              </View>
            ) : null}

            {/* Daily Habit Checklist */}
            <View style={styles.sectionGroup}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Daily Habits
              </Text>
              <View style={[styles.habitRow, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                <TouchableOpacity
                  onPress={handleToggleHabit}
                  style={[
                    styles.checkbox,
                    flag?.metTarget && styles.checkboxActive,
                  ]}
                >
                  {flag?.metTarget ? <Check size={16} color="#ffffff" /> : null}
                </TouchableOpacity>
                <TextInput
                  style={[styles.habitInput, { color: themeColors.text }]}
                  value={habitNote}
                  onChangeText={handleUpdateHabitLabel}
                  placeholder={DEFAULT_LABEL}
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                />
              </View>
            </View>

            {/* Day Goals checklist */}
            <View style={styles.sectionGroup}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Goals & TODOs ({goals.length})
              </Text>

              {/* Goal List */}
              {goals.map((g) => (
                <View
                  key={g.id}
                  style={[
                    styles.goalRow,
                    { backgroundColor: themeColors.cardBg, borderColor: themeColors.border },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleToggleGoal(g.id)}
                    style={[styles.checkbox, g.done && styles.checkboxActive]}
                  >
                    {g.done ? <Check size={16} color="#ffffff" /> : null}
                  </TouchableOpacity>
                  <Text style={[styles.goalTitle, { color: themeColors.text }, g.done && styles.goalDoneText]}>
                    {g.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(g.id)}
                    style={styles.trashBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add goal row */}
              <View style={styles.addGoalRow}>
                <TextInput
                  style={[
                    styles.addGoalInput,
                    {
                      backgroundColor: themeColors.cardBg,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    },
                  ]}
                  placeholder="Add custom goal..."
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                />
                <TouchableOpacity style={styles.addGoalBtn} onPress={handleAddGoal}>
                  <Plus size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Expense entries list */}
            <View style={[styles.sectionGroup, { marginBottom: 30 }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Transactions ({filteredExpenses.length})
              </Text>
              {filteredExpenses.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                  No spending recorded for this date. 🎉
                </Text>
              ) : (
                <View style={styles.expensesList}>
                  {filteredExpenses.map((exp) => {
                    const cat = getCat(exp.categoryId);
                    const isDebit = exp.type !== "cash-in";
                    return (
                      <View
                        key={exp.id}
                        style={[
                          styles.expenseItem,
                          { borderColor: themeColors.border },
                        ]}
                      >
                        <Text style={styles.expenseIcon}>{cat?.icon || "📦"}</Text>
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
                          {isDebit ? "-" : "+"}
                          {formatCurrency(exp.amount, currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(100, 100, 100, 0.2)",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  budgetGroup: {
    marginBottom: 20,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionGroup: {
    marginBottom: 20,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#94a3b8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  habitInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  goalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  goalDoneText: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  trashBtn: {
    padding: 6,
  },
  addGoalRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  addGoalInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  addGoalBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
  },
  expensesList: {
    gap: 10,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
});
