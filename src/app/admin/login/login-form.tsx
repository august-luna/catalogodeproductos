"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "No se pudo iniciar sesión.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium">
        Usuario
        <input
          autoComplete="username"
          className="mt-2 w-full rounded-lg border border-[#e7ded3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#a64f35] focus:ring-2 focus:ring-[#a64f35]/10"
          maxLength={50}
          onChange={(event) => setUsername(event.target.value)}
          required
          value={username}
        />
      </label>
      <label className="block text-sm font-medium">
        Contraseña
        <input
          autoComplete="current-password"
          className="mt-2 w-full rounded-lg border border-[#e7ded3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#a64f35] focus:ring-2 focus:ring-[#a64f35]/10"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <button
        className="w-full rounded-full bg-[#38251e] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#a64f35] disabled:cursor-wait disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Validando..." : "Entrar al panel"}
      </button>
    </form>
  );
}
