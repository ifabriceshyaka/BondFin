import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <div className="signup-heading">
          <span className="brand-seal" aria-hidden="true">
            B
          </span>
          <h1>Set your password</h1>
          <p className="signup-tagline">A collective built on trust.</p>
          <p>Choose a password for your BondFin account.</p>
        </div>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
