import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="nav">
        <span className="nav-logo">Vero</span>
        <span className="nav-meta">Healthcare Scheduling</span>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, marginBottom: 40 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>
            Patient Booking
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            Book an appointment in minutes.
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Choose a physician, pick an available time, and submit your details.
            No phone calls, no hold music.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 56 }}>
          <Link href="/book" className="btn btn-primary">
            Book an appointment
          </Link>
          <Link href="/admin" className="btn btn-outline">
            Admin dashboard
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            maxWidth: 640,
            width: "100%",
            background: "var(--border)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {[
            { num: "01", label: "Choose physician", desc: "Browse providers and specialties" },
            { num: "02", label: "Pick a time", desc: "See real-time availability" },
            { num: "03", label: "Confirm details", desc: "Submit and track status" },
          ].map((item) => (
            <div
              key={item.num}
              style={{ padding: "20px 18px", background: "var(--surface)" }}
            >
              <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>
                {item.num}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
