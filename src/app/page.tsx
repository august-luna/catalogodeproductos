import { Suspense } from "react";
import { connection } from "next/server";
import Catalog from "@/app/catalog";
import { getCatalogProducts } from "@/lib/products";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-[#777a70]">
          Cargando catálogo...
        </main>
      }
    >
      <ProductCatalog />
    </Suspense>
  );
}

async function ProductCatalog() {
  await connection();
  const products = await getCatalogProducts();

  return <Catalog products={products} />;
}
