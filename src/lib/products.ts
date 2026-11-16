import "server-only";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/lib/db";

export type CatalogProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string | null;
  stock: number | null;
  label: string | null;
  image: string | null;
};

type ProductRow = RowDataPacket & {
  id: number;
  name: string;
  category: string;
  price: string | number;
  description: string | null;
  stock: number | null;
  image: string;
};

function resolvePhotoPath(photo: string): string | null {
  const value = photo.trim();

  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const path = value.replaceAll("\\", "/").replace(/^\.\/+/, "");

  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
    return null;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const [rows] = await getDatabase().query<ProductRow[]>(`
    SELECT
      p.pk_clave_pro AS id,
      p.nombre AS name,
      p.precio AS price,
      c.nombre AS category,
      p.descripcion AS description,
      p.stock AS stock,
      p.txt_foto_pro AS image
    FROM tb_productos AS p
    INNER JOIN tb_categorias AS c
      ON c.pk_clave_cat = p.fk_clave_cat
    WHERE p.activo = 1
    ORDER BY p.pk_clave_pro DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    stock: row.stock,
    label:
      row.stock === 0
        ? "Agotado"
        : row.stock !== null && row.stock <= 5
          ? "Últimas piezas"
          : null,
    image: resolvePhotoPath(row.image),
  }));
}
