# Vero Booking

A patient appointment booking flow built with Next.js 15, TypeScript, and a minimal CSS design system. No external services, no environment variables, just clone and run.

---

## How to run

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/Vinesh2929/Vero_scribe.git
cd Vero_scribe
npm install
npm run dev
```

Once the server starts, open [http://localhost:3000](http://localhost:3000).

On first run, the app seeds three physicians and roughly 120 available slots across the next five business days. No database setup, no Docker, no configuration needed.

---

## What I built

### Patient booking (`/book`)

A four-step wizard: choose a physician, pick a time slot, enter details, then review and confirm. Inline validation on all required fields. If a slot gets taken between selection and submission, the API returns a 409 and the patient sees a clear error without losing their form data. All bookings start as `pending`.

### Appointment lookup (`/my-appointments`)

Patients enter their email to view all their bookings and current statuses. No account needed.

### Admin dashboard (`/admin`)

- Stat cards at the top filter by status (total / pending / confirmed / cancelled)
- Text search across patient name, email, and physician
- Sortable table with patient contact, physician, appointment time, booking timestamp, reason, and status
- Per-row status dropdown with keyboard navigation (arrow keys, Enter, Escape)
- Cancelling a booking frees the slot; re-confirming re-locks it
- Status updates are applied optimistically and roll back on failure

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

**JSON file store.** No infrastructure needed for a work sample. `lib/store.ts` is the only file that knows about persistence, so swapping to Prisma is a one-file change.

**Slots as first-class entities.** Each slot is its own record with an `available` boolean. This makes the double-booking check trivial and the cancel/re-confirm logic obvious.

**Pending by default.** Clinical workflows usually require staff to verify something before confirming. Starting as `pending` reflects that and sets the right expectation with patients upfront.

**Single client component for the wizard.** Each step is a local state change, not a route change. No state management library needed for a four-screen form.

**No auth.** The brief excluded it. Email as a lookup key for the patient portal is appropriate for this scope.

---

## What I would improve with more time

1. **Real database** - Prisma + SQLite locally, Postgres in production. The store interface is already abstracted.

2. **Soft slot reservation** - Reserve a slot the moment it is selected with a short TTL and a visible countdown, then release it if the patient abandons. Eliminates the surprise 409 entirely.

3. **Waitlist** - Let patients join a waitlist when a slot is full. Auto-notify the next person when a cancellation frees it up. Cancellation rates in healthcare are high and a waitlist turns that into recovered capacity.

4. **Status change audit trail** - Log every status transition with a timestamp and actor. Important for accountability and makes the admin view significantly more useful.

5. **Appointment types with variable duration** - Not all visits are 30 minutes. The slot model already supports this; it just needs a type and duration field.

6. **Recurring appointments** - For patients managing chronic conditions, booking one follow-up at a time is unnecessary friction.

7. **Calendar export** - One-click `.ics` export for confirmed appointments to add to Google or Apple Calendar.

8. **Physician-managed availability** - Slots are seeded once on first run. A real system needs recurring schedules and the ability to block dates.

9. **Testing** - Unit tests for the store module and a Playwright e2e test covering the booking flow and slot-conflict edge case.

10. **Mobile admin layout** - The table scrolls horizontally on small screens. A card layout would work better for clinic staff on mobile.
