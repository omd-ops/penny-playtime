import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
} from "react-native";
import { Plus, Trash2, Sun, Moon, Monitor, ChevronRight, FileSpreadsheet, Search } from "lucide-react-native";
import { useCategories, useBudgetTargets, useSettings, useExpenses } from "../lib/spend-provider";
import { generateId, type Category, type BudgetTarget } from "../lib/store";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

interface ScreenProps {
  isDark: boolean;
  setAppTheme: (theme: "light" | "dark" | "system") => void;
}

export function SettingsScreen({ isDark, setAppTheme }: ScreenProps) {
  const [categories, setCategories] = useCategories();
  const [targets, setTargets] = useBudgetTargets();
  const [settings, setSettings] = useSettings();
  const [expenses] = useExpenses();

  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("📦");

  const [newTime, setNewTime] = useState("");

  // Theme changing helper
  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSettings((prev) => ({ ...prev, theme }));
    setAppTheme(theme);
  };

  // Currency changing helper
  const handleCurrencyChange = (currency: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({ ...prev, currency }));
  };

  // Categories CRUD
  const handleAddCategory = () => {
    const name = catName.trim();
    if (!name) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Please enter a category name");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newCat: Category = {
      id: generateId(),
      name,
      icon: catIcon.trim() || "📦",
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
    };
    setCategories((prev) => [...prev, newCat]);
    setCatName("");
    setCatIcon("📦");
    setShowCatForm(false);
  };

  const handleDeleteCategory = (id: string) => {
    const used = expenses.some((e) => e.categoryId === id);
    if (used) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("This category has active expenses. Please reassign them before deleting.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Targets deletion
  const handleDeleteTarget = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  // Expo local notifications helper
  const scheduleAllNotifications = async (enabled: boolean, times: string[]) => {
    // Request permissions first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return;
    }

    // Cancel all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!enabled) return;

    // Schedule new notifications
    for (const time of times) {
      const parts = time.split(":");
      if (parts.length !== 2) continue;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Log your updates! 💸",
          body: "Don't forget to record today's spending, habits, and checklist goals in Penny Pay.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  };

  const handleToggleReminders = (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSettings((prev) => {
      const nextSettings = { ...prev, dailyUpdateRemindersEnabled: enabled };
      void scheduleAllNotifications(enabled, nextSettings.dailyUpdateReminderTimes ?? []);
      return nextSettings;
    });
  };

  const handleAddReminderTime = () => {
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const formatted = newTime.trim();
    if (!timeMatch.test(formatted)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Use HH:MM 24-hour format (e.g. 19:30)");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const existing = settings.dailyUpdateReminderTimes ?? [];
    if (existing.includes(formatted)) {
      setNewTime("");
      return;
    }

    const nextTimes = [...existing, formatted].sort();
    setSettings((prev) => {
      const nextSettings = { ...prev, dailyUpdateReminderTimes: nextTimes };
      void scheduleAllNotifications(!!prev.dailyUpdateRemindersEnabled, nextTimes);
      return nextSettings;
    });
    setNewTime("");
  };

  const handleDeleteReminderTime = (time: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existing = settings.dailyUpdateReminderTimes ?? [];
    const nextTimes = existing.filter((t) => t !== time);
    setSettings((prev) => {
      const nextSettings = { ...prev, dailyUpdateReminderTimes: nextTimes };
      void scheduleAllNotifications(!!prev.dailyUpdateRemindersEnabled, nextTimes);
      return nextSettings;
    });
  };

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  const currencyOptions = ["$", "€", "£", "¥", "₹", "₿"];

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
    <ScrollView style={[styles.container, { backgroundColor: themeColors.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
      </View>

      {/* 1. Theme Configuration */}
      <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>APPEARANCE</Text>
      <View style={[styles.themeRow, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        {themeOptions.map((opt) => {
          const isActive = settings.theme === opt.value;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => handleThemeChange(opt.value)}
              style={[styles.themeBtn, isActive && { backgroundColor: themeColors.tabActive }]}
            >
              <Icon size={14} color={isActive ? "#ffffff" : themeColors.subText} style={styles.themeIcon} />
              <Text style={[styles.themeBtnText, { color: isActive ? "#ffffff" : themeColors.subText }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Currency Selector */}
      <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>CURRENCY</Text>
      <View style={styles.currencyGrid}>
        {currencyOptions.map((curr) => {
          const isActive = settings.currency === curr;
          return (
            <TouchableOpacity
              key={curr}
              onPress={() => handleCurrencyChange(curr)}
              style={[
                styles.currencyBtn,
                {
                  backgroundColor: isActive ? themeColors.tabActive : themeColors.cardBg,
                  borderColor: isActive ? themeColors.tabActive : themeColors.border,
                },
              ]}
            >
              <Text style={[styles.currencyBtnText, { color: isActive ? "#ffffff" : themeColors.text }]}>
                {curr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Daily Reminders (Expo local notifications) */}
      <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>DAILY REMINDERS</Text>
      <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Enable Reminders</Text>
            <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>
              Push nudges to log transactions and habits.
            </Text>
          </View>
          <Switch
            value={!!settings.dailyUpdateRemindersEnabled}
            onValueChange={handleToggleReminders}
            trackColor={{ false: "#94a3b8", true: "#10b981" }}
          />
        </View>

        {settings.dailyUpdateRemindersEnabled ? (
          <View style={styles.reminderSchedule}>
            <Text style={[styles.reminderHeading, { color: themeColors.text }]}>Scheduled times</Text>
            
            {/* Times List */}
            {(settings.dailyUpdateReminderTimes ?? []).map((time) => (
              <View key={time} style={[styles.timeItem, { borderColor: themeColors.border }]}>
                <Text style={[styles.timeText, { color: themeColors.text }]}>{time}</Text>
                <TouchableOpacity onPress={() => handleDeleteReminderTime(time)} style={styles.trashBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add time input row */}
            <View style={styles.addTimeRow}>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.text,
                  },
                ]}
                placeholder="20:00"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={newTime}
                onChangeText={setNewTime}
                maxLength={5}
              />
              <TouchableOpacity style={styles.addTimeBtn} onPress={handleAddReminderTime}>
                <Text style={styles.addTimeBtnText}>Add Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {/* 4. Active spending limits summary */}
      <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>SPENDING LIMITS</Text>
      <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        {targets.length === 0 ? (
          <Text style={[styles.emptyText, { color: themeColors.subText }]}>
            No active spending caps. Set them in Notes to see limits.
          </Text>
        ) : (
          targets.map((t) => (
            <View key={t.id} style={[styles.limitItem, { borderColor: themeColors.border }]}>
              <View>
                <Text style={[styles.limitPeriod, { color: themeColors.text }]}>{t.period.toUpperCase()}</Text>
                <Text style={[styles.limitValue, { color: themeColors.subText }]}>
                  {settings.currency}{t.amount.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteTarget(t.id)} style={styles.trashBtn}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* 5. Custom categories CRUD */}
      <View style={styles.notesHeaderRow}>
        <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>CATEGORIES</Text>
        <TouchableOpacity style={styles.addBtnSmall} onPress={() => setShowCatForm(true)}>
          <Plus size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
        {categories.map((cat) => (
          <View key={cat.id} style={[styles.catItem, { borderColor: themeColors.border }]}>
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catName, { color: themeColors.text }]}>{cat.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={styles.trashBtn}>
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 6. Upcoming features stubs */}
      <Text style={[styles.sectionHeading, { color: themeColors.subText }]}>COMING SOON</Text>
      <View style={[styles.card, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, opacity: 0.6, marginBottom: 40 }]}>
        <View style={styles.comingSoonRow}>
          <FileSpreadsheet size={20} color={themeColors.text} style={styles.comingSoonIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Reports & Export</Text>
            <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>Download PDF, Excel, or CSV files.</Text>
          </View>
          <ChevronRight size={16} color={themeColors.subText} />
        </View>
        <View style={[styles.comingSoonRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.border, paddingTop: 12, marginTop: 12 }]}>
          <Search size={20} color={themeColors.text} style={styles.comingSoonIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Search & Filter</Text>
            <Text style={[styles.cardSubtitle, { color: themeColors.subText }]}>Lookup cash items by keywords.</Text>
          </View>
          <ChevronRight size={16} color={themeColors.subText} />
        </View>
      </View>

      {/* Modal for custom category */}
      <Modal visible={showCatForm} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Category</Text>
              <TouchableOpacity onPress={() => setShowCatForm(false)}>
                <Text style={{ color: "#ef4444", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 14, marginVertical: 14 }}>
              <View>
                <Text style={[styles.modalLabel, { color: themeColors.subText }]}>Emoji Icon</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                  value={catIcon}
                  onChangeText={setCatIcon}
                  maxLength={2}
                />
              </View>
              <View>
                <Text style={[styles.modalLabel, { color: themeColors.subText }]}>Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                  placeholder="e.g. Subscriptions"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  value={catName}
                  onChangeText={setCatName}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddCategory}>
              <Text style={styles.saveBtnText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  themeIcon: {
    marginRight: 6,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 14,
  },
  reminderSchedule: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(100, 100, 100, 0.2)",
    paddingTop: 16,
  },
  reminderHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trashBtn: {
    padding: 6,
  },
  addTimeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  timeInput: {
    width: 80,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  addTimeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  addTimeBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 10,
  },
  limitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  limitPeriod: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  limitValue: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  notesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
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
  catItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  comingSoonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  comingSoonIcon: {
    marginRight: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(100, 100, 100, 0.2)",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
