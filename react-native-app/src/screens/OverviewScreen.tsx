import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Wallet, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { useExpenses, useCategories, useBudgetTargets, useSettings } from "../lib/spend-provider";
import {
  getExpensesForMonth,
  getExpensesForDate,
  sumDebits,
  isExpenseDebit,
  getTargetForPeriod,
  formatCurrency,
  todayStr,
  getBudgetStatus,
} from "../lib/store";
import { BudgetBar } from "../components/BudgetBar";
import { StatusBadge } from "../components/StatusBadge";

interface ScreenProps {
  isDark: boolean;
}

export function OverviewScreen({ isDark }: ScreenProps) {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [settings] = useSettings();

  const today = todayStr();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthExpenses = useMemo(() => getExpensesForMonth(expenses, year, month), [expenses, year, month]);
  const todayExpenses = useMemo(() => getExpensesForDate(expenses, today), [expenses, today]);
  const prevMonthExpenses = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return getExpensesForMonth(expenses, py, pm);
  }, [expenses, year, month]);

  const monthTotal = sumDebits(monthExpenses);
  const todayTotal = sumDebits(todayExpenses);
  const prevMonthTotal = sumDebits(prevMonthExpenses);

  const dailyTarget = getTargetForPeriod(targets, "daily");
  const monthlyTarget = getTargetForPeriod(targets, "monthly");

  const delta = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      if (!isExpenseDebit(e)) return;
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          catId,
          name: cat?.name || "Unknown",
          icon: cat?.icon || "📦",
          color: cat?.color || "#6b7280",
          amount,
          pct: monthTotal > 0 ? (amount / monthTotal) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categories, monthTotal]);

  const monthName = now.toLocaleString("default", { month: "long" });

  // Burn rate
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const burnRate =
    monthlyTarget && monthlyTarget.amount > monthTotal && daysLeft > 0
      ? (monthlyTarget.amount - monthTotal) / daysLeft
      : null;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  const themeColors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    cardBg: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f8fafc" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.bg }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: themeColors.subText }]}>
          Good {getGreeting()}
        </Text>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {monthName} Overview
        </Text>
      </View>

      {/* Month Total Card */}
      <View style={[styles.mainCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>Total spent this month</Text>
            <Text style={[styles.cardValue, { color: themeColors.text }]}>
              {formatCurrency(monthTotal, settings.currency)}
            </Text>
          </View>
          <View style={styles.walletIconBg}>
            <Wallet size={20} color="#10b981" />
          </View>
        </View>

        {prevMonthTotal > 0 ? (
          <View style={styles.deltaContainer}>
            {delta > 0 ? (
              <TrendingUp size={16} color="#ef4444" />
            ) : delta < 0 ? (
              <TrendingDown size={16} color="#10b981" />
            ) : (
              <Minus size={16} color="#94a3b8" />
            )}
            <Text
              style={[
                styles.deltaText,
                { color: delta > 0 ? "#ef4444" : delta < 0 ? "#10b981" : "#94a3b8" },
              ]}
            >
              {Math.abs(delta).toFixed(1)}% vs last month
            </Text>
          </View>
        ) : null}
      </View>

      {/* Daily Cap Progress */}
      {dailyTarget && dailyTarget.amount > 0 ? (
        <View style={[styles.secCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <View style={styles.secCardHeader}>
            <Text style={[styles.secCardTitle, { color: themeColors.text }]}>Spending Today</Text>
            <StatusBadge status={getBudgetStatus(todayTotal, dailyTarget.amount)} isDark={isDark} />
          </View>
          <BudgetBar spent={todayTotal} limit={dailyTarget.amount} currency={settings.currency} isDark={isDark} />
        </View>
      ) : (
        <View style={[styles.secCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <Text style={[styles.secCardTitle, { color: themeColors.text }]}>Today</Text>
          <Text style={[styles.infoText, { color: themeColors.subText }]}>
            Spent: <Text style={{ fontWeight: "700", color: themeColors.text }}>{formatCurrency(todayTotal, settings.currency)}</Text>
          </Text>
          <Text style={[styles.hintText, { color: themeColors.subText }]}>
            Set a daily spending cap in Settings or Notes to compare spending here.
          </Text>
        </View>
      )}

      {/* Monthly Budget Progress */}
      {monthlyTarget && monthlyTarget.amount > 0 ? (
        <View style={[styles.secCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <View style={styles.secCardHeader}>
            <Text style={[styles.secCardTitle, { color: themeColors.text }]}>Monthly Budget</Text>
            <StatusBadge status={getBudgetStatus(monthTotal, monthlyTarget.amount)} isDark={isDark} />
          </View>
          <BudgetBar spent={monthTotal} limit={monthlyTarget.amount} currency={settings.currency} isDark={isDark} />
          {burnRate !== null ? (
            <Text style={[styles.hintText, { color: themeColors.subText, marginTop: 8 }]}>
              ~{formatCurrency(burnRate, settings.currency)}/day left to stay on track ({daysLeft} days remaining)
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Categories Breakdown list */}
      <View style={[styles.secCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        <Text style={[styles.secCardTitle, { color: themeColors.text, marginBottom: 12 }]}>
          Spending by Category
        </Text>
        {categoryBreakdown.length === 0 ? (
          <Text style={[styles.emptyText, { color: themeColors.subText }]}>
            No expenses yet this month. Start logging to see insights! 💡
          </Text>
        ) : (
          <View style={styles.categoryList}>
            {categoryBreakdown.map((cat) => (
              <View key={cat.catId} style={styles.catItem}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <View style={styles.catDetails}>
                  <View style={styles.catLabelRow}>
                    <Text style={[styles.catName, { color: themeColors.text }]}>{cat.name}</Text>
                    <Text style={[styles.catPct, { color: themeColors.subText }]}>
                      {cat.pct.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBarFill,
                        { width: `${cat.pct}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.catAmount, { color: themeColors.text }]}>
                  {formatCurrency(cat.amount, settings.currency)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  mainCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  walletIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  deltaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 4,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  secCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  secCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  secCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 14,
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
  categoryList: {
    gap: 12,
  },
  catItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  catIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  catDetails: {
    flex: 1,
    marginRight: 12,
  },
  catLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: "600",
  },
  catPct: {
    fontSize: 12,
    fontWeight: "500",
  },
  catBarBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(100, 100, 100, 0.1)",
    overflow: "hidden",
  },
  catBarFill: {
    height: "100%",
    borderRadius: 99,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: "700",
    width: 76,
    textAlign: "right",
  },
});
