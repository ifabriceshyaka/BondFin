/**
 * BondFin Collective — Login Page
 * --------------------------------
 * This page allows existing users to log in using Supabase Auth.
 * It uses client-side rendering because authentication requires browser APIs.
 *
 * URL: /auth/login
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  // Local state for form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Handles user login using Supabase Auth.
   * If successful, Supabase stores the session in local storage.
   */
  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Login successful!");
    }
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Login to BondFin</h1>

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

      <button onClick={handleLogin}>Login</button>

      <p style={{ marginTop: 20 }}>{message}</p>
    </main>
  );
}
