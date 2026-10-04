"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const controlClass =
  "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export default function MfaSettings({ factors = [] }) {
  const [verifiedFactor, setVerifiedFactor] = useState(
    factors.find((factor) => factor.status === "verified") || null,
  );
  const [pendingFactor, setPendingFactor] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function beginEnrollment() {
    setBusy(true);
    setError("");
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "BondFin authenticator",
      issuer: "BondFin Collective",
    });
    setBusy(false);

    if (enrollError) {
      setError(enrollError.message);
      return;
    }

    setPendingFactor({
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verifyEnrollment(event) {
    event.preventDefault();
    if (!pendingFactor) return;

    setBusy(true);
    setError("");
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: pendingFactor.id,
      });
    if (challengeError) {
      setBusy(false);
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactor.id,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);

    if (verifyError) {
      setError(
        "That code could not be verified. Check your authenticator and try again.",
      );
      return;
    }

    setVerifiedFactor({
      id: pendingFactor.id,
      friendly_name: "BondFin authenticator",
      status: "verified",
    });
    setPendingFactor(null);
    setCode("");
  }

  async function disableMfa(event) {
    event.preventDefault();
    if (!verifiedFactor) return;

    setBusy(true);
    setError("");
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });
    if (challengeError) {
      setBusy(false);
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) {
      setBusy(false);
      setError(
        "That code could not be verified. Two-factor authentication is still enabled.",
      );
      return;
    }

    const { error: removeError } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    });
    setBusy(false);
    if (removeError) {
      setError(removeError.message);
      return;
    }

    setVerifiedFactor(null);
    setCode("");
  }

  async function cancelEnrollment() {
    if (!pendingFactor) return;
    setBusy(true);
    const { error: removeError } = await supabase.auth.mfa.unenroll({
      factorId: pendingFactor.id,
    });
    setBusy(false);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    setPendingFactor(null);
    setCode("");
    setError("");
  }

  return (
    <div className="space-y-3">
      {verifiedFactor ? (
        <form
          onSubmit={disableMfa}
          className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/30"
        >
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-100">
            Authenticator app is enabled
          </p>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            Enter a current authenticator code to turn it off
            <input
              className={`${controlClass} max-w-56`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
          >
            {busy ? "Verifying..." : "Turn off two-factor authentication"}
          </button>
        </form>
      ) : pendingFactor ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            Scan this code with an authenticator app, then enter the six-digit
            code to finish setup.
          </p>
          <Image
            src={pendingFactor.qrCode}
            alt="Authenticator enrollment QR code"
            width={176}
            height={176}
            unoptimized
            className="size-44 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700"
          />
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-teal-800 dark:text-teal-300">
              Can’t scan the code?
            </summary>
            <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {pendingFactor.secret}
            </code>
          </details>
          <form
            onSubmit={verifyEnrollment}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              Six-digit code
              <input
                className={`${controlClass} w-40`}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
            >
              {busy ? "Verifying..." : "Verify and enable"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelEnrollment}
              className="h-10 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Authenticator app
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Require a one-time code during sign-in.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={beginEnrollment}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {busy ? "Starting..." : "Set up two-factor"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
