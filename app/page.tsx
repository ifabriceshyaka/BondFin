"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from("Users")   // MUST match your table name
        .select("*");

      if (error) console.log("Error:", error);
      else setUsers(data);
    }

    loadUsers();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Welcome to BondFin Collective</h1>
      <p>10 people. $100 each. Every 2 weeks. Everyone wins.</p>

      <h2>Users in database:</h2>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </main>
  );
}
