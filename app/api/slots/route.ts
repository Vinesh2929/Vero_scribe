import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/store";

export async function GET(req: NextRequest) {
  const physicianId = req.nextUrl.searchParams.get("physicianId");
  if (!physicianId) {
    return NextResponse.json({ error: "physicianId required" }, { status: 400 });
  }
  return NextResponse.json(getAvailableSlots(physicianId));
}
