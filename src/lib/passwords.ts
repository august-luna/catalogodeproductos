import "server-only";
import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(callbackScrypt);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, saltValue, keyValue, extra] = storedHash.split("$");

  if (algorithm !== "scrypt" || !saltValue || !keyValue || extra !== undefined) {
    return false;
  }

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(saltValue, "base64url");
    expectedKey = Buffer.from(keyValue, "base64url");
  } catch {
    return false;
  }

  if (salt.length !== 16 || expectedKey.length !== keyLength) {
    return false;
  }

  const actualKey = (await scrypt(password, salt, keyLength)) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}
