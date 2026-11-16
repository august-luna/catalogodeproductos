import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/lib/db";

const cookieName = "la-barra-admin";
const sessionLifetimeSeconds = 60 * 60 * 8;

export type AdminSession = {
  id: number;
  name: string;
  username: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("SESSION_SECRET debe tener al menos 32 bytes.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest();
}

export function createSessionToken(user: Omit<AdminSession, "expiresAt">) {
  const payload = Buffer.from(
    JSON.stringify({
      ...user,
      expiresAt: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload).toString("base64url")}`;
}

function readSessionToken(token: string): AdminSession | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expected = sign(payload);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;

    if (
      !Number.isInteger(session.id) ||
      typeof session.name !== "string" ||
      typeof session.username !== "string" ||
      !Number.isInteger(session.expiresAt) ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) {
    return null;
  }

  const session = readSessionToken(token);
  if (!session) {
    return null;
  }

  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    "SELECT activo, rol FROM tb_usuarios WHERE pk_clave_usu = ? LIMIT 1",
    [session.id],
  );
  const account = rows[0] as
    | { activo: number; rol: string }
    | undefined;

  return account?.activo === 1 && account.rol === "admin" ? session : null;
}

export async function setAdminSession(token: string) {
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(cookieName);
}

export async function requireAdminSession() {
  return getAdminSession();
}
