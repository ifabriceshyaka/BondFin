import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function updateProfile(formData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const avatar = formData.get("avatar");

  if (fullName.length < 2 || fullName.length > 80) {
    redirect("/profile?error=invalid-name");
  }

  let avatarPath;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = allowedImageTypes.get(avatar.type);

    if (!extension || avatar.size > 2 * 1024 * 1024) {
      redirect("/profile?error=invalid-avatar");
    }

    avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, avatar, { contentType: avatar.type, upsert: false });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      redirect("/profile?error=avatar-upload-failed");
    }
  }

  const updatePayload = { full_name: fullName };
  if (avatarPath) {
    updatePayload.profile_picture = avatarPath;
  }

  const { error } = await supabase
    .from("Users")
    .update(updatePayload)
    .eq("email", user.email);

  if (error) {
    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }
    console.error("Profile update error:", error);
    redirect("/profile?error=save-failed");
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (metadataError) {
    console.error("Profile auth metadata sync error:", metadataError);
  }

  redirect(`/profile?saved=1${avatarPath ? "&avatar=1" : ""}`);
}

function getMessage(searchParams) {
  if (searchParams.saved === "1") {
    return { text: "Profile updated.", color: "#167c78" };
  }

  if (searchParams.error === "invalid-name") {
    return { text: "Enter a name between 2 and 80 characters.", color: "#a33a2b" };
  }

  if (searchParams.error === "save-failed") {
    return { text: "Unable to update your profile.", color: "#a33a2b" };
  }

  if (searchParams.error === "invalid-avatar") {
    return { text: "Choose a JPG, PNG, or WebP image up to 2 MB.", color: "#a33a2b" };
  }

  if (searchParams.error === "avatar-upload-failed") {
    return { text: "Unable to upload that profile picture.", color: "#a33a2b" };
  }

  return null;
}

export default async function ProfilePage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("Users")
    .select("full_name, email, profile_picture")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    console.error("Profile fetch error:", error);
  }

  const resolvedSearchParams = await searchParams;
  const message = getMessage(resolvedSearchParams || {});
  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const email = profile?.email || user.email || "";
  let avatarUrl;

  if (profile?.profile_picture) {
    const { data: signedAvatar } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.profile_picture, 3600);
    avatarUrl = signedAvatar?.signedUrl;
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>BondFin Collective</p>
        <h1 style={headingStyle}>Your profile</h1>
        <p style={introStyle}>Keep the name your collective members see up to date.</p>

        {message && <p style={{ ...messageStyle, color: message.color }}>{message.text}</p>}

        {avatarUrl && <img src={avatarUrl} alt="" width="96" height="96" style={profileAvatarStyle} />}

        <form action={updateProfile} style={formStyle}>
          <label htmlFor="full_name" style={labelStyle}>Full name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={fullName}
            minLength={2}
            maxLength={80}
            required
            style={inputStyle}
          />

          <label htmlFor="email" style={labelStyle}>Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            aria-describedby="email-note"
            style={{ ...inputStyle, background: "#f3f6f4", color: "#667085" }}
          />
          <small id="email-note" style={noteStyle}>Email addresses cannot be changed here.</small>

          <label htmlFor="avatar" style={labelStyle}>Profile picture</label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={fileInputStyle}
          />
          <small style={noteStyle}>JPG, PNG, or WebP. Maximum 2 MB.</small>

          <button type="submit" style={buttonStyle}>Save profile</button>
        </form>
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

const cardStyle = {
  width: "min(100%, 520px)",
  margin: "0 auto",
  padding: 32,
  border: "1px solid #d9e5df",
  borderRadius: 12,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(23, 49, 59, 0.06)",
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
  fontSize: 36,
  fontWeight: 500,
  lineHeight: 1.1,
};

const introStyle = {
  margin: "12px 0 24px",
  color: "#667085",
  fontSize: 15,
  lineHeight: 1.5,
};

const formStyle = {
  display: "grid",
  gap: 10,
};

const labelStyle = {
  marginTop: 8,
  color: "#17313b",
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  border: "1px solid #d9e5df",
  borderRadius: 9,
  outline: "none",
  color: "#17313b",
  font: "inherit",
  fontSize: 14,
};

const noteStyle = {
  marginTop: -4,
  color: "#667085",
  fontSize: 12,
};

const fileInputStyle = {
  boxSizing: "border-box",
  width: "100%",
  padding: "10px 0",
  color: "#667085",
  font: "inherit",
  fontSize: 13,
};

const profileAvatarStyle = {
  display: "block",
  width: 96,
  height: 96,
  margin: "0 auto 20px",
  borderRadius: "50%",
  objectFit: "cover",
};

const messageStyle = {
  margin: "0 0 14px",
  fontSize: 14,
  fontWeight: 700,
};

const buttonStyle = {
  minHeight: 46,
  marginTop: 16,
  padding: "0 18px",
  border: 0,
  borderRadius: 8,
  background: "#167c78",
  color: "#fff",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
};
