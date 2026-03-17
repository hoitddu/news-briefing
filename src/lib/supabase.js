import { createClient } from "@supabase/supabase-js";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function createSupabaseClient(keyName, keyValue) {
  return createClient(
    requireEnv("SUPABASE_URL", process.env.SUPABASE_URL),
    requireEnv(keyName, keyValue),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function getSupabase() {
  return createSupabaseClient(
    "SUPABASE_ANON_KEY",
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  );
}

export function getSupabaseAdmin() {
  return createSupabaseClient(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
