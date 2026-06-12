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
  console.log("User:", user.id);
  const [catRes, expRes, tarRes, flaRes, goaRes, setRes] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("budget_targets").select("*").eq("user_id", user.id),
    supabase.from("day_flags").select("*").eq("user_id", user.id),
    supabase.from("day_goals").select("*").eq("user_id", user.id),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  console.log("Errors:");
  if (catRes.error) console.log("Cat Error:", catRes.error);
  if (expRes.error) console.log("Exp Error:", expRes.error);
  if (tarRes.error) console.log("Tar Error:", tarRes.error);
  if (flaRes.error) console.log("Fla Error:", flaRes.error);
  if (goaRes.error) console.log("Goa Error:", goaRes.error);
  if (setRes.error) console.log("Set Error:", setRes.error);
  console.log("Done");
}
run();
