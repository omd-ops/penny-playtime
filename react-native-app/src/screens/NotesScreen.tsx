import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { useBudgetTargets, useSettings } from "../lib/spend-provider";
import {
  generateId,
  getTargetForPeriod,
  formatCurrency,
  type AppSettings,
  type BudgetTarget,
  type HabitPlanPeriod,
  type HabitPlanTextPeriod,
  type ImportantNoteItem,
} from "../lib/store";
import * as Haptics from "expo-haptics";

function legacyItemsFromNotes(notes: string | undefined): ImportantNoteItem[] {
  const raw = notes?.trim();
  if (!raw) return [];
  return raw.split(/\n+/).filter(Boolean).map((text, idx) => ({ id: `legacy-${idx}`, text }));
}

function notesPlainText(items: ImportantNoteItem[]): string {
  return items
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join("\n");
}

function materializeNoteIds(items: ImportantNoteItem[]): ImportantNoteItem[] {
  return items.map((i) => (i.id.startsWith("legacy-") ? { ...i, id: generateId() } : i));
}

const SPENDING_PERIODS = [
  { id: "daily" as const, label: "Daily" },
  { id: "monthly" as const, label: "Monthly" },
  { id: "yearly" as const, label: "Yearly" },
];

const HABIT_PERIODS: { id: HabitPlanPeriod; label: string; hint: string }[] = [
  { id: "daily", label: "Daily", hint: "Typical day (gym, wake time, water, …)." },
  { id: "weekly", label: "Weekly", hint: "This week's focus (runs, meal prep, inbox zero, …)." },
  { id: "monthly", label: "Monthly", hint: "Month-level habits or reviews you care about." },
  { id: "yearly", label: "Yearly", hint: "Big-picture intentions or milestones for the year." },
];

interface ScreenProps {
  isDark: boolean;
}

export function NotesScreen({ isDark }: ScreenProps) {
  const [targets, setTargets] = useBudgetTargets();
  const [settings, setSettings] = useSettings();

  const [periodTab, setPeriodTab] = useState<"daily" | "monthly" | "yearly" >("daily");
  const [habitTab, setHabitTab] = useState<HabitPlanPeriod>("daily");
  const [amountDraft, setAmountDraft] = useState("");

  const importantNotes = useMemo((): ImportantNoteItem[] => {
    if (settings.importantNoteItems !== undefined) return settings.importantNoteItems;
    return legacyItemsFromNotes(settings.notes);
  }, [settings.importantNoteItems, settings.notes]);

  const dailyHabits = settings.dailyHabitItems ?? [];

  const activeTarget = getTargetForPeriod(targets, periodTab);

  useEffect(() => {
    const t = getTargetForPeriod(targets, periodTab);
    setAmountDraft(t ? String(t.amount) : "");
  }, [periodTab, targets]);

  const commitDailyHabits = (next: ImportantNoteItem[]) => {
    setSettings((s) => ({
      ...s,
      dailyHabitItems: materializeNoteIds(next),
    }));
  };

  const addDailyHabit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...dailyHabits, { id: generateId(), text: "" }];
    commitDailyHabits(next);
  };

  const updateDailyHabitText = (id: string, text: string) => {
    commitDailyHabits(dailyHabits.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const removeDailyHabit = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commitDailyHabits(dailyHabits.filter((n) => n.id !== id));
  };

  const commitImportantNotes = (next: ImportantNoteItem[]) => {
    const normalized = materializeNoteIds(next);
    setSettings((s) => ({
      ...s,
      importantNoteItems: normalized,
      notes: notesPlainText(normalized),
    }));
  };

  const addNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...importantNotes, { id: generateId(), text: "" }];
    commitImportantNotes(next);
  };

  const updateNoteText = (id: string, text: string) => {
    commitImportantNotes(importantNotes.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const removeNote = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commitImportantNotes(importantNotes.filter((n) => n.id !== id));
  };

  const saveTarget = () => {
    const amt = parseFloat(amountDraft);
    if (isNaN(amt) || amt <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Enter a valid amount");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTargets((prev) => {
      const filtered = prev.filter((t) => t.period !== periodTab);
      const existing = prev.find((t) => t.period === periodTab);
      const row: BudgetTarget = {
        id: existing?.id ?? generateId(),
        period: periodTab,
        amount: amt,
      };
      return [...filtered, row];
    });
  };

  const clearTarget = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTargets((prev) => prev.filter((t) => t.period !== periodTab));
    setAmountDraft("");
  };

  const themeColors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    cardBg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
    inputBg: isDark ? "#334155" : "#f1f5f9",
    inputBorder: isDark ? "#475569" : "#cbd5e1",
    tabActive: "#10b981",
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.bg }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Notes & Budgets</Text>
          <Text style={[styles.subtitle, { color: themeColors.subText }]}>
            Plan limits, build bullet checklists, and organize habit routines.
          </Text>
        </View>

        {/* 1. Spending caps section */}
        <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>SPENDING BUDGETS</Text>
        <View style={[styles.tabBar, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          {SPENDING_PERIODS.map((p) => {
            const isActive = periodTab === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.tabBtn, isActive && { backgroundColor: themeColors.tabActive }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPeriodTab(p.id);
                }}
              >
                <Text style={[styles.tabBtnText, { color: isActive ? "#ffffff" : themeColors.subText }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            {periodTab === "daily" && "Daily budget limit"}
            {periodTab === "monthly" && "Monthly budget limit"}
            {periodTab === "yearly" && "Yearly budget limit"}
          </Text>
          {activeTarget && activeTarget.amount > 0 ? (
            <Text style={[styles.currentLimitText, { color: themeColors.subText }]}>
              Current: <Text style={{ fontWeight: "700", color: "#10b981" }}>{formatCurrency(activeTarget.amount, settings.currency)}</Text>
            </Text>
          ) : null}

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.inputBg,
                borderColor: themeColors.inputBorder,
                color: themeColors.text,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={amountDraft}
            onChangeText={setAmountDraft}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveTarget}>
              <Text style={styles.saveBtnText}>Save Budget</Text>
            </TouchableOpacity>
            {activeTarget ? (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: themeColors.border }]}
                onPress={clearTarget}
              >
                <Text style={[styles.clearBtnText, { color: themeColors.text }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 2. Habits checklist */}
        <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>HABITS & TODO PLANS</Text>
        <View style={[styles.tabBar, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          {HABIT_PERIODS.map((p) => {
            const isActive = habitTab === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.tabBtn, isActive && { backgroundColor: themeColors.tabActive }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHabitTab(p.id);
                }}
              >
                <Text style={[styles.tabBtnText, { color: isActive ? "#ffffff" : themeColors.subText }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                {HABIT_PERIODS.find((p) => p.id === habitTab)?.label} Routines
              </Text>
              <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>
                {HABIT_PERIODS.find((p) => p.id === habitTab)?.hint}
              </Text>
            </View>
            {habitTab === "daily" ? (
              <TouchableOpacity style={styles.addBtn} onPress={addDailyHabit}>
                <Plus size={18} color="#ffffff" />
              </TouchableOpacity>
            ) : null}
          </View>

          {habitTab === "daily" ? (
            <View style={styles.habitsList}>
              {dailyHabits.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                  No daily habits scheduled. Tap + to add!
                </Text>
              ) : (
                dailyHabits.map((item, idx) => (
                  <View key={item.id} style={styles.checkRow}>
                    <Text style={[styles.bulletPoint, { color: themeColors.subText }]}>•</Text>
                    <TextInput
                      style={[
                        styles.checkInput,
                        {
                          backgroundColor: themeColors.inputBg,
                          borderColor: themeColors.inputBorder,
                          color: themeColors.text,
                        },
                      ]}
                      placeholder="e.g. Gym, read, 8 hours sleep"
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      value={item.text}
                      onChangeText={(val) => updateDailyHabitText(item.id, val)}
                    />
                    <TouchableOpacity
                      onPress={() => removeDailyHabit(item.id)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : (
            <TextInput
              style={[
                styles.textarea,
                {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text,
                },
              ]}
              multiline
              numberOfLines={6}
              placeholder={
                habitTab === "weekly"
                  ? "e.g. Inbox zero · Run twice · Prep meals"
                  : habitTab === "monthly"
                  ? "e.g. Dentist visit · Clean garage · Book vacation"
                  : "e.g. Emergency savings · Fluent Spanish · Roadtrip plan"
              }
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={settings.habitPlans?.[habitTab as HabitPlanTextPeriod] ?? ""}
              onChangeText={(text) =>
                setSettings((s) => ({
                  ...s,
                  habitPlans: { ...(s.habitPlans ?? {}), [habitTab]: text },
                }))
              }
            />
          )}
        </View>

        {/* 3. Important bullet notes */}
        <View style={styles.notesHeaderRow}>
          <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>IMPORTANT NOTES</Text>
          <TouchableOpacity style={styles.addBtnSmall} onPress={addNote}>
            <Plus size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginBottom: 40 }]}>
          {importantNotes.length === 0 ? (
            <Text style={[styles.emptyText, { color: themeColors.subText }]}>
              No persistent notes. Click + to jot down reminders.
            </Text>
          ) : (
            <View style={styles.habitsList}>
              {importantNotes.map((item, idx) => (
                <View key={item.id} style={styles.checkRow}>
                  <Text style={[styles.bulletPoint, { color: themeColors.subText }]}>•</Text>
                  <TextInput
                    style={[
                      styles.checkInput,
                      {
                        backgroundColor: themeColors.inputBg,
                        borderColor: themeColors.inputBorder,
                        color: themeColors.text,
                      },
                    ]}
                    placeholder="e.g. Rent due 1st, gas bill 15th"
                    placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                    value={item.text}
                    onChangeText={(val) => updateNoteText(item.id, val)}
                  />
                  <TouchableOpacity
                    onPress={() => removeNote(item.id)}
                    style={styles.trashBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 14,
  },
  currentLimitText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  clearBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 14,
  },
  habitsList: {
    gap: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulletPoint: {
    fontSize: 18,
    width: 16,
    textAlign: "center",
    marginRight: 6,
  },
  checkInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  trashBtn: {
    padding: 8,
    marginLeft: 4,
  },
  textarea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    textAlignVertical: "top",
  },
  notesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  addBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
});
