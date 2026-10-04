import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { formatUruziga } from "@/lib/formatUruziga";
import ThemeToggle from "./ThemeToggle";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const circleAvatarStyles = [
  "bg-[#d9e8df] text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  "bg-[#f4e6d8] text-[#714a32] dark:bg-amber-950 dark:text-amber-200",
  "bg-[#e9e3cf] text-[#6b5b2b] dark:bg-yellow-950 dark:text-yellow-200",
  "bg-[#e7ddd9] text-[#764b3f] dark:bg-rose-950 dark:text-rose-200",
  "bg-[#dce6ec] text-[#40596a] dark:bg-sky-950 dark:text-sky-200",
];

function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount));
}

const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatDate(value) {
  if (!value) return "Not scheduled";
  // Date-only values (YYYY-MM-DD) are calendar dates, not instants.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return (isDateOnly ? utcDateFormatter : dateFormatter).format(new Date(value));
}

function DashboardCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-[#e9e2d7] bg-white shadow-[0_8px_30px_rgba(92,73,48,0.055)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 ${className}`}
    >
      {children}
    </section>
  );
}

function CycleOverview({
  cycle,
  cycleError,
  contribution,
  contributionError,
  paymentReport,
  paymentReportError,
  incomingPaymentReports,
  incomingPaymentReportsError,
  isCycleRecipient,
  activeRecipientError,
  reportContributionAction,
  confirmPaymentAction,
  withdrawPaymentAction,
  rejectPaymentAction,
  recipientMethods,
  recipient,
  recipientError,
  recipientScheduleIssue,
  payout,
  payoutError,
}) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efe7db] bg-[#fffdf9] px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-800 dark:text-teal-300">
            Your circle
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            {cycle ? formatUruziga(cycle.cycle_number) : "Uruziga overview"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {cycleError
              ? "Uruziga details could not be loaded."
              : cycle
                ? `${formatDate(cycle.start_date)} to ${formatDate(cycle.due_date)}`
                : "There are no Uruziga rounds to display yet."}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            cycleError
              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
              : cycle?.status === "active"
                ? "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {cycleError ? "Unavailable" : cycle?.status || "No Uruziga"}
        </span>
      </div>
      <div className="grid gap-4 border-b border-[#efe7db] bg-[#f5faf7] px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 dark:border-slate-800 dark:bg-teal-950/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
            Uruziga recipient
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            {cycleError
              ? "Unavailable"
              : recipientError
                ? "Recipient unavailable"
                : recipientScheduleIssue
                  ? "Schedule needs attention"
                  : recipient?.recipient_name ||
                    (cycle?.status === "active"
                      ? "Not scheduled yet"
                      : cycle
                      ? "Active Uruziga only"
                        : "No active Uruziga")}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {cycleError || recipientError
              ? "Recipient details could not be loaded."
              : recipientScheduleIssue
                ? "More than one recipient is assigned to this Uruziga."
                : recipient
                  ? `Transfers for ${formatUruziga(cycle.cycle_number)} go directly to this member.`
                  : cycle?.status === "active"
                    ? "The recipient has not been added to the payout schedule."
                    : cycle
                        ? "Recipient details are only shown for the active Uruziga."
                      : "A recipient will appear when a Uruziga is active."}
          </p>
        </div>
        <div
          id="due-date"
          className="rounded-xl border border-teal-900/10 bg-white px-4 py-3 sm:min-w-52 dark:border-teal-100/10 dark:bg-slate-900"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Contribution due
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            {cycleError ? "Unavailable" : formatDate(cycle?.due_date)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {cycle
              ? `${formatCurrency(cycle.contribution_amount)} for ${formatUruziga(cycle.cycle_number)}`
              : "No due date available"}
          </p>
        </div>
        {cycle && cycle.status !== "active" ? (
          <p className="text-xs leading-5 text-slate-500 sm:col-span-2 dark:text-slate-400">
            Recipient payment details are only available for the active Uruziga.
          </p>
        ) : recipientMethods &&
        (recipientMethods.zelle_contact || recipientMethods.cashapp_tag) &&
        !isCycleRecipient ? (
          <div className="rounded-xl border border-teal-900/10 bg-white px-4 py-3 text-sm sm:col-span-2 dark:border-teal-100/10 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Send your contribution to {recipient?.recipient_name || "the recipient"}
            </p>
            {recipientMethods.zelle_contact && (
              <p className="mt-2 text-slate-800 dark:text-slate-100">
                Zelle: <strong>{recipientMethods.zelle_contact}</strong>
              </p>
            )}
            {recipientMethods.cashapp_tag && cycle && (
              <p className="mt-1 text-slate-800 dark:text-slate-100">
                Cash App:{" "}
                <a
                  href={`https://cash.app/${encodeURIComponent(recipientMethods.cashapp_tag)}/${Number(cycle.contribution_amount)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal-800 underline dark:text-teal-300"
                >
                  {recipientMethods.cashapp_tag}
                </a>
              </p>
            )}
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Check the name and handle with the recipient before sending. A
              sent transfer is not confirmed here until the recipient verifies
              it.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-5 text-slate-500 sm:col-span-2 dark:text-slate-400">
            {isCycleRecipient
              ? "Add your Zelle or Cash App details in Settings so members know where to send."
              : "The recipient has not listed payment details in BondFin yet. Use your circle's agreed transfer method; a sent transfer is not confirmed here."}
          </p>
        )}
      </div>
      <dl className="grid divide-y divide-[#efe7db] sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
        <div id="contribution" className="px-4 py-4 sm:px-5">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your contribution
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {cycleError || contributionError
              ? "Unavailable"
              : contribution
                ? formatCurrency(contribution.amount)
                : cycle
                  ? formatCurrency(cycle.contribution_amount)
                  : "No Uruziga"}
          </dd>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {cycleError || contributionError
              ? "Contribution details could not be loaded."
              : paymentReportError
                ? "Payment status could not be loaded."
                : contribution
                  ? paymentReport?.status === "retained"
                    ? `Retained by you as recipient · ${formatDate(contribution.created_at)}`
                    : `Received · ${formatDate(contribution.created_at)}`
                  : paymentReport?.status === "sent"
                  ? cycle?.status === "active"
                    ? `Reported sent ${formatDate(paymentReport.sent_at)} · Awaiting recipient confirmation`
                    : `Reported sent ${formatDate(paymentReport.sent_at)} · Follow up with the recipient`
                  : paymentReport?.status === "rejected"
                    ? cycle?.status === "active"
                      ? "The recipient did not confirm receiving this transfer. Check with them, then report again once it is sent."
                      : "The recipient marked this transfer as not received."
                      : paymentReport?.status === "withdrawn"
                        ? "You withdrew your report. Nothing is recorded as paid."
                    : paymentReport?.status === "received"
                      ? "Receipt confirmed; contribution record unavailable."
                    : cycle
                      ? cycle.status === "active"
                        ? "Not reported as sent yet"
                        : `No contribution was recorded for ${formatUruziga(cycle.cycle_number)}.`
                      : "No contribution due."}
          </p>
          {cycle?.status === "active" &&
            !cycleError &&
            !contributionError &&
            !paymentReportError &&
            !recipientError &&
            !activeRecipientError &&
            !contribution &&
            (!paymentReport ||
              ["withdrawn", "rejected"].includes(paymentReport.status)) &&
            (recipient || isCycleRecipient) && (
              <form action={reportContributionAction} className="mt-4 space-y-3">
                <input
                  type="hidden"
                  name="cycle_number"
                  value={cycle.cycle_number}
                />
                {!isCycleRecipient && (
                  <>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                      How did you send it?
                      <select
                        name="payment_method"
                        required
                        defaultValue=""
                        className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        <option value="zelle">Zelle</option>
                        <option value="cash_app">Cash App</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                      Transfer reference (confirmation number or Cash App
                      payment ID)
                      <input
                        name="transfer_reference"
                        required
                        minLength={4}
                        maxLength={64}
                        autoComplete="off"
                        className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-xs leading-5 text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        name="confirm_sent"
                        required
                        className="mt-1 size-4 accent-teal-800"
                      />
                      I have already sent{" "}
                      {formatCurrency(cycle.contribution_amount)} to the
                      recipient. I am not reporting a payment I plan to make
                      later.
                    </label>
                  </>
                )}
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
                >
                  {isCycleRecipient
                    ? "Record my contribution as retained"
                    : "I’ve sent my contribution"}
                </button>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {isCycleRecipient
                    ? `As the recipient for ${formatUruziga(cycle.cycle_number)}, your contribution is retained rather than transferred.`
                    : "This records your report only. It does not confirm receipt."}
                </p>
              </form>
            )}
          {cycle?.status === "active" &&
            !contribution &&
            paymentReport?.status === "sent" && (
              <form action={withdrawPaymentAction} className="mt-3">
                <input type="hidden" name="report_id" value={paymentReport.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold text-slate-600 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Withdraw this report (I made a mistake)
                </button>
              </form>
            )}
          {cycle?.status === "active" &&
            !contribution &&
            !paymentReport &&
            (paymentReportError || recipientError || activeRecipientError) && (
              <p
                role="alert"
                className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200"
              >
                Payment reporting is temporarily unavailable. No payment
                status was changed.
              </p>
            )}
        </div>
        <div id="payout" className="px-4 py-4 sm:px-5">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your payout
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {payoutError
              ? "Unavailable"
              : payout
                ? formatUruziga(payout.round_number)
                : "Not scheduled"}
          </dd>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {payoutError
              ? "Payout details could not be loaded."
              : payout
                ? `Scheduled for ${formatDate(payout.payout_date)}`
                : "No payout date is available."}
          </p>
        </div>
      </dl>
      {isCycleRecipient && cycle?.status === "active" && (
        <section
          aria-labelledby="payment-confirmations-heading"
          className="border-t border-[#efe7db] px-4 py-4 sm:px-6 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="payment-confirmations-heading"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Member transfer reports
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Only you, as the scheduled recipient, can confirm these transfers.
            </span>
          </div>
          {incomingPaymentReportsError ? (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            >
              Transfer reports could not be loaded.
            </p>
          ) : incomingPaymentReports.length ? (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {incomingPaymentReports.map((report) => (
                <li
                  key={report.report_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {report.contributor_name} · {formatCurrency(report.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {report.status === "received"
                        ? `Received ${formatDate(report.received_at)}`
                        : report.status === "retained"
                          ? "Retained by the recipient"
                          : report.status === "rejected"
                            ? "Marked as not received"
                            : `Reported sent ${formatDate(report.sent_at)}`}
                    </p>
                    {report.transfer_reference && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {report.payment_method === "cash_app"
                          ? "Cash App"
                          : "Zelle"}{" "}
                        reference: {report.transfer_reference}
                      </p>
                    )}
                  </div>
                  {report.status === "sent" && (
                    <div className="flex flex-wrap items-center gap-2">
                    <form action={rejectPaymentAction}>
                      <input
                        type="hidden"
                        name="report_id"
                        value={report.report_id}
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Not received
                      </button>
                    </form>
                    <form action={confirmPaymentAction}>
                      <input
                        type="hidden"
                        name="report_id"
                        value={report.report_id}
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-teal-800 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-teal-500 dark:text-teal-200 dark:hover:bg-teal-950/40"
                      >
                        Confirm received
                      </button>
                    </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No members have reported a transfer for this Uruziga yet.
            </p>
          )}
        </section>
      )}
    </DashboardCard>
  );
}

function QuickActionButton({ href, icon, title, detail }) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/40"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-base text-slate-700 group-hover:bg-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-slate-700"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      </span>
      <span
        className="text-lg text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
        aria-hidden="true"
      >
        ›
      </span>
    </Link>
  );
}

function MemberAvatar({ member, size = "size-8" }) {
  if (member.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt=""
        width="40"
        height="40"
        unoptimized
        className={`${size} shrink-0 rounded-full border border-white object-cover shadow-sm dark:border-slate-800`}
      />
    );
  }

  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full text-xs font-semibold ${member.tone}`}
      aria-hidden="true"
    >
      {member.initials}
    </span>
  );
}

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

async function reportCycleContribution(formData) {
  "use server";

  const cycleNumber = Number(formData.get("cycle_number"));
  if (!Number.isSafeInteger(cycleNumber) || cycleNumber < 1) {
    redirect("/dashboard?payment=invalid#contribution");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const method = String(formData.get("payment_method") || "");
  const reference = String(formData.get("transfer_reference") || "").trim();
  const confirmed = formData.get("confirm_sent") === "on";
  const hasDetails = ["zelle", "cash_app"].includes(method);
  if (hasDetails && (reference.length < 4 || reference.length > 64 || !confirmed)) {
    redirect("/dashboard?payment=invalid#contribution");
  }

  const { data, error } = await supabase.rpc(
    "submit_active_cycle_contribution",
    {
      p_cycle_number: cycleNumber,
      p_payment_method: hasDetails ? method : null,
      p_transfer_reference: hasDetails ? reference : null,
    },
  );
  const report = Array.isArray(data) ? data[0] : null;
  if (error || !report) {
    if (error) console.error("Contribution report submission error:", error);
    redirect("/dashboard?payment=report-failed#contribution");
  }
  if (!["sent", "received", "retained"].includes(report.payment_status)) {
    console.error("Contribution report RPC returned an unknown status.");
    redirect("/dashboard?payment=report-failed#contribution");
  }

  revalidatePath("/dashboard");
  const nextStatus =
    report.payment_status === "retained"
      ? "retained"
      : report.payment_status === "received"
        ? "received"
        : "sent";
  redirect(
    `/dashboard?payment=${nextStatus}#contribution`,
  );
}

async function confirmCycleContribution(formData) {
  "use server";

  const reportId = String(formData.get("report_id") || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      reportId,
    )
  ) {
    redirect("/dashboard?payment=invalid#payment-confirmations-heading");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.rpc("confirm_cycle_payment_received", {
    p_report_id: reportId,
  });
  if (error) {
    console.error("Contribution receipt confirmation error:", error);
    redirect("/dashboard?payment=confirm-failed#payment-confirmations-heading");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?payment=received#payment-confirmations-heading");
}

async function withdrawCycleContribution(formData) {
  "use server";
  await runReportAction(formData, "withdraw_cycle_payment_report", "withdrawn", "contribution");
}

async function rejectCycleContribution(formData) {
  "use server";
  await runReportAction(
    formData,
    "reject_cycle_payment_report",
    "rejected",
    "payment-confirmations-heading",
  );
}

async function runReportAction(formData, rpcName, okStatus, anchor) {
  const reportId = String(formData.get("report_id") || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      reportId,
    )
  ) {
    redirect(`/dashboard?payment=invalid#${anchor}`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.rpc(rpcName, { p_report_id: reportId });
  if (error) {
    console.error(`${rpcName} error:`, error);
    redirect(`/dashboard?payment=report-failed#${anchor}`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard?payment=${okStatus}#${anchor}`);
}

export default async function DashboardPage({ searchParams }) {
  const { payment, cycle: requestedCycleNumber } = await searchParams;
  const paymentStatus =
    typeof payment === "string" &&
    ["sent", "received", "retained", "withdrawn", "rejected", "report-failed", "confirm-failed", "invalid"].includes(
      payment,
    )
      ? payment
      : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [cycleResult, membersResult] = await Promise.all([
    supabase
      .from("Cycles")
      .select("cycle_number, start_date, due_date, contribution_amount, status")
      .order("cycle_number", { ascending: false }),
    supabase
      .from("MemberDirectory")
      .select("id, full_name, profile_picture")
      .order("full_name", { ascending: true })
      .limit(10),
  ]);

  if (cycleResult.error) {
    console.error("Cycle fetch error:", cycleResult.error);
  }

  const cycles = cycleResult.data || [];
  const requestedCycle =
    typeof requestedCycleNumber === "string" &&
    /^\d+$/.test(requestedCycleNumber)
      ? cycles.find(
          (cycle) => cycle.cycle_number === Number(requestedCycleNumber),
        )
      : null;
  const selectedCycle =
    requestedCycle ||
    cycles.find((cycle) => cycle.status === "active") ||
    cycles[0] ||
    null;

  const nextDayAfterDue = selectedCycle
    ? new Date(`${selectedCycle.due_date}T00:00:00.000Z`)
    : null;
  if (nextDayAfterDue)
    nextDayAfterDue.setUTCDate(nextDayAfterDue.getUTCDate() + 1);

  const [
    contributionResult,
    payoutResult,
    transactionsResult,
    recipientResult,
    paymentReportResult,
    incomingPaymentReportsResult,
    activeRecipientResult,
    recipientMethodsResult,
  ] = await Promise.all([
      selectedCycle
        ? supabase
            .from("Contributions")
            .select("amount, cycle_number, created_at")
            .eq("user_id", user.id)
            .eq("cycle_number", selectedCycle.cycle_number)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("PayoutSchedule")
        .select("round_number, payout_date")
        .eq("recipient_user_id", user.id)
        .eq("round_number", selectedCycle?.cycle_number ?? -1)
        .maybeSingle(),
      selectedCycle
        ? supabase
            .from("Transactions")
            .select("id, type, amount, created_at")
            .eq("user_id", user.id)
            .gte("created_at", `${selectedCycle.start_date}T00:00:00.000Z`)
            .lt("created_at", nextDayAfterDue.toISOString())
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
      selectedCycle?.status === "active"
        ? supabase.rpc("get_active_cycle_recipient").limit(2)
        : Promise.resolve({ data: [], error: null }),
      selectedCycle
        ? supabase
            .from("PaymentReports")
            .select("id, status, sent_at, received_at, created_at, payment_method, transfer_reference")
            .eq("user_id", user.id)
            .eq("cycle_number", selectedCycle.cycle_number)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      selectedCycle?.status === "active"
        ? supabase.rpc("get_active_cycle_payment_reports")
        : Promise.resolve({ data: [], error: null }),
      selectedCycle?.status === "active"
        ? supabase
            .from("PayoutSchedule")
            .select("round_number")
            .eq("recipient_user_id", user.id)
            .eq("round_number", selectedCycle.cycle_number)
            .limit(2)
        : Promise.resolve({ data: [], error: null }),
      selectedCycle?.status === "active"
        ? supabase.rpc("get_active_cycle_recipient_payment_methods")
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (contributionResult.error)
    console.error("Contribution fetch error:", contributionResult.error);
  if (payoutResult.error)
    console.error("Payout fetch error:", payoutResult.error);
  if (transactionsResult.error)
    console.error("Transaction fetch error:", transactionsResult.error);
  if (recipientResult.error)
    console.error("Active cycle recipient fetch error:", recipientResult.error);
  if (paymentReportResult.error)
    console.error("Member payment report fetch error:", paymentReportResult.error);
  if (incomingPaymentReportsResult.error)
    console.error("Incoming payment reports fetch error:", incomingPaymentReportsResult.error);
  if (activeRecipientResult.error)
    console.error("Active cycle membership fetch error:", activeRecipientResult.error);
  if (membersResult.error)
    console.error("Member directory fetch error:", membersResult.error);

  const contribution = contributionResult.data;
  const payout = payoutResult.data;
  const transactions = transactionsResult.data || [];
  const recipientRows = recipientResult.data || [];
  const recipientScheduleIssue = recipientRows.length > 1;
  const recipient =
    recipientRows.length === 1 &&
    recipientRows[0].cycle_number === selectedCycle?.cycle_number
      ? recipientRows[0]
      : null;
  const paymentReport = paymentReportResult.data;
  const recipientMethods = Array.isArray(recipientMethodsResult.data)
    ? recipientMethodsResult.data[0] || null
    : null;
  const incomingPaymentReports = incomingPaymentReportsResult.data || [];
  const activeRecipientRows = activeRecipientResult.data || [];
  const isCycleRecipient =
    activeRecipientRows.length === 1 &&
    activeRecipientRows[0].round_number === selectedCycle?.cycle_number;
  const otherMembers = await Promise.all(
    (membersResult.data || [])
      .filter((member) => member.id !== user.id)
      .slice(0, 4)
      .map(async (member, index) => {
        if (!member.profile_picture) {
          return {
            ...member,
            avatarUrl: null,
            initials: (member.full_name || "M").charAt(0).toUpperCase(),
            tone: circleAvatarStyles[(index + 1) % circleAvatarStyles.length],
          };
        }

        const { data: signedAvatar } = await supabase.storage
          .from("avatars")
          .createSignedUrl(member.profile_picture, 3600);

        return {
          ...member,
          avatarUrl: signedAvatar?.signedUrl || null,
          initials: (member.full_name || "M").charAt(0).toUpperCase(),
          tone: circleAvatarStyles[(index + 1) % circleAvatarStyles.length],
        };
      }),
  );
  const { data: ownProfile } = await supabase
    .from("Users")
    .select("full_name")
    .eq("email", user.email)
    .maybeSingle();
  const displayName =
    ownProfile?.full_name || user.user_metadata?.full_name || "Member";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "M";
  const circleMembers = [
    {
      id: user.id,
      initials,
      avatarUrl: null,
      tone: circleAvatarStyles[0],
    },
    ...otherMembers.map((member) => ({
      id: member.id,
      initials: member.initials,
      avatarUrl: member.avatarUrl,
      tone: member.tone,
    })),
  ].slice(0, circleAvatarStyles.length);

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-slate-900 transition-colors lg:flex dark:bg-[#101918] dark:text-slate-100">
      <aside className="border-b border-[#e8e0d2] bg-[#f1eadf] dark:border-slate-800 dark:bg-[#172321] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 px-5 text-slate-900 dark:text-slate-100"
        >
          <span className="grid size-8 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white">
            B
          </span>
          <span className="text-sm font-semibold">
            BondFin{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              Collective
            </span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap gap-2 px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:py-5"
        >
          <Link
            href="/dashboard"
            aria-current="page"
            className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg bg-white px-3 text-sm font-semibold text-teal-900 shadow-sm dark:bg-slate-800 dark:text-teal-200"
          >
            <span aria-hidden="true">⌂</span> Dashboard
          </Link>
          <Link
            href="/dashboard#transactions"
            className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">↗</span> Transactions
          </Link>
          <Link
            href="/contributions"
            className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">＋</span> My contributions
          </Link>
          <Link
            href="/members"
            className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">◎</span> Members
          </Link>
          <Link
            href="/dashboard#payout"
            className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">◷</span> My payout
          </Link>
          <Link
            href="/settings"
            className="mt-auto flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800 lg:mt-4"
          >
            <span aria-hidden="true">⚙</span> Settings
          </Link>
        </nav>
        <div className="hidden grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-slate-200 px-4 py-4 dark:border-slate-800 lg:grid">
          <span className="row-span-2 grid size-9 place-items-center rounded-full bg-orange-600 text-xs font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="wrap-anywhere text-sm font-semibold leading-5">
              {displayName}
            </p>
            <p className="wrap-anywhere text-xs leading-5 text-slate-500 dark:text-slate-400">
              Collective member
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md py-1 text-xs font-medium text-slate-600 hover:text-teal-800 dark:text-slate-300 dark:hover:text-teal-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 py-4 sm:px-7 sm:py-6 lg:ml-60 lg:px-9 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-7 sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-teal-800 dark:text-teal-300">
                Your circle
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl dark:text-white">
                Welcome, {displayName}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                A trusted circle, showing up for one another.
              </p>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
              <ThemeToggle />
              <form action={signOut} className="lg:hidden">
                <button
                  type="submit"
                  className="h-9 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:h-10 sm:px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Sign out
                </button>
              </form>
              <span className="grid size-10 place-items-center rounded-full bg-orange-600 text-sm font-bold text-white lg:hidden">
                {initials}
              </span>
            </div>
          </header>

          <section
            aria-labelledby="uruziga-history-heading"
            className="mb-4 rounded-2xl border border-[#e9e2d7] bg-white p-4 shadow-[0_8px_30px_rgba(92,73,48,0.055)] sm:mb-6 sm:p-5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="uruziga-history-heading"
                  className="text-base font-semibold text-slate-950 dark:text-white"
                >
                  Uruziga history
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Select a Uruziga to view your details and activity.
                </p>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                Past URUZIGA rounds show only your records.
              </p>
            </div>
            {cycles.length ? (
              <nav
                aria-label="Uruziga history"
                className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
              >
                {cycles.map((cycle) => {
                  const isSelected =
                    cycle.cycle_number === selectedCycle?.cycle_number;
                  const isActive = cycle.status === "active";

                  return (
                    <Link
                      key={cycle.cycle_number}
                      href={`/dashboard?cycle=${cycle.cycle_number}`}
                      aria-current={isSelected ? "page" : undefined}
                      aria-label={`View ${formatUruziga(cycle.cycle_number)}, ${cycle.status}${isActive ? ", active Uruziga" : ""}${isSelected ? ", currently selected" : ""}`}
                      className={`group min-w-[min(76vw,15rem)] snap-start rounded-xl border p-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:min-w-52 sm:flex-1 ${
                        isSelected
                          ? "border-teal-700 bg-[#eff7f2] ring-2 ring-teal-700/15 dark:border-teal-400 dark:bg-teal-950/40 dark:ring-teal-400/20"
                          : "border-slate-200 bg-white hover:border-teal-600/60 hover:bg-[#f8fbf9] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-500/60 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {formatUruziga(cycle.cycle_number)}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-teal-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-teal-300 dark:text-teal-950">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {formatDate(cycle.start_date)} –{" "}
                        {formatDate(cycle.due_date)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isActive
                              ? "bg-teal-100 text-teal-900 dark:bg-teal-900/70 dark:text-teal-100"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {isActive ? "Active" : cycle.status}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatCurrency(cycle.contribution_amount)} per member
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                No Uruziga rounds are available yet.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500 sm:hidden dark:text-slate-400">
              Past URUZIGA rounds show only your records.
            </p>
          </section>

          {paymentStatus && (
            <p
              role={
                ["report-failed", "confirm-failed", "invalid"].includes(
                  paymentStatus,
                )
                  ? "alert"
                  : "status"
              }
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                ["report-failed", "confirm-failed", "invalid"].includes(
                  paymentStatus,
                )
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  : "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
              }`}
            >
              {paymentStatus === "sent"
                ? "Your transfer was reported as sent. It is not confirmed received until the recipient verifies it."
                : paymentStatus === "received"
                  ? "The recipient confirmed receipt. BondFin recorded the contribution as received."
                  : paymentStatus === "retained"
                    ? `Your contribution is recorded as retained by you as the recipient for ${formatUruziga(cycle.cycle_number)}.`
                    : paymentStatus === "withdrawn"
                      ? "Your report was withdrawn. Nothing is recorded as paid."
                      : paymentStatus === "rejected"
                        ? "Marked as not received. The member can check with you and report again."
                    : paymentStatus === "invalid"
                      ? "That payment action could not be validated. Please reload the dashboard and try again."
                      : paymentStatus === "report-failed"
                        ? "Your transfer report could not be saved. No contribution was marked received."
                        : paymentStatus === "confirm-failed"
                          ? "Receipt could not be confirmed. The contribution was not recorded as received."
                          : null}
            </p>
          )}

          <div className="grid items-start gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
            <div className="space-y-3 sm:space-y-5">
              <CycleOverview
                cycle={selectedCycle}
                cycleError={cycleResult.error}
                contribution={contribution}
                contributionError={contributionResult.error}
                paymentReport={paymentReport}
                paymentReportError={paymentReportResult.error}
                incomingPaymentReports={incomingPaymentReports}
                incomingPaymentReportsError={incomingPaymentReportsResult.error}
                isCycleRecipient={
                  !recipientScheduleIssue && isCycleRecipient
                }
                activeRecipientError={activeRecipientResult.error}
                reportContributionAction={reportCycleContribution}
                confirmPaymentAction={confirmCycleContribution}
                withdrawPaymentAction={withdrawCycleContribution}
                rejectPaymentAction={rejectCycleContribution}
                recipientMethods={recipientMethods}
                recipient={recipient}
                recipientError={recipientResult.error}
                recipientScheduleIssue={recipientScheduleIssue}
                payout={payout}
                payoutError={payoutResult.error}
              />

              <DashboardCard id="transactions" className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Recent activity</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Transaction records in this Uruziga, with the stored amount
                      and date
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#714a32] dark:bg-slate-800 dark:text-slate-300">
                    {transactionsResult.error
                      ? "Unavailable"
                      : `${transactions.length} records`}
                  </span>
                </div>
                {cycleResult.error ? (
                  <p className="mt-5 rounded-xl bg-amber-50 px-4 py-5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Transaction activity is unavailable because Uruziga
                    details could not be loaded.
                  </p>
                ) : transactionsResult.error ? (
                  <p className="mt-5 rounded-xl bg-amber-50 px-4 py-5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Transaction activity could not be loaded. Please try again
                    later.
                  </p>
                ) : transactions.length ? (
                  <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d9e8df] text-sm text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                            aria-hidden="true"
                          >
                            ↗
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {transaction.type}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Recorded {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    No transactions are recorded in this Uruziga’s date range.
                  </p>
                )}
              </DashboardCard>
            </div>

            <aside className="space-y-5">
              <DashboardCard className="p-4">
                <h2 className="px-1 text-sm font-semibold">Quick actions</h2>
                <div className="mt-3 grid gap-2">
                  <QuickActionButton
                    href="/contributions"
                    icon="＋"
                    title="Contribution history"
                    detail="Review your recorded contributions"
                  />
                  <QuickActionButton
                    href="/dashboard#payout"
                    icon="↗"
                    title="My payout details"
                    detail="See your scheduled round"
                  />
                  <QuickActionButton
                    href="/dashboard#transactions"
                    icon="⇄"
                    title="Recent transactions"
                    detail="Review your activity"
                  />
                  <QuickActionButton
                    href="/members"
                    icon="◎"
                    title="Meet the members"
                    detail="Get to know your circle"
                  />
                </div>
              </DashboardCard>

              <DashboardCard className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <span
                    className="grid size-9 place-items-center rounded-full bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                    aria-hidden="true"
                  >
                    ◎
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Your circle</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      The people beside you
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  {membersResult.error ? (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Member directory could not be loaded.
                    </p>
                  ) : otherMembers.length ? (
                    <ul className="space-y-3">
                      {otherMembers.map((member) => (
                        <li key={member.id} className="flex items-center gap-3">
                          <MemberAvatar member={member} />
                          <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                            {member.full_name || "Member"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No other members are listed yet.
                    </p>
                  )}
                  <Link
                    href="/members"
                    className="mt-4 inline-flex text-xs font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
                  >
                    Meet everyone{" "}
                    <span className="ml-1" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </DashboardCard>

              <DashboardCard className="bg-[#edf2f6] p-5 dark:bg-slate-800">
                <div
                  className="grid size-9 place-items-center rounded-full bg-white text-amber-800 dark:bg-slate-700 dark:text-amber-200"
                  aria-hidden="true"
                >
                  ✳
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Our shared commitment
                </p>
                <h2 className="mt-1 text-base font-semibold leading-6 text-slate-900 dark:text-slate-100">
                  We move forward together.
                </h2>
                <div
                  className="mt-4 flex items-center justify-between gap-1"
                  role="img"
                  aria-label="A circle of members supporting one another"
                >
                  {circleMembers.map((member) => (
                    <MemberAvatar key={member.id} member={member} />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Every turn helps another member move forward. That is the
                  strength of our circle.
                </p>
              </DashboardCard>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
