import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "db.json");

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface Physician {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  initials: string;
}

export interface TimeSlot {
  id: string;
  physicianId: string;
  date: string;
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  physicianId: string;
  slotId: string;
  date: string;
  time: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reasonForVisit: string;
  status: AppointmentStatus;
  createdAt: string;
}

interface DB {
  physicians: Physician[];
  slots: TimeSlot[];
  appointments: Appointment[];
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readDB(): DB {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const seed = getSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeDB(db: DB) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function getSeedData(): DB {
  const physicians: Physician[] = [
    {
      id: "p1",
      name: "Dr. Sarah Chen",
      specialty: "Family Medicine",
      bio: "Board-certified in family medicine with 12 years of experience in primary care.",
      initials: "SC",
    },
    {
      id: "p2",
      name: "Dr. Marcus Webb",
      specialty: "Internal Medicine",
      bio: "Specializes in chronic disease management and hospital medicine.",
      initials: "MW",
    },
    {
      id: "p3",
      name: "Dr. Priya Nair",
      specialty: "General Practice",
      bio: "Focused on community health and accessible primary care.",
      initials: "PN",
    },
  ];

  const slots: TimeSlot[] = [];
  const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"];

  const today = new Date();
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split("T")[0];

    for (const physician of physicians) {
      for (const time of times) {
        slots.push({
          id: `slot-${physician.id}-${dateStr}-${time.replace(":", "")}`,
          physicianId: physician.id,
          date: dateStr,
          time,
          available: true,
        });
      }
    }
  }

  return { physicians, slots, appointments: [] };
}

export function getPhysicians(): Physician[] {
  return readDB().physicians;
}

export function getPhysician(id: string): Physician | undefined {
  return readDB().physicians.find((p) => p.id === id);
}

export function getAvailableSlots(physicianId: string): TimeSlot[] {
  const db = readDB();
  const today = new Date().toISOString().split("T")[0];
  return db.slots.filter(
    (s) => s.physicianId === physicianId && s.available && s.date >= today
  );
}

export function getSlot(slotId: string): TimeSlot | undefined {
  return readDB().slots.find((s) => s.id === slotId);
}

export function createAppointment(data: {
  physicianId: string;
  slotId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reasonForVisit: string;
}): Appointment | { error: string } {
  const db = readDB();

  const slot = db.slots.find((s) => s.id === data.slotId);
  if (!slot) return { error: "Slot not found" };
  if (!slot.available) return { error: "Slot no longer available" };

  const appointment: Appointment = {
    id: `appt-${Date.now()}`,
    physicianId: data.physicianId,
    slotId: data.slotId,
    date: slot.date,
    time: slot.time,
    patientName: data.patientName,
    patientEmail: data.patientEmail,
    patientPhone: data.patientPhone,
    reasonForVisit: data.reasonForVisit,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  slot.available = false;
  db.appointments.push(appointment);
  writeDB(db);

  return appointment;
}

export function getAppointments(): (Appointment & { physician: Physician })[] {
  const db = readDB();
  return db.appointments
    .map((a) => ({
      ...a,
      physician: db.physicians.find((p) => p.id === a.physicianId)!,
    }))
    .sort((a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + b.time).getTime());
}

export function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Appointment | { error: string } {
  const db = readDB();
  const appt = db.appointments.find((a) => a.id === id);
  if (!appt) return { error: "Appointment not found" };

  if (status === "cancelled" && appt.status !== "cancelled") {
    const slot = db.slots.find((s) => s.id === appt.slotId);
    if (slot) slot.available = true;
  }
  if (status !== "cancelled" && appt.status === "cancelled") {
    const slot = db.slots.find((s) => s.id === appt.slotId);
    if (slot) slot.available = false;
  }

  appt.status = status;
  writeDB(db);
  return appt;
}
