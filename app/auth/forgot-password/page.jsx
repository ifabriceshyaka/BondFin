/**
 * BondFin Collective - Forgot Password
 * -------------------------------------
 * Matches the login/signup design system. Sends a Supabase
 * password-reset email; never reveals whether the address exists.
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/login`,
      });
    } catch {
      // Ignore - we always show the same generic message below.
    } finally {
      // Always show the same message so we don't reveal registered emails.
      setMessage(
        "If an account exists for that email, a reset link has been sent."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <div className="signup-heading">
          <span className="brand-seal" aria-hidden="true">
            B
          </span>
          <h1>Reset your password</h1>
          <p className="signup-tagline">A collective built on trust.</p>
          <p>We&apos;ll email you a secure reset link</p>
        </div>
        <form onSubmit={handleSubmit} className="signup-form">
          <label htmlFor="forgot-email">Email address</label>
          <input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            required
            autoFocus
            autoComplete="email"
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            <span>{isSubmitting ? "Sending..." : "Send reset link"}</span>
          </button>
          <p className="account-switch">
            Remembered it? <a href="/auth/login">Back to sign in</a>
          </p>
          <p role="status" aria-live="polite" className="signup-message">
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

        .signup-heading {
          display: grid;
          justify-items: center;
          gap: 8px;
          margin-bottom: 30px;
          text-align: center;
        }

        .signup-heading p {
          color: #4b5563;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
          margin: 0;
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
          color: #667085;
          font-size: 13px;
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
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .simple-auth-page {
            padding: 16px;
          }

          .simple-auth-card {
            padding: 28px 20px 24px;
          }
        }
      `}</style>
    </main>
  );
}
