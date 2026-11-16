import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { logDatabaseError } from "@/lib/db";

export async function GET() {
  try {
    const customer = await getCustomerSession();
    return NextResponse.json({
      customer: customer
        ? { name: customer.name, username: customer.username }
        : null,
    });
  } catch (error) {
    logDatabaseError("customer_session", error);
    return NextResponse.json(
      { error: "No se pudo verificar la sesión." },
      { status: 500 },
    );
  }
}
