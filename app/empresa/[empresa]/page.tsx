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
    <main className="min-h-screen bg-transparent text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12">
        <div className="w-full rounded-3xl border border-blue-200/25 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-[2px] sm:p-8">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/95 p-3 mx-auto">
          <Image src="/logo-clinicore.png" alt="Logo CliniCore" width={80} height={80} className="h-full w-full rounded-full object-cover" />
          </div>
          <p className="mb-3 inline-flex items-center rounded-full border border-blue-200/30 bg-slate-900/40 px-4 py-1 text-sm text-slate-200">
            CliniCore · Portal Empresa · {tipoNegocioLabel}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            Portal de {empresaLabel || 'Empresa'}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:mt-5 sm:text-lg">
            Tu sesión ya está identificada por empresa, rol y tipo de negocio. Aquí construiremos
            la plataforma única de esta empresa.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row sm:mx-auto">
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-blue-200/35 bg-slate-900/45 px-6 font-semibold text-slate-100 transition hover:bg-slate-800/70 sm:w-auto"
            >
              Ir a Inicio
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue-500 px-6 font-semibold text-slate-50 transition hover:bg-blue-400 sm:w-auto"
            >
              Cambiar sesión
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
