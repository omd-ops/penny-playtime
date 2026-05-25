import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  useExpenses,
  useCategories,
  useBudgetTargets,
  useDayFlags,
  useDayGoals,
  useSettings,
} from "../lib/spend-provider";
import {
  sumDebits,
  sumCredits,
  isExpenseDebit,
  getTargetForPeriod,
  formatCurrency,
  todayStr,
} from "../lib/store";
import { DayDetailSheet } from "../components/DayDetailSheet";
import * as Haptics from "expo-haptics";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface ScreenProps {
  isDark: boolean;
}

export function CalendarScreen({ isDark }: ScreenProps) {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [dayFlags, setDayFlags] = useDayFlags();
  const [dayGoals, setDayGoals] = useDayGoals();
  const [settings] = useSettings();

  const today = todayStr();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyTarget = getTargetForPeriod(targets, "daily");

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    // Convert firstDay.getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Mon=0, ..., Sun=6
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const cells: { day: number; dateStr: string; inMonth: boolean }[] = [];
    
    // Fill leading empty cells
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: 0, dateStr: "", inMonth: false });
    }
    
    // Fill month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d), inMonth: true });
    }
    
    return cells;
  }, [viewYear, viewMonth]);

  // Rollups of totals per day
  const dayRollups = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    expenses.forEach((e) => {
      if (!e.date.startsWith(prefix)) return;
      const cur = map.get(e.date) || { debit: 0, credit: 0 };
      if (isExpenseDebit(e)) cur.debit += e.amount;
      else cur.credit += e.amount;
      map.set(e.date, cur);
    });
    return map;
  }, [expenses, viewYear, viewMonth]);

  const dailyHabitLines = useMemo(() => {
    const fromItems = (settings.dailyHabitItems ?? [])
      .map((i) => i.text.trim())
      .filter(Boolean);
    if (fromItems.length) return fromItems;
    const raw = (settings.habitPlans as { daily?: string } | undefined)?.daily?.trim();
    if (!raw) return [];
    return raw
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }, [settings.dailyHabitItems, settings.habitPlans]);

  const prevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const handleOpenDay = (dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(dateStr);
  };

  const themeColors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    cardBg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.bg }]} contentContainerStyle={styles.content}>
      {/* Header controls */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={[styles.ctrlBtn, { borderColor: themeColors.border }]}>
          <ChevronLeft size={20} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={[styles.ctrlBtn, { borderColor: themeColors.border }]}>
          <ChevronRight size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid headers */}
      <View style={styles.gridHeaders}>
        {WEEKDAYS.map((wd) => (
          <Text key={wd} style={[styles.gridHeaderCell, { color: themeColors.subText }]}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Calendar Grid cells */}
      <View style={styles.grid}>
        {grid.map((cell, i) => {
          if (!cell.inMonth) {
            return <View key={`empty-${i}`} style={styles.gridCellEmpty} />;
          }

          const roll = dayRollups.get(cell.dateStr);
          const debited = roll?.debit ?? 0;
          const credited = roll?.credit ?? 0;
          const hasOut = debited > 0;
          const hasIn = credited > 0;
          const isToday = cell.dateStr === today;
          const flag = dayFlags.find((f) => f.date === cell.dateStr);
          const goalsForDay = dayGoals.filter((g) => g.date === cell.dateStr);
          const anyGoalDone = goalsForDay.some((g) => g.done);

          return (
            <TouchableOpacity
              key={`day-${cell.day}`}
              style={[
                styles.gridCell,
                {
                  backgroundColor: themeColors.cardBg,
                  borderColor: isToday ? "#10b981" : themeColors.border,
                  borderWidth: isToday ? 2 : 1,
                },
              ]}
              onPress={() => handleOpenDay(cell.dateStr)}
            >
              <Text style={[styles.dayText, { color: isToday ? "#10b981" : themeColors.text }]}>
                {cell.day}
              </Text>

              {/* Transactions rollups inside calendar */}
              <View style={styles.rollupList}>
                {hasOut ? (
                  <Text style={styles.rollupOut} numberOfLines={1}>
                    -{formatCurrency(debited, settings.currency)}
                  </Text>
                ) : null}
                {hasIn ? (
                  <Text style={styles.rollupIn} numberOfLines={1}>
                    +{formatCurrency(credited, settings.currency)}
                  </Text>
                ) : null}
              </View>

              {/* Mini habits indicators */}
              {dailyHabitLines.length > 0 ? (
                <View style={styles.habitsDotList}>
                  {dailyHabitLines.slice(0, 3).map((_, idx) => (
                    <View key={`hdot-${idx}`} style={styles.habitBulletPoint} />
                  ))}
                  {dailyHabitLines.length > 3 ? (
                    <Text style={styles.habitBulletMore}>+</Text>
                  ) : null}
                </View>
              ) : null}

              {/* Status flag dot */}
              {flag?.metTarget || anyGoalDone ? (
                <View style={styles.statusDot} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <DayDetailSheet
        date={selectedDate}
        visible={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        expenses={expenses}
        categories={categories}
        dayFlags={dayFlags}
        setDayFlags={setDayFlags}
        dayGoals={dayGoals}
        setDayGoals={setDayGoals}
        dailyLimit={dailyTarget?.amount}
        currency={settings.currency}
        isDark={isDark}
      />
    </ScrollView>
  );
}

const windowWidth = Dimensions.get("window").width;
const cellSize = (windowWidth - 40 - 12) / 7; // Account for container padding and gap offsets

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  gridHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  gridHeaderCell: {
    width: cellSize,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  gridCell: {
    width: cellSize,
    height: cellSize * 1.5,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    justifyContent: "space-between",
  },
  gridCellEmpty: {
    width: cellSize,
    height: cellSize * 1.5,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rollupList: {
    marginTop: 2,
    gap: 1,
  },
  rollupOut: {
    fontSize: 8,
    fontWeight: "700",
    color: "#ef4444",
    textAlign: "center",
  },
  rollupIn: {
    fontSize: 8,
    fontWeight: "700",
    color: "#10b981",
    textAlign: "center",
  },
  habitsDotList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    marginTop: 2,
  },
  habitBulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#3b82f6",
  },
  habitBulletMore: {
    fontSize: 7,
    fontWeight: "800",
    color: "#3b82f6",
  },
  statusDot: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#10b981",
  },
});
