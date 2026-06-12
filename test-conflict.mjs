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

  const payload = [
    {
      id: "cat-food",
      user_id: user.id,
      name: "Food & Drinks",
      color: "#10b981",
      icon: "🍔",
    },
  ];

  const { error } = await supabase
    .from("categories")
    .upsert(payload, { onConflict: "user_id, name" });
  console.log("Upsert Error:", error);
}
run();
