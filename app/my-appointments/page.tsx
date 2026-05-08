"use client";

import { useState } from "react";
import Link from "next/link";
import type { Appointment, AppointmentStatus, Physician } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/utils";

type AppointmentWithPhysician = Appointment & { physician: Physician };

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function MyAppointmentsPage() {
  const [email,        setEmail]        = useState("");
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [appointments, setAppointments] = useState<AppointmentWithPhysician[] | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch(`/api/appointments?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      setAppointments(data);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo">Vero</Link>
        <span className="nav-meta">My Appointments</span>
      </nav>

      <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <Link href="/" className="back-link">← Home</Link>

        <div style={{ marginBottom: 28 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Patient Portal</div>
          <div className="page-title">Your appointments</div>
          <div className="page-subtitle">Enter your email to view your booking status.</div>
        </div>

        <div className="card card-padded" style={{ marginBottom: 24 }}>
          <form onSubmit={handleLookup} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <input
                className={`form-input${error ? " error" : ""}`}
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); setSubmitted(false); }}
                style={{ width: "100%" }}
              />
              {error && <div className="field-error" style={{ marginTop: 4 }}>{error}</div>}
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}
            >
              {loading ? <><span className="spinner" /> Looking up…</> : "Look up"}
            </button>
          </form>
        </div>

        {submitted && appointments !== null && (
          appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-line-1">No appointments found</div>
              <div className="empty-line-2">
                No bookings were found for <span className="mono">{email.trim()}</span>
              </div>
              <Link href="/book" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book an appointment
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>
                {appointments.length} booking{appointments.length !== 1 ? "s" : ""} found
              </div>
              {appointments.map((appt) => (
                <div key={appt.id} className="card card-padded">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar avatar-sm">{appt.physician.initials}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{appt.physician.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{appt.physician.specialty}</div>
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Date</div>
                      <div className="mono" style={{ fontSize: 13 }}>{formatDate(appt.date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Time</div>
                      <div className="mono" style={{ fontSize: 13 }}>{formatTime(appt.time)}</div>
                    </div>
                    <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Reason</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{appt.reasonForVisit}</div>
                    </div>
                  </div>
                  {appt.status === "pending" && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-faint)" }}>
                      The clinic will reach out to confirm this appointment.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
