"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage("Unable to update your password. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Unable to update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="signup-form">
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        disabled={isSubmitting}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Updating password..." : "Set password"}
      </button>
      <p role="status" aria-live="polite" className="signup-message is-error">
        {message}
      </p>
      <style jsx>{`
        .signup-message.is-error {
          color: #b3261e;
        }
      `}</style>
    </form>
  );
}
