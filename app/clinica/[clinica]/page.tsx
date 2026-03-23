import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import ClinicaPortalClient from './clinica-portal.client';

type PageProps = {
  params: Promise<{ clinica: string }>;
};

type MeResponse = {
  success?: boolean;
  data?: {
    rol?: string;
    clinica?: {
      id?: string;
      nombre?: string;
      tipo_negocio_codigo?: string;
      tipo_negocio_nombre?: string;
    } | null;
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

export default async function ClinicaTipoPage({ params }: PageProps) {
  const { clinica } = await params;
  const routeSlug = toSlug(String(clinica || ''));

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
  const clinicaSesion = meData?.data?.clinica || meData?.data?.empresa || null;

  if (!clinicaSesion?.id || !clinicaSesion?.nombre) {
    redirect('/login');
  }

  const expectedSlug = toSlug(clinicaSesion.nombre);

  if (!routeSlug || routeSlug !== expectedSlug) {
    if (redirectPath && redirectPath.startsWith('/clinica/')) {
      redirect(redirectPath);
    }
    redirect(`/clinica/${expectedSlug}`);
  }

  const clinicaLabel = clinicaSesion.nombre
    .split('-')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');

  if (!clinicaLabel) {
    redirect('/login');
  }

  return <ClinicaPortalClient />;
}
