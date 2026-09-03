"use client";

/**
 * BondFin Dashboard — Protected Page
 * ----------------------------------
 * This version FIXES the redirect loop by:
 * - Waiting for Supabase to restore the session
 * - Using getSession() instead of getUser()
 * - Preventing early redirects
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      // Get the current session (more reliable than getUser)
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setSession(data.session);
      } else {
        router.push("/auth/login");
      }

      setLoading(false);
    }

    checkSession();
  }, [router]);

  if (loading) {
    return <p style={{ padding: 40 }}>Loading dashboard...</p>;
  }

  if (!session) {
    return <p style={{ padding: 40 }}>Redirecting...</p>;
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>BondFin Dashboard</h1>
      <p>Welcome to your member area.</p>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/auth/login");
        }}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          backgroundColor: "#222",
          color: "white",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </main>
  );
}
