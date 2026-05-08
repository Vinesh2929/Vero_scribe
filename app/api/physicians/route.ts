import { NextResponse } from "next/server";
import { getPhysicians } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getPhysicians());
}
