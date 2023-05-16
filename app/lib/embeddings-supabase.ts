import { createClient } from "@supabase/supabase-js";

interface Client {
  url?: string;
  key?: string;
}

const client: Client = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_ANON_KEY,
};

if (!client.url || !client.key) {
  throw new Error("Missing Supabase credentials");
}

function createClient0(url: string, key: string) {
  console.log("[supabase] create client");
  return createClient(url, key);
}

export const supabaseClient = createClient0(client.url!, client.key!);
