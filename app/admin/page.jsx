import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const sampleContributions = [
  { member: "Sample Member A", cycle: "URUZIGA-04", amount: "Example amount", status: "Example: pending" },
  { member: "Sample Member B", cycle: "URUZIGA-04", amount: "Example amount", status: "Example: needs review" },
  { member: "Sample Member C", cycle: "URUZIGA-03", amount: "Example amount", status: "Example: verified" },
];

const sampleTransactions = [
  { reference: "SAMPLE-001", member: "Sample Member A", cycle: "Unassigned sample", note: "Illustrative legacy record" },
  { reference: "SAMPLE-002", member: "Sample Member B", cycle: "URUZIGA-04", note: "Illustrative assigned record" },
];

function PrototypeCard({ title, eyebrow, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {eyebrow && <p className="text-[11px] font-semibold uppercase text-teal-800 dark:text-teal-300">{eyebrow}</p>}
      <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AdminTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th scope="col" className="px-3 py-3 font-medium">Member</th>
            <th scope="col" className="px-3 py-3 font-medium">Uruziga</th>
            <th scope="col" className="px-3 py-3 font-medium">Amount</th>
            <th scope="col" className="px-3 py-3 font-medium">Sample status</th>
            <th scope="col" className="px-3 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.member}-${row.cycle}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{row.member}</td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{row.cycle}</td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{row.amount}</td>
              <td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{row.status}</span></td>
              <td className="px-3 py-3"><button type="button" disabled className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-700">Unavailable</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminCycleEditor() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        Sample Uruziga label
        <input disabled value="URUZIGA-04" readOnly className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800" />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        Sample status
        <input disabled value="Draft (illustration only)" readOnly className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800" />
      </label>
      <button type="button" disabled className="h-10 rounded-md bg-slate-300 px-3 text-sm font-semibold text-slate-600 sm:col-span-2 dark:bg-slate-700 dark:text-slate-400">Publishing unavailable in prototype</button>
    </div>
  );
}

function AdminTransactionLog() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th scope="col" className="px-3 py-3 font-medium">Sample reference</th>
            <th scope="col" className="px-3 py-3 font-medium">Sample member</th>
            <th scope="col" className="px-3 py-3 font-medium">Uruziga assignment</th>
            <th scope="col" className="px-3 py-3 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {sampleTransactions.map((transaction) => (
            <tr key={transaction.reference} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{transaction.reference}</td>
              <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{transaction.member}</td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{transaction.cycle}</td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{transaction.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPrototypePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-[#f4f7f6] px-4 py-6 text-slate-900 dark:bg-[#101918] dark:text-slate-100 sm:px-7 lg:px-9 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100">← Member dashboard</Link>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Admin dashboard prototype</h1>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">Development only</span>
        </header>

        <section role="alert" className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">Prototype only: fabricated sample content</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">No financial tables are queried here. This route is visible to any signed-in user in development, has no admin authorization, and must not be deployed or treated as an admin console. All rows below are synthetic and all controls are disabled.</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PrototypeCard title="URUZIGA-04" eyebrow="Uruziga overview">
            <p className="text-sm text-slate-600 dark:text-slate-400">Illustrative state: active</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Dates and values intentionally omitted.</p>
          </PrototypeCard>
          <PrototypeCard title="3 sample items" eyebrow="Verification queue">
            <p className="text-sm text-slate-600 dark:text-slate-400">Example queue only</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Not connected to member records.</p>
          </PrototypeCard>
          <PrototypeCard title="Sample round" eyebrow="Payout schedule">
            <p className="text-sm text-slate-600 dark:text-slate-400">Example recipient: Sample Member A</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">No real payout data displayed.</p>
          </PrototypeCard>
          <PrototypeCard title="Not configured" eyebrow="Admin authorization">
            <p className="text-sm text-slate-600 dark:text-slate-400">No admin role or guard exists yet.</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Role model requires approval.</p>
          </PrototypeCard>
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
          <PrototypeCard title="Contribution verification" eyebrow="Synthetic review queue" className="overflow-hidden">
            <AdminTable rows={sampleContributions} />
          </PrototypeCard>
          <PrototypeCard title="Uruziga editor" eyebrow="No writes enabled">
            <AdminCycleEditor />
          </PrototypeCard>
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
          <PrototypeCard title="Payout schedule preview" eyebrow="Synthetic schedule">
            <ol className="space-y-3">
              {["Sample round 01 · Sample Member A", "Sample round 02 · Sample Member B", "Sample round 03 · Unassigned sample recipient"].map((entry) => (
                <li key={entry} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <span>{entry}</span>
                  <span className="text-xs text-slate-500">Preview</span>
                </li>
              ))}
            </ol>
            <button type="button" disabled className="mt-4 h-9 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-400 dark:border-slate-700">Editing unavailable</button>
          </PrototypeCard>
          <PrototypeCard title="Transaction log" eyebrow="Synthetic records only" className="overflow-hidden">
            <AdminTransactionLog />
          </PrototypeCard>
        </div>

        <PrototypeCard title="Security gates before live wiring" eyebrow="Implementation checklist" className="mt-5">
          <ul className="grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300 sm:grid-cols-2">
            <li>Approve admin identity source and manual bootstrap process.</li>
            <li>Approve admin RLS policy and test member denial paths.</li>
            <li>Define transaction-to-cycle reference and trusted write path.</li>
            <li>Keep old transactions unassigned until manually verified.</li>
            <li>Define late-payment exception and required approvers.</li>
            <li>Add append-only audit history and server-side abuse controls.</li>
          </ul>
        </PrototypeCard>
      </div>
    </main>
  );
}