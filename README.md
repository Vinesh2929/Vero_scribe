# Vero Booking

A patient appointment booking flow built with Next.js 15, TypeScript, and a minimal CSS design system. No external services, no environment variables — just clone and run.

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

On first run, the app creates `data/db.json` and seeds it with three physicians and roughly 120 available slots across the next five business days. No database setup, no Docker, no configuration needed.

---

## What I built

### Patient booking (`/book`)

A four-step wizard that walks a patient through choosing a physician, picking a time, entering their details, and reviewing before submitting.

- Step 1 picks a physician from card-style listings showing name, specialty, and bio
- Step 2 shows availability grouped by date with morning/afternoon sections — nothing is reserved until the final submit, so there's no orphaned slot problem
- Step 3 collects name, email, phone (optional), and reason for visit with inline validation on blur
- Step 4 is a full review before confirming — if someone else books the same slot in the meantime, the API returns a 409 and the patient sees a clear error without losing their other form data

Appointments always start as `pending`. The success screen tells the patient exactly that and links to the lookup page.

### Appointment lookup (`/my-appointments`)

Patients can enter their email to see all their bookings and current statuses. No account needed — email as a lookup key is the right tradeoff at this stage, and it's how most clinic confirmation flows work before a full auth system is in place.

### Admin dashboard (`/admin`)

- Stat cards at the top double as filter buttons (total / pending / confirmed / cancelled)
- Text search filters across patient name, email, and physician name in real time
- Sortable table with patient contact, physician, appointment date/time, booking timestamp, reason, and status
- Per-row status dropdown — fully keyboard-navigable (arrow keys, Enter, Escape) — with optimistic updates that roll back on failure
- Cancelling an appointment frees the slot back for patients to book; re-confirming re-locks it

### API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/physicians` | List all physicians |
| GET | `/api/slots?physicianId=` | Available future slots for a physician |
| GET | `/api/appointments` | All appointments; accepts `?email=` to filter by patient |
| POST | `/api/appointments` | Create appointment (409 on slot conflict) |
| PATCH | `/api/appointments/:id` | Update status |

---

## Key decisions

**JSON file store over SQLite.** For a work sample with no infrastructure expectations, a JSON file is honest and practical. It's human-readable for review, works on any OS, and requires no compilation step. More importantly, `lib/store.ts` is the only file that knows about persistence — switching to Prisma is a one-file change.

**Slots as first-class entities.** Rather than storing availability as a list on the physician, each slot is its own record with an `available` boolean. This makes the availability query trivial, the double-booking check a single line, and the cancel/re-confirm logic obvious. It also maps cleanly to how real calendar APIs model free/busy time.

**Pending by default.** In real clinical workflows, staff usually need to verify a few things before a booking is confirmed — physician availability, patient history, insurance. Starting everything as `pending` reflects that reality and sets the right expectation with patients from the start.

**No page-level navigation inside the wizard.** The booking flow is a single client component. Each step is a local state change, not a route. This keeps the experience snappy without pulling in a state management library for what is essentially a four-screen form.

**No auth, intentionally.** The brief explicitly excluded it. For the patient lookup I used email as a lookup key rather than building a session system — appropriate for this scope, and consistent with how many clinics handle unverified confirmations before an account exists.

---

## What I'd improve with more time

1. **Real database** — Prisma + SQLite locally, Postgres in production. The store interface is already abstracted so this is a clean swap.

2. **Soft slot reservation** — right now nothing stops two patients from selecting the same slot simultaneously; one gets a 409 at the end. A better experience is to soft-reserve a slot the moment it's selected (a Redis TTL of 5–10 minutes with a visible countdown), then release it if the patient abandons the form. This is how flight and concert booking works and it eliminates the surprise failure entirely.

3. **Waitlist** — when a patient's preferred slot gets taken, let them join a waitlist for that physician and date. If a cancellation frees a slot, automatically notify the next person in line. No-show and cancellation rates are high in healthcare; a waitlist turns that into recovered capacity rather than lost appointments.

4. **Status change audit trail** — every status transition should be logged with a timestamp and actor (patient or staff). This matters practically for HIPAA-adjacent accountability, and it makes the appointment detail view much more useful: staff can see exactly when something was confirmed or cancelled and by whom.

5. **Appointment types with variable duration** — not all appointments are 30 minutes. A new patient intake, a follow-up, and an urgent visit all have different durations and different prep requirements. The slot model supports this already; it just needs a `type` and `durationMinutes` field and the slot generation logic updated to block the right number of intervals.

6. **Recurring appointment booking** — for patients managing chronic conditions, booking a single follow-up at a time is friction. A "book next 4 follow-ups every 2 weeks" flow would be genuinely useful and is a natural fit given the slot model.

7. **Calendar export** — a confirmed appointment should be one click to add to Google Calendar or Apple Calendar. Generating an `.ics` file server-side is straightforward and it's one of those small things patients actually notice.

8. **Physician-managed availability** — right now slots are seeded once. A real system needs recurring weekly schedules, the ability to block dates (vacation, conference), and ideally a two-way sync with the physician's existing calendar.

9. **Testing** — the store functions are pure and easy to unit test. A Playwright e2e test covering the booking happy path, the slot-conflict edge case, and the admin status update would give real confidence before any deployment.

10. **Mobile admin layout** — the table scrolls horizontally on small screens. Clinic staff checking bookings on their phone would be better served by a stacked card layout.
