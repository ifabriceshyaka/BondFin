/**
 * BondFin Collective — Manual User Confirmation Script
 * -----------------------------------------------------
 * Confirms all existing Supabase users using the Admin API.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// MUST use service role key (admin privileges)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function confirmAllUsers() {
  console.log("🔄 Fetching all users...");

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("❌ Error fetching users:", error.message);
    return;
  }

  const users = data?.users;

  if (!users || users.length === 0) {
    console.log("❌ No users found. This means your service role key is NOT working.");
    return;
  }

  console.log(`Found ${users.length} users. Confirming...\n`);

  for (const user of users) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.log(`❌ Failed to confirm ${user.email}: ${updateError.message}`);
    } else {
      console.log(`✅ Confirmed: ${user.email}`);
    }
  }

  console.log("\n🎉 All users processed.");
}

confirmAllUsers();
