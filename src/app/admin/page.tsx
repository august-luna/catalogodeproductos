import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AdminDashboard from "./dashboard";
import { getAdminSession } from "@/lib/admin-session";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] text-sm text-[#777168]">
          Cargando administración...
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await connection();
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminDashboard userName={session.name} />;
}
