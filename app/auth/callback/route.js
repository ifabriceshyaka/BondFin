import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const allowedOtpTypes = new Set(["invite", "recovery", "email"]);
const allowedDestinations = new Set([
  "/dashboard",
  "/auth/update-password",
]);

function redirectToLogin(requestUrl) {
  return NextResponse.redirect(
    new URL("/auth/login?error=auth_callback_failed", requestUrl),
  );
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (
    Boolean(code) === Boolean(tokenHash) ||
    (type !== null && !allowedOtpTypes.has(type)) ||
    (tokenHash && !type)
  ) {
    return redirectToLogin(requestUrl);
  }

  try {
    const supabase = await createClient();
    const verification = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

    if (verification.error) {
      return redirectToLogin(requestUrl);
    }

    const requestedDestination = requestUrl.searchParams.get("next");
    const destination =
      type === "invite" || type === "recovery"
        ? "/auth/update-password"
        : allowedDestinations.has(requestedDestination)
          ? requestedDestination
          : "/dashboard";

    return NextResponse.redirect(new URL(destination, requestUrl));
  } catch {
    return redirectToLogin(requestUrl);
  }
}
