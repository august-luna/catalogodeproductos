import { randomBytes, scrypt as callbackScrypt } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const scrypt = promisify(callbackScrypt);

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Define ${name} en .env.local antes de continuar.`);
  }
  if (value.length < 12) {
    throw new Error(`${name} debe tener al menos 12 caracteres.`);
  }
  return value;
}

const adminPassword = required("ADMIN_PASSWORD");
const professorPassword = required("PROFESOR_PASSWORD");
if (adminPassword === professorPassword) {
  throw new Error("Las contraseñas de admin y profesor deben ser distintas.");
}

const users = [
  { name: "Administrador", username: "admin", password: adminPassword },
  { name: "Profesor", username: "profesor", password: professorPassword },
];

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(key).toString("base64url")}`;
}

const connection = await mysql.createConnection({
  host: required("MYSQL_HOST"),
  port: Number(process.env.MYSQL_PORT || 3306),
  user: required("MYSQL_USER"),
  password: process.env.MYSQL_PASSWORD || "",
  database: required("MYSQL_DATABASE"),
  charset: "utf8mb4",
});

try {
  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tb_usuarios'
       AND COLUMN_NAME = 'rol'`,
  );
  if (columns.length === 0) {
    throw new Error(
      "Primero ejecuta database/migrations/001_user_roles.sql en MySQL.",
    );
  }

  await connection.beginTransaction();

  const [rows] = await connection.execute(
    "SELECT pk_clave_usu, contrasena FROM tb_usuarios FOR UPDATE",
  );
  for (const row of rows) {
    if (!row.contrasena.startsWith("scrypt$")) {
      await connection.execute(
        "UPDATE tb_usuarios SET contrasena = ? WHERE pk_clave_usu = ?",
        [await hashPassword(row.contrasena), row.pk_clave_usu],
      );
    }
  }

  for (const user of users) {
    const [existing] = await connection.execute(
      "SELECT pk_clave_usu FROM tb_usuarios WHERE usuario = ? FOR UPDATE",
      [user.username],
    );
    const passwordHash = await hashPassword(user.password);

    if (existing.length > 0) {
      await connection.execute(
        `UPDATE tb_usuarios
         SET nombre = ?, contrasena = ?, activo = 1, rol = 'admin'
         WHERE pk_clave_usu = ?`,
        [user.name, passwordHash, existing[0].pk_clave_usu],
      );
    } else {
      await connection.execute(
        `INSERT INTO tb_usuarios (nombre, usuario, contrasena, activo, rol)
         VALUES (?, ?, ?, 1, 'admin')`,
        [user.name, user.username, passwordHash],
      );
    }
  }

  await connection.commit();
  console.log(
    "Contraseñas migradas y cuentas administradoras admin/profesor preparadas.",
  );
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
