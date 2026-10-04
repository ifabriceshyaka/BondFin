/**
 * BondFin Collective - Simple Signup + Onboarding
 * ------------------------------------------------
 * Clean, professional signup form with Contribution Ring
 * and a lightweight onboarding flow.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(event) {
    event.preventDefault();
    // Guard against double-submits before React re-renders the disabled button.
    if (isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });

      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        // Email confirmation is required, so no session exists yet.
        setMessage("Check your email to confirm your account before signing in.");
      } else {
        setStep(2);
      }
    } catch {
      setMessage("Unable to sign up. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFinishSetup() {
    // router.refresh() avoids a stale client Router Cache entry for /dashboard.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        {step === 1 && (
          <>
            <div className="signup-progress">
              {/* Contribution Ring */}
              <svg
                className="contribution-ring"
                width="44"
                height="44"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#d2a967"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#167c78"
                  strokeWidth="2"
                  strokeDasharray="69 69"
                  strokeDashoffset="34"
                  fill="none"
                />
              </svg>
              <p>Step 1 of 3 - Join the Collective</p>
            </div>
            <div className="signup-heading">
              <span className="brand-seal" aria-hidden="true">
                B
              </span>
              <h1>BondFin Collective</h1>
              <p className="signup-tagline">A collective built on trust.</p>
              <p>Create your account</p>
            </div>
            <form onSubmit={handleSignup} className="signup-form">
              <label htmlFor="fullname">Full name</label>
              <input
                id="fullname"
                type="text"
                placeholder="e.g. Fabrice Iraguha"
                required
                onChange={(event) => setFullName(event.target.value)}
              />
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters"
                  required
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.8 4 10 8a11.8 11.8 0 0 1-3.1 5.1" />
                        <path d="M6.2 6.2C4.5 7.4 3.2 9.2 2 12c1.2 4 5 8 10 8 1 0 2-.2 2.9-.5" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <small className="trust-note">
                <span className="trust-icon" aria-hidden="true">
                  &#128274;
                </span>
                Your information is encrypted and never shared.
              </small>
              <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting && <span className="spinner" aria-hidden="true" />}
                <span>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </span>
              </button>
              <p className="account-switch">
                Have an account? <a href="/auth/login">Sign in</a>
              </p>
              <p className="signup-message">{message}</p>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <div className="signup-progress">
              <svg
                className="contribution-ring"
                width="44"
                height="44"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#d2a967"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#167c78"
                  strokeWidth="2"
                  strokeDasharray="69 69"
                  strokeDashoffset="34"
                  fill="none"
                />
              </svg>
              <p>Step 2 of 3 - Personalize</p>
            </div>
            <div className="signup-heading">
              <span className="brand-seal" aria-hidden="true">
                B
              </span>
              <h1>Welcome to BondFin!</h1>
              <p className="signup-tagline">A collective built on trust.</p>
              <p>Let&apos;s personalize your experience.</p>
            </div>
            <div className="onboarding-step">
              <button onClick={() => setStep(3)}>Continue</button>
              <button
                type="button"
                className="onboarding-back"
                onClick={() => setStep(1)}
              >
                Back
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="onboarding-step">
            <h2>Set Your Contribution Plan</h2>
            <p>Choose how you&apos;ll participate in the collective.</p>
            <button onClick={handleFinishSetup}>Finish Setup</button>
          </div>
        )}
      </section>
      <style jsx>{`
        .simple-auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f9fafb;
          color: #17313b;
          font-family: Arial, sans-serif;
        }

        .simple-auth-card {
          width: min(100%, 450px);
          padding: 36px 32px 32px;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(23, 49, 59, 0.08);
          animation: signup-card-in 120ms ease-out both;
        }

        @keyframes signup-card-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .signup-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 20px;
          margin: 0 0 32px;
          text-align: left;
        }

        .contribution-ring {
          display: block;
          width: 14px;
          height: 14px;
          flex: 0 0 auto;
          transform: rotate(-90deg);
          filter: drop-shadow(0 0 1px rgba(23, 49, 59, 0.24));
        }

        .signup-progress p,
        .signup-heading p,
        .account-switch,
        .signup-message,
        .onboarding-step p {
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
          letter-spacing: 0;
        }

        .signup-progress p {
          display: flex;
          align-items: center;
          min-height: 20px;
          max-width: 180px;
          color: #667085;
          font-size: 13px;
          line-height: 1.35;
        }

        .signup-progress p,
        .signup-heading p,
        .signup-message,
        .account-switch,
        .onboarding-step p {
          margin: 0;
        }

        .signup-heading {
          display: grid;
          justify-items: center;
          gap: 8px;
          margin-bottom: 30px;
          text-align: center;
        }

        .brand-seal {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 1px solid #d2a967;
          border-radius: 50%;
          color: #167c78;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 700;
        }

        h1,
        h2 {
          margin: 0;
          color: #17313b;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 400;
          letter-spacing: 0;
          line-height: 1.1;
        }

        h1 {
          font-size: 30px;
          letter-spacing: -0.01em;
          font-weight: 500;
        }

        .signup-tagline {
          color: #667085;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
        }

        .signup-form {
          display: grid;
          gap: 12px;
        }

        .signup-form label {
          margin-top: 6px;
          color: #17313b;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
          text-align: left;
        }

        .signup-form input {
          box-sizing: border-box;
          width: 100%;
          min-height: 48px;
          padding: 12px 14px;
          border: 1px solid #d9e5df;
          border-radius: 9px;
          outline: none;
          background: #fff;
          color: #17313b;
          font: inherit;
          font-size: 14px;
          text-align: left;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .signup-form input::placeholder {
          color: #aab5b8;
        }

        .signup-form input:focus {
          border-color: #167c78;
          box-shadow: 0 0 0 3px rgba(22, 124, 120, 0.14);
        }

        .password-field {
          position: relative;
          width: 100%;
        }

        .password-field input {
          padding-right: 62px;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 12px;
          display: grid;
          width: 24px;
          height: 24px;
          place-items: center;
          min-height: auto;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: #167c78;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          appearance: none;
          transform: translateY(-50%);
        }

        .password-toggle svg {
          display: block;
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 1.8;
        }

        .password-toggle:hover {
          background: transparent;
          color: #0d5c5b;
          transform: translateY(-50%);
        }

        .signup-form small {
          margin-top: -2px;
          color: #667085;
          font-size: 11px;
          line-height: 1.4;
          text-align: center;
        }

        .trust-note {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .trust-icon {
          font-size: 10px;
          line-height: 1;
        }

        .signup-form button,
        .onboarding-step button {
          border: 0;
          border-radius: 9px;
          background: #167c78;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .signup-form button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          margin-top: 10px;
          padding: 0 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .signup-form button:hover:not(:disabled),
        .onboarding-step button:hover {
          background: #0d5c5b;
          transform: translateY(-1px);
        }

        .signup-form button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .signup-form .password-toggle {
          display: grid;
          width: 24px;
          height: 24px;
          min-height: 24px;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          opacity: 1;
        }

        .signup-form .password-toggle:hover {
          background: transparent;
          transform: translateY(-50%);
        }

        .signup-form button.password-toggle:hover:not(:disabled) {
          background: transparent;
          transform: translateY(-50%);
        }

        .spinner {
          width: 14px;
          height: 14px;
          margin-right: 8px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spinner-spin 600ms linear infinite;
        }

        @keyframes spinner-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .account-switch {
          margin-top: 20px;
          text-align: center;
        }

        .account-switch a {
          color: #167c78;
          font-weight: 700;
          text-underline-offset: 3px;
        }

        .account-switch a:hover {
          text-decoration: underline;
        }

        .signup-message {
          color: #0d5c5b;
          text-align: center;
        }

        .onboarding-step {
          display: grid;
          justify-items: center;
          gap: 16px;
          padding: 42px 10px;
          text-align: center;
        }

        .onboarding-step h2 {
          font-size: 28px;
        }

        .onboarding-step button {
          min-height: 48px;
          padding: 0 24px;
        }

        .onboarding-back {
          border: 0;
          background: transparent;
          color: #167c78;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          text-underline-offset: 3px;
        }

        .onboarding-back:hover {
          background: transparent;
          text-decoration: underline;
          transform: none;
        }

        @media (max-width: 480px) {
          .simple-auth-page {
            padding: 16px;
          }

          .simple-auth-card {
            padding: 28px 20px 24px;
          }

          .contribution-ring {
            width: 14px;
            height: 14px;
          }

          .signup-progress {
            min-height: 20px;
          }

          .signup-progress {
            gap: 10px;
          }

          .signup-progress p {
            min-height: 20px;
            max-width: 160px;
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
