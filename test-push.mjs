import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function run() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user.id;

  const s = {
    settings: {
      currency: "$",
      theme: "system",
      dailyHabitItems: [],
      habitPlans: {},
      importantNoteItems: [],
    },
    categories: [{ id: "cat-1", name: "Custom", color: "#000", icon: "X" }],
    expenses: [{ id: "exp-1", amount: 10, date: "2026-01-01", type: "cash-out" }],
    budgetTargets: [],
    dayFlags: [],
    dayGoals: [],
  };

  // same as pushFullStateToCloud
  const [catRes, expRes, tarRes, flaRes, goaRes] = await Promise.all([
    supabase.from("categories").select("id").eq("user_id", userId),
    supabase.from("expenses").select("id").eq("user_id", userId),
    supabase.from("budget_targets").select("id").eq("user_id", userId),
    supabase.from("day_flags").select("date").eq("user_id", userId),
    supabase.from("day_goals").select("id").eq("user_id", userId),
  ]);

  if (catRes.error) console.log("E1", catRes.error);
  if (expRes.error) console.log("E2", expRes.error);
  if (tarRes.error) console.log("E3", tarRes.error);
  if (flaRes.error) console.log("E4", flaRes.error);
  if (goaRes.error) console.log("E5", goaRes.error);

  const { error: settingsErr } = await supabase.from("user_settings").upsert({
    user_id: userId,
    currency: s.settings.currency,
    theme: s.settings.theme,
    notes: s.settings.notes || "",
    daily_habit_items: s.settings.dailyHabitItems || [],
    habit_plans: s.settings.habitPlans || {},
    important_note_items: s.settings.importantNoteItems || [],
    daily_update_reminders_enabled: s.settings.dailyUpdateRemindersEnabled || false,
    daily_update_reminder_times: s.settings.dailyUpdateReminderTimes || [],
    ai_api_key: s.settings.aiApiKey || null,
    ai_model_name: s.settings.aiModelName || null,
    updated_at: new Date().toISOString(),
  });
  if (settingsErr) console.log("E6", settingsErr);

  const localCatIds = new Set(s.categories.map((x) => x.id));
  const catToDelete = (catRes.data || []).filter((x) => !localCatIds.has(x.id)).map((x) => x.id);
  if (catToDelete.length > 0) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("user_id", userId)
      .in("id", catToDelete);
    if (error) console.log("E7", error);
  }
  if (s.categories.length > 0) {
    const payload = s.categories.map((c) => ({
      id: c.id,
      user_id: userId,
      name: c.name,
      color: c.color,
      icon: c.icon,
    }));
    const { error } = await supabase.from("categories").upsert(payload);
    if (error) console.log("E8", error);
  }

  if (s.expenses.length > 0) {
    const payload = s.expenses.map((e) => ({
      id: e.id,
      user_id: userId,
      category_id: e.categoryId || null,
      amount: e.amount,
      note: e.note || "",
      date: e.date,
      type: e.type || "cash-out",
      created_at: e.createdAt || new Date().toISOString(),
    }));
    const { error } = await supabase.from("expenses").upsert(payload);
    if (error) console.log("E9", error);
  }

  console.log("Done");
}
run();
