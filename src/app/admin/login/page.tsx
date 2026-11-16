import Link from "next/link";
import LoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe7] px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-[#ece5dc] bg-[#fbf8f2] p-7 shadow-sm sm:p-10">
        <Link
          className="text-xl font-semibold tracking-[-0.06em]"
          href="/"
        >
          la barra<span className="text-[#a64f35]">.</span>
        </Link>
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a64f35]">
          Administración
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">
          Inicia sesión
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#777168]">
          Acceso reservado a las cuentas administradoras del proyecto.
        </p>
        <LoginForm />
        <Link
          className="mt-6 block text-center text-sm text-[#777168] transition hover:text-[#a64f35]"
          href="/"
        >
          Volver al catálogo
        </Link>
      </section>
    </main>
  );
}
