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
import { X } from "lucide-react-native";
import type { Category, Expense } from "../lib/store";
import { todayStr, generateId } from "../lib/store";
import * as Haptics from "expo-haptics";

interface AddExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  categories: Category[];
  currency: string;
  isDark: boolean;
  expenseType: "cash-in" | "cash-out";
  editingExpense?: Expense | null;
}

export function AddExpenseSheet({
  visible,
  onClose,
  onSave,
  categories,
  currency,
  isDark,
  expenseType,
  editingExpense,
}: AddExpenseSheetProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setCategoryId(editingExpense.categoryId);
      setNote(editingExpense.note);
      setDate(editingExpense.date);
    } else {
      setAmount("");
      setCategoryId(categories[0]?.id || "");
      setNote("");
      setDate(todayStr());
    }
  }, [editingExpense, visible, categories]);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Please select a category");
      return;
    }

    const savedExpense: Expense = {
      id: editingExpense?.id || generateId(),
      amount: parsedAmount,
      categoryId,
      note: note.trim(),
      date,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      type: expenseType,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(savedExpense);
    onClose();
  };

  const themeColors = {
    bg: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f8fafc" : "#0f172a",
    inputBg: isDark ? "#334155" : "#f1f5f9",
    inputBorder: isDark ? "#475569" : "#cbd5e1",
    inputText: isDark ? "#ffffff" : "#000000",
    label: isDark ? "#94a3b8" : "#64748b",
  };

  const activeColor = expenseType === "cash-in" ? "#10b981" : "#ef4444";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.sheetContainer, { backgroundColor: themeColors.bg }]}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              {editingExpense
                ? "Edit Entry"
                : expenseType === "cash-in"
                ? "Add Income"
                : "Add Expense"}
            </Text>
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

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {/* Amount Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.label }]}>
                Amount ({currency})
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.inputText,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Category selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.label }]}>
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryBtn,
                        {
                          backgroundColor: isSelected
                            ? cat.color
                            : themeColors.inputBg,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategoryId(cat.id);
                      }}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.categoryName,
                          { color: isSelected ? "#ffffff" : themeColors.text },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Note input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.label }]}>
                Note (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.inputText,
                  },
                ]}
                placeholder="Coffee, rent, utilities..."
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Date Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.label }]}>
                Date
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.inputText,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: activeColor }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>
                {editingExpense
                  ? "Save Changes"
                  : expenseType === "cash-in"
                  ? "Save Income"
                  : "Save Expense"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
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
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  amountInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "700",
    borderWidth: 1,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  categoryScroll: {
    paddingRight: 10,
    gap: 8,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
