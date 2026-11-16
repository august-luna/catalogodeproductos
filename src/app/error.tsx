"use client";

export default function CatalogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-medium">No pudimos cargar el catálogo.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#777a70]">
        Verifica la conexión a MySQL y las variables de entorno. Puedes intentar
        cargar los productos de nuevo.
      </p>
      <button
        className="mt-6 rounded-full bg-[#293c2d] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3f5b43]"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
    </main>
  );
}
