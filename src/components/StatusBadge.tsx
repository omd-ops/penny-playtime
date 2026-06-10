import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StatusBadgeProps {
  status: "safe" | "warning" | "over";
  isDark?: boolean;
}

export function StatusBadge({ status, isDark }: StatusBadgeProps) {
  let bgColor = "#10b98115";
  let textColor = "#10b981";
  let label = "Safe";

  if (status === "warning") {
    bgColor = "#f59e0b15";
    textColor = "#f59e0b";
    label = "Warning";
  } else if (status === "over") {
    bgColor = "#ef444415";
    textColor = "#ef4444";
    label = "Over Budget";
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
