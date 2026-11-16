import { NextResponse } from "next/server";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { hashPassword } from "@/lib/passwords";
import {
  getConnection,
  getDatabase,
  logDatabaseError,
} from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";

const entities = [
  "products",
  "categories",
  "users",
  "orders",
  "order-details",
  "statuses",
] as const;
type Entity = (typeof entities)[number];
type Body = Record<string, unknown>;

class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function isEntity(value: string): value is Entity {
  return entities.some((entity) => entity === value);
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function authorize(request: Request, mutation = false) {
  if (mutation && !sameOrigin(request)) {
    return {
      error: NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }),
      session: null,
    };
  }

  const session = await getAdminSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Inicia sesión como administrador." }, { status: 401 }),
      session: null,
    };
  }

  return { error: null, session };
}

async function readBody(request: Request): Promise<Body> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestError("El contenido de la solicitud no es válido.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("El contenido de la solicitud no es válido.");
  }
  return value as Body;
}

function text(
  body: Body,
  key: string,
  maximum: number,
  optional: true,
): string | null;
function text(body: Body, key: string, maximum: number, optional?: false): string;
function text(body: Body, key: string, maximum: number, optional = false) {
  const value = body[key];
  if (optional && (value === null || value === undefined || value === "")) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestError(`${key} es obligatorio.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new RequestError(`${key} no puede exceder ${maximum} caracteres.`);
  }
  return normalized;
}

function integer(
  body: Body,
  key: string,
  options: { minimum?: number; maximum?: number; optional: true },
): number | null;
function integer(
  body: Body,
  key: string,
  options?: { minimum?: number; maximum?: number; optional?: false },
): number;
function integer(
  body: Body,
  key: string,
  {
    minimum = 0,
    maximum = 2_147_483_647,
    optional = false,
  }: { minimum?: number; maximum?: number; optional?: boolean } = {},
) {
  const value = body[key];
  if (optional && (value === null || value === undefined || value === "")) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RequestError(`${key} debe ser un entero válido.`);
  }
  return parsed;
}

function price(body: Body, key = "precio") {
  const value = body[key];
  const stringValue = typeof value === "number" ? String(value) : value;
  if (
    typeof stringValue !== "string" ||
    !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(stringValue)
  ) {
    throw new RequestError(`${key} debe ser un importe válido con hasta dos decimales.`);
  }
  return Number(stringValue).toFixed(2);
}

function booleanValue(body: Body, key: string, fallback = true) {
  const value = body[key];
  if (value === undefined) return fallback ? 1 : 0;
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  throw new RequestError(`${key} debe ser verdadero o falso.`);
}

function databaseError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "ER_DUP_ENTRY") {
    return NextResponse.json(
      { error: "Ya existe un registro con ese usuario o nombre único." },
      { status: 409 },
    );
  }
  if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_NO_REFERENCED_ROW_2") {
    return NextResponse.json(
      { error: "No se puede completar la acción porque hay registros relacionados." },
      { status: 409 },
    );
  }
  logDatabaseError("admin_data_request", error);
  return NextResponse.json(
    { error: "No se pudo completar la operación. Revisa los datos e inténtalo de nuevo." },
    { status: 500 },
  );
}

async function getList(entity: Entity) {
  const queries: Record<Entity, string> = {
    products: `SELECT p.pk_clave_pro AS id, p.nombre, p.precio,
        p.fk_clave_cat AS categoria_id, c.nombre AS categoria,
        p.descripcion, p.stock, p.txt_foto_pro AS fotografia, p.activo
      FROM tb_productos p
      INNER JOIN tb_categorias c ON c.pk_clave_cat = p.fk_clave_cat
      ORDER BY p.pk_clave_pro DESC`,
    categories: `SELECT c.pk_clave_cat AS id, c.nombre, c.descripcion,
        COUNT(p.pk_clave_pro) AS productos
      FROM tb_categorias c
      LEFT JOIN tb_productos p ON p.fk_clave_cat = c.pk_clave_cat
      GROUP BY c.pk_clave_cat
      ORDER BY c.nombre`,
    users: `SELECT pk_clave_usu AS id, nombre, usuario, activo, rol
      FROM tb_usuarios ORDER BY pk_clave_usu DESC`,
    orders: `SELECT p.pk_clave_ped AS id, p.fecha, p.total, p.observaciones,
        p.fk_clave_usu AS usuario_id, u.nombre AS usuario,
        p.fk_clave_est AS estatus_id, e.nombre AS estatus
      FROM tb_pedidos p
      INNER JOIN tb_usuarios u ON u.pk_clave_usu = p.fk_clave_usu
      INNER JOIN tb_estatus_pedidos e ON e.pk_clave_est = p.fk_clave_est
      ORDER BY p.fecha DESC, p.pk_clave_ped DESC`,
    "order-details": `SELECT d.pk_clave_det AS id, d.fk_clave_ped AS pedido_id,
        d.fk_clave_pro AS producto_id, p.nombre AS producto,
        d.precio, d.cantidad, d.subtotal
      FROM tb_detalle_pedidos d
      INNER JOIN tb_productos p ON p.pk_clave_pro = d.fk_clave_pro
      ORDER BY d.fk_clave_ped DESC, d.pk_clave_det`,
    statuses: `SELECT e.pk_clave_est AS id, e.nombre, e.descripcion,
        COUNT(p.pk_clave_ped) AS pedidos
      FROM tb_estatus_pedidos e
      LEFT JOIN tb_pedidos p ON p.fk_clave_est = e.pk_clave_est
      GROUP BY e.pk_clave_est
      ORDER BY e.pk_clave_est`,
  };
  const [rows] = await getDatabase().query<RowDataPacket[]>(queries[entity]);
  return rows;
}

function centsForPrice(value: string | number) {
  const [whole, fraction = ""] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function moneyFromCents(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

const maximumOrderTotalCents = 9_999_999_999;

async function addOrderItems(
  connection: Connection,
  orderId: number,
  items: unknown,
) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new RequestError("Agrega entre 1 y 30 productos al pedido.");
  }

  const quantities = new Map<number, number>();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new RequestError("La lista de productos del pedido no es válida.");
    }
    const row = item as Record<string, unknown>;
    const productId = integer(row, "productId", {
      minimum: 1,
      maximum: 2_147_483_647,
    });
    const quantity = integer(row, "quantity", { minimum: 1, maximum: 1_000_000 });
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    if (quantities.get(productId)! > 1_000_000) {
      throw new RequestError("La cantidad de un producto excede el máximo permitido.");
    }
  }

  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT pk_clave_pro AS id, precio, stock, activo
     FROM tb_productos
     WHERE pk_clave_pro IN (${placeholders})
     FOR UPDATE`,
    ids,
  );
  if (rows.length !== ids.length) {
    throw new RequestError("Uno o más productos ya no existen.", 409);
  }

  let totalCents = 0;
  for (const row of rows) {
    const quantity = quantities.get(row.id as number)!;
    if (row.activo !== 1) {
      throw new RequestError("No se pueden agregar productos inactivos.", 409);
    }
    if (row.stock !== null && Number(row.stock) < quantity) {
      throw new RequestError("No hay existencias suficientes para un producto.", 409);
    }

    const unitPriceCents = centsForPrice(row.precio as string | number);
    totalCents += unitPriceCents * quantity;
    if (totalCents > maximumOrderTotalCents) {
      throw new RequestError("El total del pedido excede el máximo permitido.");
    }
    await connection.query(
      `INSERT INTO tb_detalle_pedidos
       (precio, fk_clave_ped, fk_clave_pro, cantidad)
       VALUES (?, ?, ?, ?)`,
      [moneyFromCents(unitPriceCents), orderId, row.id, quantity],
    );

    if (row.stock !== null) {
      await connection.query(
        `UPDATE tb_productos SET stock = stock - ?
         WHERE pk_clave_pro = ? AND stock >= ?`,
        [quantity, row.id, quantity],
      );
    }
  }
  return totalCents;
}

async function createOrder(body: Body) {
  const userId = integer(body, "usuario_id", { minimum: 1 });
  const statusId = integer(body, "estatus_id", { minimum: 1 });
  const observations = text(body, "observaciones", 5000, true);
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    const [order] = await connection.query(
      `INSERT INTO tb_pedidos (fk_clave_usu, fk_clave_est, observaciones, total)
       VALUES (?, ?, ?, 0)`,
      [userId, statusId, observations],
    );
    const orderId = Number((order as { insertId: number }).insertId);
    const total = await addOrderItems(connection, orderId, body.items);
    await connection.query("UPDATE tb_pedidos SET total = ? WHERE pk_clave_ped = ?", [
      moneyFromCents(total),
      orderId,
    ]);
    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function addExistingOrderDetail(body: Body) {
  const orderId = integer(body, "orderId", { minimum: 1, maximum: 2_147_483_647 });
  const productId = integer(body, "productId", { minimum: 1, maximum: 2_147_483_647 });
  const quantity = integer(body, "cantidad", { minimum: 1, maximum: 1_000_000 });
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    const [orders] = await connection.query<RowDataPacket[]>(
      "SELECT pk_clave_ped FROM tb_pedidos WHERE pk_clave_ped = ? FOR UPDATE",
      [orderId],
    );
    if (orders.length === 0) throw new RequestError("El pedido no existe.", 404);

    const [products] = await connection.query<RowDataPacket[]>(
      `SELECT precio, stock, activo FROM tb_productos
       WHERE pk_clave_pro = ? FOR UPDATE`,
      [productId],
    );
    const product = products[0];
    if (!product) throw new RequestError("El producto no existe.", 404);
    if (product.activo !== 1) {
      throw new RequestError("No se pueden agregar productos inactivos.", 409);
    }
    if (product.stock !== null && Number(product.stock) < quantity) {
      throw new RequestError("No hay existencias suficientes.", 409);
    }

    await connection.query(
      `INSERT INTO tb_detalle_pedidos
       (precio, fk_clave_ped, fk_clave_pro, cantidad)
       VALUES (?, ?, ?, ?)`,
      [product.precio, orderId, productId, quantity],
    );
    if (product.stock !== null) {
      await connection.query(
        "UPDATE tb_productos SET stock = stock - ? WHERE pk_clave_pro = ?",
        [quantity, productId],
      );
    }

    const [totals] = await connection.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(subtotal), 0) AS total FROM tb_detalle_pedidos WHERE fk_clave_ped = ?",
      [orderId],
    );
    if (centsForPrice(totals[0].total as string | number) > maximumOrderTotalCents) {
      throw new RequestError("El total del pedido excede el máximo permitido.", 409);
    }
    await connection.query("UPDATE tb_pedidos SET total = ? WHERE pk_clave_ped = ?", [
      totals[0].total,
      orderId,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function updateOrderDetail(id: number, quantity: number) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [references] = await connection.query<RowDataPacket[]>(
      "SELECT fk_clave_ped AS orderId FROM tb_detalle_pedidos WHERE pk_clave_det = ?",
      [id],
    );
    const orderId = references[0]?.orderId;
    if (!orderId) throw new RequestError("El detalle de pedido no existe.", 404);
    await connection.query(
      "SELECT pk_clave_ped FROM tb_pedidos WHERE pk_clave_ped = ? FOR UPDATE",
      [orderId],
    );
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT d.fk_clave_ped AS orderId, d.fk_clave_pro AS productId,
          d.cantidad AS quantity, p.stock
       FROM tb_detalle_pedidos d
       INNER JOIN tb_productos p ON p.pk_clave_pro = d.fk_clave_pro
       WHERE d.pk_clave_det = ? FOR UPDATE`,
      [id],
    );
    const detail = rows[0];
    if (!detail) throw new RequestError("El detalle de pedido no existe.", 404);

    const delta = quantity - Number(detail.quantity);
    if (delta > 0 && detail.stock !== null && Number(detail.stock) < delta) {
      throw new RequestError("No hay existencias suficientes.", 409);
    }
    if (detail.stock !== null && delta !== 0) {
      await connection.query(
        "UPDATE tb_productos SET stock = stock - ? WHERE pk_clave_pro = ?",
        [delta, detail.productId],
      );
    }
    await connection.query(
      "UPDATE tb_detalle_pedidos SET cantidad = ? WHERE pk_clave_det = ?",
      [quantity, id],
    );
    const [totals] = await connection.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(subtotal), 0) AS total FROM tb_detalle_pedidos WHERE fk_clave_ped = ?",
      [detail.orderId],
    );
    if (centsForPrice(totals[0].total as string | number) > maximumOrderTotalCents) {
      throw new RequestError("El total del pedido excede el máximo permitido.", 409);
    }
    await connection.query(
      "UPDATE tb_pedidos SET total = ? WHERE pk_clave_ped = ?",
      [totals[0].total, detail.orderId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function deleteOrderDetail(id: number) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [references] = await connection.query<RowDataPacket[]>(
      "SELECT fk_clave_ped AS orderId FROM tb_detalle_pedidos WHERE pk_clave_det = ?",
      [id],
    );
    const orderId = references[0]?.orderId;
    if (!orderId) throw new RequestError("El detalle de pedido no existe.", 404);
    await connection.query(
      "SELECT pk_clave_ped FROM tb_pedidos WHERE pk_clave_ped = ? FOR UPDATE",
      [orderId],
    );
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT d.fk_clave_ped AS orderId, d.fk_clave_pro AS productId,
          d.cantidad AS quantity, p.stock
       FROM tb_detalle_pedidos d
       INNER JOIN tb_productos p ON p.pk_clave_pro = d.fk_clave_pro
       WHERE d.pk_clave_det = ? FOR UPDATE`,
      [id],
    );
    const detail = rows[0];
    if (!detail) throw new RequestError("El detalle de pedido no existe.", 404);

    await connection.query("DELETE FROM tb_detalle_pedidos WHERE pk_clave_det = ?", [id]);
    if (detail.stock !== null) {
      await connection.query(
        "UPDATE tb_productos SET stock = stock + ? WHERE pk_clave_pro = ?",
        [detail.quantity, detail.productId],
      );
    }
    const [totals] = await connection.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(subtotal), 0) AS total FROM tb_detalle_pedidos WHERE fk_clave_ped = ?",
      [detail.orderId],
    );
    if (centsForPrice(totals[0].total as string | number) > maximumOrderTotalCents) {
      throw new RequestError("El total del pedido excede el máximo permitido.", 409);
    }
    await connection.query(
      "UPDATE tb_pedidos SET total = ? WHERE pk_clave_ped = ?",
      [totals[0].total, detail.orderId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ error: "Sección no válida." }, { status: 404 });
  }

  try {
    return NextResponse.json({ items: await getList(entity) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await authorize(request, true);
  if (auth.error) return auth.error;
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ error: "Sección no válida." }, { status: 404 });
  }

  try {
    const body = await readBody(request);
    const pool = getDatabase();

    switch (entity) {
      case "products": {
        const name = text(body, "nombre", 100);
        const categoryId = integer(body, "categoria_id", { minimum: 1, maximum: 2_147_483_647 });
        const productPrice = price(body);
        const description = text(body, "descripcion", 65535, true);
        const stock = integer(body, "stock", { maximum: 2_147_483_647, optional: true });
        const photo = text(body, "fotografia", 1000);
        await pool.query(
          `INSERT INTO tb_productos
           (nombre, precio, fk_clave_cat, descripcion, stock, txt_foto_pro, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, productPrice, categoryId, description, stock, photo, booleanValue(body, "activo")],
        );
        break;
      }
      case "categories":
        await pool.query(
          "INSERT INTO tb_categorias (nombre, descripcion) VALUES (?, ?)",
          [text(body, "nombre", 50), text(body, "descripcion", 255, true)],
        );
        break;
      case "users": {
        const password = body.contrasena;
        if (
          typeof password !== "string" ||
          password.length < 8 ||
          password.length > 255
        ) {
          throw new RequestError("La contraseña debe tener entre 8 y 255 caracteres.");
        }
        const role = body.rol === "admin" ? "admin" : body.rol === "usuario" || body.rol === undefined ? "usuario" : null;
        if (!role) throw new RequestError("El rol no es válido.");
        await pool.query(
          `INSERT INTO tb_usuarios (nombre, usuario, contrasena, activo, rol)
           VALUES (?, ?, ?, ?, ?)`,
          [
            text(body, "nombre", 100),
            text(body, "usuario", 50),
            await hashPassword(password),
            booleanValue(body, "activo"),
            role,
          ],
        );
        break;
      }
      case "statuses":
        await pool.query(
          "INSERT INTO tb_estatus_pedidos (nombre, descripcion) VALUES (?, ?)",
          [text(body, "nombre", 50), text(body, "descripcion", 100, true)],
        );
        break;
      case "orders": {
        const id = await createOrder(body);
        return NextResponse.json({ id }, { status: 201 });
      }
      case "order-details":
        await addExistingOrderDetail(body);
        break;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return databaseError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await authorize(request, true);
  if (auth.error) return auth.error;
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ error: "Sección no válida." }, { status: 404 });
  }
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });
  }

  try {
    const body = await readBody(request);
    const pool = getDatabase();
    switch (entity) {
      case "products": {
        const name = text(body, "nombre", 100);
        const categoryId = integer(body, "categoria_id", { minimum: 1, maximum: 2_147_483_647 });
        const productPrice = price(body);
        const description = text(body, "descripcion", 65535, true);
        const stock = integer(body, "stock", { maximum: 2_147_483_647, optional: true });
        await pool.query(
          `UPDATE tb_productos SET nombre = ?, precio = ?, fk_clave_cat = ?,
           descripcion = ?, stock = ?, txt_foto_pro = ?, activo = ?
           WHERE pk_clave_pro = ?`,
          [
            name,
            productPrice,
            categoryId,
            description,
            stock,
            text(body, "fotografia", 1000),
            booleanValue(body, "activo"),
            id,
          ],
        );
        break;
      }
      case "categories":
        await pool.query(
          "UPDATE tb_categorias SET nombre = ?, descripcion = ? WHERE pk_clave_cat = ?",
          [text(body, "nombre", 50), text(body, "descripcion", 255, true), id],
        );
        break;
      case "users": {
        const role = body.rol === "admin" ? "admin" : body.rol === "usuario" ? "usuario" : null;
        if (!role) throw new RequestError("El rol no es válido.");
        const active = booleanValue(body, "activo");
        if (id === auth.session.id && (!active || role !== "admin")) {
          throw new RequestError("No puedes desactivar ni quitar el rol de tu propia cuenta.", 409);
        }
        const [currentUsers] = await pool.query<RowDataPacket[]>(
          "SELECT activo, rol FROM tb_usuarios WHERE pk_clave_usu = ?",
          [id],
        );
        if (currentUsers.length === 0) {
          throw new RequestError("El usuario no existe.", 404);
        }
        const currentUser = currentUsers[0];
        if (
          currentUser.activo === 1 &&
          currentUser.rol === "admin" &&
          (!active || role !== "admin")
        ) {
          const [admins] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM tb_usuarios WHERE activo = 1 AND rol = 'admin'",
          );
          if (Number(admins[0].count) <= 1) {
            throw new RequestError("Debe quedar al menos un administrador activo.", 409);
          }
        }
        const password = body.contrasena;
        if (password !== undefined && typeof password !== "string") {
          throw new RequestError("La contraseña no es válida.");
        }
        const newPassword = typeof password === "string" ? password : "";
        if (newPassword.length > 255) {
          throw new RequestError("La contraseña no puede exceder 255 caracteres.");
        }
        if (newPassword.length > 0 && newPassword.length < 8) {
          throw new RequestError("La contraseña debe tener al menos 8 caracteres.");
        }
        if (newPassword.length > 0) {
          await pool.query(
            `UPDATE tb_usuarios SET nombre = ?, usuario = ?, activo = ?, rol = ?, contrasena = ?
             WHERE pk_clave_usu = ?`,
            [
              text(body, "nombre", 100),
              text(body, "usuario", 50),
              active,
              role,
              await hashPassword(newPassword),
              id,
            ],
          );
        } else {
          await pool.query(
            `UPDATE tb_usuarios SET nombre = ?, usuario = ?, activo = ?, rol = ?
             WHERE pk_clave_usu = ?`,
            [text(body, "nombre", 100), text(body, "usuario", 50), active, role, id],
          );
        }
        break;
      }
      case "orders":
        await pool.query(
          `UPDATE tb_pedidos SET fk_clave_est = ?, observaciones = ?
           WHERE pk_clave_ped = ?`,
          [
            integer(body, "estatus_id", { minimum: 1 }),
            text(body, "observaciones", 5000, true),
            id,
          ],
        );
        break;
      case "order-details":
        await updateOrderDetail(id, integer(body, "cantidad", { minimum: 1 }));
        break;
      case "statuses":
        await pool.query(
          "UPDATE tb_estatus_pedidos SET nombre = ?, descripcion = ? WHERE pk_clave_est = ?",
          [text(body, "nombre", 50), text(body, "descripcion", 100, true), id],
        );
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return databaseError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await authorize(request, true);
  if (auth.error) return auth.error;
  const { entity } = await params;
  if (!isEntity(entity)) {
    return NextResponse.json({ error: "Sección no válida." }, { status: 404 });
  }
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Identificador no válido." }, { status: 400 });
  }

  try {
    const pool = getDatabase();
    switch (entity) {
      case "products":
        await pool.query("UPDATE tb_productos SET activo = 0 WHERE pk_clave_pro = ?", [id]);
        break;
      case "users": {
        if (id === auth.session.id) {
          throw new RequestError("No puedes desactivar tu propia cuenta.", 409);
        }
        const [target] = await pool.query<RowDataPacket[]>(
          "SELECT rol, activo FROM tb_usuarios WHERE pk_clave_usu = ?",
          [id],
        );
        if (target[0]?.rol === "admin" && target[0].activo === 1) {
          const [admins] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM tb_usuarios WHERE activo = 1 AND rol = 'admin'",
          );
          if (Number(admins[0].count) <= 1) {
            throw new RequestError("Debe quedar al menos un administrador activo.", 409);
          }
        }
        await pool.query("UPDATE tb_usuarios SET activo = 0 WHERE pk_clave_usu = ?", [id]);
        break;
      }
      case "categories":
        await pool.query("DELETE FROM tb_categorias WHERE pk_clave_cat = ?", [id]);
        break;
      case "statuses":
        await pool.query("DELETE FROM tb_estatus_pedidos WHERE pk_clave_est = ?", [id]);
        break;
      case "order-details":
        await deleteOrderDetail(id);
        break;
      case "orders":
        throw new RequestError("Los pedidos se conservan para proteger el historial.", 409);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return databaseError(error);
  }
}
