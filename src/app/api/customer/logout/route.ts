import { NextResponse } from "next/server";
import { clearCustomerSession } from "@/lib/customer-session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    (() => {
      try {
        return new URL(origin).origin !== new URL(request.url).origin;
      } catch {
        return true;
      }
    })()
  ) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  await clearCustomerSession();
  return NextResponse.json({ ok: true });
}
