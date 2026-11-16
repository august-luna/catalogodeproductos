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

export async function getConnection(): Promise<Connection> {
  const { env } = await getCloudflareContext({ async: true });
  const hyperdrive = env.HYPERDRIVE;

  return createConnection({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    charset: "utf8mb4",
    disableEval: true,
  });
}

async function withConnection<T>(
  callback: (connection: Connection) => Promise<T>,
): Promise<T> {
  const connection = await getConnection();

  try {
    return await callback(connection);
  } finally {
    await connection.end();
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
      withConnection((connection) => connection.execute<T>(sql, values)),
    query: <T extends QueryResult>(sql: string, values?: QueryValues) =>
      withConnection((connection) => connection.query<T>(sql, values)),
  };
}
