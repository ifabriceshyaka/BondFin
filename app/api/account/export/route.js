import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const [
    profileResult,
    contributionResult,
    payoutResult,
    transactionResult,
    preferencesQueryResult,
  ] = await Promise.all([
    supabase
      .from("Users")
      .select("full_name, email, profile_picture")
      .eq("email", user.email)
      .maybeSingle(),
    supabase
      .from("Contributions")
      .select("amount, cycle_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("PayoutSchedule")
      .select("round_number, payout_date, created_at")
      .eq("recipient_user_id", user.id)
      .order("payout_date", { ascending: true }),
    supabase
      .from("Transactions")
      .select("id, type, amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("NotificationPreferences")
      .select("payment_updates, receipt_updates, cycle_updates, updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const preferencesResult =
    preferencesQueryResult.error &&
    ["42P01", "PGRST205"].includes(preferencesQueryResult.error.code)
      ? { data: null, error: null }
      : preferencesQueryResult;

  const queryError = [
    profileResult,
    contributionResult,
    payoutResult,
    transactionResult,
    preferencesResult,
  ].find((result) => result.error)?.error;

  if (queryError) {
    console.error("Account export query error:", queryError);
    return Response.json(
      { error: "Unable to export account data." },
      { status: 500 },
    );
  }

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profileResult.data,
    notification_preferences: preferencesResult.data,
    contributions: contributionResult.data,
    payout_schedule: payoutResult.data,
    transactions: transactionResult.data,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="bondfin-account-export.json"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
