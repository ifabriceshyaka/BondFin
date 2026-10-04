/**
 * BondFin Collective - Login
 * ---------------------------
 * Matches the signup page's design system: Contribution Ring,
 * brand seal, serif title, and shared card/input/button styling.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    // Guard against double-submits before React re-renders the disabled button.
    if (isSubmitting) return;
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.status === 429 || error.code === "over_request_rate_limit") {
          setMessage("Too many sign-in attempts. Please wait a few minutes and try again.");
          setIsError(true);
          return;
        }

        // Normalize to a generic message so we don't reveal whether the email is registered.
        setMessage("Invalid login credentials");
        setIsError(true);
        return;
      }

      router.push("/dashboard");
    } catch {
      setMessage("Unable to sign in. Please try again.");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
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
          <p>Welcome back to the Collective</p>
        </div>
        <div className="signup-heading">
          <span className="brand-seal" aria-hidden="true">
            B
          </span>
          <h1>BondFin Collective</h1>
          <div className="tagline-spacer" aria-hidden="true" />
          <p>Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="signup-form">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="login-password">Password</label>
          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="8+ characters"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
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
          <p className="forgot-password">
            <a href="/auth/forgot-password">Forgot password?</a>
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
          </button>
          <small className="trust-note">
            <span className="trust-icon" aria-hidden="true">
              &#128274;
            </span>
            Your information is encrypted and never shared.
          </small>
          <p className="account-switch">
            Need an account? <a href="/auth/signup">Sign up</a>
          </p>
          <p
            role="status"
            aria-live="polite"
            className={isError ? "signup-message is-error" : "signup-message"}
          >
            {message}
          </p>
        </form>
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
        .signup-message {
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
          letter-spacing: 0;
        }

        .signup-progress p {
          display: flex;
          align-items: center;
          min-height: 20px;
          max-width: none;
          white-space: nowrap;
          color: #667085;
          font-size: 13px;
          line-height: 1.35;
        }

        .signup-progress p,
        .signup-heading p,
        .signup-message,
        .account-switch {
          margin: 0;
        }

        .signup-heading p {
          color: #4b5563;
          font-weight: 600;
        }

        .signup-heading {
          display: grid;
          justify-items: center;
          gap: 10px;
          margin-bottom: 30px;
          text-align: center;
        }

        .signup-heading h1 {
          margin-top: 4px;
        }

        .tagline-spacer {
          height: 16.8px;
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

        h1 {
          margin: 0;
          color: #17313b;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 500;
          font-size: 30px;
          letter-spacing: -0.01em;
          line-height: 1.1;
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
          border: 1px solid #c7d2ce;
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

        .signup-form input:disabled {
          background: #f4f6f5;
          cursor: not-allowed;
          opacity: 0.75;
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

        .password-toggle:focus-visible {
          outline: 2px solid #167c78;
          outline-offset: 2px;
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

        .signup-form button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          margin-top: 10px;
          padding: 0 16px;
          border: 0;
          border-radius: 8px;
          background: #167c78;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .signup-form button:hover:not(:disabled) {
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
          color: #167c78;
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

        .signup-message.is-error {
          color: #b3261e;
        }

        .forgot-password {
          margin: -4px 0 0;
          text-align: right;
        }

        .forgot-password a {
          color: #167c78;
          font-size: 12px;
          font-weight: 700;
          text-underline-offset: 3px;
        }

        .forgot-password a:hover {
          text-decoration: underline;
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
            gap: 10px;
          }

          .signup-progress p {
            min-height: 20px;
            max-width: none;
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
