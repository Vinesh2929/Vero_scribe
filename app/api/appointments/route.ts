import { NextRequest, NextResponse } from "next/server";
import { getAppointments, createAppointment } from "@/lib/store";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const all = getAppointments();
  if (email) {
    return NextResponse.json(all.filter((a) => a.patientEmail.toLowerCase() === email));
  }
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { physicianId, slotId, patientName, patientEmail, patientPhone, reasonForVisit } = body;

  if (!physicianId || !slotId || !patientName || !patientEmail || !reasonForVisit) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = createAppointment({
    physicianId,
    slotId,
    patientName: String(patientName).trim(),
    patientEmail: String(patientEmail).trim(),
    patientPhone: String(patientPhone || "").trim(),
    reasonForVisit: String(reasonForVisit).trim(),
  });

  if ("error" in result) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result, { status: 201 });
}
