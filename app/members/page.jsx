import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: members, error } = await supabase
    .from("MemberDirectory")
    .select("id, full_name, profile_picture")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Member directory fetch error:", error);
    return <main style={pageStyle}>Unable to load the member directory.</main>;
  }

  const membersWithAvatars = await Promise.all(
    members.map(async (member) => {
      if (!member.profile_picture) {
        return member;
      }

      const { data: signedAvatar } = await supabase.storage
        .from("avatars")
        .createSignedUrl(member.profile_picture, 3600);

      return { ...member, profile_picture: signedAvatar?.signedUrl || null };
    })
  );

  return (
    <main style={pageStyle}>
      <section style={{ width: "min(100%, 760px)", margin: "0 auto" }}>
        <p style={eyebrowStyle}>BondFin Collective</p>
        <h1 style={headingStyle}>Members</h1>
        <p style={introStyle}>
          The trusted circle behind the collective.
        </p>

        {members.length > 0 ? (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              padding: 0,
              listStyle: "none",
            }}
          >
            {membersWithAvatars.map((member) => (
              <li key={member.id} style={memberCardStyle}>
                {member.profile_picture ? (
                  <img
                    src={member.profile_picture}
                    alt=""
                    width="48"
                    height="48"
                    style={avatarStyle}
                  />
                ) : (
                  <span style={avatarStyle} aria-hidden="true">
                    {(member.full_name || "M").charAt(0).toUpperCase()}
                  </span>
                )}
                <span style={memberNameStyle}>{member.full_name || "Member"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={emptyStyle}>No members are available yet.</p>
        )}
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "48px 24px",
  background: "#f9fafb",
  color: "#17313b",
  fontFamily: "Arial, sans-serif",
};

const eyebrowStyle = {
  margin: "0 0 8px",
  color: "#167c78",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const headingStyle = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 38,
  fontWeight: 500,
  lineHeight: 1.1,
};

const introStyle = {
  margin: "12px 0 28px",
  color: "#667085",
  fontSize: 15,
};

const memberCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minHeight: 88,
  padding: 18,
  border: "1px solid #d9e5df",
  borderRadius: 10,
  background: "#fff",
};

const avatarStyle = {
  display: "grid",
  width: 48,
  height: 48,
  flex: "0 0 48px",
  placeItems: "center",
  borderRadius: "50%",
  background: "#e6f1ed",
  color: "#167c78",
  fontSize: 18,
  fontWeight: 700,
  objectFit: "cover",
};

const memberNameStyle = {
  color: "#17313b",
  fontSize: 15,
  fontWeight: 700,
};

const emptyStyle = {
  padding: 24,
  border: "1px solid #d9e5df",
  borderRadius: 10,
  background: "#fff",
  color: "#667085",
};
