import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { formatUruziga } from "@/lib/formatUruziga";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount));
}

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "Date unavailable";
}

function paymentStatus(status, hasContribution) {
  if (status === "received" || status === "retained" || hasContribution) {
    return {
      label: "Received",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (status === "sent") {
    return {
      label: "Awaiting confirmation",
      className:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }

  if (status === "rejected") {
    return {
      label: "Not received",
      className:
        "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }

  if (status === "withdrawn") {
    return {
      label: "Withdrawn",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  return {
    label: "Recorded",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
}

function PaymentStatusBadge({ status, hasContribution }) {
  const badge = paymentStatus(status, hasContribution);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

export default async function ContributionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [contributionResult, paymentReportResult] = await Promise.all([
    supabase
      .from("Contributions")
      .select("amount, cycle_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("PaymentReports")
      .select("amount, cycle_number, status, payment_method, sent_at, received_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const error = contributionResult.error || paymentReportResult.error;
  if (contributionResult.error)
    console.error("Contribution history fetch error:", contributionResult.error);
  if (paymentReportResult.error)
    console.error("Payment history fetch error:", paymentReportResult.error);

  const contributions = contributionResult.data || [];
  const paymentReports = paymentReportResult.data || [];
  const contributionsByCycle = new Map(
    contributions.map((contribution) => [contribution.cycle_number, contribution]),
  );
  const reportsByCycle = new Map(
    paymentReports.map((report) => [report.cycle_number, report]),
  );
  const history = new Map();

  for (const contribution of contributions) {
    const report = reportsByCycle.get(contribution.cycle_number);
    history.set(contribution.cycle_number, {
      ...contribution,
      payment_method: report?.payment_method || null,
      status: report?.status || "received",
      recorded_at: report?.received_at || contribution.created_at,
    });
  }

  for (const report of paymentReports) {
    if (contributionsByCycle.has(report.cycle_number)) continue;

    history.set(report.cycle_number, {
      ...report,
      recorded_at: report.received_at || report.sent_at || report.created_at,
    });
  }

  const records = [...history.values()].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
  const { data: profile } = await supabase
    .from("Users")
    .select("full_name")
    .eq("email", user.email)
    .maybeSingle();
  const displayName =
    profile?.full_name || user.user_metadata?.full_name || "Member";

  return (
    <main className="min-h-screen bg-[#f8f5ee] px-4 py-5 text-slate-900 dark:bg-[#101918] dark:text-slate-100 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#e8e0d2] pb-5 dark:border-slate-800">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
            >
              ← Dashboard
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase text-teal-800 dark:text-teal-300">
              {displayName}&apos;s account
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
              My contributions
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Your contribution and transfer history, newest first.
            </p>
          </div>
          <span className="rounded-full border border-[#e3d9c9] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Private to your account
          </span>
        </header>

        <section
          aria-labelledby="contribution-history-heading"
          className="overflow-hidden rounded-2xl border border-[#e9e2d7] bg-white shadow-[0_8px_30px_rgba(92,73,48,0.045)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe7db] px-4 py-4 sm:px-6 dark:border-slate-800">
            <div>
              <h2
                id="contribution-history-heading"
                className="text-base font-semibold"
              >
                Payment history
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                A transfer marked sent is not confirmed until the recipient verifies it.
                Downloadable receipts and invoices are not available for manual
                transfers yet.
              </p>
            </div>
            {!error && (
              <span className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#714a32] dark:bg-slate-800 dark:text-slate-300">
                {records.length} {records.length === 1 ? "record" : "records"}
              </span>
            )}
          </div>

          {error ? (
            <p
              role="alert"
              className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 sm:m-6"
            >
              Payment history could not be loaded. Please try again later.
            </p>
          ) : records.length ? (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fffdf9] text-xs text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Uruziga
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Payment method
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right font-medium"
                      >
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-right font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efe7db] dark:divide-slate-800">
                    {records.map((record) => (
                      <tr key={record.cycle_number}>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {formatDate(record.recorded_at)}
                        </td>
                        <th
                          scope="row"
                          className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100"
                        >
                          {formatUruziga(record.cycle_number)}
                        </th>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {record.payment_method === "zelle"
                            ? "Zelle"
                            : record.payment_method === "cash_app"
                              ? "Cash App"
                              : "Not recorded"}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <PaymentStatusBadge
                            status={record.status}
                            hasContribution={contributionsByCycle.has(
                              record.cycle_number,
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-[#efe7db] sm:hidden dark:divide-slate-800">
                {records.map((record) => (
                  <li
                    key={record.cycle_number}
                    className="space-y-3 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {formatUruziga(record.cycle_number)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(record.recorded_at)} ·{" "}
                          {record.payment_method === "zelle"
                            ? "Zelle"
                            : record.payment_method === "cash_app"
                              ? "Cash App"
                              : "Method not recorded"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(record.amount)}
                      </p>
                    </div>
                    <PaymentStatusBadge
                      status={record.status}
                      hasContribution={contributionsByCycle.has(
                        record.cycle_number,
                      )}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="px-5 py-12 text-center sm:px-8">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No contribution records yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                When a contribution record is added for your account, it will
                appear here. This page is read-only.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-[#e3d9c9] px-4 text-sm font-semibold text-teal-900 hover:bg-[#fffdf9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-700 dark:text-teal-200 dark:hover:bg-slate-800"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}