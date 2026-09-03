/**
 * BondFin Collective — Member Account Generator
 * ------------------------------------------------
 * This script automatically creates 10 member accounts
 * using Supabase's Admin API. It bypasses email confirmation
 * and avoids rate limits by using the Service Role Key.
 *
 * You run this script ONCE to initialize your project.
 * Command:
 *      node scripts/createMembers.js
 *
 * Requirements:
 * - .env.local must contain:
 *      NEXT_PUBLIC_SUPABASE_URL=
 *      SUPABASE_SERVICE_ROLE_KEY=
 *
 * Notes:
 * - NEVER expose the service role key in frontend code.
 * - This script runs ONLY in Node (backend environment).
 */

import dotenv from "dotenv";
// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client using the Service Role Key
// This key allows admin-level operations such as creating users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List of BondFin member emails to create
const members = [
  "member1@bondfin.com",
  "member2@bondfin.com",
  "member3@bondfin.com",
  "member4@bondfin.com",
  "member5@bondfin.com",
  "member6@bondfin.com",
  "member7@bondfin.com",
  "member8@bondfin.com",
  "member9@bondfin.com",
  "member10@bondfin.com",
];

/**
 * Creates all member accounts using Supabase Admin API.
 * Each member receives:
 * - email
 * - default password: bondfin123
 * - email_confirm: true (no confirmation email sent)
 */
async function createAccounts() {
  console.log("🚀 Starting BondFin member creation...\n");

  for (const email of members) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: "bondfin123",
      email_confirm: true, // bypass confirmation email
    });

    if (error) {
      console.log(`❌ Error creating ${email}: ${error.message}`);
    } else {
      console.log(`✅ Created: ${email}`);
    }
  }

  console.log("\n🎉 Member creation process completed.");
}

// Execute the script
createAccounts();
