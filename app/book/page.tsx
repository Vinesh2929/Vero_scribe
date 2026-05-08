"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Physician, TimeSlot } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/utils";

type Step = "physician" | "slot" | "details" | "confirm" | "success";
type StringField = "patientName" | "patientEmail" | "patientPhone" | "reasonForVisit";

interface BookingState {
  physician: Physician | null;
  slot: TimeSlot | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reasonForVisit: string;
}

const STEP_ORDER: Step[] = ["physician", "slot", "details", "confirm", "success"];
const REASON_MAX = 500;
const REASON_MIN = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

const TAG_PALETTES = [
  { bg: "#EFF4FF", color: "#2D52CC" }, // blue
  { bg: "#F3F0FF", color: "#5B3FC8" }, // indigo
  { bg: "#EDFAF5", color: "#157A52" }, // teal-green
  { bg: "#FFF7ED", color: "#96500E" }, // amber
];

function tagStyle(specialty: string): { background: string; color: string } {
  const hash = specialty.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const { bg, color } = TAG_PALETTES[hash % TAG_PALETTES.length];
  return { background: bg, color };
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validateName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Full name is required";
  if (t.length < 2) return "Name must be at least 2 characters";
  if (/\d/.test(t)) return "Name cannot contain numbers";
  return null;
}

function validateEmail(v: string): string | null {
  const t = v.trim();
  if (!t) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Enter a valid email address";
  return null;
}

function validateReason(v: string): string | null {
  const t = v.trim();
  if (!t) return "Please describe your reason for the visit";
  if (t.length < REASON_MIN)
    return `Please provide a bit more detail (${t.length} of ${REASON_MIN} characters minimum)`;
  return null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ height = 80, width = "100%" }: { height?: number; width?: string | number }) {
  return (
    <div className="skeleton" style={{ height, width: width as string, borderRadius: "var(--radius-md)" }} />
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: "physician", label: "Physician" },
    { key: "slot",      label: "Time"      },
    { key: "details",   label: "Details"   },
    { key: "confirm",   label: "Review"    },
  ];
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <div className="step-bar">
      {steps.map((s, i) => {
        const isDone   = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`step-node${isDone ? " done" : isActive ? " active" : ""}`}>
              {isDone ? "✓" : i + 1}
            </div>
            <span className={`step-label${isActive ? " active" : ""}`}>{s.label}</span>
            {i < steps.length - 1 && (
              <div className={`step-line${isDone ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Physician ─────────────────────────────────────────────────────────

function PhysicianStep({ onSelect }: { onSelect: (p: Physician) => void }) {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selecting,  setSelecting]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/physicians")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setPhysicians(d); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  async function handleSelect(p: Physician) {
    setSelecting(p.id);
    await new Promise((r) => setTimeout(r, 100));
    onSelect(p);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Step 1 of 4</div>
        <div className="page-title">Choose a physician</div>
        <div className="page-subtitle">Select a provider to view their availability.</div>
      </div>

      {fetchError ? (
        <div className="error-banner">
          Could not load physicians. Please refresh the page.
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[84, 100, 84].map((h, i) => <Skeleton key={i} height={h} />)}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {physicians.map((p) => (
            <button
              key={p.id}
              className="physician-card"
              onClick={() => handleSelect(p)}
              disabled={selecting !== null}
              style={{
                opacity: selecting && selecting !== p.id ? 0.4 : 1,
                borderColor: selecting === p.id ? "var(--accent)" : undefined,
                transition: "opacity 0.15s ease, border-color 0.1s ease",
              }}
            >
              <div className="avatar avatar-lg">{p.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                  <span className="tag" style={tagStyle(p.specialty)}>{p.specialty}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {p.bio}
                </div>
              </div>
              <div style={{
                fontSize: 16,
                color: selecting === p.id ? "var(--accent)" : "var(--text-faint)",
                transition: "color 0.1s ease",
              }}>→</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Slot ──────────────────────────────────────────────────────────────

function formatDayLabel(dateStr: string): { weekday: string; day: number; month: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-CA", { weekday: "short" }),
    day:     d.getDate(),
    month:   d.toLocaleDateString("en-CA", { month: "short" }),
  };
}

function SlotStep({
  physician,
  onSelect,
}: {
  physician: Physician;
  onSelect: (s: TimeSlot) => void;
}) {
  const [slots,         setSlots]         = useState<TimeSlot[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);
  const [activeDate,    setActiveDate]    = useState<string | null>(null);
  const [selectedSlot,  setSelectedSlot]  = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/slots?physicianId=${physician.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: TimeSlot[]) => {
        setSlots(d);
        setLoading(false);
        const first = d[0]?.date ?? null;
        if (first) setActiveDate(first);
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [physician.id]);

  const byDate: Record<string, TimeSlot[]> = {};
  for (const slot of slots) {
    (byDate[slot.date] ??= []).push(slot);
  }
  const dates = Object.keys(byDate);

  const daySlots  = activeDate ? (byDate[activeDate] ?? []) : [];
  const amSlots   = daySlots.filter((s) => parseInt(s.time) < 12);
  const pmSlots   = daySlots.filter((s) => parseInt(s.time) >= 12);

  function pickDate(date: string) {
    setActiveDate(date);
    setSelectedSlot(null);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Step 2 of 4</div>
        <div className="page-title">Pick a time</div>
        <div className="page-subtitle">
          Availability for{" "}
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{physician.name}</span>
        </div>
      </div>

      {fetchError ? (
        <div className="error-banner">
          Could not load availability. Please go back and try again.
        </div>
      ) : loading ? (
        <>
          {/* Day pill skeletons */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[1,2,3,4,5].map((i) => <Skeleton key={i} height={72} width={72} />)}
          </div>
          {/* Slot skeletons */}
          <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[1, 2].map((i) => (
              <div key={i}>
                <Skeleton height={11} width={80} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {[78, 78, 78, 78, 78].map((w, j) => <Skeleton key={j} height={34} width={w} />)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : dates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-line-1">No available slots</div>
          <div className="empty-line-2">Try selecting a different physician</div>
        </div>
      ) : (
        <>
          {/* ── Date pill selector ── */}
          <div style={{
            display: "flex", gap: 6, overflowX: "auto",
            paddingBottom: 8, marginBottom: 16,
            scrollbarWidth: "none",
          }}>
            {dates.map((date) => {
              const { weekday, day, month } = formatDayLabel(date);
              const isActive = date === activeDate;
              return (
                <button
                  key={date}
                  onClick={() => pickDate(date)}
                  style={{
                    flexShrink: 0,
                    minWidth: 72,
                    padding: "10px 0",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    background: isActive ? "var(--accent)" : "var(--surface)",
                    color: isActive ? "white" : "var(--text)",
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    color: isActive ? "rgba(255,255,255,0.65)" : "var(--text-faint)",
                    marginBottom: 2,
                  }}>
                    {weekday}
                  </div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.1 }}>
                    {day}
                  </div>
                  <div style={{
                    fontSize: 10, marginTop: 2,
                    color: isActive ? "rgba(255,255,255,0.65)" : "var(--text-faint)",
                  }}>
                    {month}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Slots for selected day ── */}
          <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {amSlots.length > 0 && (
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>Morning</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {amSlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={`slot-btn${selectedSlot === slot.id ? " selected" : ""}`}
                      onClick={() => setSelectedSlot(slot.id)}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pmSlots.length > 0 && (
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>Afternoon</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pmSlots.map((slot) => (
                    <button
                      key={slot.id}
                      className={`slot-btn${selectedSlot === slot.id ? " selected" : ""}`}
                      onClick={() => setSelectedSlot(slot.id)}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          className="btn btn-primary"
          disabled={!selectedSlot}
          onClick={() => {
            const slot = slots.find((s) => s.id === selectedSlot);
            if (slot) onSelect(slot);
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Details ───────────────────────────────────────────────────────────

function DetailsStep({
  booking,
  onChange,
  onNext,
}: {
  booking: BookingState;
  onChange: (k: StringField, v: string) => void;
  onNext: () => void;
}) {
  const [touched,   setTouched]   = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);

  const errors = {
    patientName:    validateName(booking.patientName),
    patientEmail:   validateEmail(booking.patientEmail),
    reasonForVisit: validateReason(booking.reasonForVisit),
  };

  const isValid = !Object.values(errors).some(Boolean);

  function touch(field: string) {
    setTouched((prev) => new Set(prev).add(field));
  }

  function visible(field: keyof typeof errors): string | null {
    return touched.has(field) || attempted ? errors[field] : null;
  }

  function fieldClass(field: keyof typeof errors): string {
    if (!touched.has(field) && !attempted) return "";
    return errors[field] ? " error" : " valid";
  }

  function handleNext() {
    setAttempted(true);
    if (isValid) onNext();
  }

  const reasonLen = booking.reasonForVisit.length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Step 3 of 4</div>
        <div className="page-title">Your information</div>
        <div className="page-subtitle">We'll use these details to confirm your booking.</div>
      </div>

      <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="inp-name">
            Full name <span className="required-star">*</span>
          </label>
          <input
            id="inp-name"
            className={`form-input${fieldClass("patientName")}`}
            placeholder="Jane Smith"
            autoComplete="name"
            value={booking.patientName}
            onChange={(e) => onChange("patientName", e.target.value)}
            onBlur={() => touch("patientName")}
          />
          {visible("patientName") && (
            <div className="field-error">{visible("patientName")}</div>
          )}
        </div>

        {/* Email + Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-email">
              Email <span className="required-star">*</span>
            </label>
            <input
              id="inp-email"
              className={`form-input${fieldClass("patientEmail")}`}
              type="email"
              placeholder="jane@example.com"
              autoComplete="email"
              value={booking.patientEmail}
              onChange={(e) => onChange("patientEmail", e.target.value)}
              onBlur={() => touch("patientEmail")}
            />
            {visible("patientEmail") && (
              <div className="field-error">{visible("patientEmail")}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-phone">
              Phone{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-faint)" }}>
                (optional)
              </span>
            </label>
            <input
              id="inp-phone"
              className="form-input"
              type="tel"
              placeholder="(416) 555-0100"
              autoComplete="tel"
              value={booking.patientPhone}
              onChange={(e) => onChange("patientPhone", formatPhone(e.target.value))}
            />
          </div>
        </div>

        {/* Reason */}
        <div className="form-group">
          <label className="form-label" htmlFor="inp-reason">
            Reason for visit <span className="required-star">*</span>
          </label>
          <textarea
            id="inp-reason"
            className={`form-textarea${fieldClass("reasonForVisit")}`}
            placeholder="Briefly describe your symptoms or reason for this appointment"
            rows={4}
            value={booking.reasonForVisit}
            onChange={(e) => onChange("reasonForVisit", e.target.value.slice(0, REASON_MAX))}
            onBlur={() => touch("reasonForVisit")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 }}>
            <div>
              {visible("reasonForVisit") && (
                <div className="field-error">{visible("reasonForVisit")}</div>
              )}
            </div>
            <div className={`char-count${reasonLen > REASON_MAX * 0.8 ? " warn" : ""}`}>
              {reasonLen} / {REASON_MAX}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
          <span className="required-star">*</span> Required fields
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button className="btn btn-primary" onClick={handleNext}>
          Review booking
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

function ConfirmStep({
  booking,
  onConfirm,
  submitting,
  errorMsg,
}: {
  booking: BookingState;
  onConfirm: () => void;
  submitting: boolean;
  errorMsg: string | null;
}) {
  const rows = [
    { label: "Physician", value: booking.physician?.name ?? "",           mono: false },
    { label: "Specialty", value: booking.physician?.specialty ?? "",      mono: false },
    { label: "Date",      value: booking.slot ? formatDate(booking.slot.date) : "", mono: true },
    { label: "Time",      value: booking.slot ? formatTime(booking.slot.time) : "", mono: true },
    { label: "Patient",   value: booking.patientName,                     mono: false },
    { label: "Email",     value: booking.patientEmail,                    mono: true  },
    { label: "Phone",     value: booking.patientPhone || "—",             mono: !!booking.patientPhone },
    { label: "Reason",    value: booking.reasonForVisit,                  mono: false },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Step 4 of 4</div>
        <div className="page-title">Review your booking</div>
        <div className="page-subtitle">
          Your appointment will be marked{" "}
          <span className="badge badge-pending">pending</span>{" "}
          until the clinic confirms it.
        </div>
      </div>

      <div className="card card-padded">
        {rows.map((row) => (
          <div key={row.label} className="review-row">
            <div className="review-key">{row.label}</div>
            <div className={`review-val${row.mono ? " mono" : ""}`}>{row.value}</div>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="error-banner" style={{ marginTop: 16 }}>{errorMsg}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={submitting}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          {submitting ? <><span className="spinner" /> Booking…</> : "Confirm appointment"}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Success ───────────────────────────────────────────────────────────

function SuccessStep({ booking }: { booking: BookingState }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="32" cy="32" r="29"
            stroke="var(--teal)" strokeWidth="2" fill="var(--teal-bg)"
            className="check-circle"
          />
          <path
            d="M20 32 L28.5 40.5 L44 24"
            stroke="var(--teal)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="check-path"
          />
        </svg>
      </div>
      <div className="page-title" style={{ marginBottom: 8 }}>Appointment requested</div>
      <p style={{ color: "var(--text-muted)", maxWidth: 360, margin: "0 auto", fontSize: 14, lineHeight: 1.7 }}>
        Your appointment with{" "}
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{booking.physician?.name}</span> on{" "}
        <span className="mono" style={{ color: "var(--text)" }}>
          {booking.slot ? formatDate(booking.slot.date) : ""} at{" "}
          {booking.slot ? formatTime(booking.slot.time) : ""}
        </span>{" "}
        is <span className="badge badge-pending">pending</span>. The clinic will reach out to confirm shortly.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 32 }}>
        <Link href="/my-appointments" className="btn btn-primary">View my appointments</Link>
        <Link href="/book" className="btn btn-outline">Book another</Link>
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BookPage() {
  const [step,       setStep]       = useState<Step>("physician");
  const [direction,  setDirection]  = useState<"forward" | "backward">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [booking,    setBooking]    = useState<BookingState>({
    physician:      null,
    slot:           null,
    patientName:    "",
    patientEmail:   "",
    patientPhone:   "",
    reasonForVisit: "",
  });

  function advance(next: Step) {
    setDirection("forward");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retreat(prev: Step) {
    setDirection("backward");
    setStep(prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(k: StringField, v: string) {
    setBooking((b) => ({ ...b, [k]: v }));
  }

  async function handleConfirm() {
    if (!booking.physician || !booking.slot) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          physicianId:    booking.physician.id,
          slotId:         booking.slot.id,
          patientName:    booking.patientName,
          patientEmail:   booking.patientEmail,
          patientPhone:   booking.patientPhone,
          reasonForVisit: booking.reasonForVisit,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      } else {
        advance("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav className="nav">
        <Link href="/" className="nav-logo">Vero</Link>
        {step !== "success" && <span className="nav-meta">Patient Booking</span>}
      </nav>

      <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        {step !== "success" && <StepIndicator current={step} />}

        {/* Back link — always at the top so it's visible regardless of form length */}
        {step !== "success" && (
          step === "physician" ? (
            <Link href="/" className="back-link">← Home</Link>
          ) : (
            <button
              className="back-link"
              onClick={() => {
                if (step === "slot")    retreat("physician");
                if (step === "details") retreat("slot");
                if (step === "confirm") { setErrorMsg(null); retreat("details"); }
              }}
            >
              ← Back
            </button>
          )
        )}

        <div key={step} className={direction === "forward" ? "slide-forward" : "slide-backward"}>
          {step === "physician" && (
            <PhysicianStep
              onSelect={(p) => { setBooking((b) => ({ ...b, physician: p })); advance("slot"); }}
            />
          )}
          {step === "slot" && booking.physician && (
            <SlotStep
              physician={booking.physician}
              onSelect={(s) => { setBooking((b) => ({ ...b, slot: s })); advance("details"); }}
            />
          )}
          {step === "details" && (
            <DetailsStep
              booking={booking}
              onChange={updateField}
              onNext={() => advance("confirm")}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              booking={booking}
              onConfirm={handleConfirm}
              submitting={submitting}
              errorMsg={errorMsg}
            />
          )}
          {step === "success" && <SuccessStep booking={booking} />}
        </div>
      </main>
    </div>
  );
}
