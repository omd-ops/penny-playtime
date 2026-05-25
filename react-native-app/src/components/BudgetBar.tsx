import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency, getBudgetStatus } from "../lib/store";

interface BudgetBarProps {
  spent: number;
  limit: number;
  currency: string;
  isDark?: boolean;
}

export function BudgetBar({ spent, limit, currency, isDark }: BudgetBarProps) {
  if (limit <= 0) return null;
  const pct = Math.min((spent / limit) * 100, 100);
  const status = getBudgetStatus(spent, limit);

  let barColor = "#10b981"; // Safe
  if (status === "warning") barColor = "#f59e0b"; // Warning
  if (status === "over") barColor = "#ef4444"; // Over

  const remaining = Math.max(limit - spent, 0);

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBarBg, isDark && styles.progressBarBgDark]}>
          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <View style={styles.labelContainer}>
        <Text style={[styles.textLeft, isDark ? styles.textDark : styles.textLight]}>
          {formatCurrency(spent, currency)} of {formatCurrency(limit, currency)}
        </Text>
        <Text style={[styles.textRight, isDark ? styles.textDark : styles.textLight, status === "over" && styles.overText]}>
          {status === "over" ? "Over budget" : `${formatCurrency(remaining, currency)} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    width: "100%",
  },
  progressContainer: {
    height: 10,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarBg: {
    flex: 1,
    backgroundColor: "#e2e8f0",
  },
  progressBarBgDark: {
    backgroundColor: "#334155",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  textLeft: {
    fontSize: 12,
    fontWeight: "500",
  },
  textRight: {
    fontSize: 12,
    fontWeight: "500",
  },
  textLight: {
    color: "#64748b",
  },
  textDark: {
    color: "#94a3b8",
  },
  overText: {
    color: "#ef4444",
    fontWeight: "600",
  },
});
