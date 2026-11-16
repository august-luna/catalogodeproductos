"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/products";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "search" | "bag" | "heart" | "arrow" | "plus" | "menu";
  className?: string;
}) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l1 13H4L5 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </>
    ),
    heart: <path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(price);
}

function BeverageArtwork({ product }: { product: CatalogProduct }) {
  const palettes = [
    { light: "#f0d9b8", middle: "#c98659", dark: "#693e30", label: "#f8eee0" },
    { light: "#ead6c7", middle: "#a9503c", dark: "#5c3029", label: "#f6e8d6" },
    { light: "#f0e2bd", middle: "#c59a4c", dark: "#69502c", label: "#faf1dc" },
    { light: "#e5ddc8", middle: "#718166", dark: "#3d503f", label: "#f5efdf" },
  ];
  const palette = palettes[product.id % palettes.length];
  const gradientId = `beverage-${product.id}`;

  return (
    <div
      aria-label={`Ilustración de bebida: ${product.name}`}
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      role="img"
      style={{
        background: `radial-gradient(ellipse at 50% 34%, ${palette.light} 0%, #efe8dc 55%, #e8dfd2 100%)`,
      }}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
        fill="none"
        viewBox="0 0 400 480"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={palette.middle} />
            <stop offset="48%" stopColor={palette.dark} />
            <stop offset="100%" stopColor={palette.middle} />
          </linearGradient>
          <linearGradient id={`${gradientId}-shine`} x1="0" x2="1">
            <stop stopColor="#fff" stopOpacity=".4" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="78" cy="127" r="4" fill="#fff" fillOpacity=".55" />
        <circle cx="309" cy="175" r="6" fill="#fff" fillOpacity=".45" />
        <circle cx="285" cy="91" r="3" fill="#fff" fillOpacity=".65" />
        <ellipse
          cx="201"
          cy="412"
          fill={palette.dark}
          fillOpacity=".13"
          rx="96"
          ry="15"
        />
        <path
          d="M165 76h70v48c0 17 42 27 51 65l28 178c4 26-14 48-40 48H126c-26 0-44-22-40-48l28-178c9-38 51-48 51-65V76Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M165 76h70v48c0 17 42 27 51 65l28 178c4 26-14 48-40 48H126c-26 0-44-22-40-48l28-178c9-38 51-48 51-65V76Z"
          stroke="#fff"
          strokeOpacity=".22"
          strokeWidth="2"
        />
        <path
          d="M164 95h19v33c0 18-40 28-49 64l-28 177c-2 14 2 24 11 31"
          stroke={`url(#${gradientId}-shine)`}
          strokeLinecap="round"
          strokeWidth="10"
        />
        <path d="M160 53h80v28h-80z" fill={palette.dark} />
        <path d="M163 56h74v5h-74z" fill="#fff" fillOpacity=".2" />
        <rect
          height="94"
          rx="4"
          width="164"
          x="118"
          y="228"
          fill={palette.label}
        />
        <path d="M132 245h136" stroke={palette.middle} strokeOpacity=".55" />
        <text
          fill={palette.dark}
          fontFamily="Georgia, serif"
          fontSize="16"
          letterSpacing="3"
          textAnchor="middle"
          x="200"
          y="273"
        >
          LA BARRA
        </text>
        <text
          fill={palette.dark}
          fillOpacity=".75"
          fontFamily="Arial, sans-serif"
          fontSize="10"
          letterSpacing="1.5"
          textAnchor="middle"
          x="200"
          y="296"
        >
          {product.category.toLocaleUpperCase("es-MX").slice(0, 22)}
        </text>
        <path d="M132 306h136" stroke={palette.middle} strokeOpacity=".55" />
      </svg>
    </div>
  );
}

function ProductPhoto({ product }: { product: CatalogProduct }) {
  const [hasError, setHasError] = useState(false);

  if (!product.image || hasError) {
    return <BeverageArtwork product={product} />;
  }

  return (
    <Image
      alt={product.name}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      fill
      onError={() => setHasError(true)}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      src={product.image}
      unoptimized
    />
  );
}

type CartItem = { productId: number; quantity: number };
type Customer = { name: string; username: string };

export default function Catalog({ products }: { products: CatalogProduct[] }) {
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartProducts = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const cartTotal = cartProducts.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const categories = useMemo(
    () => [
      "Todo",
      ...Array.from(new Set(products.map((product) => product.category))).sort(),
    ],
    [products],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const restoreCart = async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        const saved = window.localStorage.getItem("la-barra-cart");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const restored = new Map<number, number>();
            for (const entry of parsed) {
              if (!entry || typeof entry !== "object") continue;
              const item = entry as {
                productId?: unknown;
                quantity?: unknown;
              };
              if (
                typeof item.productId !== "number" ||
                !Number.isSafeInteger(item.productId) ||
                typeof item.quantity !== "number" ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1
              ) {
                continue;
              }
              const product = products.find(
                (candidate) => candidate.id === item.productId,
              );
              if (!product || product.stock === 0) continue;

              const maximum = product.stock ?? 1_000_000;
              const quantity = Math.min(
                maximum,
                (restored.get(product.id) ?? 0) + item.quantity,
              );
              restored.set(product.id, quantity);
            }
            setCart(
              [...restored]
                .slice(0, 30)
                .map(([productId, quantity]) => ({ productId, quantity })),
            );
          }
        }
      } catch {
        setCartError(
          "No se pudo recuperar el carrito guardado en este dispositivo.",
        );
      } finally {
        if (active) setCartReady(true);
      }
    };
    void restoreCart();

    fetch("/api/customer/session", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "No se pudo verificar la sesión.");
        }
        setCustomer(result.customer);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCartError(
          error instanceof Error
            ? error.message
            : "No se pudo verificar la sesión.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [products]);

  useEffect(() => {
    if (!cartReady) return;
    void Promise.resolve().then(() => {
      try {
        window.localStorage.setItem("la-barra-cart", JSON.stringify(cart));
      } catch {
        setCartError("No se pudo guardar el carrito en este dispositivo.");
      }
    });
  }, [cart, cartReady]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Todo" || product.category === activeCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${product.name} ${product.category}`
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  function addToCart(product: CatalogProduct) {
    const existing = cart.find((item) => item.productId === product.id);
    if (!existing && cart.length >= 30) {
      setCartError("Puedes agregar hasta 30 productos distintos al carrito.");
      return;
    }
    if (product.stock !== null && (existing?.quantity ?? 0) >= product.stock) {
      setCartError(`No hay más existencias disponibles de ${product.name}.`);
      return;
    }

    setCartError("");
    setCart((current) => {
      const item = current.find((entry) => entry.productId === product.id);
      if (item) {
        return current.map((entry) =>
          entry.productId === product.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setAnnouncement(`${product.name} se agregó a tu bolsa.`);
  }

  function updateCartQuantity(product: CatalogProduct, quantity: number) {
    if (quantity < 1) {
      setCart((current) =>
        current.filter((item) => item.productId !== product.id),
      );
      return;
    }
    const maximum = product.stock ?? 1_000_000;
    setCart((current) =>
      current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: Math.min(maximum, quantity) }
          : item,
      ),
    );
  }

  async function handleCustomerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setCartError("");
    try {
      const response = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo iniciar sesión.");
      }
      setCustomer(result.customer);
      setPassword("");
      setCartNotice(`Sesión iniciada. Hola, ${result.customer.name}.`);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCustomerLogout() {
    setIsSubmitting(true);
    setCartError("");
    try {
      const response = await fetch("/api/customer/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo cerrar sesión.");
      }
      setCustomer(null);
      setCartNotice("Cerraste sesión.");
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "No se pudo cerrar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckout() {
    setIsSubmitting(true);
    setCartError("");
    setCartNotice("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo guardar el pedido.");
      }
      setCart([]);
      setCartNotice(`¡Pedido #${result.orderId} guardado correctamente!`);
      setAnnouncement(`Pedido ${result.orderId} confirmado.`);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "No se pudo guardar el pedido.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleFavorite(productId: number) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  return (
    <main>
      <div className="bg-[#38251e] px-4 py-2.5 text-center text-[11px] font-medium tracking-[0.12em] text-[#fff9f0] sm:text-xs">
        UNA BUENA BEBIDA SIEMPRE MEJORA EL DÍA · ENCUENTRA TU FAVORITA
      </div>

      <header className="sticky top-0 z-20 border-b border-[#ece5dc] bg-[#fbf8f2]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
          <a
            aria-label="La Barra, ir al inicio"
            className="flex items-center gap-2 text-[25px] font-semibold tracking-[-0.07em]"
            href="#inicio"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a64f35] text-[#fff9f0]">
              <svg
                aria-hidden="true"
                className="h-[19px] w-[19px]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M7 3h10l-1 18H8L7 3Z" />
                <path d="M8 9h8M9 6h6" />
              </svg>
            </span>
            la barra<span className="text-[#c27a4d]">.</span>
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-9 text-[13px] text-[#55574f] md:flex"
          >
            <a className="transition-colors hover:text-[#a64f35]" href="#catalogo">
              Tienda
            </a>
            <a className="transition-colors hover:text-[#a64f35]" href="#historia">
              Nosotros
            </a>
            <a className="transition-colors hover:text-[#a64f35]" href="#contacto">
              Contacto
            </a>
            <a
              className="transition-colors hover:text-[#a64f35]"
              href="/admin/login"
            >
              Administración
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <label className="hidden items-center gap-2 rounded-full border border-[#e9e7e0] bg-white/70 px-3 py-2 sm:flex">
              <Icon className="h-[17px] w-[17px] text-[#777a70]" name="search" />
              <span className="sr-only">Buscar productos</span>
              <input
                aria-label="Buscar productos"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-[#92938c] focus:w-40"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar..."
                type="search"
                value={search}
              />
            </label>
            <button
              aria-label={`Bolsa de compras, ${cartCount} productos`}
              aria-controls="cart-panel"
              aria-expanded={cartOpen}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#efeee8]"
              onClick={() => setCartOpen(true)}
              type="button"
            >
              <Icon name="bag" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#a64f35] px-1 text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <a
              aria-label="Ir al catálogo"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#efeee8] md:hidden"
              href="#catalogo"
            >
              <Icon name="menu" />
            </a>
          </div>
        </div>
      </header>

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Cerrar carrito"
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
            onClick={() => setCartOpen(false)}
            type="button"
          />
          <aside
            aria-labelledby="cart-title"
            aria-modal="true"
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-[#fbf8f2] shadow-2xl"
            id="cart-panel"
            role="dialog"
          >
            <header className="flex items-center justify-between border-b border-[#ece5dc] px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-xl font-medium" id="cart-title">
                  Tu carrito
                </h2>
                <p className="mt-1 text-xs text-[#777168]">
                  {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
                </p>
              </div>
              <button
                aria-label="Cerrar carrito"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#efeee8]"
                onClick={() => setCartOpen(false)}
                type="button"
              >
                <span aria-hidden="true" className="text-2xl leading-none">×</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {cartNotice && (
                <p
                  aria-live="polite"
                  className="mb-4 rounded bg-[#edf3e9] px-3 py-2 text-sm text-[#3d6840]"
                >
                  {cartNotice}
                </p>
              )}
              {cartError && (
                <p
                  aria-live="assertive"
                  className="mb-4 rounded bg-[#f7e9e4] px-3 py-2 text-sm text-[#8b392e]"
                >
                  {cartError}
                </p>
              )}

              {cartProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Icon className="mx-auto h-9 w-9 text-[#a64f35]" name="bag" />
                  <p className="mt-4 font-medium">Tu carrito está vacío</p>
                  <p className="mt-2 text-sm text-[#777168]">
                    Agrega algo de nuestra selección para empezar tu pedido.
                  </p>
                  <button
                    className="mt-5 rounded-full bg-[#38251e] px-5 py-2.5 text-sm text-white hover:bg-[#a64f35]"
                    onClick={() => setCartOpen(false)}
                    type="button"
                  >
                    Seguir comprando
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#ece5dc]">
                  {cartProducts.map(({ product, quantity }) => (
                    <li
                      className="flex gap-4 py-4 first:pt-0"
                      key={product.id}
                    >
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-[#e7e4dc]">
                        <ProductPhoto product={product} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-medium">{product.name}</h3>
                            <p className="mt-1 text-xs text-[#777168]">
                              {product.category}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-medium">
                            {formatPrice(product.price * quantity)}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-[#e6ded4]">
                            <button
                              aria-label={`Quitar una unidad de ${product.name}`}
                              className="h-8 w-8 text-lg text-[#61564d] hover:text-[#a64f35]"
                              onClick={() =>
                                updateCartQuantity(product, quantity - 1)
                              }
                              type="button"
                            >
                              −
                            </button>
                            <span className="w-7 text-center text-xs">
                              {quantity}
                            </span>
                            <button
                              aria-label={`Agregar una unidad de ${product.name}`}
                              className="h-8 w-8 text-lg text-[#61564d] hover:text-[#a64f35] disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={
                                product.stock !== null &&
                                quantity >= product.stock
                              }
                              onClick={() =>
                                updateCartQuantity(product, quantity + 1)
                              }
                              type="button"
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="text-xs text-[#8a5c43] underline underline-offset-2 hover:text-[#a64f35]"
                            onClick={() => updateCartQuantity(product, 0)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-[#ece5dc] bg-white/60 px-5 py-5 sm:px-7">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-medium">Total estimado</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              <p className="mb-4 text-[11px] leading-5 text-[#777168]">
                El precio final y las existencias se validan al guardar el pedido.
              </p>

              {customer ? (
                <div className="mb-4 flex items-center justify-between rounded border border-[#ece5dc] px-3 py-2.5">
                  <div>
                    <p className="text-xs text-[#777168]">Pedido para</p>
                    <p className="mt-0.5 text-sm font-medium">{customer.name}</p>
                  </div>
                  <button
                    className="text-xs text-[#8a5c43] underline underline-offset-2 disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={handleCustomerLogout}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : sessionLoading ? (
                <p className="mb-4 text-sm text-[#777168]">
                  Verificando sesión...
                </p>
              ) : (
                <form
                  className="mb-4 space-y-3 rounded border border-[#ece5dc] p-3"
                  onSubmit={handleCustomerLogin}
                >
                  <p className="text-sm font-medium">
                    Inicia sesión con tu cuenta de cliente
                  </p>
                  <label className="block text-xs text-[#61564d]">
                    Usuario
                    <input
                      autoComplete="username"
                      className="mt-1 w-full rounded border border-[#e6ded4] bg-white px-3 py-2 text-sm outline-none focus:border-[#a64f35]"
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      value={username}
                    />
                  </label>
                  <label className="block text-xs text-[#61564d]">
                    Contraseña
                    <input
                      autoComplete="current-password"
                      className="mt-1 w-full rounded border border-[#e6ded4] bg-white px-3 py-2 text-sm outline-none focus:border-[#a64f35]"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      type="password"
                      value={password}
                    />
                  </label>
                  <button
                    className="w-full rounded-full border border-[#38251e] px-4 py-2.5 text-sm font-medium text-[#38251e] hover:bg-[#f4efe7] disabled:cursor-wait disabled:opacity-50"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
                  </button>
                </form>
              )}

              <button
                className="w-full rounded-full bg-[#38251e] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#a64f35] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  cartProducts.length === 0 ||
                  !customer ||
                  isSubmitting ||
                  sessionLoading
                }
                onClick={handleCheckout}
                type="button"
              >
                {isSubmitting ? "Guardando pedido..." : "Confirmar pedido"}
              </button>
            </div>
          </aside>
        </div>
      )}

      <section
        className="mx-auto grid max-w-[1440px] gap-8 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-16 lg:px-14 lg:pb-24 lg:pt-14"
        id="inicio"
      >
        <div className="order-2 max-w-xl lg:order-1">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a64f35] sm:text-xs">
            <span className="h-px w-7 bg-[#a64f35]" />
            Un brindis por los buenos momentos
          </p>
          <h1 className="max-w-lg text-[43px] font-medium leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-[70px]">
            Tu próximo
            <br />
            sorbo <span className="font-serif italic text-[#a64f35]">favorito.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#707168] sm:mt-7 sm:text-base sm:leading-8">
            Cervezas, vinos y bebidas para cada ocasión. Descubre sabores
            auténticos, elige algo nuevo y disfruta el momento.
          </p>
          <a
            className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#38251e] px-6 py-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#a64f35] sm:mt-9"
            href="#catalogo"
          >
            Explorar bebidas <Icon className="h-4 w-4" name="arrow" />
          </a>
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#777168] sm:mt-12">
            {["Para compartir", "Para regalar", "Para disfrutar"].map((text) => (
              <span className="flex items-center gap-2" key={text}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#a64f35]" />
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="relative order-1 min-h-[310px] overflow-hidden rounded-[5px] bg-[#e7e3da] sm:min-h-[440px] lg:order-2 lg:min-h-[520px]">
          <div
            aria-label="Copas de vino para compartir en una mesa"
            className="absolute inset-0 bg-cover bg-center"
            role="img"
            style={{
              backgroundImage:
                "linear-gradient(180deg,rgba(30,18,14,.04),rgba(30,18,14,.28)),url('https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1500&q=90')",
            }}
          />
          <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-[4px] bg-[#faf9f6]/95 p-3 pr-5 shadow-sm sm:bottom-7 sm:left-7 sm:p-4 sm:pr-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e5d9] text-[#a64f35]">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
                <path d="M8 5H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3 3v3m-4 3h8m-6-3h4" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold">Momentos para brindar</p>
              <p className="mt-1 text-[11px] text-[#777a70]">
                Cada ocasión tiene su sabor
              </p>
            </div>
          </div>
          <span className="absolute right-5 top-5 rounded-full bg-[#fbf8f2]/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] sm:right-7 sm:top-7">
            Selección de la casa
          </span>
        </div>
      </section>

      <section className="border-y border-[#ece5dc] bg-[#f4efe7]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-y-7 px-5 py-8 sm:px-8 sm:py-9 lg:grid-cols-4 lg:px-14">
          {[
            ["01", "Para cada ocasión"],
            ["02", "Sabores que sorprenden"],
            ["03", "Tus marcas favoritas"],
            ["04", "Siempre algo nuevo"],
          ].map(([number, text]) => (
            <div className="flex items-center gap-3 sm:gap-4" key={number}>
              <span className="font-serif text-lg italic text-[#a64f35]">
                {number}
              </span>
              <span className="text-[11px] text-[#5d5148] sm:text-xs">
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mx-auto max-w-[1440px] px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:px-14"
        id="catalogo"
      >
        <div className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a64f35] sm:text-[11px]">
              Nuestra selección
            </p>
            <h2 className="text-3xl font-medium tracking-[-0.04em] sm:text-[40px]">
              Brindemos por algo bueno.
            </h2>
          </div>
          <p className="max-w-xs text-xs leading-6 text-[#777a70] sm:text-right sm:text-[13px]">
            Explora el catálogo, encuentra nuevos sabores y elige qué se te
            antoja hoy.
          </p>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 sm:mb-9 sm:flex-wrap">
          {categories.map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${
                activeCategory === category
                  ? "border-[#38251e] bg-[#38251e] text-white"
                  : "border-[#e6ded4] bg-transparent text-[#61564d] hover:border-[#c89b7b]"
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 items-center gap-2 border-b border-[#dcdad2] px-2 sm:hidden">
            <Icon className="h-4 w-4 text-[#777a70]" name="search" />
            <span className="sr-only">Buscar productos</span>
            <input
              aria-label="Buscar productos"
              className="w-24 bg-transparent py-2 text-xs outline-none placeholder:text-[#92938c]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar"
              type="search"
              value={search}
            />
          </label>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-7">
            {visibleProducts.map((product) => {
              const isFavorite = favorites.includes(product.id);

              return (
                <article className="group min-w-0" key={product.id}>
                  <div
                    className="relative aspect-[0.83] overflow-hidden rounded-[3px] bg-[#e7e4dc]"
                  >
                    <ProductPhoto product={product} />
                    {product.label && (
                      <span className="absolute left-2.5 top-2.5 bg-[#faf9f6]/95 px-2.5 py-1.5 text-[9px] font-medium tracking-wide sm:left-3 sm:top-3 sm:text-[10px]">
                        {product.label}
                      </span>
                    )}
                    <button
                      aria-label={
                        isFavorite
                          ? `Quitar ${product.name} de favoritos`
                          : `Agregar ${product.name} a favoritos`
                      }
                      aria-pressed={isFavorite}
                      className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#fbf8f2]/90 transition-colors hover:bg-white sm:right-3 sm:top-3 ${
                        isFavorite ? "text-[#b45e4c]" : "text-[#42443e]"
                      }`}
                      onClick={() => toggleFavorite(product.id)}
                      type="button"
                    >
                      <Icon className="h-[17px] w-[17px]" name="heart" />
                    </button>
                    <button
                      aria-label={`Agregar ${product.name} a la bolsa`}
                      className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#fbf8f2] text-[#38251e] opacity-100 shadow-sm transition-all hover:bg-[#a64f35] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      type="button"
                    >
                      <Icon className="h-[17px] w-[17px]" name="plus" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-3 sm:pt-4">
                    <div className="min-w-0">
                      <h3
                        className="truncate text-[13px] font-medium sm:text-sm"
                        title={product.description ?? undefined}
                      >
                        {product.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-[#85867e] sm:text-xs">
                        {product.category}
                      </p>
                      {product.stock !== null && product.stock >= 0 && (
                        <p className="mt-1 text-[10px] text-[#8a5c43]">
                          {product.stock === 0
                            ? "Agotado"
                            : product.stock <= 5
                              ? `Últimas ${product.stock} piezas`
                              : "Disponible"}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 pt-0.5 text-xs font-medium sm:text-[13px]">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded border border-dashed border-[#dcdad2] py-16 text-center">
            <p className="text-base font-medium">
              {products.length === 0
                ? "Todavía no hay productos activos."
                : "No encontramos esa pieza."}
            </p>
            <p className="mt-2 text-sm text-[#777a70]">
              {products.length === 0
                ? "Agrega productos activos en tu base de datos y vuelve a intentarlo."
                : "Prueba con otra búsqueda o categoría."}
            </p>
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>

      <section
        className="bg-[#f0e5d9] px-5 py-14 sm:px-8 sm:py-20 lg:px-14"
        id="historia"
      >
        <div className="mx-auto grid max-w-[1440px] gap-7 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a64f35] sm:text-[11px]">
              Un buen sabor se disfruta mejor
            </p>
            <h2 className="max-w-xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
              Hay una bebida para cada momento.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#66695f]">
              Desde algo refrescante para la tarde hasta una botella especial
              para compartir. Explora lo que tenemos y encuentra tu próximo
              favorito.
            </p>
          </div>
          <a
            className="inline-flex items-center gap-3 text-sm font-medium text-[#713b2b] transition-colors hover:text-[#a64f35]"
            href="#contacto"
          >
            Ver bebidas <Icon className="h-4 w-4" name="arrow" />
          </a>
        </div>
      </section>

      <footer
        className="bg-[#38251e] px-5 py-10 text-white sm:px-8 sm:py-12 lg:px-14"
        id="contacto"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a className="text-2xl font-semibold tracking-[-0.07em]" href="#inicio">
              la barra<span className="text-[#db9a6d]">.</span>
            </a>
            <p className="mt-2 text-xs text-white/65">
              Buenos sabores, mejores momentos.
            </p>
          </div>
          <div className="text-xs text-white/75 sm:text-right">
            <a className="transition-colors hover:text-white" href="mailto:hola@labarra.mx">
              hola@labarra.mx
            </a>
            <p className="mt-2 text-[10px] text-white/45">
              © 2026 La Barra. ¡Salud!
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
