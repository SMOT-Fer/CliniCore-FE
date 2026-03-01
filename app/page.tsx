import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Inicio de StarMOT con acceso a login y documentación API.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12">
        <p className="mb-3 inline-flex items-center rounded-full border border-slate-700 px-4 py-1 text-sm text-slate-300">
          Plataforma clínica segura
        </p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          StarMOT para gestión de usuarios, pacientes y operaciones
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 sm:mt-5 sm:text-lg">
          Accede al sistema con tu cuenta corporativa para administrar módulos y flujos según tu rol.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto"
          >
            Ir a Login
          </Link>
          <a
            href="https://saas-be-t4rh.onrender.com/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-600 px-6 font-semibold transition hover:bg-slate-800 sm:w-auto"
          >
            API Docs
          </a>
        </div>

        <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 text-left md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Autenticación segura</h2>
            <p className="mt-2 text-sm text-slate-300">Cookies httpOnly, CSRF y refresh automático de sesión.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Control por roles</h2>
            <p className="mt-2 text-sm text-slate-300">Cada usuario visualiza solo la interfaz asignada a su perfil.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Operación clínica</h2>
            <p className="mt-2 text-sm text-slate-300">Base para escalar módulos de administración y auditoría.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
