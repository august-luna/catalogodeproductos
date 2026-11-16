"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Entity =
  | "products"
  | "categories"
  | "users"
  | "orders"
  | "order-details"
  | "statuses";
type RecordRow = Record<string, unknown> & { id: number };
type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "order-items";
  required?: boolean;
  options?: { label: string; value: string | number }[];
  hint?: string;
};

const sections: { id: Entity; label: string; title: string; singular: string }[] = [
  { id: "products", label: "Productos", title: "Productos", singular: "producto" },
  { id: "categories", label: "Categorías", title: "Categorías", singular: "categoría" },
  { id: "users", label: "Usuarios", title: "Usuarios", singular: "usuario" },
  { id: "orders", label: "Pedidos", title: "Pedidos", singular: "pedido" },
  { id: "order-details", label: "Detalles", title: "Detalles de pedidos", singular: "detalle" },
  { id: "statuses", label: "Estatus", title: "Estatus de pedidos", singular: "estatus" },
];

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function isActive(value: unknown) {
  return value === 1 || value === true;
}

function formatValue(value: unknown, key: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "precio" || key === "total" || key === "subtotal") {
    return currency.format(Number(value));
  }
  if (key === "activo") return isActive(value) ? "Activo" : "Inactivo";
  if (key === "fecha" && typeof value === "string") {
    return new Date(value).toLocaleString("es-MX");
  }
  return String(value);
}

export default function AdminDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [section, setSection] = useState<Entity>("products");
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [categories, setCategories] = useState<RecordRow[]>([]);
  const [users, setUsers] = useState<RecordRow[]>([]);
  const [statuses, setStatuses] = useState<RecordRow[]>([]);
  const [products, setProducts] = useState<RecordRow[]>([]);
  const [orders, setOrders] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<RecordRow | null | false>(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [orderItems, setOrderItems] = useState<
    { productId: string; quantity: string }[]
  >([]);
  const [notice, setNotice] = useState("");

  const currentSection = sections.find((item) => item.id === section)!;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${section}`, { cache: "no-store" });
      const result = (await response.json()) as { items?: RecordRow[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar los datos.");
      setRows(result.items ?? []);
      const optionEntities: Entity[] = [
        "categories",
        "users",
        "statuses",
        "products",
        "orders",
      ];
      const optionResponses = await Promise.all(
        optionEntities.map((entity) =>
          fetch(`/api/admin/${entity}`, { cache: "no-store" }),
        ),
      );
      const optionResults = (await Promise.all(
        optionResponses.map((optionResponse) => optionResponse.json()),
      )) as { items?: RecordRow[]; error?: string }[];
      if (optionResponses.some((optionResponse) => !optionResponse.ok)) {
        throw new Error("No se pudieron cargar las opciones de los formularios.");
      }
      setCategories(optionResults[0].items ?? []);
      setUsers(optionResults[1].items ?? []);
      setStatuses(optionResults[2].items ?? []);
      setProducts(optionResults[3].items ?? []);
      setOrders(optionResults[4].items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const fields = useMemo<Field[]>(() => {
    switch (section) {
      case "products":
        return [
          { key: "nombre", label: "Nombre", required: true },
          { key: "precio", label: "Precio", type: "number", required: true },
          {
            key: "categoria_id",
            label: "Categoría",
            type: "select",
            required: true,
            options: categories.map((item) => ({
              label: String(item.nombre),
              value: String(item.id),
            })),
          },
          { key: "stock", label: "Stock", type: "number", hint: "Déjalo vacío si no controlas existencias." },
          { key: "fotografia", label: "URL o ruta de fotografía", required: true },
          { key: "descripcion", label: "Descripción", type: "textarea" },
          { key: "activo", label: "Activo", type: "checkbox" },
        ];
      case "categories":
        return [
          { key: "nombre", label: "Nombre", required: true },
          { key: "descripcion", label: "Descripción", type: "textarea" },
        ];
      case "users":
        return [
          { key: "nombre", label: "Nombre", required: true },
          { key: "usuario", label: "Usuario", required: true },
          {
            key: "contrasena",
            label: editor ? "Nueva contraseña (opcional)" : "Contraseña",
            type: "text",
            required: !editor,
            hint: editor ? "Déjala vacía para conservar la contraseña actual." : "Se almacenará como hash seguro.",
          },
          {
            key: "rol",
            label: "Rol",
            type: "select",
            required: true,
            options: [
              { label: "Usuario", value: "usuario" },
              { label: "Administrador", value: "admin" },
            ],
          },
          { key: "activo", label: "Activo", type: "checkbox" },
        ];
      case "orders":
        return editor
          ? [
              {
                key: "estatus_id",
                label: "Estatus",
                type: "select",
                required: true,
                options: statuses.map((item) => ({
                  label: String(item.nombre),
                  value: String(item.id),
                })),
              },
              { key: "observaciones", label: "Observaciones", type: "textarea" },
            ]
          : [
              {
                key: "usuario_id",
                label: "Usuario",
                type: "select",
                required: true,
                options: users
                  .filter((item) => isActive(item.activo))
                  .map((item) => ({
                    label: `${String(item.nombre)} (${String(item.usuario)})`,
                    value: String(item.id),
                  })),
              },
              {
                key: "estatus_id",
                label: "Estatus",
                type: "select",
                required: true,
                options: statuses.map((item) => ({
                  label: String(item.nombre),
                  value: String(item.id),
                })),
              },
              {
                key: "items",
                label: "Bebidas del pedido",
                type: "order-items",
                required: true,
              },
              { key: "observaciones", label: "Observaciones", type: "textarea" },
            ];
      case "order-details":
        return editor
          ? [{ key: "cantidad", label: "Cantidad", type: "number", required: true }]
          : [
              {
                key: "fk_clave_ped",
                label: "Pedido",
                type: "select",
                required: true,
                options: orders.map((item) => ({
                  label: `Pedido #${String(item.id)}`,
                  value: String(item.id),
                })),
              },
              {
                key: "fk_clave_pro",
                label: "Producto",
                type: "select",
                required: true,
                options: products
                  .filter((item) => isActive(item.activo))
                  .map((item) => ({
                    label: String(item.nombre),
                    value: String(item.id),
                  })),
              },
              { key: "cantidad", label: "Cantidad", type: "number", required: true },
            ];
      case "statuses":
        return [
          { key: "nombre", label: "Nombre", required: true },
          { key: "descripcion", label: "Descripción", type: "textarea" },
        ];
    }
  }, [categories, editor, orders, products, section, statuses, users]);

  const columns = useMemo(() => {
    const columnMap: Record<Entity, { key: string; label: string }[]> = {
      products: [
        { key: "id", label: "ID" },
        { key: "nombre", label: "Producto" },
        { key: "categoria", label: "Categoría" },
        { key: "precio", label: "Precio" },
        { key: "stock", label: "Stock" },
        { key: "activo", label: "Estado" },
      ],
      categories: [
        { key: "id", label: "ID" },
        { key: "nombre", label: "Categoría" },
        { key: "descripcion", label: "Descripción" },
        { key: "productos", label: "Productos" },
      ],
      users: [
        { key: "id", label: "ID" },
        { key: "nombre", label: "Nombre" },
        { key: "usuario", label: "Usuario" },
        { key: "rol", label: "Rol" },
        { key: "activo", label: "Estado" },
      ],
      orders: [
        { key: "id", label: "Pedido" },
        { key: "fecha", label: "Fecha" },
        { key: "usuario", label: "Usuario" },
        { key: "estatus", label: "Estatus" },
        { key: "total", label: "Total" },
      ],
      "order-details": [
        { key: "id", label: "ID" },
        { key: "pedido_id", label: "Pedido" },
        { key: "producto", label: "Producto" },
        { key: "cantidad", label: "Cantidad" },
        { key: "precio", label: "Precio unitario" },
        { key: "subtotal", label: "Subtotal" },
      ],
      statuses: [
        { key: "id", label: "ID" },
        { key: "nombre", label: "Estatus" },
        { key: "descripcion", label: "Descripción" },
        { key: "pedidos", label: "Pedidos" },
      ],
    };
    return columnMap[section];
  }, [section]);

  function openCreate() {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "checkbox") initial[field.key] = "1";
      else if (field.options?.[0]) {
        initial[field.key] = String(field.options[0].value);
      } else {
        initial[field.key] = "";
      }
      if (section === "orders") {
        setOrderItems([
          {
            productId: String(
              products.find((product) => isActive(product.activo))?.id ?? "",
            ),
            quantity: "1",
          },
        ]);
      }
    }
    setValues(initial);
    setEditor(null);
    setError("");
  }

  function openEdit(row: RecordRow) {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      const value = row[field.key];
      initial[field.key] =
        value === null || value === undefined
          ? ""
          : field.type === "checkbox"
            ? isActive(value) ? "1" : "0"
            : String(value);
    }
    if (section === "order-details") {
      initial.fk_clave_ped = String(row.pedido_id ?? "");
      initial.fk_clave_pro = String(row.producto_id ?? "");
    }
    if (section === "orders") {
      initial.usuario_id = String(row.usuario_id ?? "");
      initial.estatus_id = String(row.estatus_id ?? "");
    }
    setValues(initial);
    setEditor(row);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = { ...values };
    for (const field of fields) {
      if (field.type === "checkbox") payload[field.key] = values[field.key] === "1";
      if (field.type === "number" && values[field.key] !== "") {
        payload[field.key] = Number(values[field.key]);
      }
    }
    if (section === "orders" && !editor) {
      payload.items = orderItems.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }));
    }
    if (section === "order-details") {
      payload.orderId = Number(values.fk_clave_ped);
      payload.productId = Number(values.fk_clave_pro);
    }

    try {
      const response = await fetch(
        `/api/admin/${section}${editor ? `?id=${editor.id}` : ""}`,
        {
          method: editor ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setEditor(false);
      setNotice("Cambios guardados correctamente.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: RecordRow) {
    const action = section === "products" || section === "users" ? "desactivar" : "eliminar";
    if (!window.confirm(`¿Seguro que quieres ${action} este registro?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/${section}?id=${row.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo completar la acción.");
      setNotice("Acción realizada correctamente.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Error al eliminar.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#30251f]">
      <header className="sticky top-0 z-20 border-b border-[#e9e1d7] bg-[#fbf8f2]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link className="text-xl font-semibold tracking-[-0.06em]" href="/">
              la barra<span className="text-[#a64f35]">.</span>
            </Link>
            <span className="hidden h-6 w-px bg-[#e6ded4] sm:block" />
            <span className="hidden text-sm text-[#777168] sm:block">
              Panel de administración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#777168] sm:block">
              {userName}
            </span>
            <button
              className="rounded-full border border-[#e4d9ce] px-4 py-2 text-xs font-medium transition hover:border-[#a64f35] hover:text-[#a64f35]"
              onClick={logout}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a64f35]">
            La Barra · Gestión
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Administración de la tienda
          </h1>
          <p className="mt-2 text-sm text-[#777168]">
            Gestiona el catálogo y los registros de pedidos en un solo lugar.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav
            aria-label="Secciones de administración"
            className="flex gap-2 overflow-x-auto rounded-xl border border-[#ebe4da] bg-[#fbf8f2] p-2 lg:flex-col lg:self-start"
          >
            {sections.map((item) => (
              <button
                aria-current={section === item.id ? "page" : undefined}
                className={`shrink-0 rounded-lg px-4 py-3 text-left text-sm transition ${
                  section === item.id
                    ? "bg-[#38251e] font-medium text-white"
                    : "text-[#62564d] hover:bg-[#f2ece3]"
                }`}
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setError("");
                  setNotice("");
                  setEditor(false);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <section className="min-w-0 rounded-xl border border-[#ebe4da] bg-[#fbf8f2]">
            <div className="flex flex-col justify-between gap-4 border-b border-[#eee7de] p-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2 className="text-xl font-medium">{currentSection.title}</h2>
                <p className="mt-1 text-xs text-[#8a8177]">
                  {rows.length} registro{rows.length === 1 ? "" : "s"}
                </p>
              </div>
              {section !== "orders" && section !== "order-details" && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a64f35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#87402c]"
                  onClick={openCreate}
                  type="button"
                >
                  <span aria-hidden="true" className="text-lg leading-none">+</span>
                  Crear {currentSection.singular}
                </button>
              )}
              {section === "orders" && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a64f35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#87402c]"
                  onClick={openCreate}
                  type="button"
                >
                  <span aria-hidden="true" className="text-lg leading-none">+</span>
                  Crear pedido
                </button>
              )}
              {section === "order-details" && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a64f35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#87402c]"
                  onClick={openCreate}
                  type="button"
                >
                  <span aria-hidden="true" className="text-lg leading-none">+</span>
                  Crear detalle
                </button>
              )}
            </div>

            {notice && (
              <p className="mx-5 mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 sm:mx-6" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6" role="alert">
                {error}
              </p>
            )}

            {section === "orders" && (
              <p className="mx-5 mt-4 rounded-lg bg-[#f4efe7] px-4 py-3 text-xs leading-5 text-[#6e6258] sm:mx-6">
                Los pedidos se conservan como historial. Puedes cambiar su estatus y
                observaciones, pero no eliminarlos.
              </p>
            )}

            {loading ? (
              <p className="p-8 text-center text-sm text-[#777168]">Cargando registros...</p>
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#777168]">
                No hay registros en esta sección.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eee7de] text-[11px] uppercase tracking-wide text-[#8a8177]">
                      {columns.map((column) => (
                        <th className="px-5 py-3 font-medium sm:px-6" key={column.key}>
                          {column.label}
                        </th>
                      ))}
                      <th className="px-5 py-3 text-right font-medium sm:px-6">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="border-b border-[#f0ebe4] last:border-0" key={row.id}>
                        {columns.map((column) => (
                          <td className="max-w-[260px] truncate px-5 py-4 sm:px-6" key={column.key}>
                            {formatValue(row[column.key], column.key)}
                          </td>
                        ))}
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[#76503c] hover:bg-[#f4ece3]"
                              onClick={() => openEdit(row)}
                              type="button"
                            >
                              Modificar
                            </button>
                            {section !== "orders" && (
                              <button
                                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                onClick={() => void remove(row)}
                                type="button"
                              >
                                {section === "products" || section === "users"
                                  ? "Desactivar"
                                  : "Borrar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {editor !== false && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditor(false);
          }}
        >
          <section
            aria-labelledby="editor-title"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-[#fbf8f2] p-6 shadow-xl sm:rounded-2xl sm:p-8"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a64f35]">
                  {editor ? "Editar" : "Nuevo registro"}
                </p>
                <h2 className="mt-1 text-2xl font-medium" id="editor-title">
                  {editor ? `Modificar ${currentSection.singular}` : `Crear ${currentSection.singular}`}
                </h2>
              </div>
              <button
                aria-label="Cerrar formulario"
                className="rounded-full px-3 py-1 text-xl text-[#777168] hover:bg-[#f0ebe4]"
                onClick={() => setEditor(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={save}>
              {fields.map((field) => (
                <label className="block text-sm font-medium" key={field.key}>
                  {field.label}
                  {field.type === "order-items" ? (
                    <span className="mt-2 block space-y-3">
                      {orderItems.map((item, index) => (
                        <span
                          className="grid grid-cols-[minmax(0,1fr)_90px_auto] items-center gap-2"
                          key={index}
                        >
                          <select
                            aria-label={`Bebida ${index + 1}`}
                            className="min-w-0 rounded-lg border border-[#e7ded3] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#a64f35]"
                            onChange={(event) =>
                              setOrderItems((current) =>
                                current.map((line, lineIndex) =>
                                  lineIndex === index
                                    ? { ...line, productId: event.target.value }
                                    : line,
                                ),
                              )
                            }
                            required
                            value={item.productId}
                          >
                            <option value="">Elige una bebida</option>
                            {products
                              .filter((product) => isActive(product.activo))
                              .map((product) => (
                                <option key={product.id} value={product.id}>
                                  {String(product.nombre)} · {currency.format(Number(product.precio))}
                                </option>
                              ))}
                          </select>
                          <input
                            aria-label={`Cantidad de bebida ${index + 1}`}
                            className="w-full rounded-lg border border-[#e7ded3] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#a64f35]"
                            min={1}
                            onChange={(event) =>
                              setOrderItems((current) =>
                                current.map((line, lineIndex) =>
                                  lineIndex === index
                                    ? { ...line, quantity: event.target.value }
                                    : line,
                                ),
                              )
                            }
                            required
                            type="number"
                            value={item.quantity}
                          />
                          <button
                            aria-label={`Quitar bebida ${index + 1}`}
                            className="rounded px-2 py-2 text-lg text-[#9a5640] hover:bg-[#f4ece3] disabled:opacity-40"
                            disabled={orderItems.length === 1}
                            onClick={() =>
                              setOrderItems((current) =>
                                current.filter((_, lineIndex) => lineIndex !== index),
                              )
                            }
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#a64f35] hover:bg-[#f4ece3]"
                        onClick={() =>
                          setOrderItems((current) => [
                            ...current,
                            {
                              productId: String(
                                products.find((product) => isActive(product.activo))
                                  ?.id ?? "",
                              ),
                              quantity: "1",
                            },
                          ])
                        }
                        type="button"
                      >
                        + Agregar bebida
                      </button>
                    </span>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-lg border border-[#e7ded3] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#a64f35]"
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      required={field.required}
                      value={values[field.key] ?? ""}
                    />
                  ) : field.type === "checkbox" ? (
                    <input
                      checked={values[field.key] === "1"}
                      className="ml-3 h-4 w-4 accent-[#a64f35]"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.key]: event.target.checked ? "1" : "0",
                        }))
                      }
                      type="checkbox"
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="mt-2 w-full rounded-lg border border-[#e7ded3] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#a64f35]"
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      required={field.required}
                      value={values[field.key] ?? ""}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-2 w-full rounded-lg border border-[#e7ded3] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#a64f35]"
                      maxLength={field.key === "fotografia" ? 1000 : undefined}
                      min={field.type === "number" ? 0 : undefined}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      required={field.required}
                      step={field.key === "precio" ? "0.01" : "1"}
                      type={field.type === "number" ? "number" : field.key === "contrasena" ? "password" : "text"}
                      value={values[field.key] ?? ""}
                    />
                  )}
                  {field.hint && (
                    <span className="mt-1 block text-xs font-normal text-[#8a8177]">
                      {field.hint}
                    </span>
                  )}
                </label>
              ))}
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  className="rounded-full border border-[#e4d9ce] px-5 py-2.5 text-sm"
                  onClick={() => setEditor(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="rounded-full bg-[#38251e] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
