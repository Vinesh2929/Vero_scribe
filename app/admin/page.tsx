"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Appointment, AppointmentStatus, Physician } from "@/lib/store";

type AppointmentWithPhysician = Appointment & { physician: Physician };
type SortKey = "date" | "patient" | "physician" | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: AppointmentStatus[] = ["pending", "confirmed", "cancelled"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// ── Status dropdown ───────────────────────────────────────────────────────────

function StatusDropdown({
  appt,
  onUpdate,
}: {
  appt: AppointmentWithPhysician;
  onUpdate: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function change(status: AppointmentStatus) {
    setOpen(false);
    if (status === appt.status) return;
    setLoading(true);
    try { await onUpdate(appt.id, status); }
    finally { setLoading(false); }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* Trigger: the badge itself + chevron */}
      <button
        className="status-trigger"
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
      >
        <StatusBadge status={appt.status} />
        {loading ? (
          <span className="spinner spinner-dark" />
        ) : (
          <svg width="9" height="6" viewBox="0 0 9 6" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 1L4.5 5L8 1" stroke="var(--text-faint)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="dropdown" style={{ left: 0, right: "auto", minWidth: 152 }}>
          <div className="dropdown-header">Set status</div>
          {STATUS_OPTIONS.map((s) => {
            const isCurrent = s === appt.status;
            return (
              <button
                key={s}
                className={`dropdown-item${isCurrent ? " current" : ""}`}
                onClick={() => change(s)}
              >
                <StatusBadge status={s} />
                {isCurrent && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
                    style={{ marginLeft: "auto", flexShrink: 0 }}>
                    <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="var(--teal)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ h = 14, w = "100%" }: { h?: number; w?: string | number }) {
  return <div className="skeleton" style={{ height: h, width: w as string, borderRadius: "var(--radius)", flexShrink: 0 }} />;
}

function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          <td>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk h={14} w={130} />
              <Sk h={11} w={170} />
            </div>
          </td>
          <td>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sk h={32} w={32} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk h={13} w={100} />
                <Sk h={11} w={80} />
              </div>
            </div>
          </td>
          <td>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk h={14} w={90} />
              <Sk h={11} w={60} />
            </div>
          </td>
          <td><Sk h={13} w={180} /></td>
          <td><Sk h={22} w={88} /></td>
        </tr>
      ))}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [appointments, setAppointments] = useState<AppointmentWithPhysician[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<AppointmentStatus | "all">("all");
  const [sort,         setSort]         = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "asc" });
  const [updateError,  setUpdateError]  = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const res  = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  async function updateStatus(id: string, status: AppointmentStatus) {
    setUpdateError(null);
    // Optimistic: update UI immediately
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setUpdateError("Status update failed — please try again.");
      await loadAppointments(); // rollback
    }
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const filtered = filter === "all"
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sort.key === "date")      cmp = (a.date + a.time).localeCompare(b.date + b.time);
    if (sort.key === "patient")   cmp = a.patientName.localeCompare(b.patientName);
    if (sort.key === "physician") cmp = a.physician.name.localeCompare(b.physician.name);
    if (sort.key === "status")    cmp = a.status.localeCompare(b.status);
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const counts = {
    all:       appointments.length,
    pending:   appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  function SortArrow({ col }: { col: SortKey }) {
    if (sort.key !== col)
      return <span style={{ color: "var(--text-faint)", marginLeft: 4, fontSize: 10 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>;
  }

  function thProps(col: SortKey): React.ThHTMLAttributes<HTMLTableCellElement> {
    return {
      className: "th-sortable",
      onClick: () => toggleSort(col),
      style: { color: sort.key === col ? "var(--text)" : undefined },
    };
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo">Vero</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="nav-meta">Admin</span>
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          <Link href="/book" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>
            + New booking
          </Link>
        </div>
      </nav>

      <main className="container-wide" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Dashboard</div>
          <div className="page-title">Appointments</div>
          <div className="page-subtitle">Review and update upcoming patient bookings.</div>
        </div>

        {/* Stat filter cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {(["all", "pending", "confirmed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`stat-card${filter === s ? " active" : ""}`}
            >
              <div className="stat-num">{counts[s]}</div>
              <div className="stat-label">{s === "all" ? "Total" : s}</div>
            </button>
          ))}
        </div>

        {/* Inline update error */}
        {updateError && (
          <div className="error-banner" style={{ marginBottom: 16 }}>{updateError}</div>
        )}

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          {sorted.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-line-1">
                {filter === "all" ? "No appointments yet" : `No ${filter} appointments`}
              </div>
              <div className="empty-line-2">
                {filter === "all"
                  ? "Bookings will appear here when patients submit them"
                  : "Try a different filter or change a status above"}
              </div>
              {filter === "all" && (
                <Link href="/book" className="btn btn-primary" style={{ marginTop: 16 }}>
                  Book first appointment
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th {...thProps("patient")}>Patient <SortArrow col="patient" /></th>
                    <th {...thProps("physician")}>Physician <SortArrow col="physician" /></th>
                    <th {...thProps("date")}>Date & Time <SortArrow col="date" /></th>
                    <th>Reason</th>
                    <th {...thProps("status")}>Status <SortArrow col="status" /></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : (
                    sorted.map((appt) => (
                      <tr key={appt.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{appt.patientName}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {appt.patientEmail}
                          </div>
                          {appt.patientPhone && (
                            <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {appt.patientPhone}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="avatar avatar-sm">{appt.physician.initials}</div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{appt.physician.name}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {appt.physician.specialty}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 500 }}>{formatDate(appt.date)}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatTime(appt.time)}</div>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={appt.reasonForVisit}
                          >
                            {appt.reasonForVisit}
                          </div>
                        </td>
                        <td><StatusDropdown appt={appt} onUpdate={updateStatus} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-faint)" }}>
          Showing{" "}
          <span className="mono">{sorted.length}</span> of{" "}
          <span className="mono">{appointments.length}</span>{" "}
          appointment{appointments.length !== 1 ? "s" : ""}. Data persists in{" "}
          <code style={{
            fontSize: 11, padding: "1px 4px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3,
          }}>
            data/db.json
          </code>.
          Click any column header to sort.
        </p>
      </main>
    </div>
  );
}
