require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    const { error: anonErr } = await supabase.auth.signInAnonymously();
    if (anonErr) {
      console.log("Anon Error:", anonErr);
      return;
    }
  }
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    console.log("User Error:", userErr);
    return;
  }
  console.log("User ID:", user.id);

  const [catRes, expRes, tarRes, flaRes, goaRes, setRes] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("budget_targets").select("*").eq("user_id", user.id),
    supabase.from("day_flags").select("*").eq("user_id", user.id),
    supabase.from("day_goals").select("*").eq("user_id", user.id),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (catRes.error) console.log("Cat Error:", catRes.error);
  if (expRes.error) console.log("Exp Error:", expRes.error);
  if (tarRes.error) console.log("Tar Error:", tarRes.error);
  if (flaRes.error) console.log("Fla Error:", flaRes.error);
  if (goaRes.error) console.log("Goa Error:", goaRes.error);
  if (setRes.error) console.log("Set Error:", setRes.error);

  console.log("Done");
}
run();
