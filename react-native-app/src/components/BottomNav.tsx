import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Wallet, List, Calendar, FileText, Settings } from "lucide-react-native";
import * as Haptics from "expo-haptics";

export type ScreenTab = "overview" | "expenses" | "calendar" | "notes" | "settings";

interface BottomNavProps {
  activeTab: ScreenTab;
  onChangeTab: (tab: ScreenTab) => void;
  isDark: boolean;
}

export function BottomNav({ activeTab, onChangeTab, isDark }: BottomNavProps) {
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Wallet },
    { id: "expenses" as const, label: "Expenses", icon: List },
    { id: "calendar" as const, label: "Calendar", icon: Calendar },
    { id: "notes" as const, label: "Notes", icon: FileText },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const themeColors = {
    bg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    active: "#10b981",
    inactive: isDark ? "#64748b" : "#94a3b8",
  };

  const handlePress = (tabId: ScreenTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeTab(tabId);
  };

  return (
    <View style={[styles.navContainer, { backgroundColor: themeColors.bg, borderTopColor: themeColors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handlePress(tab.id)}
            style={styles.tabBtn}
            activeOpacity={0.8}
          >
            <Icon size={20} color={isActive ? themeColors.active : themeColors.inactive} />
            <Text style={[styles.tabLabel, { color: isActive ? themeColors.active : themeColors.inactive }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: "row",
    height: 72,
    borderTopWidth: 1,
    paddingBottom: 16,
    paddingTop: 10,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 10,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
});
