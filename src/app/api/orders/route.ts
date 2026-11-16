import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { logDatabaseError } from "@/lib/db";
import { createOrder, OrderError, parseOrderItems } from "@/lib/orders";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json(
        { error: "Inicia sesión con una cuenta de cliente para realizar el pedido." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    }

    const items = parseOrderItems((body as Record<string, unknown>).items);
    const result = await createOrder({ userId: customer.id, items });
    return NextResponse.json(
      {
        orderId: result.orderId,
        total: result.totalCents / 100,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    logDatabaseError("customer_create_order", error);
    return NextResponse.json(
      { error: "No se pudo guardar el pedido. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
