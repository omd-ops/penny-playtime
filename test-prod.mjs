import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function run() {
  const { data, error } = await supabase.from("user_settings").select("*");
  if (error) {
    console.error("user_settings Error:", error);
  } else {
    console.log("user_settings Data length:", data.length);
  }
}
run();
