# Vero Booking — Technical Work Sample

A patient appointment booking flow for Vero's clinical workspace, built with Next.js 15, TypeScript, and a custom minimal design system.

---

## How to run

**Prerequisites:** Node.js 18+

```bash
git clone <repo-url>
cd vero-booking
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables, no database setup, no Docker. On first run the app seeds `data/db.json` with three physicians and ~120 slots across the next 5 business days.

---

## What I built

### Patient flow (`/book`)
A four-step booking wizard with a clear step indicator at the top:

1. **Physician selection** — Three physicians displayed as scan-friendly cards with initials avatars, name, specialty tag, and bio. Clicking advances to availability.
2. **Slot selection** — Times grouped by date, all rendered in monospace because they're data. Selected slot highlights in blue. Selection is local state only — nothing is reserved until submission.
3. **Patient details** — Name (required), email (required, validated), phone (optional), reason for visit (required). Inline error messages on blur, no toasts.
4. **Review & confirm** — Two-column key/value layout summarising every field. On confirm, `POST /api/appointments` is called; if the slot was concurrently booked, the API returns 409 and an inline error appears beneath the review card.

On success, the appointment is created with `status: "pending"` and the slot is marked unavailable. The success screen shows date/time in mono and the pending status badge.

### Admin dashboard (`/admin`)
- Four stat cards (total / pending / confirmed / cancelled) that double as filter buttons. The active filter inverts to the dark accent.
- Sortable table showing patient contact, physician (with avatar), monospace date/time, truncated reason, status badge, and a per-row "Change" dropdown.
- Status changes hit `PATCH /api/appointments/:id` and re-fetch. Cancelling an appointment frees the slot back; re-confirming re-locks it.

### Design philosophy
The UI follows a ruthlessly minimal aesthetic adapted from a system spec I was given:

- **Inter** for UI text, **DM Mono** for all data (dates, times, counts, IDs)
- One near-black accent (`#111`) plus two purposeful colours: blue (`#1A56DB`) for primary CTAs and teal (`#0D7C66`) for the confirmed state
- No shadows anywhere, no gradients, no border-radius above 6px
- Section labels are uppercase with letter-spacing — never sentence-case headings
- Status badges use restrained palettes (warm tan / teal / desaturated red) tied only to data meaning, never decoration
- Specialty tags share one neutral grey — no per-category colour coding

### API
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/physicians` | List all physicians |
| GET | `/api/slots?physicianId=` | Available slots for a physician |
| GET | `/api/appointments` | All appointments with physician joined |
| POST | `/api/appointments` | Create a new appointment |
| PATCH | `/api/appointments/:id` | Update appointment status |

---

## Key technical / product decisions

**JSON file store instead of SQLite or Postgres.** Take-home scope, zero infrastructure expectations. `fs` + a JSON file gives full CRUD with no native compilation step, works on any OS, makes the data human-readable for review. The store module (`lib/store.ts`) is the only place that knows about persistence — swapping to Prisma is a one-file change.

**Slot model separate from appointments.** Rather than storing "available times" as a field on the physician, slots are first-class entities with an `available` boolean. This makes availability queries cheap, makes the race-condition check trivial, and maps cleanly to how a real calendar system works (Google Calendar FREEBUSY, etc.). Cancellation correctly frees the slot back; re-confirming re-locks it.

**No page reloads inside the wizard.** The wizard is a single client component managing step state locally. API calls happen only on submission. This gives a snappy feel without needing Zustand or Redux for what is fundamentally a four-screen form.

**Pending by default.** Bookings land as `pending`, requiring explicit admin confirmation. This mirrors real clinical workflows where staff verify insurance, physician availability, or other constraints before confirming. The patient-facing success screen communicates this clearly using the same status badge that admin sees.

**No auth, by design.** The brief excluded it. In production, the admin route would be behind session-based auth (NextAuth or Clerk) and the patient flow would optionally support unauthenticated bookings with email verification.

**Inline validation, no toasts.** The design philosophy explicitly forbids them. Errors appear beneath the relevant input on blur, and submission errors render directly above the action buttons.

**Monospace for data.** Dates, times, IDs, counts, and patient phone numbers all use DM Mono. This is a deliberate signal — it tells the user at a glance which parts of the UI are values vs labels. Specialty tags and badges stay in Inter because they're labels.

---

## What I'd improve with more time

1. **Real database** — migrate the store to Prisma + SQLite (or Postgres in prod). The store interface is already abstracted.

2. **Optimistic UI for admin status changes** — currently re-fetches all appointments after a status update. Should update local state immediately and roll back on error.

3. **Appointment detail drawer** — clicking a row in admin should open a slide-over with full patient details, full reason text, and a timeline of status changes.

4. **Time zone handling** — slots are stored as naive date+time strings. Production needs explicit timezone storage (UTC) and client-side conversion based on the user's locale.

5. **Concurrent booking protection** — the current race-condition guard works for single-server deployments. A real DB would use a transaction or `SELECT FOR UPDATE`.

6. **Email notifications** — patient confirmation email on booking, admin notification on new pending. Would use Resend with a Next.js API route.

7. **Physician-managed availability** — slots are seeded on first run. Production would have a recurring schedule + exception dates system, likely via a calendar integration.

8. **Mobile polish** — the layout is responsive but the admin table degrades to horizontal scroll on small screens. A card-based layout would work better there.

9. **Testing** — unit tests for the store module (pure functions, easy to test) and a Playwright e2e test for the booking happy path plus the slot-conflict edge case.

10. **Accessibility** — semantic labels on form inputs are in place but I didn't add full ARIA attributes for the step indicator or status dropdown. The dropdown should also be keyboard-navigable.
