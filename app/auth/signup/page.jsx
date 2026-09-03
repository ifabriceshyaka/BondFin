/**
 * BondFin Collective — Signup Page
 * ---------------------------------
 * This page allows new users to create an account using Supabase Auth.
 * It uses client-side rendering because authentication requires browser APIs.
 *
 * URL: /auth/signup
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  // Local state for form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Handles user signup using Supabase Auth.
   * Supabase automatically creates the user in the Auth system.
   */
  async function handleSignup() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Signup successful! Check your email for confirmation.");
    }
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Create Your BondFin Account</h1>

      <input
        type="email"
        placeholder="Email address"
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <button onClick={handleSignup}>Sign Up</button>

      <p style={{ marginTop: 20 }}>{message}</p>
    </main>
  );
}
