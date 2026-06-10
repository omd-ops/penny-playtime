import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, useColorScheme, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SpendDataProvider, useSettings, useSpendCtx } from "./src/lib/spend-provider";
import { BottomNav, type ScreenTab } from "./src/components/BottomNav";
import { OverviewScreen } from "./src/screens/OverviewScreen";
import { ExpensesScreen } from "./src/screens/ExpensesScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { NotesScreen } from "./src/screens/NotesScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

function AppContent() {
  const { ready, syncError } = useSpendCtx();
  const [settings] = useSettings();
  const [activeTab, setActiveTab] = useState<ScreenTab>("overview");
  const systemScheme = useColorScheme();
  
  // Theme state
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    if (settings && settings.theme) {
      setThemeMode(settings.theme);
    }
  }, [settings]);

  const isDark =
    themeMode === "system"
      ? systemScheme === "dark"
      : themeMode === "dark";

  const themeColors = {
    bg: isDark ? "#0f172a" : "#f8fafc",
    headerBg: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    bannerBg: isDark ? "#ef444430" : "#ef444415",
  };

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
        <View style={styles.spinner} />
        <Text style={[styles.loadingText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
          Loading your financial snapshots...
        </Text>
      </View>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewScreen isDark={isDark} />;
      case "expenses":
        return <ExpensesScreen isDark={isDark} />;
      case "calendar":
        return <CalendarScreen isDark={isDark} />;
      case "notes":
        return <NotesScreen isDark={isDark} />;
      case "settings":
        return <SettingsScreen isDark={isDark} setAppTheme={setThemeMode} />;
      default:
        return <OverviewScreen isDark={isDark} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={["top", "left", "right"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Offline/sync error warning banner */}
      {syncError ? (
        <View style={[styles.syncBanner, { backgroundColor: themeColors.bannerBg, borderColor: themeColors.border }]}>
          <Text style={styles.syncBannerText}>⚠️ {syncError}</Text>
        </View>
      ) : null}

      {/* Screen body */}
      <View style={styles.screenBody}>{renderActiveScreen()}</View>

      {/* Navigation menu */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} isDark={isDark} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SpendDataProvider>
        <AppContent />
      </SpendDataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#10b981",
    borderTopColor: "transparent",
    transform: [{ rotate: "0deg" }], // Native spinners use ActivityIndicator, this is custom mock
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  syncBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  syncBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
});
