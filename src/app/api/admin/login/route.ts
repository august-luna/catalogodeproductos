import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { createSessionToken, setAdminSession } from "@/lib/admin-session";
import { getPool } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";

type UserRow = RowDataPacket & {
  pk_clave_usu: number;
  nombre: string;
  usuario: string;
  contrasena: string;
  activo: number;
  rol: string;
};

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

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

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  if (
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    body.username.length > 50 ||
    body.password.length > 256
  ) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }

  try {
    const [rows] = await getPool().execute<UserRow[]>(
      `SELECT pk_clave_usu, nombre, usuario, contrasena, activo, rol
       FROM tb_usuarios
       WHERE usuario = ?
       LIMIT 1`,
      [body.username.trim()],
    );
    const user = rows[0];

    if (
      !user ||
      user.activo !== 1 ||
      user.rol !== "admin" ||
      !(await verifyPassword(body.password, user.contrasena))
    ) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    await setAdminSession(
      createSessionToken({
        id: user.pk_clave_usu,
        name: user.nombre,
        username: user.usuario,
      }),
    );

    return NextResponse.json({ user: { name: user.nombre } });
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Revisa la configuración del servidor." },
      { status: 500 },
    );
  }
}
