import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createConnection,
  type Connection,
  type ExecuteValues,
  type FieldPacket,
  type QueryResult,
  type QueryValues,
} from "mysql2/promise";

type HyperdriveBinding = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

declare global {
  interface CloudflareEnv {
    HYPERDRIVE: HyperdriveBinding;
  }
}

export function logDatabaseError(operation: string, error: unknown) {
  const details: Record<string, string | number> = { operation };

  if (error instanceof Error) {
    details.name = error.name;
    details.message = error.message;
    if (error.stack) details.stack = error.stack;
  } else if (typeof error === "string") {
    details.message = error;
  }

  if (error && typeof error === "object") {
    for (const key of ["code", "errno", "sqlState"] as const) {
      const value = Reflect.get(error, key);
      if (typeof value === "string" || typeof value === "number") {
        details[key] = value;
      }
    }
  }

  console.error(JSON.stringify({ event: "database_error", ...details }));
}

export async function getConnection(): Promise<Connection> {
  let hyperdrive: HyperdriveBinding | undefined;

  try {
    const { env } = await getCloudflareContext({ async: true });
    hyperdrive = env.HYPERDRIVE;
    if (!hyperdrive) {
      throw new Error("Cloudflare binding HYPERDRIVE is not available.");
    }
  } catch (error) {
    logDatabaseError("resolve_hyperdrive_binding", error);
    throw error;
  }

  try {
    return await createConnection({
      host: hyperdrive.host,
      port: hyperdrive.port,
      user: hyperdrive.user,
      password: hyperdrive.password,
      database: hyperdrive.database,
      charset: "utf8mb4",
      disableEval: true,
    });
  } catch (error) {
    logDatabaseError("connect_hyperdrive", error);
    throw error;
  }
}

async function withConnection<T>(
  operation: "execute" | "query",
  callback: (connection: Connection) => Promise<T>,
): Promise<T> {
  const connection = await getConnection();
  let operationFailed = false;

  try {
    return await callback(connection);
  } catch (error) {
    operationFailed = true;
    logDatabaseError(`mysql_${operation}`, error);
    throw error;
  } finally {
    try {
      await connection.end();
    } catch (error) {
      logDatabaseError("close_hyperdrive_connection", error);
      if (!operationFailed) throw error;
    }
  }
}

type Database = {
  execute<T extends QueryResult>(
    sql: string,
    values?: ExecuteValues,
  ): Promise<[T, FieldPacket[]]>;
  query<T extends QueryResult>(
    sql: string,
    values?: QueryValues,
  ): Promise<[T, FieldPacket[]]>;
};

export function getDatabase(): Database {
  return {
    execute: <T extends QueryResult>(sql: string, values?: ExecuteValues) =>
      withConnection("execute", (connection) =>
        connection.execute<T>(sql, values),
      ),
    query: <T extends QueryResult>(sql: string, values?: QueryValues) =>
      withConnection("query", (connection) => connection.query<T>(sql, values)),
  };
}
