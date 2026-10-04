export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f9fafb",
        color: "#17313b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        aria-label="Loading signup page"
        style={{
          width: "min(100%, 420px)",
          minHeight: 360,
          padding: "36px 32px 32px",
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 8px 24px rgba(23, 49, 59, 0.08)",
        }}
      />
    </main>
  );
}
