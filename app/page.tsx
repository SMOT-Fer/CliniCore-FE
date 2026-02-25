import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-12 text-center">
        <p className="mb-3 inline-flex items-center rounded-full border border-slate-700 px-4 py-1 text-sm text-slate-300">
          Plataforma clínica segura
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          StarMOT para gestión de usuarios, pacientes y operaciones
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Accede al sistema con tu cuenta corporativa para administrar módulos y flujos según tu rol.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Ir a Login
          </Link>
          <a
            href="https://saas-be-t4rh.onrender.com/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-600 px-6 font-semibold transition hover:bg-slate-800"
          >
            API Docs
          </a>
        </div>

        <div className="mt-10 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
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
