import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type PageProps = {
  params: { empresa: string };
};

type MeResponse = {
  success?: boolean;
  data?: {
    rol?: string;
    empresa?: {
      id?: string;
      nombre?: string;
      tipo_negocio_codigo?: string;
      tipo_negocio_nombre?: string;
    } | null;
    redirect_path?: string | null;
  };
};

function toSlug(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default async function EmpresaTipoPage({ params }: PageProps) {
  const { empresa } = params;
  const routeSlug = toSlug(String(empresa || ''));

  const headersList = await headers();
  const host = headersList.get('host');
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const cookie = headersList.get('cookie') || '';

  if (!host) {
    redirect('/login');
  }

  const meResponse = await fetch(`${proto}://${host}/api/backend/usuarios/me`, {
    headers: {
      cookie
    },
    cache: 'no-store'
  });

  if (!meResponse.ok) {
    redirect('/login');
  }

  const meData = (await meResponse.json()) as MeResponse;
  const redirectPath = meData?.data?.redirect_path || null;
  const rol = meData?.data?.rol || '';
  const empresaSesion = meData?.data?.empresa || null;

  if (rol === 'SUPERADMIN' && !empresaSesion?.id) {
    redirect('/superadmin');
  }

  if (!empresaSesion?.id || !empresaSesion?.nombre) {
    redirect('/login');
  }

  const expectedSlug = toSlug(empresaSesion.nombre);

  if (!routeSlug || routeSlug !== expectedSlug) {
    if (redirectPath && redirectPath.startsWith('/empresa/')) {
      redirect(redirectPath);
    }
    redirect(`/empresa/${expectedSlug}`);
  }

  const empresaLabel = empresaSesion.nombre
    .split('-')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');

  const tipoNegocioLabel = empresaSesion.tipo_negocio_nombre || empresaSesion.tipo_negocio_codigo || 'No definido';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/95 p-3">
          <Image src="/logo.png" alt="Logo StarMOT" width={80} height={80} className="h-full w-full rounded-full object-cover" />
        </div>
        <p className="mb-3 inline-flex items-center rounded-full border border-slate-700 px-4 py-1 text-sm text-slate-300">
          StarMOT · Portal Empresa · {tipoNegocioLabel}
        </p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Portal de {empresaLabel || 'Empresa'}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 sm:mt-5 sm:text-lg">
          Tu sesión ya está identificada por empresa, rol y tipo de negocio. Aquí construiremos
          la plataforma única de esta empresa.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-600 px-6 font-semibold transition hover:bg-slate-800 sm:w-auto"
          >
            Ir a Inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto"
          >
            Cambiar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
