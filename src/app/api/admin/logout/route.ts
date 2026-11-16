import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
