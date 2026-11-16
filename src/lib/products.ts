import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

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

const sampleProducts: CatalogProduct[] = [
  {
    id: 1,
    name: "Jarrón Alba",
    category: "Hogar",
    price: 640,
    description: null,
    stock: 12,
    label: "Hecho a mano",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Bolso Brisa",
    category: "Accesorios",
    price: 890,
    description: null,
    stock: 4,
    label: "Favorito",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Vela de cedro",
    category: "Bienestar",
    price: 320,
    description: null,
    stock: 9,
    label: null,
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Taza Tierra",
    category: "Hogar",
    price: 280,
    description: null,
    stock: 2,
    label: "Últimas piezas",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Lino de domingo",
    category: "Textiles",
    price: 760,
    description: null,
    stock: 7,
    label: null,
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Aretes Lucero",
    category: "Accesorios",
    price: 450,
    description: null,
    stock: 6,
    label: "Nuevo",
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    name: "Cuaderno Botánica",
    category: "Papelería",
    price: 190,
    description: null,
    stock: 15,
    label: null,
    image:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    name: "Canasto Palma",
    category: "Hogar",
    price: 540,
    description: null,
    stock: 3,
    label: "Hecho a mano",
    image:
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
  },
];

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

function isDatabaseConfigured() {
  return [
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_DATABASE",
  ].some((key) => process.env[key] !== undefined);
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  if (!isDatabaseConfigured()) {
    return sampleProducts;
  }

  const [rows] = await getPool().execute<ProductRow[]>(`
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
