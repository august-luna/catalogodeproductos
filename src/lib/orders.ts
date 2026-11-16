import "server-only";
import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getConnection, logDatabaseError } from "@/lib/db";

export type OrderItem = {
  productId: number;
  quantity: number;
};

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const maximumOrderTotalCents = 9_999_999_999;

function centsForPrice(value: string | number) {
  const [whole, fraction = ""] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function moneyFromCents(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function parseOrderItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new OrderError("Agrega entre 1 y 30 productos al pedido.");
  }

  const quantities = new Map<number, number>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new OrderError("La lista de productos del pedido no es válida.");
    }

    const row = item as Record<string, unknown>;
    const productId = row.productId;
    const quantity = row.quantity;
    if (
      typeof productId !== "number" ||
      !Number.isSafeInteger(productId) ||
      productId < 1 ||
      productId > 2_147_483_647
    ) {
      throw new OrderError("El identificador de un producto no es válido.");
    }
    if (
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 1_000_000
    ) {
      throw new OrderError("La cantidad de un producto no es válida.");
    }

    const combinedQuantity = (quantities.get(productId) ?? 0) + quantity;
    if (combinedQuantity > 1_000_000) {
      throw new OrderError("La cantidad de un producto excede el máximo permitido.");
    }
    quantities.set(productId, combinedQuantity);
  }

  if (quantities.size > 30) {
    throw new OrderError("Agrega hasta 30 productos distintos al pedido.");
  }

  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

async function insertOrderItems(
  connection: Connection,
  orderId: number,
  items: OrderItem[],
) {
  const ids = items.map((item) => item.productId);
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT pk_clave_pro AS id, nombre, precio, stock, activo
     FROM tb_productos
     WHERE pk_clave_pro IN (${placeholders})
     ORDER BY pk_clave_pro
     FOR UPDATE`,
    ids,
  );
  if (rows.length !== ids.length) {
    throw new OrderError("Uno o más productos ya no existen.", 409);
  }

  const itemsByProductId = new Map(items.map((item) => [item.productId, item]));
  let totalCents = 0;
  for (const row of rows) {
    const item = itemsByProductId.get(Number(row.id));
    if (!item) {
      throw new Error("Locked product does not match the requested order items.");
    }
    if (row.activo !== 1) {
      throw new OrderError("No se pueden agregar productos inactivos.", 409);
    }
    if (row.stock !== null && Number(row.stock) < item.quantity) {
      throw new OrderError(
        `No hay existencias suficientes de ${String(row.nombre ?? "un producto")}.`,
        409,
      );
    }

    const unitPriceCents = centsForPrice(row.precio as string | number);
    totalCents += unitPriceCents * item.quantity;
    if (totalCents > maximumOrderTotalCents) {
      throw new OrderError("El total del pedido excede el máximo permitido.");
    }

    await connection.query(
      `INSERT INTO tb_detalle_pedidos
       (precio, fk_clave_ped, fk_clave_pro, cantidad)
       VALUES (?, ?, ?, ?)`,
      [moneyFromCents(unitPriceCents), orderId, row.id, item.quantity],
    );

    if (row.stock !== null) {
      await connection.query(
        `UPDATE tb_productos SET stock = stock - ?
         WHERE pk_clave_pro = ? AND stock >= ?`,
        [item.quantity, row.id, item.quantity],
      );
    }
  }

  return totalCents;
}

export async function createOrder({
  userId,
  statusId,
  items,
  observations = null,
}: {
  userId: number;
  statusId?: number;
  items: OrderItem[];
  observations?: string | null;
}) {
  const connection = await getConnection();
  let transactionStarted = false;
  let transactionCommitted = false;
  let operationFailed = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    let orderStatusId = statusId;
    if (orderStatusId === undefined) {
      const [statuses] = await connection.query<RowDataPacket[]>(
        `SELECT pk_clave_est AS id
         FROM tb_estatus_pedidos
         WHERE LOWER(TRIM(nombre)) = 'pendiente'
         ORDER BY pk_clave_est
         LIMIT 1`,
      );
      if (statuses.length === 0) {
        throw new OrderError(
          "No existe el estatus «Pendiente». Pide a un administrador que lo agregue antes de comprar.",
          503,
        );
      }
      orderStatusId = Number(statuses[0].id);
    }

    const [orderResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO tb_pedidos (fk_clave_usu, fk_clave_est, observaciones, total)
       VALUES (?, ?, ?, 0)`,
      [userId, orderStatusId, observations],
    );
    const orderId = Number(orderResult.insertId);
    const totalCents = await insertOrderItems(connection, orderId, items);
    await connection.query(
      "UPDATE tb_pedidos SET total = ? WHERE pk_clave_ped = ?",
      [moneyFromCents(totalCents), orderId],
    );
    await connection.commit();
    transactionStarted = false;
    transactionCommitted = true;

    return { orderId, totalCents };
  } catch (error) {
    operationFailed = true;
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Failed to roll back order transaction:", rollbackError);
      }
    }
    throw error;
  } finally {
    try {
      await connection.end();
    } catch (error) {
      logDatabaseError("close_order_connection", error);
      if (!operationFailed && !transactionCommitted) throw error;
    }
  }
}
