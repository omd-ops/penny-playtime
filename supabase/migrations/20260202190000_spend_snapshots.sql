-- Simplified and normalized schema for Penny Pay (SpendWise)
-- Replaces monolithic JSON snapshots with separate tables.

-- 1. Create Tables

-- 1.1 User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL DEFAULT '$',
  theme VARCHAR(20) NOT NULL DEFAULT 'system',
  notes TEXT NOT NULL DEFAULT '',
  daily_habit_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  habit_plans JSONB NOT NULL DEFAULT '{}'::jsonb,
  important_note_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_update_reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_update_reminder_times JSONB NOT NULL DEFAULT '["09:00", "14:00", "19:00"]'::jsonb,
  ai_api_key TEXT,
  ai_model_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 1.3 Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories (id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'cash-out' CHECK (type IN ('cash-in', 'cash-out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Budget Targets Table
CREATE TABLE IF NOT EXISTS public.budget_targets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'monthly', 'yearly')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  UNIQUE(user_id, period)
);

-- 1.5 Day Flags Table
CREATE TABLE IF NOT EXISTS public.day_flags (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  met_target BOOLEAN NOT NULL DEFAULT false,
  label TEXT,
  importance VARCHAR(50),
  emoji VARCHAR(50),
  completed_habit_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (user_id, date)
);

-- 1.6 Day Goals Table
CREATE TABLE IF NOT EXISTS public.day_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false
);


-- 2. Row Level Security (RLS) Configuration

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_goals ENABLE ROW LEVEL SECURITY;

-- 2.1 Policies for user_settings
CREATE POLICY "user_settings_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- 2.2 Policies for categories
CREATE POLICY "categories_select_own" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- 2.3 Policies for expenses
CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- 2.4 Policies for budget_targets
CREATE POLICY "budget_targets_select_own" ON public.budget_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budget_targets_insert_own" ON public.budget_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_targets_update_own" ON public.budget_targets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_targets_delete_own" ON public.budget_targets FOR DELETE USING (auth.uid() = user_id);

-- 2.5 Policies for day_flags
CREATE POLICY "day_flags_select_own" ON public.day_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "day_flags_insert_own" ON public.day_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_flags_update_own" ON public.day_flags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_flags_delete_own" ON public.day_flags FOR DELETE USING (auth.uid() = user_id);

-- 2.6 Policies for day_goals
CREATE POLICY "day_goals_select_own" ON public.day_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "day_goals_insert_own" ON public.day_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_goals_update_own" ON public.day_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_goals_delete_own" ON public.day_goals FOR DELETE USING (auth.uid() = user_id);


-- 3. Automatic User Initialization (Trigger)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default categories
  INSERT INTO public.categories (id, user_id, name, color, icon)
  VALUES
    (gen_random_uuid()::text, new.id, 'Food & Drinks', '#10b981', '🍔'),
    (gen_random_uuid()::text, new.id, 'Transport', '#3b82f6', '🚌'),
    (gen_random_uuid()::text, new.id, 'Shopping', '#f59e0b', '🛍️'),
    (gen_random_uuid()::text, new.id, 'Bills & Utilities', '#ef4444', '📱'),
    (gen_random_uuid()::text, new.id, 'Entertainment', '#8b5cf6', '🎬'),
    (gen_random_uuid()::text, new.id, 'Health', '#ec4899', '💊'),
    (gen_random_uuid()::text, new.id, 'Education', '#06b6d4', '📚'),
    (gen_random_uuid()::text, new.id, 'Salary', '#22c55e', '🤑'),
    (gen_random_uuid()::text, new.id, 'Grooming', '#f472b6', '✂️'),
    (gen_random_uuid()::text, new.id, 'Other', '#6b7280', '📦')
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. Indexes for Performance

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_day_goals_user_date ON public.day_goals (user_id, date);

-- 5. Grant Privileges on Tables to API Roles
GRANT ALL ON TABLE public.user_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.expenses TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.budget_targets TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.day_flags TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.day_goals TO postgres, anon, authenticated, service_role;
