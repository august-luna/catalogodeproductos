import "server-only";
import { createPool, type Pool } from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & {
  mysqlPool?: Pool;
};

export function getPool(): Pool {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } =
    process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    throw new Error(
      "Configura MYSQL_HOST, MYSQL_USER y MYSQL_DATABASE antes de conectar a MySQL.",
    );
  }

  if (!globalForMysql.mysqlPool) {
    const port = Number(process.env.MYSQL_PORT ?? 3306);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("MYSQL_PORT debe ser un puerto válido.");
    }

    globalForMysql.mysqlPool = createPool({
      host: MYSQL_HOST,
      port,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return globalForMysql.mysqlPool;
}
