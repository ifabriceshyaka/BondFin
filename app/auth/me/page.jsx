/**
 * BondFin Collective — Current User Page
 * --------------------------------------
 * Displays the currently logged-in user.
 * Useful for debugging authentication and session persistence.
 *
 * URL: /auth/me
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    getUser();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Current User</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </main>
  );
}
