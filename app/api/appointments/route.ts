import { NextRequest, NextResponse } from "next/server";
import { getAppointments, createAppointment } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getAppointments());
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
