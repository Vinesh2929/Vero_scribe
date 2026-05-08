import { NextRequest, NextResponse } from "next/server";
import { updateAppointmentStatus, type AppointmentStatus } from "@/lib/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: AppointmentStatus };

  const valid: AppointmentStatus[] = ["pending", "confirmed", "cancelled"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = updateAppointmentStatus(id, status);

  if ("error" in result) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
