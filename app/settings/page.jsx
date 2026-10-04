import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ThemeToggle from "@/app/dashboard/ThemeToggle";
import MfaSettings from "./MfaSettings";

async function updateBasicDetails(formData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (firstName.length < 1 || firstName.length > 50 || lastName.length > 50) {
    redirect("/settings?error=invalid-name");
  }

  const { error } = await supabase
    .from("Users")
    .update({ full_name: fullName })
    .eq("email", user.email);

  if (error) {
    console.error("Settings profile update error:", error);
    redirect("/settings?error=save-failed");
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (metadataError) {
    console.error("Settings auth metadata sync error:", metadataError);
  }

  redirect("/settings?saved=1");
}

async function updateNotificationPreferences(formData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("NotificationPreferences").upsert(
    {
      user_id: user.id,
      payment_updates: formData.get("payment_updates") === "on",
      receipt_updates: formData.get("receipt_updates") === "on",
      cycle_updates: formData.get("cycle_updates") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Notification preferences update error:", error);
    redirect("/settings?error=notifications-save-failed");
  }

  redirect("/settings?saved=notifications#notifications");
}

async function requestAccountDeletion(formData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (String(formData.get("confirmation") || "") !== "DELETE") {
    redirect("/settings?error=deletion-confirmation#account-data");
  }

  const { error } = await supabase
    .from("AccountDeletionRequests")
    .insert({ user_id: user.id });

  if (error) {
    if (error.code === "23505") {
      redirect("/settings?deletion=pending#account-data");
    }
    console.error("Account deletion request error:", error);
    redirect("/settings?error=deletion-request-failed#account-data");
  }

  redirect("/settings?deletion=requested#account-data");
}

async function updatePaymentMethods(formData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const zelle = String(formData.get("zelle_contact") || "").trim();
  const cashapp = String(formData.get("cashapp_tag") || "").trim();
  if (
    zelle.length > 100 ||
    (zelle && zelle.length < 3) ||
    (cashapp && !/^\$?[A-Za-z][A-Za-z0-9_]{0,19}$/.test(cashapp))
  ) {
    redirect("/settings?error=payment-methods-invalid#payout");
  }

  const { error } = await supabase.rpc("set_my_payment_methods", {
    p_zelle_contact: zelle || null,
    p_cashapp_tag: cashapp || null,
  });
  if (error) {
    console.error("Payment methods save error:", error);
    redirect("/settings?error=payment-methods-failed#payout");
  }
  redirect("/settings?saved=payment-methods#payout");
}

async function signOutOtherSessions() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    console.error("Other session revocation error:", error);
    redirect("/settings?error=sessions-failed#security");
  }

  redirect("/settings?saved=sessions#security");
}

function SettingsNavLink({ href, icon, children, active = false }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
        active
          ? "bg-white font-semibold text-teal-900 shadow-sm dark:bg-slate-800 dark:text-teal-200"
          : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <span className="w-4 text-center text-xs" aria-hidden="true">
        {icon}
      </span>
      {children}
    </Link>
  );
}

function SettingsSection({ id, title, description, children, isLast = false }) {
  return (
    <section
      id={id}
      className={
        isLast
          ? "scroll-mt-6 py-7 pb-0"
          : "scroll-mt-6 border-b border-[#e9e2d7] py-7 dark:border-slate-800"
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(150px,0.75fr)_minmax(0,1.5fr)] sm:gap-8">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default async function SettingsPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: profile, error: profileError },
    resolvedSearchParams,
    { data: notificationPreferences, error: preferencesError },
    { data: deletionRequest, error: deletionError },
    { data: factorsData, error: factorsError },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("Users")
      .select("full_name, email")
      .eq("email", user.email)
      .maybeSingle(),
    searchParams,
    supabase
      .from("NotificationPreferences")
      .select("payment_updates, receipt_updates, cycle_updates")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("AccountDeletionRequests")
      .select("id, status, requested_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .maybeSingle(),
    supabase.auth.mfa.listFactors(),
    supabase
      .from("MemberPaymentMethods")
      .select("zelle_contact, cashapp_tag")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error("Settings profile fetch error:", profileError);
  }
  if (preferencesError)
    console.error("Notification preferences fetch error:", preferencesError);
  if (deletionError)
    console.error("Account deletion status fetch error:", deletionError);
  if (factorsError) console.error("MFA factor fetch error:", factorsError);

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
  const lastName = lastNameParts.join(" ");
  const email = profile?.email || user.email || "";
  const displayName = fullName || "Member";
  const message =
    resolvedSearchParams?.saved === "1"
      ? "Your basic details were saved."
      : resolvedSearchParams?.saved === "payment-methods"
        ? "Your payment details were saved."
        : resolvedSearchParams?.error === "payment-methods-invalid"
          ? "Enter a valid Zelle email or phone and a Cash App $cashtag."
          : resolvedSearchParams?.error === "payment-methods-failed"
            ? "Unable to save payment details. Apply the payment hardening migration and try again."
      : resolvedSearchParams?.saved === "notifications"
        ? "Notification preferences saved."
        : resolvedSearchParams?.saved === "sessions"
          ? "Other active sessions have been signed out."
          : resolvedSearchParams?.error === "invalid-name"
            ? "Enter a first name up to 50 characters and a last name up to 50 characters."
            : resolvedSearchParams?.error === "save-failed"
              ? "Unable to save your details. Please try again."
              : resolvedSearchParams?.error === "notifications-save-failed"
                ? "Unable to save notification preferences. Apply the account settings migration and try again."
                : resolvedSearchParams?.error === "sessions-failed"
                  ? "Unable to sign out other sessions. Please try again."
                  : "";
  const messageIsError = resolvedSearchParams?.error;
  const deletionMessage =
    resolvedSearchParams?.deletion === "requested"
      ? "Your deletion request has been recorded. It will be reviewed before any account data is removed."
      : resolvedSearchParams?.deletion === "pending"
        ? "You already have an open account deletion request."
        : resolvedSearchParams?.error === "deletion-confirmation"
          ? "Type DELETE exactly to confirm the request."
          : resolvedSearchParams?.error === "deletion-request-failed"
            ? "Unable to submit the deletion request. Apply the account settings migration and try again."
            : "";
  const notificationValues = notificationPreferences || {
    payment_updates: false,
    receipt_updates: false,
    cycle_updates: false,
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-slate-900 dark:bg-[#101918] dark:text-slate-100 lg:flex">
      <aside className="border-b border-[#e8e0d2] bg-[#f1eadf] dark:border-slate-800 dark:bg-[#172321] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <Link
          href="/dashboard"
          className="flex h-14 items-center gap-3 border-b border-slate-200 px-5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
        >
          <span aria-hidden="true">←</span> Back to dashboard
        </Link>
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="grid size-7 place-items-center rounded-full bg-teal-800 text-[10px] font-bold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
            {displayName}
          </span>
        </div>
        <nav
          aria-label="Settings navigation"
          className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pb-4 lg:flex lg:flex-col lg:gap-1 lg:overflow-y-auto"
        >
          <div className="hidden px-2.5 pb-1 text-[11px] font-semibold uppercase text-slate-500 lg:block dark:text-slate-400">
            My account
          </div>
          <SettingsNavLink href="#basic" icon="▤" active>
            Basic details
          </SettingsNavLink>
          <SettingsNavLink href="#profile" icon="◎">
            Profile picture
          </SettingsNavLink>
          <div className="hidden px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-500 lg:block dark:text-slate-400">
            Preferences
          </div>
          <SettingsNavLink href="#notifications" icon="♧">
            Notifications
          </SettingsNavLink>
          <SettingsNavLink href="#appearance" icon="☼">
            Appearance
          </SettingsNavLink>
          <SettingsNavLink href="#payout" icon="◇">
            Payout account
          </SettingsNavLink>
          <div className="hidden px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-500 lg:block dark:text-slate-400">
            Security and privacy
          </div>
          <SettingsNavLink href="#security" icon="◇">
            Security
          </SettingsNavLink>
          <SettingsNavLink href="#privacy" icon="▣">
            Privacy
          </SettingsNavLink>
          <SettingsNavLink href="#account-data" icon="↓">
            Data and account
          </SettingsNavLink>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 bg-[#f8f5ee] px-4 pb-10 pt-5 sm:px-7 lg:ml-60 lg:px-10 dark:bg-[#101918]">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex items-center justify-between gap-3 border-b border-[#e9e2d7] pb-5 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase text-teal-800 dark:text-teal-300">
                Your account
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                Settings
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Make your BondFin account feel like yours.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-[#e3d9c9] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#fffdf9] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:inline-flex"
            >
              ← Dashboard
            </Link>
          </header>

          <div className="divide-y divide-[#e9e2d7] dark:divide-slate-800">
            {message && (
              <p
                role="status"
                className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
                  messageIsError
                    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                    : "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                }`}
              >
                {message}
              </p>
            )}

            <form action={updateBasicDetails} className="space-y-5">
              <SettingsSection
                id="basic"
                title="Basic details"
                description="Your name is shown to other members in the directory."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    First name
                    <input
                      name="first_name"
                      type="text"
                      defaultValue={firstName}
                      minLength={1}
                      maxLength={50}
                      required
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Last name
                    <input
                      name="last_name"
                      type="text"
                      defaultValue={lastName}
                      maxLength={50}
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
                    Email address
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    />
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      Email address is used to sign in and cannot be changed
                      here.
                    </span>
                  </label>
                  <div className="flex items-end gap-3 sm:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
                    >
                      Save changes
                    </button>
                    <Link
                      href="/profile"
                      className="inline-flex h-10 items-center text-sm font-medium text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
                    >
                      Profile picture settings
                    </Link>
                  </div>
                </div>
              </SettingsSection>
            </form>

            <SettingsSection
              id="notifications"
              title="Email notifications"
              description="Choose which account emails you receive."
            >
              <form
                action={updateNotificationPreferences}
                className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
              >
                {[
                  [
                    "payment_updates",
                    "Payment updates",
                    "Receive email when a contribution or payment is recorded.",
                  ],
                  [
                    "receipt_updates",
                    "Receipts",
                    "Receive an email when a receipt is available.",
                  ],
                  [
                    "cycle_updates",
                    "Uruziga reminders",
                    "Receive email reminders about Uruziga dates.",
                  ],
                ].map(([name, title, description]) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-start gap-3"
                  >
                    <input
                      name={name}
                      type="checkbox"
                      defaultChecked={notificationValues[name]}
                      className="mt-0.5 size-4 accent-teal-800"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  These preferences are saved to your account. They do not
                  enable email delivery until BondFin’s notification sender is
                  configured.
                </p>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-teal-800 px-3.5 text-sm font-semibold text-white hover:bg-teal-900 dark:bg-teal-700 dark:hover:bg-teal-600"
                >
                  Save preferences
                </button>
              </form>
            </SettingsSection>

            <SettingsSection
              id="appearance"
              title="Appearance"
              description="Set the color theme for your dashboard. This preference is saved in this browser."
            >
              <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Light and dark mode
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Switch between a light or dark dashboard.
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </SettingsSection>

            <SettingsSection
              id="security"
              title="Security"
              description="Add a second sign-in factor and manage other active sessions."
            >
              <div className="space-y-4">
                <MfaSettings factors={factorsData?.totp || []} />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Active sessions
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Sign out from other devices and browsers.
                    </p>
                  </div>
                  <form action={signOutOtherSessions}>
                    <button
                      type="submit"
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Sign out other sessions
                    </button>
                  </form>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Request a password reset
                </Link>
              </div>
            </SettingsSection>

            <SettingsSection
              id="profile"
              title="Profile picture"
              description="Manage the picture visible in the member directory."
            >
              <Link
                href="/profile"
                className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Manage profile picture
              </Link>
            </SettingsSection>

            <SettingsSection
              id="privacy"
              title="Privacy"
              description="Your financial data remains limited to your own account."
            >
              <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950 dark:bg-teal-950/40 dark:text-teal-100">
                Row-level security restricts your contributions, payout records,
                and transactions to your signed-in account. The member directory
                contains names only.
              </p>
            </SettingsSection>

            <SettingsSection
              id="payout"
              title="Payment details"
              description="Where circle members send your contribution when you are the Uruziga recipient."
            >
              <form action={updatePaymentMethods} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Zelle email or phone
                  <input
                    name="zelle_contact"
                    defaultValue={paymentMethods?.zelle_contact || ""}
                    maxLength={100}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Cash App $cashtag
                  <input
                    name="cashapp_tag"
                    defaultValue={paymentMethods?.cashapp_tag || ""}
                    maxLength={21}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Shown only to signed-in members while you are the recipient
                  for the active Uruziga. No bank account details are collected.
                  Leave both empty to remove them.
                </p>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
                >
                  Save payment details
                </button>
              </form>
            </SettingsSection>

            <SettingsSection
              id="account-data"
              title="Data and account"
              description="Download a copy of your records or request account deletion."
              isLast
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 px-4 py-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Export your data
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Download your profile, notification preferences,
                    contributions, payout rows, and transactions as a private
                    JSON file.
                  </p>
                  <a
                    href="/api/account/export"
                    className="mt-3 inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Download my data
                  </a>
                </div>

                <div className="rounded-lg border border-rose-200 px-4 py-4 dark:border-rose-900">
                  <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                    Request account deletion
                  </h3>
                  {deletionRequest ? (
                    <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      A deletion request is {deletionRequest.status}. It was
                      submitted{" "}
                      {new Date(
                        deletionRequest.requested_at,
                      ).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      . An administrator must review it; this does not delete
                      your account immediately.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        This submits a request for administrator review. Your
                        financial records are not deleted automatically, so
                        records and retention requirements can be reviewed
                        first.
                      </p>
                      {deletionMessage && (
                        <p
                          role="status"
                          className="mt-3 text-xs font-medium text-rose-800 dark:text-rose-200"
                        >
                          {deletionMessage}
                        </p>
                      )}
                      <form
                        action={requestAccountDeletion}
                        className="mt-3 flex flex-wrap items-end gap-3"
                      >
                        <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          Type DELETE to confirm
                          <input
                            name="confirmation"
                            autoComplete="off"
                            required
                            pattern="DELETE"
                            className="h-9 w-44 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                        </label>
                        <button
                          type="submit"
                          className="h-9 rounded-md bg-rose-700 px-3.5 text-sm font-semibold text-white hover:bg-rose-800"
                        >
                          Submit deletion request
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </main>
    </div>
  );
}
