"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Appointment, AppointmentStatus, Physician } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/utils";

const TAG_PALETTES = [
  { bg: "#EFF4FF", color: "#2D52CC" },
  { bg: "#F3F0FF", color: "#5B3FC8" },
  { bg: "#EDFAF5", color: "#157A52" },
  { bg: "#FFF7ED", color: "#96500E" },
];

function tagStyle(specialty: string): { background: string; color: string } {
  const hash = specialty.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const { bg, color } = TAG_PALETTES[hash % TAG_PALETTES.length];
  return { background: bg, color };
}

type AppointmentWithPhysician = Appointment & { physician: Physician };
type SortKey = "date" | "patient" | "physician" | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: AppointmentStatus[] = ["pending", "confirmed", "cancelled"];

function formatBookedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h || 12;
  const min = m.toString().padStart(2, "0");
  return `${date} · ${hour}:${min} ${ampm}`;
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
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setActiveIndex(-1); return; }

    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % STATUS_OPTIONS.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + STATUS_OPTIONS.length) % STATUS_OPTIONS.length);
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        change(STATUS_OPTIONS[activeIndex]);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, activeIndex]);

  async function change(status: AppointmentStatus) {
    setOpen(false);
    if (status === appt.status) return;
    setLoading(true);
    try { await onUpdate(appt.id, status); }
    finally { setLoading(false); }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        className="status-trigger"
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
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

      {open && (
        <div className="dropdown" role="listbox">
          <div className="dropdown-header">Set status</div>
          {STATUS_OPTIONS.map((s, i) => {
            const isCurrent = s === appt.status;
            return (
              <button
                key={s}
                role="option"
                aria-selected={isCurrent}
                className={`dropdown-item${isCurrent ? " current" : ""}${activeIndex === i ? " focused" : ""}`}
                onClick={() => change(s)}
                onMouseEnter={() => setActiveIndex(i)}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk h={13} w={100} />
              <Sk h={11} w={80} />
            </div>
          </td>
          <td>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk h={14} w={90} />
              <Sk h={11} w={60} />
            </div>
          </td>
          <td><Sk h={13} w={180} /></td>
          <td><Sk h={11} w={100} /></td>
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
  const [search,       setSearch]       = useState("");
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
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setUpdateError("Status update failed — please try again.");
      await loadAppointments();
    }
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const q = search.trim().toLowerCase();

  const filtered = appointments
    .filter((a) => filter === "all" || a.status === filter)
    .filter((a) =>
      !q ||
      a.patientName.toLowerCase().includes(q) ||
      a.patientEmail.toLowerCase().includes(q) ||
      a.physician.name.toLowerCase().includes(q) ||
      a.physician.specialty.toLowerCase().includes(q)
    );

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
    const active = sort.key === col;
    const upColor   = active && sort.dir === "asc"  ? "currentColor" : "var(--text-faint)";
    const downColor = active && sort.dir === "desc" ? "currentColor" : "var(--text-faint)";
    return (
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 1L1 5.5H7L4 1Z"   fill={upColor}/>
        <path d="M4 11L1 6.5H7L4 11Z" fill={downColor}/>
      </svg>
    );
  }

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="th-sortable"
        onClick={() => toggleSort(col)}
        style={{ color: sort.key === col ? "var(--text)" : undefined }}
      >
        <span className="th-sort-inner">
          {children}
          <SortArrow col={col} />
        </span>
      </th>
    );
  }

  const isSearching = q.length > 0;

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
          <Link href="/" className="back-link" style={{ marginBottom: 12 }}>← Home</Link>
          <div className="section-label" style={{ marginBottom: 6 }}>Dashboard</div>
          <div className="page-title">Appointments</div>
          <div className="page-subtitle">Review and update upcoming patient bookings.</div>
        </div>

        {/* Stat filter cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
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

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="6" cy="6" r="4.5" stroke="var(--text-faint)" strokeWidth="1.4"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="var(--text-faint)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            className="form-input"
            type="search"
            placeholder="Search by patient, email, or physician…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, fontSize: 13 }}
            aria-label="Search appointments"
          />
          {isSearching && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-faint)", fontSize: 16, lineHeight: 1, padding: "2px 4px",
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
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
                {isSearching
                  ? `No results for "${search}"`
                  : filter === "all" ? "No appointments yet" : `No ${filter} appointments`}
              </div>
              <div className="empty-line-2">
                {isSearching
                  ? "Try a different name, email, or physician"
                  : filter === "all"
                    ? "Bookings will appear here when patients submit them"
                    : "Try a different filter or change a status above"}
              </div>
              {filter === "all" && !isSearching && (
                <Link href="/book" className="btn btn-primary" style={{ marginTop: 16 }}>
                  Book first appointment
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "9%"  }} />
                </colgroup>
                <thead>
                  <tr>
                    <SortTh col="patient">Patient</SortTh>
                    <SortTh col="physician">Physician</SortTh>
                    <SortTh col="date">Appointment</SortTh>
                    <th>Reason</th>
                    <th>Booked on</th>
                    <SortTh col="status">Status</SortTh>
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
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{appt.physician.name}</div>
                          <span
                            className="tag"
                            style={{ ...tagStyle(appt.physician.specialty), fontSize: 10, marginTop: 4, display: "inline-block" }}
                          >
                            {appt.physician.specialty}
                          </span>
                        </td>
                        <td className="mono" style={{ whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 500 }}>{formatDate(appt.date, "short")}</div>
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
                        <td className="mono" style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>
                          {formatBookedAt(appt.createdAt)}
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
          appointment{appointments.length !== 1 ? "s" : ""}.{" "}
          Click any column header to sort.
        </p>
      </main>
    </div>
  );
}
