'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/context/ToastContext';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiHome,
  FiLayers,
  FiLogOut,
  FiShield,
  FiTrash2,
  FiPlus,
  FiUser,
  FiUsers,
  FiX
} from 'react-icons/fi';
import ConsoleThemeToggle from '../components/console-theme-toggle';

type SectionKey = 'dashboard' | 'clinicas' | 'suscripciones' | 'usuarios';

type SessionUser = {
  id: string;
  email: string;
  rol: 'SUPERADMIN';
  estado: 'ACTIVO' | 'INACTIVO';
};

type Clinica = {
  id: string;
  nombre: string;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  tipo_negocio_id?: string | null;
  tipo_negocio_codigo?: string | null;
  tipo_negocio_nombre?: string | null;
};

type Usuario = {
  id: string;
  email: string;
  rol: 'SUPERADMIN' | 'ADMIN' | 'DOCTOR' | 'STAFF';
  estado: 'ACTIVO' | 'INACTIVO';
  clinica_id?: string | null;
  persona_id?: string | null;
  dni?: string | null;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  ultimo_login_at?: string | null;
  created_at?: string;
};

type Plan = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  moneda?: string;
  precio_mensual?: number;
  precio_anual?: number;
  max_usuarios?: number | null;
  max_pacientes_activos?: number | null;
  max_storage_gb?: number | null;
  incluye_facturacion_electronica?: boolean;
  incluye_historia_clinica_avanzada?: boolean;
  incluye_integraciones?: boolean;
  incluye_api?: boolean;
  dias_trial?: number | null;
  estado: 'ACTIVO' | 'INACTIVO';
};

type TipoNegocio = {
  id: string;
  codigo?: string;
  nombre: string;
};

type SuscripcionEstado = 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA';

type SuscripcionVigente = {
  id?: string;
  suscripcion_id: string;
  clinica_id: string;
  empresa_id?: string | null;
  suscripcion_estado: SuscripcionEstado;
  estado?: SuscripcionEstado;
  plan_id: string;
  plan_codigo?: string;
  plan_nombre?: string;
  periodo_actual_fin?: string;
  trial_ends_at?: string;
  max_usuarios?: number | null;
  max_storage_gb?: number | null;
  moneda?: string;
  precio_mensual?: number | null;
};

type SuscripcionHistorial = {
  id: string;
  plan_codigo?: string;
  plan_nombre?: string;
  estado: 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA';
  periodo_actual_inicio?: string;
  periodo_actual_fin?: string;
  trial_ends_at?: string | null;
  created_at?: string;
};

type DashboardSummaryData = {
  clinicasTotal: number;
  clinicasActivas: number;
  clinicasActivasNombres: string[];
  usuariosTotal: number;
  usuariosActivos: number;
  usuariosActivosNombres: string[];
  sesionesActivas: number;
  actividad7dias: Array<{
    dia: string;
    etiqueta: string;
    total: number;
  }>;
};

type ActiveSession = {
  id: string;
  usuario_id: string;
  email: string;
  rol?: string;
  clinica_id?: string | null;
  expires_at?: string;
  created_at?: string;
};

type PlanFormState = {
  codigo: string;
  nombre: string;
  descripcion: string;
  moneda: string;
  precio_mensual: string;
  precio_anual: string;
  max_usuarios: string;
  max_pacientes_activos: string;
  max_storage_gb: string;
  incluye_facturacion_electronica: boolean;
  incluye_historia_clinica_avanzada: boolean;
  incluye_integraciones: boolean;
  incluye_api: boolean;
  dias_trial: string;
  estado: 'ACTIVO' | 'INACTIVO';
};

type PersonaData = {
  id: string;
  dni?: string | null;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
};

type UserEditState = {
  id: string;
  email: string;
  rol: Usuario['rol'];
  estado: 'ACTIVO' | 'INACTIVO';
  clinica_id: string;
  persona_id?: string | null;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo?: string;
  fecha_nacimiento?: string;
  password: string;
};

const INITIAL_PLAN_FORM: PlanFormState = {
  codigo: '',
  nombre: '',
  descripcion: '',
  moneda: 'PEN',
  precio_mensual: '0',
  precio_anual: '0',
  max_usuarios: '',
  max_pacientes_activos: '',
  max_storage_gb: '',
  incluye_facturacion_electronica: false,
  incluye_historia_clinica_avanzada: false,
  incluye_integraciones: false,
  incluye_api: false,
  dias_trial: '0',
  estado: 'ACTIVO'
};

const CLINICAS_PAGE_SIZE = 3;
const OFFICIAL_PLAN_CODES = ['TRIAL_CLINICA', 'BASIC_CLINICA', 'PRO_CLINICA', 'ENTERPRISE_CLINICA'] as const;
const ACTIVE_LICENSE_STATUSES: SuscripcionEstado[] = ['TRIAL', 'ACTIVA', 'PAST_DUE'];

function normalizeSuscripcionVigente(raw: Partial<SuscripcionVigente> & { id?: string; estado?: string; empresa_id?: string | null }): SuscripcionVigente {
  const clinicaId = String(raw.clinica_id || raw.empresa_id || '').trim();
  const estado = String(raw.suscripcion_estado || raw.estado || 'EXPIRADA').trim().toUpperCase() as SuscripcionEstado;

  return {
    ...raw,
    id: raw.id,
    suscripcion_id: String(raw.suscripcion_id || raw.id || '').trim(),
    clinica_id: clinicaId,
    empresa_id: raw.empresa_id ?? clinicaId,
    suscripcion_estado: estado,
    estado,
    plan_id: String(raw.plan_id || '').trim(),
    plan_codigo: raw.plan_codigo,
    plan_nombre: raw.plan_nombre,
    periodo_actual_fin: raw.periodo_actual_fin,
    trial_ends_at: raw.trial_ends_at,
    max_usuarios: raw.max_usuarios ?? null,
    max_storage_gb: raw.max_storage_gb ?? null,
    moneda: raw.moneda,
    precio_mensual: raw.precio_mensual ?? null
  };
}

class SessionInvalidError extends Error {
  constructor(message = 'Sesion invalida') {
    super(message);
    this.name = 'SessionInvalidError';
  }
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function getCsrfHeaders(): Promise<Record<string, string>> {
  await fetch('/api/backend/usuarios/csrf', {
    method: 'GET',
    credentials: 'include'
  });

  const token = getCookie('csrf_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-csrf-token'] = token;
  return headers;
}

function formatDate(value?: string | null) {
  if (!value) return 'No definido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No definido';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(date);
}

function getPersonaNombre(persona?: Partial<PersonaData> | null) {
  const fullName = [persona?.nombres, persona?.apellido_paterno, persona?.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || 'Datos personales no disponibles';
}

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isUuidLike(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function Surface({
  title,
  eyebrow,
  description,
  action,
  children
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-6 shadow-[var(--ui-shadow)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ui-muted)]">{eyebrow}</p>}
          <h3 className="mt-2 text-2xl font-semibold text-[var(--ui-foreground)]">{title}</h3>
          {description && <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  summaryTitle,
  summaryItems = [],
  summaryFooter
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  summaryTitle?: string;
  summaryItems?: string[];
  summaryFooter?: string;
}) {
  const hasSummary = summaryItems.length > 0 || Boolean(summaryFooter);

  return (
    <article className="group relative z-20 rounded-[30px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-5 shadow-[var(--ui-shadow)] backdrop-blur hover:z-[140]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ui-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--ui-foreground)]">{value}</p>
          <p className="mt-2 text-sm text-[var(--ui-muted)]">{hint}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]">
          {icon}
        </div>
      </div>

      {hasSummary && (
        <div className="pointer-events-none absolute left-1/2 top-full z-[160] mt-3 hidden w-[340px] -translate-x-1/2 rounded-[22px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 shadow-[var(--ui-shadow)] group-hover:block">
          {summaryTitle && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ui-muted)]">{summaryTitle}</p>}
          {summaryItems.length > 0 && (
            <div className="mt-3 space-y-2">
              {summaryItems.map((item, index) => (
                <div key={`${label}-${index}`} className="rounded-[14px] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-foreground)]">
                  {item}
                </div>
              ))}
            </div>
          )}
          {summaryFooter && <p className="mt-3 text-xs text-[var(--ui-muted)]">{summaryFooter}</p>}
        </div>
      )}
    </article>
  );
}

function SectionButton({
  active,
  icon,
  label,
  description,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-white shadow-[0_20px_45px_-30px_rgba(32,94,255,0.95)]'
          : 'border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-foreground)] hover:bg-[var(--ui-surface-strong)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-white/18 text-white' : 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]'}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className={`mt-1 text-xs ${active ? 'text-white/78' : 'text-[var(--ui-muted)]'}`}>{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function SuperadminDashboardClient() {
  const router = useRouter();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [clinicaView, setClinicaView] = useState<'list' | 'detail' | 'create'>('list');
  const [clinicasPage, setClinicasPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tipos, setTipos] = useState<TipoNegocio[]>([]);
  const [suscripciones, setSuscripciones] = useState<SuscripcionVigente[]>([]);
  const [historialClinica, setHistorialClinica] = useState<SuscripcionHistorial[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryData | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  const [selectedClinicaId, setSelectedClinicaId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState<'ALL' | Usuario['rol']>('ALL');
  const [selectedUserClinicaId, setSelectedUserClinicaId] = useState<'ALL' | string>('ALL');

  const { notify } = useToast();

  const [createClinica, setCreateClinica] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    tipo_negocio_id: '',
    estado: 'ACTIVA' as 'ACTIVA' | 'INACTIVA',
    plan_id: '',
    suscripcion_estado: 'TRIAL' as 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA',
    duracion_dias: '14'
  });

  const [editClinica, setEditClinica] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    tipo_negocio_id: '',
    estado: 'ACTIVA' as 'ACTIVA' | 'INACTIVA'
  });

  const [adminForm, setAdminForm] = useState({
    email: '',
    dni: '',
    password: '',
    rol: 'ADMIN' as 'ADMIN' | 'DOCTOR' | 'STAFF'
  });
  const [createPersonaPreview, setCreatePersonaPreview] = useState<PersonaData | null>(null);
  const [personasById, setPersonasById] = useState<Record<string, PersonaData>>({});

  const [assignPlanForm, setAssignPlanForm] = useState({
    clinica_id: '',
    plan_id: '',
    estado: 'TRIAL' as 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA',
    duracion_dias: '14'
  });

  const [planForm, setPlanForm] = useState<PlanFormState>(INITIAL_PLAN_FORM);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  const [editingUser, setEditingUser] = useState<UserEditState | null>(null);
  const [viewingUserSessions, setViewingUserSessions] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState({ codigo: '', nombre: '' });
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [showTipoEditor, setShowTipoEditor] = useState(false);
  const [isEditingClinica, setIsEditingClinica] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [userEditorMode, setUserEditorMode] = useState<'create' | 'edit' | null>(null);

  const selectedClinica = useMemo(
    () => clinicas.find((c) => c.id === selectedClinicaId) || null,
    [clinicas, selectedClinicaId]
  );

  const selectedSuscripcion = useMemo(
    () => suscripciones.find((s) => s.clinica_id === selectedClinicaId) || null,
    [suscripciones, selectedClinicaId]
  );

  const selectedPlan = useMemo(
    () =>
      planes.find(
        (plan) =>
          plan.id === selectedSuscripcion?.plan_id ||
          (selectedSuscripcion?.plan_codigo && plan.codigo === selectedSuscripcion.plan_codigo)
      ) || null,
    [planes, selectedSuscripcion]
  );

  const usuariosPorClinica = useMemo(() => {
    if (!selectedClinicaId) return [];
    return usuarios.filter((u) => u.clinica_id === selectedClinicaId);
  }, [usuarios, selectedClinicaId]);

  const adminsPorClinica = useMemo(
    () => usuariosPorClinica.filter((u) => u.rol === 'ADMIN'),
    [usuariosPorClinica]
  );

  useEffect(() => {
    const missingPersonaIds = Array.from(
      new Set(
        usuariosPorClinica
          .map((user) => user.persona_id)
          .filter((personaId): personaId is string => Boolean(personaId && !personasById[personaId]))
      )
    );

    if (missingPersonaIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadMissingPersonas = async () => {
      const results = await Promise.all(
        missingPersonaIds.map(async (personaId) => {
          try {
            const res = await fetch(`/api/backend/personas/${personaId}`, { credentials: 'include' });
            const payload = await res.json().catch(() => null);
            if (!res.ok || !payload?.data?.id) return null;
            return [personaId, payload.data as PersonaData] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      setPersonasById((prev) => {
        const next = { ...prev };
        results.forEach((entry) => {
          if (entry) {
            next[entry[0]] = entry[1];
          }
        });
        return next;
      });
    };

    loadMissingPersonas().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [personasById, usuariosPorClinica]);

  const totalClinicaPages = useMemo(
    () => Math.max(1, Math.ceil(clinicas.length / CLINICAS_PAGE_SIZE)),
    [clinicas.length]
  );

  const visibleClinicas = useMemo(() => {
    const start = clinicasPage * CLINICAS_PAGE_SIZE;
    return clinicas.slice(start, start + CLINICAS_PAGE_SIZE);
  }, [clinicas, clinicasPage]);

  const totalClinicasRegistradas = useMemo(() => clinicas.length, [clinicas]);

  const totalClinicasActivas = useMemo(
    () => clinicas.filter((clinica) => clinica.estado === 'ACTIVA').length,
    [clinicas]
  );

  const totalUsuariosRegistrados = useMemo(() => usuarios.length, [usuarios]);

  const totalUsuariosActivos = useMemo(
    () => usuarios.filter((usuario) => usuario.estado === 'ACTIVO').length,
    [usuarios]
  );

  const sesionesActivas = useMemo(
    () => Number(dashboardSummary?.sesionesActivas || 0),
    [dashboardSummary]
  );

  const actividadSesiones = useMemo(
    () => (Array.isArray(dashboardSummary?.actividad7dias) ? dashboardSummary.actividad7dias : []),
    [dashboardSummary]
  );

  const actividadSesionesMax = useMemo(
    () => Math.max(1, ...actividadSesiones.map((row) => row.total || 0)),
    [actividadSesiones]
  );

  const porcentajeClinicasActivas = useMemo(() => {
    if (totalClinicasRegistradas <= 0) return 0;
    return Math.round((totalClinicasActivas / totalClinicasRegistradas) * 100);
  }, [totalClinicasActivas, totalClinicasRegistradas]);

  const porcentajeUsuariosActivos = useMemo(() => {
    if (totalUsuariosRegistrados <= 0) return 0;
    return Math.round((totalUsuariosActivos / totalUsuariosRegistrados) * 100);
  }, [totalUsuariosActivos, totalUsuariosRegistrados]);

  const clinicasSummaryItems = useMemo(
    () => clinicas.slice(0, 10).map((clinica) => `${clinica.nombre} • ${clinica.estado}`),
    [clinicas]
  );

  const usuariosSummaryItems = useMemo(
    () => usuarios.filter((usuario) => usuario.estado === 'ACTIVO').map((usuario) => usuario.email).slice(0, 10),
    [usuarios]
  );

  const sesionesSummaryItems = useMemo(
    () => activeSessions.slice(0, 10).map((sessionItem) => {
      const clinica = clinicas.find((item) => item.id === sessionItem.clinica_id);
      const roleLabel = sessionItem.rol || 'SIN ROL';
      const clinicaLabel = clinica?.nombre || 'Sin clinica';
      const expiresLabel = formatDate(sessionItem.expires_at);
      return `${sessionItem.email} • ${roleLabel} • ${clinicaLabel} • Vence ${expiresLabel}`;
    }),
    [activeSessions, clinicas]
  );

  const availableLicensePlans = useMemo(() => {
    const official = OFFICIAL_PLAN_CODES
      .map((code) => planes.find((plan) => plan.codigo === code && plan.estado === 'ACTIVO'))
      .filter(Boolean) as Plan[];

    return official.length > 0 ? official : planes.filter((plan) => plan.estado === 'ACTIVO');
  }, [planes]);

  const licenciasVigentes = useMemo(
    () => suscripciones.filter((suscripcion) => ACTIVE_LICENSE_STATUSES.includes(suscripcion.suscripcion_estado) && Boolean(suscripcion.clinica_id)),
    [suscripciones]
  );

  const clinicasConLicenciaActiva = useMemo(
    () => new Set(licenciasVigentes.map((suscripcion) => suscripcion.clinica_id)).size,
    [licenciasVigentes]
  );

  const licenciasActivasSummaryItems = useMemo(
    () => licenciasVigentes
      .map((suscripcion) => {
        const clinica = clinicas.find((item) => item.id === suscripcion.clinica_id);
        return `${clinica?.nombre || 'Clínica'} • ${suscripcion.plan_nombre || suscripcion.plan_codigo || 'Sin plan'} • ${suscripcion.suscripcion_estado}`;
      })
      .slice(0, 10),
    [clinicas, licenciasVigentes]
  );

  const subscriptionPlanSummaries = useMemo(
    () => planes.map((plan) => {
      const activeClinicas = licenciasVigentes.filter((suscripcion) => suscripcion.plan_id === plan.id || suscripcion.plan_codigo === plan.codigo);
      const clinicaNames = Array.from(new Set(activeClinicas.map((suscripcion) => clinicas.find((item) => item.id === suscripcion.clinica_id)?.nombre || 'Clínica')));

      return {
        plan,
        totalClinicas: clinicaNames.length,
        clinicaNames: clinicaNames.slice(0, 4)
      };
    }),
    [clinicas, licenciasVigentes, planes]
  );

  const planesActivos = useMemo(
    () => availableLicensePlans.filter((plan) => plan.estado === 'ACTIVO').length,
    [availableLicensePlans]
  );

  const usuariosInactivos = useMemo(
    () => usuarios.filter((usuario) => usuario.estado !== 'ACTIVO').length,
    [usuarios]
  );

  const clinicasSinSuscripcion = useMemo(
    () => clinicas.filter((clinica) => !licenciasVigentes.some((suscripcion) => suscripcion.clinica_id === clinica.id)).length,
    [clinicas, licenciasVigentes]
  );

  const latestSessionDate = useMemo(() => {
    const ordered = [...activeSessions]
      .filter((sessionItem) => Boolean(sessionItem.created_at))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return ordered[0]?.created_at || null;
  }, [activeSessions]);

  useEffect(() => {
    setClinicasPage((current) => Math.min(current, Math.max(0, totalClinicaPages - 1)));
  }, [totalClinicaPages]);

  const filteredUsers = useMemo(() => {
    return usuarios.filter((usuario) => {
      const passRole = selectedUserRole === 'ALL' || usuario.rol === selectedUserRole;
      const passClinica = selectedUserClinicaId === 'ALL' || usuario.clinica_id === selectedUserClinicaId;
      return passRole && passClinica;
    });
  }, [usuarios, selectedUserClinicaId, selectedUserRole]);

  const loadHistorialClinica = useCallback(async (clinicaId: string) => {
    if (!clinicaId) {
      setHistorialClinica([]);
      return;
    }

    const res = await fetch(`/api/backend/platform/suscripciones/empresa/${clinicaId}`, {
      credentials: 'include'
    });

    if (!res.ok) {
      setHistorialClinica([]);
      return;
    }

    const payload = await res.json().catch(() => ({ data: [] }));
    setHistorialClinica(Array.isArray(payload.data) ? payload.data : []);
  }, []);

  const loadAllData = useCallback(async () => {
    let sessionRes = await fetch('/api/backend/usuarios/me', { credentials: 'include' });

    if (sessionRes.status === 401) {
      const refreshRes = await fetch('/api/backend/usuarios/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (refreshRes.ok) {
        // Retry /me briefly after refresh in case Set-Cookie propagation is not immediate.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 180));
          }

          sessionRes = await fetch('/api/backend/usuarios/me', { credentials: 'include' });
          if (sessionRes.ok) break;
        }
      }
    }

    if (!sessionRes.ok) throw new SessionInvalidError();

    const [clinicasRes, usuariosRes, planesRes, tiposRes, vigentesRes, dashboardRes, sessionsRes] = await Promise.all([
      fetch('/api/backend/empresas', { credentials: 'include' }),
      fetch('/api/backend/usuarios', { credentials: 'include' }),
      fetch('/api/backend/platform/planes?soloActivos=false', { credentials: 'include' }),
      fetch('/api/backend/tipos-negocio', { credentials: 'include' }),
      fetch('/api/backend/platform/suscripciones/vigentes', { credentials: 'include' }),
      fetch('/api/backend/admin/dashboard-summary', { credentials: 'include' }),
      fetch('/api/backend/admin/sesiones', { credentials: 'include' })
    ]);
    const sessionJson = await sessionRes.json();
    if (!sessionJson?.data || sessionJson.data.rol !== 'SUPERADMIN') throw new Error('No autorizado');

    const clinicasJson = clinicasRes.ok ? await clinicasRes.json() : { data: [] };
    const usuariosJson = usuariosRes.ok ? await usuariosRes.json() : { data: [] };
    const planesJson = planesRes.ok ? await planesRes.json() : { data: [] };
    const tiposJson = tiposRes.ok ? await tiposRes.json() : { data: [] };
    const vigentesJson = vigentesRes.ok ? await vigentesRes.json() : { data: [] };
    const dashboardJson = dashboardRes.ok ? await dashboardRes.json().catch(() => null) : null;
    const sessionsJson = sessionsRes.ok ? await sessionsRes.json().catch(() => null) : null;

    const clinicasData = Array.isArray(clinicasJson.data) ? clinicasJson.data : [];
    setSession(sessionJson.data);
    setClinicas(clinicasData);
    setUsuarios(Array.isArray(usuariosJson.data) ? usuariosJson.data : []);
    setPlanes(Array.isArray(planesJson.data) ? planesJson.data : []);
    setTipos(Array.isArray(tiposJson.data) ? tiposJson.data : []);
    setSuscripciones(
      Array.isArray(vigentesJson.data)
        ? vigentesJson.data.map((item: Partial<SuscripcionVigente> & { id?: string; estado?: string; empresa_id?: string | null }) => normalizeSuscripcionVigente(item))
        : []
    );
    setDashboardSummary(dashboardJson?.data || null);
    setActiveSessions(Array.isArray(sessionsJson?.data) ? sessionsJson.data : []);

    if (!selectedClinicaId && clinicasData.length > 0) {
      const first = clinicasData[0].id;
      setSelectedClinicaId(first);
      setAssignPlanForm((prev) => ({ ...prev, clinica_id: first }));
    }
  }, [selectedClinicaId]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setIsLoading(true);
      try {
        await loadAllData();
      } catch (error) {
        if (!(error instanceof SessionInvalidError)) {
          console.error(error);
        }
        if (mounted) {
          router.push('/login');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [loadAllData, router]);

  useEffect(() => {
    if (!selectedClinica) return;
    setEditClinica({
      nombre: selectedClinica.nombre || '',
      ruc: selectedClinica.ruc || '',
      direccion: selectedClinica.direccion || '',
      telefono: selectedClinica.telefono || '',
      tipo_negocio_id: selectedClinica.tipo_negocio_id || '',
      estado: selectedClinica.estado || 'ACTIVA'
    });
    setIsEditingClinica(false);
    setIsEditingPlan(false);
    setUserEditorMode(null);
    setCreatePersonaPreview(null);
    setEditingUser(null);
    loadHistorialClinica(selectedClinica.id).catch(() => setHistorialClinica([]));
  }, [loadHistorialClinica, selectedClinica]);

  useEffect(() => {
    if (!selectedClinicaId) return;
    setAssignPlanForm((prev) => ({ ...prev, clinica_id: selectedClinicaId }));
  }, [selectedClinicaId]);

  const startCreateUser = useCallback(() => {
    setEditingUser(null);
    setUserEditorMode('create');
    setCreatePersonaPreview(null);
    setAdminForm({ email: '', dni: '', password: '', rol: 'ADMIN' });
  }, []);

  const resolvePersonaByDni = useCallback(async (dni: string) => {
    const normalizedDni = dni.trim();
    if (!normalizedDni) {
      throw new Error('El DNI es obligatorio');
    }

    const personaRes = await fetch(`/api/backend/personas/dni/${encodeURIComponent(normalizedDni)}`, {
      credentials: 'include'
    });
    const personaPayload = await personaRes.json().catch(() => null);

    if (!personaRes.ok || !personaPayload?.data?.id) {
      throw new Error(personaPayload?.error || 'No se encontró persona por DNI');
    }

    const persona = personaPayload.data as PersonaData;
    setPersonasById((prev) => ({ ...prev, [persona.id]: persona }));
    return persona;
  }, []);

  const handleSearchCreatePersona = useCallback(async () => {
    try {
      const persona = await resolvePersonaByDni(adminForm.dni);
      setCreatePersonaPreview(persona);
      notify(`Persona encontrada: ${getPersonaNombre(persona)}`, 'success');
    } catch (error) {
      setCreatePersonaPreview(null);
      notify(error instanceof Error ? error.message : 'No se pudo buscar la persona por DNI', 'error');
    }
  }, [adminForm.dni, notify, resolvePersonaByDni]);

  const handleSearchEditPersona = useCallback(async () => {
    if (!editingUser) return;

    try {
      const persona = await resolvePersonaByDni(editingUser.dni);
      setEditingUser((prev) => (prev ? {
        ...prev,
        persona_id: persona.id,
        dni: persona.dni || prev.dni,
        nombres: persona.nombres || '',
        apellido_paterno: persona.apellido_paterno || '',
        apellido_materno: persona.apellido_materno || '',
        sexo: persona.sexo || '',
        fecha_nacimiento: persona.fecha_nacimiento || ''
      } : prev));
      notify(`Persona encontrada: ${getPersonaNombre(persona)}`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo buscar la persona por DNI', 'error');
    }
  }, [editingUser, notify, resolvePersonaByDni]);

  const handleLogout = useCallback(async () => {
    try {
      const headers = await getCsrfHeaders();
      await fetch('/api/backend/usuarios/logout', {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (error) {
      console.error(error);
    } finally {
      router.push('/login');
    }
  }, [router]);

  const resetCreateClinicaForm = useCallback(() => {
    setCreateClinica({
      nombre: '',
      ruc: '',
      direccion: '',
      telefono: '',
      tipo_negocio_id: '',
      estado: 'ACTIVA',
      plan_id: '',
      suscripcion_estado: 'TRIAL',
      duracion_dias: '14'
    });
  }, []);

  const handleCreateClinica = useCallback(async () => {
    if (!createClinica.nombre.trim() || !createClinica.tipo_negocio_id) {
      notify('Nombre y tipo de negocio son obligatorios', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/backend/empresas', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nombre: createClinica.nombre.trim(),
          tipo_negocio_id: createClinica.tipo_negocio_id,
          ruc: createClinica.ruc.trim() || undefined,
          direccion: createClinica.direccion.trim() || undefined,
          telefono: createClinica.telefono.trim() || undefined,
          estado: createClinica.estado
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo crear la clinica');

      // Flujo en dos pasos: primero se crea la clínica, luego se asigna plan inicial opcional.
      const nuevaClinicaId = payload?.data?.id;
      const selectedInitialPlan = availableLicensePlans.find((plan) => plan.id === createClinica.plan_id);
      const automaticInitialEstado = selectedInitialPlan?.codigo === 'TRIAL_CLINICA' ? 'TRIAL' : 'ACTIVA';

      let nuevaSuscripcion = null;
      if (nuevaClinicaId && createClinica.plan_id) {
        const assignRes = await fetch('/api/backend/platform/suscripciones/asignar', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            clinica_id: nuevaClinicaId,
            plan_id: createClinica.plan_id,
            estado: automaticInitialEstado
          })
        });

        const assignPayload = await assignRes.json().catch(() => null);
        if (!assignRes.ok || !assignPayload?.success) {
          throw new Error(assignPayload?.error || 'La clinica se creó pero no se pudo asignar la suscripcion inicial');
        }
        nuevaSuscripcion = assignPayload?.data;
      }

      // Actualizar localmente sin recargar todo
      const nuevaClinica: Clinica = {
        id: nuevaClinicaId,
        nombre: createClinica.nombre.trim(),
        tipo_negocio_id: createClinica.tipo_negocio_id,
        ruc: createClinica.ruc.trim() || null,
        direccion: createClinica.direccion.trim() || null,
        telefono: createClinica.telefono.trim() || null,
        estado: createClinica.estado,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setClinicas((prev) => [...prev, nuevaClinica]);
      
      if (nuevaSuscripcion) {
        setSuscripciones((prev) => [...prev, nuevaSuscripcion]);
      }

      notify(createClinica.plan_id ? 'Clinica y suscripcion inicial creadas correctamente' : 'Clinica creada con trial inicial de 14 dias', 'success');
      resetCreateClinicaForm();
      setClinicaView('list');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al crear clinica', 'error');
    }
  }, [availableLicensePlans, createClinica, notify, resetCreateClinicaForm]);

  const handleUpdateClinica = useCallback(async () => {
    if (!selectedClinicaId) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/empresas/${selectedClinicaId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          nombre: editClinica.nombre.trim() || undefined,
          ruc: editClinica.ruc.trim() || undefined,
          direccion: editClinica.direccion.trim() || undefined,
          telefono: editClinica.telefono.trim() || undefined,
          tipo_negocio_id: editClinica.tipo_negocio_id || undefined,
          estado: editClinica.estado
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar la clinica');

      // Actualizar localmente sin recargar todo
      setClinicas((prev) =>
        prev.map((c) =>
          c.id === selectedClinicaId
            ? {
                ...c,
                nombre: editClinica.nombre.trim() || c.nombre,
                ruc: editClinica.ruc.trim() || c.ruc,
                direccion: editClinica.direccion.trim() || c.direccion,
                telefono: editClinica.telefono.trim() || c.telefono,
                tipo_negocio_id: editClinica.tipo_negocio_id || c.tipo_negocio_id,
                estado: editClinica.estado,
                updated_at: new Date().toISOString()
              }
            : c
        )
      );

      notify('Clinica actualizada', 'success');
      setIsEditingClinica(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar clinica', 'error');
    }
  }, [editClinica, notify, selectedClinicaId]);

  const handleClinicaLifecycle = useCallback(async (action: 'desactivar' | 'reactivar' | 'eliminar') => {
    if (!selectedClinicaId) return;

    const label = action === 'desactivar' ? 'desactivar' : action === 'reactivar' ? 'reactivar' : 'eliminar';
    if (!window.confirm(`Deseas ${label} esta clinica?`)) {
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const method = action === 'eliminar' ? 'DELETE' : 'POST';
      const url = action === 'eliminar'
        ? `/api/backend/empresas/${selectedClinicaId}`
        : `/api/backend/empresas/${selectedClinicaId}/${action}`;

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || `No se pudo ${label} la clinica`);

      // Actualizar localmente sin recargar todo
      if (action === 'eliminar') {
        setClinicas((prev) => prev.filter((c) => c.id !== selectedClinicaId));
        setSuscripciones((prev) => prev.filter((s) => s.clinica_id !== selectedClinicaId));
        setUsuarios((prev) => prev.filter((u) => u.clinica_id !== selectedClinicaId));
        setSelectedClinicaId(null);
      } else {
        const nuevoEstado = action === 'desactivar' ? 'INACTIVA' : 'ACTIVA';
        setClinicas((prev) =>
          prev.map((c) => (c.id === selectedClinicaId ? { ...c, estado: nuevoEstado, updated_at: new Date().toISOString() } : c))
        );
      }

      notify(`Clinica ${label}da correctamente`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : `Error al ${label} clinica`, 'error');
    }
  }, [notify, selectedClinicaId]);

  const handleCreateAdmin = useCallback(async () => {
    if (!selectedClinicaId) return;

    if (!adminForm.email.trim() || !adminForm.dni.trim() || !adminForm.password.trim()) {
      notify('Email, DNI y contraseña son obligatorios', 'error');
      return;
    }

    try {
      const persona = createPersonaPreview?.id && createPersonaPreview.dni === adminForm.dni.trim()
        ? createPersonaPreview
        : await resolvePersonaByDni(adminForm.dni.trim());
      setCreatePersonaPreview(persona);

      const headers = await getCsrfHeaders();
      const createRes = await fetch('/api/backend/usuarios', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: selectedClinicaId,
          persona_id: persona.id,
          email: adminForm.email.trim(),
          password: adminForm.password,
          rol: adminForm.rol,
          estado: 'ACTIVO'
        })
      });

      const createPayload = await createRes.json().catch(() => null);
      if (!createRes.ok || !createPayload?.success) throw new Error(createPayload?.error || 'No se pudo crear el usuario');

      // Actualizar localmente sin recargar todo
      const nuevoUsuario: Usuario = {
        id: createPayload?.data?.id || crypto.randomUUID(),
        clinica_id: selectedClinicaId,
        persona_id: persona.id,
        email: adminForm.email.trim(),
        rol: adminForm.rol,
        estado: 'ACTIVO',
        nombres: persona.nombres,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        dni: persona.dni,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUsuarios((prev) => [...prev, nuevoUsuario]);

      notify(`${adminForm.rol} creado correctamente`, 'success');
      setAdminForm({ email: '', dni: '', password: '', rol: 'ADMIN' });
      setCreatePersonaPreview(null);
      setUserEditorMode(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al crear usuario', 'error');
    }
  }, [adminForm, createPersonaPreview, notify, resolvePersonaByDni, selectedClinicaId]);

  const handleAssignPlan = useCallback(async () => {
    if (!assignPlanForm.clinica_id || !assignPlanForm.plan_id) {
      notify('Selecciona clinica y plan', 'error');
      return;
    }

    const selectedPlanConfig = availableLicensePlans.find((plan) => plan.id === assignPlanForm.plan_id);
    const automaticEstado = selectedPlanConfig?.codigo === 'TRIAL_CLINICA' ? 'TRIAL' : 'ACTIVA';

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/backend/platform/suscripciones/asignar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: assignPlanForm.clinica_id,
          plan_id: assignPlanForm.plan_id,
          estado: automaticEstado
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo asignar suscripcion');

      // Actualizar localmente sin recargar todo
      const nuevaSuscripcion = payload?.data;
      if (nuevaSuscripcion) {
        setSuscripciones((prev) => {
          const existingIndex = prev.findIndex((s) => s.clinica_id === assignPlanForm.clinica_id);
          if (existingIndex >= 0) {
            return prev.map((s, i) => (i === existingIndex ? nuevaSuscripcion : s));
          }
          return [...prev, nuevaSuscripcion];
        });
      }

      notify(automaticEstado === 'TRIAL' ? 'Trial asignado correctamente' : 'Plan activado correctamente', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al asignar suscripcion', 'error');
    }
  }, [assignPlanForm, availableLicensePlans, notify]);

  const handleRevokeCurrentPlan = useCallback(async () => {
    if (!selectedClinicaId || !selectedSuscripcion?.plan_id) {
      notify('La clínica no tiene un plan vigente para revocar', 'error');
      return;
    }

    if (!window.confirm('¿Deseas revocar el plan actual de esta clínica?')) {
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/backend/platform/suscripciones/asignar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: selectedClinicaId,
          plan_id: selectedSuscripcion.plan_id,
          estado: 'CANCELADA'
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo revocar el plan actual');

      // Actualizar localmente sin recargar todo
      setSuscripciones((prev) =>
        prev.map((s) =>
          s.clinica_id === selectedClinicaId ? { ...s, estado: 'CANCELADA', updated_at: new Date().toISOString() } : s
        )
      );

      notify('Plan revocado correctamente', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al revocar el plan', 'error');
    }
  }, [notify, selectedClinicaId, selectedSuscripcion]);

  const normalizePlanPayload = useCallback((form: PlanFormState) => {
    return {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      moneda: form.moneda.trim().toUpperCase() || 'PEN',
      precio_mensual: Number(form.precio_mensual || '0'),
      precio_anual: Number(form.precio_anual || '0'),
      max_usuarios: toNumberOrNull(form.max_usuarios),
      max_pacientes_activos: toNumberOrNull(form.max_pacientes_activos),
      max_storage_gb: toNumberOrNull(form.max_storage_gb),
      incluye_facturacion_electronica: form.incluye_facturacion_electronica,
      incluye_historia_clinica_avanzada: form.incluye_historia_clinica_avanzada,
      incluye_integraciones: form.incluye_integraciones,
      incluye_api: form.incluye_api,
      dias_trial: Number(form.dias_trial || '0'),
      estado: form.estado
    };
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (!planForm.codigo.trim() || !planForm.nombre.trim()) {
      notify('Codigo y nombre de plan son obligatorios', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const payload = normalizePlanPayload(planForm);

      const url = editingPlanId ? `/api/backend/platform/planes/${editingPlanId}` : '/api/backend/platform/planes';
      const method = editingPlanId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'No se pudo guardar el plan');

      const savedPlan = json.data as Plan;

      // Actualizar localmente sin recargar todo
      if (editingPlanId) {
        setPlanes((prev) => prev.map((p) => (p.id === editingPlanId ? { ...p, ...savedPlan } : p)));
      } else {
        setPlanes((prev) => [...prev, savedPlan]);
      }

      notify(editingPlanId ? 'Plan actualizado correctamente' : 'Plan creado correctamente', 'success');
      setPlanForm(INITIAL_PLAN_FORM);
      setEditingPlanId(null);
      setShowPlanEditor(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al guardar plan', 'error');
    }
  }, [editingPlanId, normalizePlanPayload, notify, planForm]);

  const handleEditPlan = useCallback((plan: Plan) => {
    setShowPlanEditor(true);
    setEditingPlanId(plan.id);
    setPlanForm({
      codigo: plan.codigo || '',
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      moneda: plan.moneda || 'PEN',
      precio_mensual: String(plan.precio_mensual ?? 0),
      precio_anual: String(plan.precio_anual ?? 0),
      max_usuarios: plan.max_usuarios == null ? '' : String(plan.max_usuarios),
      max_pacientes_activos: plan.max_pacientes_activos == null ? '' : String(plan.max_pacientes_activos),
      max_storage_gb: plan.max_storage_gb == null ? '' : String(plan.max_storage_gb),
      incluye_facturacion_electronica: Boolean(plan.incluye_facturacion_electronica),
      incluye_historia_clinica_avanzada: Boolean(plan.incluye_historia_clinica_avanzada),
      incluye_integraciones: Boolean(plan.incluye_integraciones),
      incluye_api: Boolean(plan.incluye_api),
      dias_trial: String(plan.dias_trial ?? 0),
      estado: plan.estado || 'ACTIVO'
    });
  }, []);

  const handleDeletePlan = useCallback(async (plan: Plan) => {
    if (!window.confirm(`Deseas eliminar el plan ${plan.nombre}?`)) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/platform/planes/${plan.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo eliminar plan');

      // Actualizar localmente sin recargar todo
      setPlanes((prev) => prev.filter((p) => p.id !== plan.id));

      notify(payload?.message || 'Plan eliminado correctamente', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al eliminar plan', 'error');
    }
  }, [notify]);

  const startEditUser = useCallback(async (user: Usuario) => {
    const persona = user.persona_id ? personasById[user.persona_id] : null;

    setUserEditorMode('edit');
    setEditingUser({
      id: user.id,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      clinica_id: user.clinica_id || '',
      persona_id: user.persona_id || '',
      dni: user.dni || persona?.dni || '',
      nombres: user.nombres || persona?.nombres || '',
      apellido_paterno: user.apellido_paterno || persona?.apellido_paterno || '',
      apellido_materno: user.apellido_materno || persona?.apellido_materno || '',
      sexo: user.sexo || persona?.sexo || '',
      fecha_nacimiento: user.fecha_nacimiento || persona?.fecha_nacimiento || '',
      password: ''
    });

    if (!user.persona_id || persona) return;

    try {
      const res = await fetch(`/api/backend/personas/${user.persona_id}`, { credentials: 'include' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.data?.id) return;

      const loadedPersona = payload.data as PersonaData;
      setPersonasById((prev) => ({ ...prev, [loadedPersona.id]: loadedPersona }));
      setEditingUser((prev) => (prev && prev.id === user.id
        ? {
            ...prev,
            dni: loadedPersona.dni || prev.dni,
            nombres: loadedPersona.nombres || prev.nombres,
            apellido_paterno: loadedPersona.apellido_paterno || prev.apellido_paterno,
            apellido_materno: loadedPersona.apellido_materno || prev.apellido_materno,
            sexo: loadedPersona.sexo || prev.sexo,
            fecha_nacimiento: loadedPersona.fecha_nacimiento || prev.fecha_nacimiento
          }
        : prev));
    } catch {
      // Silencioso: si la persona no carga, mantenemos la edición básica del usuario.
    }
  }, [personasById]);

  const handleSaveUser = useCallback(async () => {
    if (!editingUser) return;

    if (!editingUser.email.trim()) {
      notify('Email de usuario es obligatorio', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();

      const body: Record<string, unknown> = {
        email: editingUser.email.trim(),
        estado: editingUser.estado,
        persona_id: editingUser.persona_id || undefined
      };

      if (editingUser.password.trim()) {
        body.password = editingUser.password;
      }

      if (editingUser.rol !== 'SUPERADMIN') {
        body.rol = editingUser.rol;
        body.clinica_id = editingUser.clinica_id || undefined;
      }

      const res = await fetch(`/api/backend/usuarios/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(body)
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar usuario');

      // Actualizar localmente sin recargar todo
      const updatedUser = payload.data as Usuario;
      setUsuarios((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updatedUser } : u)));

      notify('Usuario actualizado correctamente', 'success');
      setEditingUser(null);
      setUserEditorMode(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar usuario', 'error');
    }
  }, [editingUser, notify]);

  const handleDeleteUser = useCallback(async (user: Usuario) => {
    if (!window.confirm(`¿Deseas eliminar permanentemente el usuario ${user.email}? Esta acción no se puede deshacer.`)) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/usuarios/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo eliminar usuario');

      // Actualizar localmente sin recargar todo
      setUsuarios((prev) => prev.filter((u) => u.id !== user.id));

      notify(payload?.message || 'Usuario eliminado permanentemente', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al eliminar usuario', 'error');
    }
  }, [notify]);

  const handleToggleUsuario = useCallback(async (user: Usuario) => {
    const endpoint = user.estado === 'ACTIVO' ? 'desactivar' : 'reactivar';
    const newEstado = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/usuarios/${user.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar usuario');

      // Actualizar localmente sin recargar todo
      setUsuarios((prev) => prev.map((u) => (u.id === user.id ? { ...u, estado: newEstado } : u)));

      notify('Usuario actualizado', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar usuario', 'error');
    }
  }, [notify]);

  const userSessions = useMemo(() => {
    if (!viewingUserSessions) return [];
    return activeSessions.filter((s) => s.usuario_id === viewingUserSessions);
  }, [activeSessions, viewingUserSessions]);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    if (!window.confirm('¿Deseas revocar esta sesión? El usuario será desconectado.')) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/admin/sesiones/${sessionId}/revocar`, {
        method: 'POST',
        credentials: 'include',
        headers
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo revocar la sesión');

      // Actualizar localmente
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));

      notify('Sesión revocada correctamente', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al revocar sesión', 'error');
    }
  }, [notify]);

  const getSubBadge = useCallback((sub: SuscripcionVigente | null) => {
    if (!sub) return { label: 'Sin suscripcion', cls: 'bg-rose-500/14 text-[var(--ui-danger)]' };
    if (sub.suscripcion_estado === 'TRIAL') return { label: 'TRIAL', cls: 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' };
    if (sub.suscripcion_estado === 'ACTIVA') return { label: 'ACTIVA', cls: 'bg-emerald-500/14 text-[var(--ui-success)]' };
    return { label: sub.suscripcion_estado, cls: 'bg-amber-500/14 text-[var(--ui-warning)]' };
  }, []);

  const handleSelectTipoForEdit = useCallback((tipo: TipoNegocio) => {
    setEditingTipoId(tipo.id);
    setTipoForm({ codigo: tipo.codigo || '', nombre: tipo.nombre || '' });
    setShowTipoEditor(true);
  }, []);

  const handleCancelTipoEdit = useCallback(() => {
    setEditingTipoId(null);
    setTipoForm({ codigo: '', nombre: '' });
    setShowTipoEditor(false);
  }, []);

  const handleSaveTipo = useCallback(async () => {
    if (!tipoForm.codigo.trim() || !tipoForm.nombre.trim()) {
      notify('Código y nombre son obligatorios para tipo de negocio', 'error');
      return;
    }

    if (editingTipoId && !isUuidLike(editingTipoId)) {
      notify('ID de tipo inválido. Recarga la lista antes de editar.', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const url = editingTipoId ? `/api/backend/tipos-negocio/${editingTipoId}` : '/api/backend/tipos-negocio';
      const method = editingTipoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers,
        body: JSON.stringify({
          codigo: tipoForm.codigo.trim().toUpperCase(),
          nombre: tipoForm.nombre.trim()
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo guardar el tipo de negocio');

      // Actualizar localmente sin recargar todo
      const nuevoTipo: TipoNegocio = {
        id: editingTipoId || payload?.data?.id || crypto.randomUUID(),
        codigo: tipoForm.codigo.trim().toUpperCase(),
        nombre: tipoForm.nombre.trim(),
        created_at: editingTipoId ? (tipos.find((t) => t.id === editingTipoId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (editingTipoId) {
        setTipos((prev) => prev.map((t) => (t.id === editingTipoId ? nuevoTipo : t)));
      } else {
        setTipos((prev) => [...prev, nuevoTipo]);
      }

      notify(editingTipoId ? 'Tipo de negocio actualizado' : 'Tipo de negocio creado', 'success');
      handleCancelTipoEdit();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al guardar tipo de negocio', 'error');
    }
  }, [editingTipoId, handleCancelTipoEdit, notify, tipoForm.codigo, tipoForm.nombre, tipos]);

  const handleDeleteTipo = useCallback(async (tipo: TipoNegocio) => {
    if (!window.confirm(`Deseas eliminar el tipo de negocio ${tipo.nombre}?`)) return;

    if (!isUuidLike(tipo.id)) {
      notify('ID de tipo inválido. Recarga la lista antes de eliminar.', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/tipos-negocio/${tipo.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo eliminar el tipo de negocio');

      // Actualizar localmente sin recargar todo
      setTipos((prev) => prev.filter((t) => t.id !== tipo.id));

      notify('Tipo de negocio eliminado', 'success');
      if (editingTipoId === tipo.id) {
        handleCancelTipoEdit();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al eliminar tipo de negocio', 'error');
    }
  }, [editingTipoId, handleCancelTipoEdit, notify]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--ui-foreground)]">
        Cargando panel SuperAdmin...
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="superadmin-shell min-h-screen bg-[var(--app-bg)] text-[var(--ui-foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ui-muted)]">CliniCore</p>
                  <h1 className="mt-2 text-3xl font-semibold">SuperAdmin</h1>
                  <p className="mt-2 text-sm text-[var(--ui-muted)]">Control total de clínicas, usuarios, suscripciones y planes.</p>
                </div>
                <ConsoleThemeToggle compact />
              </div>

              <div className="rounded-[28px] bg-[var(--ui-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Sesión</p>
                <p className="mt-2 font-semibold text-[var(--ui-foreground)]">{session.email}</p>
                <p className="mt-1 text-sm text-[var(--ui-muted)]">Rol SUPERADMIN activo</p>
              </div>

              <nav className="space-y-3">
                <SectionButton active={section === 'dashboard'} icon={<FiBarChart2 size={18} />} label="Dashboard" description="Métricas y estadísticas generales." onClick={() => setSection('dashboard')} />
                <SectionButton active={section === 'clinicas'} icon={<FiHome size={18} />} label="Clínicas" description="Listado completo y detalle de cada clínica." onClick={() => { setSection('clinicas'); setClinicaView('list'); }} />
                <SectionButton active={section === 'suscripciones'} icon={<FiCreditCard size={18} />} label="Suscripciones" description="Asignación real e historial por clínica." onClick={() => setSection('suscripciones')} />
                <SectionButton active={section === 'usuarios'} icon={<FiUsers size={18} />} label="Usuarios" description="Edición, activación y eliminación global." onClick={() => setSection('usuarios')} />
              </nav>

              <div className="rounded-[28px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Clínicas activas</p>
                    <p className="mt-2 text-3xl font-semibold">{totalClinicasActivas}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]">
                    <FiShield size={20} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-[var(--ui-danger)] px-4 py-3 text-sm font-semibold text-white hover:opacity-92"
              >
                <FiLogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ui-muted)]">Panel ejecutivo</p>
                <h2 className="mt-2 text-3xl font-semibold">
                  {section === 'dashboard' && 'Dashboard — Estadísticas generales'}
                  {section === 'clinicas' && 'Gestión completa de clínicas'}
                  {section === 'suscripciones' && 'Suscripciones y planes SaaS'}
                  {section === 'usuarios' && 'Gestión global de usuarios'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">
                  Todo se alimenta de datos reales del backend y cada acción impacta directamente en la base de datos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="lg:hidden">
                  <ConsoleThemeToggle compact />
                </div>
              </div>
            </div>
          </header>

          <main className={section === 'clinicas' && clinicaView === 'list' ? 'flex h-[calc(100vh-180px)] flex-col overflow-hidden py-6' : 'space-y-6 py-6'}>
            {/* ====== DASHBOARD ====== */}
            {section === 'dashboard' && (
              <>
                <section className="relative z-30 grid gap-4 xl:grid-cols-4 2xl:grid-cols-4">
                  <MetricCard label="Clínicas" value={String(totalClinicasRegistradas)} hint={`${totalClinicasActivas} activas de ${totalClinicasRegistradas}`} icon={<FiBriefcase size={20} />} summaryTitle="Clinicas registradas" summaryItems={clinicasSummaryItems} summaryFooter={totalClinicasRegistradas > 10 ? `+${totalClinicasRegistradas - 10} clinicas adicionales` : `${totalClinicasActivas} activas actualmente`} />
                  <MetricCard label="Usuarios" value={String(totalUsuariosRegistrados)} hint={`${totalUsuariosActivos} activos de ${totalUsuariosRegistrados}`} icon={<FiUsers size={20} />} summaryTitle="Usuarios activos" summaryItems={usuariosSummaryItems} summaryFooter={totalUsuariosActivos ? `${porcentajeUsuariosActivos}% del total habilitado` : 'Sin usuarios activos'} />
                  <MetricCard label="Sesiones activas" value={String(sesionesActivas)} hint="Refresh tokens vigentes" icon={<FiShield size={20} />} summaryTitle="Sesiones activas" summaryItems={sesionesSummaryItems} summaryFooter={activeSessions.length > 10 ? `+${activeSessions.length - 10} sesiones adicionales` : `Sesiones activas actuales: ${sesionesActivas}`} />
                  <MetricCard label="Licencias activas" value={String(clinicasConLicenciaActiva)} hint="Clínicas con plan vigente" icon={<FiLayers size={20} />} summaryTitle="Clínicas con licencia activa" summaryItems={licenciasActivasSummaryItems} summaryFooter={clinicasConLicenciaActiva > 0 ? 'Incluye TRIAL, ACTIVA y PAST_DUE' : 'Sin licencias vigentes'} />
                </section>

                <section className="relative z-0 grid gap-4 xl:grid-cols-2">
                  <Surface eyebrow="Adopción" title="KPIs clave del sistema" description="Porcentaje de entidades activas sobre el total registrado en plataforma.">
                    <div className="grid gap-3 md:grid-cols-2">
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Clínicas activas</p>
                        <p className="mt-2 text-3xl font-semibold">{porcentajeClinicasActivas}%</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ui-surface-strong)]">
                          <div className="h-full rounded-full bg-[var(--ui-accent)]" style={{ width: `${Math.max(4, porcentajeClinicasActivas)}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--ui-muted)]">{totalClinicasActivas} de {totalClinicasRegistradas}</p>
                      </article>
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Usuarios activos</p>
                        <p className="mt-2 text-3xl font-semibold">{porcentajeUsuariosActivos}%</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ui-surface-strong)]">
                          <div className="h-full rounded-full bg-[var(--ui-accent)]" style={{ width: `${Math.max(4, porcentajeUsuariosActivos)}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--ui-muted)]">{totalUsuariosActivos} de {totalUsuariosRegistrados}</p>
                      </article>
                    </div>
                  </Surface>

                  <Surface eyebrow="Actividad" title="Sesiones creadas por día" description="Últimos 7 días según emisión de sesiones (refresh tokens).">
                    {actividadSesiones.length === 0 ? (
                      <p className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-muted)]">Sin datos de actividad por ahora.</p>
                    ) : (
                      <div className="space-y-3">
                        {actividadSesiones.map((row) => (
                          <div key={row.dia} className="grid grid-cols-[52px_1fr_42px] items-center gap-3">
                            <span className="text-xs font-semibold text-[var(--ui-muted)]">{row.etiqueta}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-surface-strong)]">
                              <div className="h-full rounded-full bg-[var(--ui-accent)]" style={{ width: `${Math.max(6, Math.round((row.total / actividadSesionesMax) * 100))}%` }} />
                            </div>
                            <span className="text-right text-xs font-semibold text-[var(--ui-foreground)]">{row.total}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Surface>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
                  <Surface eyebrow="Panorama" title="Estado rápido de plataforma" description="Resumen compacto para ocupar el espacio inferior con señales útiles de operación diaria.">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Clínicas sin plan</p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--ui-foreground)]">{clinicasSinSuscripcion}</p>
                        <p className="mt-2 text-sm text-[var(--ui-muted)]">Requieren asignación o revisión comercial.</p>
                      </article>
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Planes oficiales</p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--ui-foreground)]">{planesActivos}</p>
                        <p className="mt-2 text-sm text-[var(--ui-muted)]">Catálogo oficial de licencias disponible para nuevas altas.</p>
                      </article>
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Usuarios inactivos</p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--ui-foreground)]">{usuariosInactivos}</p>
                        <p className="mt-2 text-sm text-[var(--ui-muted)]">Cuentas detenidas o pendientes de reactivación.</p>
                      </article>
                      <article className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Última sesión</p>
                        <p className="mt-2 text-xl font-semibold text-[var(--ui-foreground)]">{formatDate(latestSessionDate)}</p>
                        <p className="mt-2 text-sm text-[var(--ui-muted)]">Último refresh token emitido en la plataforma.</p>
                      </article>
                    </div>
                  </Surface>

                  <Surface eyebrow="Licenciamiento" title="Clínicas con licencia activa" description="Visibilidad rápida de las clínicas que ya operan con Trial, licencia activa o PAST_DUE.">
                    <div className="space-y-3">
                      <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-sm font-semibold text-[var(--ui-foreground)]">Estado actual de licencias</p>
                        {licenciasActivasSummaryItems.length === 0 ? (
                          <p className="mt-2 text-sm text-[var(--ui-muted)]">Aún no hay clínicas con licencia activa.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {licenciasActivasSummaryItems.slice(0, 6).map((item, index) => (
                              <div key={`licencia-${index}`} className="rounded-[14px] bg-[var(--ui-card)] px-3 py-2 text-sm text-[var(--ui-foreground)]">
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Prioridad actual</p>
                        <p className="mt-2 text-lg font-semibold text-[var(--ui-foreground)]">
                          {clinicasSinSuscripcion > 0
                            ? `${clinicasSinSuscripcion} clínicas requieren plan asignado`
                            : clinicasConLicenciaActiva > 0
                              ? `${clinicasConLicenciaActiva} clínicas ya tienen licencia activa`
                              : 'Operación estable en este momento'}
                        </p>
                        <p className="mt-2 text-sm text-[var(--ui-muted)]">
                          Así puedes revisar rápidamente qué clínicas ya están licenciadas y cuáles todavía necesitan asignación.
                        </p>
                      </div>
                    </div>
                  </Surface>
                </section>

              </>
            )}

            {/* ====== CLINICAS — LISTA ====== */}
            {section === 'clinicas' && clinicaView === 'list' && (
              <>
                <section className="grid flex-1 gap-6 xl:grid-cols-[1.45fr_0.85fr] xl:items-start xl:overflow-hidden">
                  <Surface
                    eyebrow="Clínicas"
                    title="Listado de clínicas"
                    description="La lista muestra 3 por bloque para mantener foco. Usa las flechas para avanzar por el catálogo."
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          resetCreateClinicaForm();
                          setClinicaView('create');
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        <FiPlus size={16} />
                        Nueva clínica
                      </button>
                    }
                  >
                    <div className="flex h-[460px] flex-col">
                      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                        {visibleClinicas.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-8 text-sm text-[var(--ui-muted)]">
                            No hay clínicas registradas todavía.
                          </div>
                        ) : (
                          visibleClinicas.map((clinica) => {
                            const sub = suscripciones.find((s) => s.clinica_id === clinica.id) || null;
                            const badge = getSubBadge(sub);
                            return (
                              <article key={clinica.id} className="flex min-h-[152px] flex-col justify-between rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-lg font-semibold text-[var(--ui-foreground)]">{clinica.nombre}</p>
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${clinica.estado === 'ACTIVA' ? 'bg-emerald-500/14 text-[var(--ui-success)]' : 'bg-rose-500/14 text-[var(--ui-danger)]'}`}>{clinica.estado}</span>
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Tipo</p>
                                        <p className="mt-1 text-sm text-[var(--ui-foreground)]">{clinica.tipo_negocio_nombre || clinica.tipo_negocio_codigo || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">RUC</p>
                                        <p className="mt-1 text-sm text-[var(--ui-foreground)]">{clinica.ruc || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Plan</p>
                                        <p className="mt-1 text-sm text-[var(--ui-foreground)]">{sub?.plan_nombre || sub?.plan_codigo || 'Sin plan activo'}</p>
                                      </div>
                                    </div>
                                    <p className="mt-3 text-sm text-[var(--ui-muted)]">{clinica.direccion || 'Sin dirección registrada'}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedClinicaId(clinica.id);
                                      setAssignPlanForm((prev) => ({ ...prev, clinica_id: clinica.id }));
                                      setClinicaView('detail');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white"
                                  >
                                    Ver detalle <FiChevronRight size={14} />
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3">
                        <p className="text-sm text-[var(--ui-muted)]">
                          Página <span className="font-semibold text-[var(--ui-foreground)]">{clinicasPage + 1}</span> de <span className="font-semibold text-[var(--ui-foreground)]">{totalClinicaPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setClinicasPage((current) => Math.max(0, current - 1))}
                            disabled={clinicasPage === 0}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-card)] text-[var(--ui-foreground)] disabled:opacity-40"
                          >
                            <FiChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setClinicasPage((current) => Math.min(totalClinicaPages - 1, current + 1))}
                            disabled={clinicasPage >= totalClinicaPages - 1}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-card)] text-[var(--ui-foreground)] disabled:opacity-40"
                          >
                            <FiChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Surface>

                  <Surface
                    eyebrow="Catálogo"
                    title="Tipos de negocio"
                    description="Visualiza hasta 4 por bloque y desplázate dentro del panel para ver más, sin afectar el scroll general."
                    action={
                      <div className="flex h-10 w-10 items-center justify-center">
                        {!showTipoEditor ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTipoId(null);
                              setTipoForm({ codigo: '', nombre: '' });
                              setShowTipoEditor(true);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ui-accent)] text-white"
                            aria-label="Agregar tipo de negocio"
                            title="Nuevo tipo de negocio"
                          >
                            <FiPlus size={18} />
                          </button>
                        ) : (
                          <span className="block h-10 w-10" aria-hidden="true" />
                        )}
                      </div>
                    }
                  >
                    {!showTipoEditor ? (
                      <div className="flex h-[460px] flex-col space-y-3">
                        <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-muted)]">
                          {tipos.length} tipos registrados · se muestran hasta 4 visibles con scroll interno.
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                          {tipos.length === 0 ? (
                            <div className="rounded-[20px] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-sm text-[var(--ui-muted)]">
                              Aún no hay tipos de negocio. Usa el botón <span className="font-semibold text-[var(--ui-foreground)]">+</span> para crear el primero.
                            </div>
                          ) : (
                            tipos.map((tipo) => (
                              <article key={tipo.id} className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                                <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Código</p>
                                <p className="mt-1 text-sm font-semibold text-[var(--ui-foreground)]">{tipo.codigo || 'GENERAL'}</p>
                                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Nombre</p>
                                <p className="mt-1 text-base font-semibold text-[var(--ui-foreground)]">{tipo.nombre}</p>
                                <div className="mt-3 flex items-center gap-2">
                                  <button type="button" onClick={() => handleSelectTipoForEdit(tipo)} className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-card)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-foreground)]">
                                    <FiEdit2 size={12} /> Editar
                                  </button>
                                  <button type="button" onClick={() => handleDeleteTipo(tipo)} className="inline-flex items-center gap-1 rounded-full bg-rose-500/14 px-3 py-1.5 text-xs font-semibold text-[var(--ui-danger)]">
                                    <FiTrash2 size={12} /> Eliminar
                                  </button>
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[460px] flex-col rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 overflow-y-auto">
                        <p className="text-sm font-semibold text-[var(--ui-foreground)]">{editingTipoId ? 'Editar tipo seleccionado' : 'Nuevo tipo de negocio'}</p>
                        <p className="mt-1 text-xs text-[var(--ui-muted)]">Este mismo bloque cambia entre creación y edición del tipo seleccionado.</p>
                        <div className="mt-3 grid gap-3">
                          <input
                            className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm"
                            placeholder="Código"
                            value={tipoForm.codigo}
                            onChange={(e) => setTipoForm((prev) => ({ ...prev, codigo: e.target.value }))}
                          />
                          <input
                            className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm"
                            placeholder="Nombre"
                            value={tipoForm.nombre}
                            onChange={(e) => setTipoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={handleSaveTipo} className="rounded-[12px] bg-[var(--ui-accent)] px-3 py-2 text-sm font-semibold text-white">
                              {editingTipoId ? 'Guardar cambios' : 'Crear tipo'}
                            </button>
                            <button type="button" onClick={handleCancelTipoEdit} className="rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm font-semibold text-[var(--ui-foreground)]">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Surface>
                </section>
              </>
            )}

            {/* ====== CLINICAS — CREAR ====== */}
            {section === 'clinicas' && clinicaView === 'create' && (
              <>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setClinicaView('list')}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-semibold text-[var(--ui-foreground)] hover:bg-[var(--ui-surface-strong)]"
                  >
                    <FiArrowLeft size={16} /> Volver al listado
                  </button>
                  <div>
                    <p className="text-xs text-[var(--ui-muted)]">Alta de clínica</p>
                    <p className="font-semibold text-[var(--ui-foreground)]">Registro completo de nueva clínica</p>
                  </div>
                </div>

                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
                  <Surface eyebrow="Clínica" title="Datos principales" description="Aquí registras la clínica y luego, en el mismo flujo, puedes asignar su suscripción inicial.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-[var(--ui-muted)]">Nombre</span>
                        <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" placeholder="Nombre de la clínica" value={createClinica.nombre} onChange={(e) => setCreateClinica((p) => ({ ...p, nombre: e.target.value }))} />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[var(--ui-muted)]">RUC</span>
                        <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" placeholder="11 dígitos" value={createClinica.ruc} onChange={(e) => setCreateClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                      </label>
                      <label className="grid gap-2 text-sm md:col-span-2">
                        <span className="text-[var(--ui-muted)]">Dirección</span>
                        <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" placeholder="Dirección completa" value={createClinica.direccion} onChange={(e) => setCreateClinica((p) => ({ ...p, direccion: e.target.value }))} />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[var(--ui-muted)]">Teléfono</span>
                        <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" placeholder="Solo números" value={createClinica.telefono} onChange={(e) => setCreateClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-[var(--ui-muted)]">Estado inicial</span>
                        <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" value={createClinica.estado} onChange={(e) => setCreateClinica((p) => ({ ...p, estado: e.target.value as 'ACTIVA' | 'INACTIVA' }))}>
                          <option value="ACTIVA">ACTIVA</option>
                          <option value="INACTIVA">INACTIVA</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm md:col-span-2">
                        <span className="text-[var(--ui-muted)]">Tipo de negocio</span>
                        <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" value={createClinica.tipo_negocio_id} onChange={(e) => setCreateClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                          <option value="">Selecciona un tipo</option>
                          {tipos.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </Surface>

                  <div className="space-y-6">
                    <Surface eyebrow="Suscripción" title="Configuración inicial" description="Puedes dejar trial automático o asignar un plan desde el inicio.">
                      <div className="grid gap-4">
                        <label className="grid gap-2 text-sm">
                          <span className="text-[var(--ui-muted)]">Plan inicial</span>
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3" value={createClinica.plan_id} onChange={(e) => setCreateClinica((p) => ({ ...p, plan_id: e.target.value }))}>
                            <option value="">Solo trial automático</option>
                            {availableLicensePlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.nombre}</option>
                            ))}
                          </select>
                        </label>
                        <div className="grid gap-4 md:grid-cols-1">
                          <div className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-muted)]">
                            <p className="font-semibold text-[var(--ui-foreground)]">Estado automático</p>
                            <p className="mt-1">Si no seleccionas plan, la clínica entra en <strong>TRIAL</strong> automáticamente.</p>
                            <p className="mt-1">Si seleccionas Basic, Pro o Enterprise, la licencia se activa automáticamente como <strong>ACTIVA</strong>.</p>
                          </div>
                        </div>
                      </div>
                    </Surface>

                    <Surface eyebrow="Acciones" title="Confirmación" description="Guarda la clínica o limpia los campos para empezar de nuevo.">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <button type="button" onClick={handleCreateClinica} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Crear clínica</button>
                        <button type="button" onClick={resetCreateClinicaForm} className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]">Limpiar campos</button>
                        <button type="button" onClick={() => setClinicaView('list')} className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]">Cancelar</button>
                      </div>
                    </Surface>
                  </div>
                </section>
              </>
            )}

            {/* ====== CLINICAS — DETALLE ====== */}
            {section === 'clinicas' && clinicaView === 'detail' && selectedClinica && (
              <>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setClinicaView('list')}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-semibold text-[var(--ui-foreground)] hover:bg-[var(--ui-surface-strong)]"
                  >
                    <FiArrowLeft size={16} /> Volver al listado
                  </button>
                  <div>
                    <p className="text-xs text-[var(--ui-muted)]">Detalle de clínica</p>
                    <p className="font-semibold text-[var(--ui-foreground)]">{selectedClinica.nombre}</p>
                  </div>
                </div>

                <section className="grid gap-6">
                  <Surface
                    eyebrow="Clínica"
                    title="Datos generales de la clínica"
                    description="Los datos editables están visibles en el mismo bloque y solo se habilitan cuando entras en modo edición."
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        {!isEditingClinica ? (
                          <button
                            type="button"
                            onClick={() => setIsEditingClinica(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            <FiEdit2 size={14} /> Editar
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleUpdateClinica}
                              className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white"
                            >
                              <FiCheckCircle size={14} /> Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditClinica({
                                  nombre: selectedClinica.nombre || '',
                                  ruc: selectedClinica.ruc || '',
                                  direccion: selectedClinica.direccion || '',
                                  telefono: selectedClinica.telefono || '',
                                  tipo_negocio_id: selectedClinica.tipo_negocio_id || '',
                                  estado: selectedClinica.estado || 'ACTIVA'
                                });
                                setIsEditingClinica(false);
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-semibold text-[var(--ui-foreground)]"
                            >
                              <FiX size={14} /> Cancelar
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleClinicaLifecycle(selectedClinica.estado === 'ACTIVA' ? 'desactivar' : 'reactivar')}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${selectedClinica.estado === 'ACTIVA' ? 'bg-[var(--ui-danger)]' : 'bg-emerald-600'}`}
                        >
                          <FiTrash2 size={14} />
                          {selectedClinica.estado === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Nombre</span>
                          <input disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.nombre} onChange={(e) => setEditClinica((p) => ({ ...p, nombre: e.target.value }))} />
                        </label>
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">RUC</span>
                          <input disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.ruc} onChange={(e) => setEditClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                        </label>
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Estado clínica</span>
                          <select disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.estado} onChange={(e) => setEditClinica((p) => ({ ...p, estado: e.target.value as 'ACTIVA' | 'INACTIVA' }))}>
                            <option value="ACTIVA">ACTIVA</option>
                            <option value="INACTIVA">INACTIVA</option>
                          </select>
                        </label>
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 md:col-span-2 xl:col-span-1 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Dirección</span>
                          <input disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.direccion} onChange={(e) => setEditClinica((p) => ({ ...p, direccion: e.target.value }))} />
                        </label>
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Teléfono</span>
                          <input disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.telefono} onChange={(e) => setEditClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                        </label>
                        <label className={`grid gap-2 rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <span className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Tipo de negocio</span>
                          <select disabled={!isEditingClinica} className={`rounded-[12px] px-3 py-2 text-sm text-[var(--ui-foreground)] ${isEditingClinica ? 'border border-[var(--ui-border)] bg-white' : 'border border-transparent bg-transparent p-0 shadow-none'}`} value={editClinica.tipo_negocio_id} onChange={(e) => setEditClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                            <option value="">Tipo de negocio</option>
                            {tipos.map((tipo) => (
                              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                          </select>
                        </label>
                        <div className={`rounded-[16px] border px-4 py-3 md:col-span-2 xl:col-span-1 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Suscripción vigente</p>
                          <p className="mt-2 font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.plan_nombre || selectedSuscripcion?.plan_codigo || 'Sin plan activo'}</p>
                          <p className="mt-1 text-xs text-[var(--ui-muted)]">Estado: {selectedSuscripcion?.suscripcion_estado || 'Sin estado'}</p>
                          <p className="mt-1 text-xs text-[var(--ui-muted)]">Vence: {formatDate(selectedSuscripcion?.periodo_actual_fin)}</p>
                        </div>
                        <div className={`rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Usuarios activos</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ui-foreground)]">{usuariosPorClinica.length}</p>
                        </div>
                        <div className={`rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Límite del plan</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.max_usuarios ?? selectedPlan?.max_usuarios ?? 'Ilimitado'}</p>
                        </div>
                        <div className={`rounded-[16px] border px-4 py-3 ${isEditingClinica ? 'border-[var(--ui-border)] bg-white shadow-sm' : 'border-slate-200 bg-slate-100/80'}`}>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Storage (GB)</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.max_storage_gb ?? selectedPlan?.max_storage_gb ?? 'Ilimitado'}</p>
                        </div>
                      </div>

                      <div className={`rounded-[16px] border px-4 py-3 text-sm ${isEditingClinica ? 'border-[var(--ui-border)] bg-white text-[var(--ui-foreground)]' : 'border-slate-200 bg-slate-100/80 text-[var(--ui-muted)]'}`}>
                        {isEditingClinica
                          ? 'Modo edición activo: los campos editables se muestran en blanco para diferenciarlos claramente.'
                          : 'Vista de solo lectura: los datos aparecen en un tono gris suave hasta que presiones Editar.'}
                      </div>
                    </div>
                  </Surface>
                </section>

                <Surface eyebrow="Licencias" title="Plan e historial de esta clínica" description="En la mitad izquierda ves el plan actual y todo lo que puedes hacer con él; en la derecha se mantiene el historial completo.">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                      <div className="flex h-full flex-col gap-4">
                        <div className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-5 py-5 text-center">
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Plan actual</p>
                          <p className="mt-3 text-2xl font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.plan_nombre || selectedSuscripcion?.plan_codigo || 'Sin plan activo'}</p>
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            <span className="rounded-full bg-[var(--ui-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ui-accent)]">
                              {selectedSuscripcion?.plan_codigo || 'SIN_PLAN'}
                            </span>
                            <span className="rounded-full bg-[var(--ui-surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--ui-foreground)]">
                              {selectedSuscripcion?.suscripcion_estado || 'Sin estado'}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">
                            <div className="rounded-[14px] bg-[var(--ui-surface)] px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Vence</p>
                              <p className="mt-1 text-sm font-semibold text-[var(--ui-foreground)]">{formatDate(selectedSuscripcion?.periodo_actual_fin)}</p>
                            </div>
                            <div className="rounded-[14px] bg-[var(--ui-surface)] px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Precio mensual</p>
                              <p className="mt-1 text-sm font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.precio_mensual != null ? `${selectedSuscripcion?.moneda || 'PEN'} ${selectedSuscripcion.precio_mensual}` : 'No definido'}</p>
                            </div>
                            <div className="rounded-[14px] bg-[var(--ui-surface)] px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Usuarios</p>
                              <p className="mt-1 text-sm font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.max_usuarios ?? selectedPlan?.max_usuarios ?? 'Ilimitado'}</p>
                            </div>
                            <div className="rounded-[14px] bg-[var(--ui-surface)] px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Storage</p>
                              <p className="mt-1 text-sm font-semibold text-[var(--ui-foreground)]">{selectedSuscripcion?.max_storage_gb ?? selectedPlan?.max_storage_gb ?? 'Ilimitado'} GB</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingPlan(true);
                                setAssignPlanForm((prev) => ({ ...prev, plan_id: selectedSuscripcion?.plan_id || prev.plan_id }));
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white"
                            >
                              <FiEdit2 size={14} /> Modificar plan
                            </button>
                            <button
                              type="button"
                              onClick={handleRevokeCurrentPlan}
                              disabled={!selectedSuscripcion?.plan_id}
                              className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-[16px] border border-rose-200 bg-rose-50 text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Eliminar plan actual"
                              title="Eliminar plan actual"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>

                          {isEditingPlan ? (
                            <div className="grid gap-3 rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-4">
                              <label className="grid gap-2 text-sm">
                                <span className="text-[var(--ui-muted)]">Nuevo plan o ajuste</span>
                                <select className="rounded-[16px] border border-[var(--ui-border)] bg-white px-4 py-3 text-sm" value={assignPlanForm.plan_id} onChange={(e) => setAssignPlanForm((p) => ({ ...p, plan_id: e.target.value }))}>
                                  <option value="">Selecciona plan</option>
                                  {availableLicensePlans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>{plan.nombre} ({plan.codigo})</option>
                                  ))}
                                </select>
                              </label>

                              <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3 text-xs text-[var(--ui-muted)]">
                                <p><span className="font-semibold text-[var(--ui-foreground)]">Flujo guiado</span>: eliges el plan y guardas el ajuste con un solo botón.</p>
                                <p className="mt-1">El <strong>TRIAL</strong> dura 14 días exactos y los demás planes se activan por 1 mes calendario exacto.</p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={handleAssignPlan} className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">
                                  <FiCheckCircle size={14} /> Guardar ajuste
                                </button>
                                <button type="button" onClick={() => setIsEditingPlan(false)} className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]">
                                  <FiX size={14} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-xs text-[var(--ui-muted)]">
                              Usa <strong className="text-[var(--ui-foreground)]">Modificar plan</strong> para cambiar o ajustar la licencia, y el botón de tacho para eliminar el plan actual.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                      <p className="text-sm font-semibold text-[var(--ui-foreground)]">Historial de licenciamiento / facturación</p>
                      {historialClinica.length === 0 ? (
                        <p className="mt-3 text-sm text-[var(--ui-muted)]">Sin historial de suscripciones o licencias registradas todavía.</p>
                      ) : (
                        <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                          {historialClinica.map((item) => (
                            <article key={item.id} className="rounded-[16px] bg-[var(--ui-card)] px-4 py-3">
                              <p className="font-semibold text-[var(--ui-foreground)]">{item.plan_nombre || item.plan_codigo || 'Plan desconocido'}</p>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--ui-muted)]">
                                <span>Estado: {item.estado}</span>
                                <span>Inicio: {formatDate(item.periodo_actual_inicio)}</span>
                                <span>Fin: {formatDate(item.periodo_actual_fin)}</span>
                                <span>Registro: {formatDate(item.created_at)}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Surface>

                <Surface
                  eyebrow="Usuarios"
                  title={`Usuarios y gestión de ${selectedClinica.nombre}`}
                  description="La lista queda visible siempre y el bloque lateral cambia solo cuando agregas o editas un usuario."
                  action={
                    <button
                      type="button"
                      onClick={startCreateUser}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      <FiPlus size={14} /> Nuevo usuario
                    </button>
                  }
                >
                  <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--ui-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ui-accent)]">Total usuarios: {usuariosPorClinica.length}</span>
                        <span className="rounded-full bg-[var(--ui-surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--ui-foreground)]">Admins: {adminsPorClinica.length}</span>
                      </div>

                      {usuariosPorClinica.length === 0 ? (
                        <p className="text-sm text-[var(--ui-muted)]">No hay usuarios asociados a esta clínica.</p>
                      ) : (
                        <div className="space-y-3">
                          {usuariosPorClinica.map((user) => {
                            const persona = user.persona_id ? personasById[user.persona_id] : null;
                            const nombreVisible = getPersonaNombre({
                              nombres: user.nombres || persona?.nombres,
                              apellido_paterno: user.apellido_paterno || persona?.apellido_paterno,
                              apellido_materno: user.apellido_materno || persona?.apellido_materno
                            });
                            const dniVisible = user.dni || persona?.dni || 'Sin DNI';

                            return (
                              <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--ui-card)] px-4 py-3">
                                <div>
                                  <p className="font-semibold text-[var(--ui-foreground)]">{nombreVisible}</p>
                                  <p className="text-xs text-[var(--ui-muted)]">DNI: {dniVisible} • {user.email}</p>
                                  <p className="mt-1 text-xs text-[var(--ui-muted)]">Rol: {user.rol} • Estado: {user.estado}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => startEditUser(user)} className="rounded-full bg-[var(--ui-surface-strong)] p-2" aria-label="Editar usuario">
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUsuario(user)}
                                    className={`rounded-full p-2 text-white ${user.estado === 'ACTIVO' ? 'bg-[var(--ui-danger)]' : 'bg-emerald-600'}`}
                                    aria-label={user.estado === 'ACTIVO' ? 'Desactivar usuario' : 'Reactivar usuario'}
                                    title={user.estado === 'ACTIVO' ? 'Desactivar usuario' : 'Reactivar usuario'}
                                  >
                                    <FiUser size={14} />
                                  </button>
                                  {user.rol !== 'SUPERADMIN' && (
                                    <button type="button" onClick={() => handleDeleteUser(user)} className="rounded-full bg-[var(--ui-danger)] p-2 text-white" aria-label="Eliminar usuario">
                                      <FiTrash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                      {userEditorMode === 'edit' && editingUser ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ui-foreground)]">Editar usuario</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(null);
                                setUserEditorMode(null);
                              }}
                              className="rounded-full bg-[var(--ui-card)] p-2"
                              aria-label="Cerrar edición"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3">
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                              <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editingUser.dni} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, dni: e.target.value.replace(/\D/g, '').slice(0, 8) } : prev))} placeholder="DNI" />
                              <button type="button" onClick={handleSearchEditPersona} className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]">
                                Buscar DNI
                              </button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)]" value={editingUser.nombres} placeholder="Nombres" />
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)]" value={editingUser.apellido_paterno} placeholder="Apellido paterno" />
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)] md:col-span-2" value={editingUser.apellido_materno} placeholder="Apellido materno" />
                            </div>
                            <p className="text-xs text-[var(--ui-muted)]">Los datos de persona se obtienen por DNI y aquí solo se muestran en modo lectura.</p>
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editingUser.email} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : prev))} placeholder="Email" />
                            <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editingUser.rol} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, rol: e.target.value as Usuario['rol'] } : prev))} disabled={editingUser.rol === 'SUPERADMIN'}>
                              <option value="ADMIN">ADMIN</option>
                              <option value="DOCTOR">DOCTOR</option>
                              <option value="STAFF">STAFF</option>
                              <option value="SUPERADMIN">SUPERADMIN</option>
                            </select>
                            <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editingUser.estado} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, estado: e.target.value as 'ACTIVO' | 'INACTIVO' } : prev))}>
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="INACTIVO">INACTIVO</option>
                            </select>
                            <input type="password" className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editingUser.password} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, password: e.target.value } : prev))} placeholder="Nueva contraseña (opcional)" />
                            <button type="button" onClick={handleSaveUser} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Guardar cambios del usuario</button>
                          </div>
                        </>
                      ) : userEditorMode === 'create' ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ui-foreground)]">Nuevo usuario para la clínica</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCreatePersonaPreview(null);
                                setUserEditorMode(null);
                              }}
                              className="rounded-full bg-[var(--ui-card)] p-2"
                              aria-label="Cerrar creación"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3">
                            <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={adminForm.rol} onChange={(e) => setAdminForm((p) => ({ ...p, rol: e.target.value as 'ADMIN' | 'DOCTOR' | 'STAFF' }))}>
                              <option value="ADMIN">ADMIN</option>
                              <option value="DOCTOR">DOCTOR</option>
                              <option value="STAFF">STAFF</option>
                            </select>
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                              <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="DNI" value={adminForm.dni} onChange={(e) => {
                                const nextDni = e.target.value.replace(/\D/g, '').slice(0, 8);
                                setCreatePersonaPreview(null);
                                setAdminForm((p) => ({ ...p, dni: nextDni }));
                              }} />
                              <button type="button" onClick={handleSearchCreatePersona} className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]">
                                Buscar DNI
                              </button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)]" value={createPersonaPreview?.nombres || ''} placeholder="Nombres" />
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)]" value={createPersonaPreview?.apellido_paterno || ''} placeholder="Apellido paterno" />
                              <input readOnly className="rounded-[16px] border border-[var(--ui-border)] bg-slate-100 px-4 py-3 text-sm text-[var(--ui-foreground)] md:col-span-2" value={createPersonaPreview?.apellido_materno || ''} placeholder="Apellido materno" />
                            </div>
                            <p className="text-xs text-[var(--ui-muted)]">Los datos de persona se completan con la búsqueda por DNI y no se editan desde aquí.</p>
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Email" value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" type="password" placeholder="Contraseña" value={adminForm.password} onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))} />
                            <button type="button" onClick={handleCreateAdmin} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Crear {adminForm.rol}</button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[16px] border border-dashed border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-6 text-sm text-[var(--ui-muted)]">
                          Selecciona un usuario de la lista para editarlo o usa el botón <strong className="text-[var(--ui-foreground)]">Nuevo usuario</strong> para añadir un ADMIN, DOCTOR o STAFF.
                        </div>
                      )}
                    </div>
                  </div>
                </Surface>
              </>
            )}

            {/* ====== SUSCRIPCIONES ====== */}
            {section === 'suscripciones' && (
              <section className="grid gap-6">
                <Surface eyebrow="Suscripciones" title="Resumen breve por plan" description="Aquí ves cada suscripción/plan con un indicador rápido de las clínicas que la tienen activa.">
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    {subscriptionPlanSummaries.map(({ plan, totalClinicas, clinicaNames }) => (
                      <article key={plan.id} className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--ui-foreground)]">{plan.nombre}</p>
                            <p className="text-xs text-[var(--ui-muted)]">{plan.codigo}</p>
                          </div>
                          <span className="rounded-full bg-[var(--ui-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ui-accent)]">
                            {totalClinicas} clínicas
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-[var(--ui-muted)]">
                          {totalClinicas > 0 ? 'Clínicas activas con este plan:' : 'Actualmente no hay clínicas activas con esta suscripción.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {clinicaNames.length > 0 ? clinicaNames.map((name) => (
                            <span key={`${plan.id}-${name}`} className="rounded-full bg-[var(--ui-card)] px-3 py-1 text-xs font-semibold text-[var(--ui-foreground)]">
                              {name}
                            </span>
                          )) : (
                            <span className="text-xs text-[var(--ui-muted)]">Sin clínicas activas</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </Surface>

                <Surface
                  eyebrow="Planes"
                  title="Crear, modificar o eliminar planes"
                  description="El bloque cambia completo entre listado y edición, y ya no se muestra el historial general."
                  action={
                    <div className="flex h-10 w-10 items-center justify-center">
                      {!showPlanEditor ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlanId(null);
                            setPlanForm(INITIAL_PLAN_FORM);
                            setShowPlanEditor(true);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ui-accent)] text-white"
                          aria-label="Agregar plan"
                          title="Nuevo plan"
                        >
                          <FiPlus size={18} />
                        </button>
                      ) : (
                        <span className="block h-10 w-10" aria-hidden="true" />
                      )}
                    </div>
                  }
                >
                  {!showPlanEditor ? (
                    <div className="flex flex-col space-y-3">
                      <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-muted)]">
                        {planes.length} planes registrados. Usa el botón <span className="font-semibold text-[var(--ui-foreground)]">+</span> para crear uno nuevo.
                      </div>

                      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
                        {planes.length === 0 ? (
                          <div className="rounded-[20px] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-sm text-[var(--ui-muted)]">
                            Aún no hay planes registrados. Usa el botón <span className="font-semibold text-[var(--ui-foreground)]">+</span> para crear el primero.
                          </div>
                        ) : (
                          subscriptionPlanSummaries.map(({ plan, totalClinicas, clinicaNames }) => (
                            <article key={plan.id} className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-[var(--ui-foreground)]">{plan.nombre}</p>
                                  <p className="text-xs text-[var(--ui-muted)]">{plan.codigo}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${plan.estado === 'ACTIVO' ? 'bg-emerald-500/14 text-[var(--ui-success)]' : 'bg-rose-500/14 text-[var(--ui-danger)]'}`}>
                                  {plan.estado}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Precio mensual</p>
                                  <p className="mt-1 text-sm text-[var(--ui-foreground)]">{plan.precio_mensual != null ? `${plan.moneda || 'PEN'} ${plan.precio_mensual}` : 'No definido'}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Trial</p>
                                  <p className="mt-1 text-sm text-[var(--ui-foreground)]">{plan.dias_trial || 0} días</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ui-muted)]">Clínicas activas</p>
                                  <p className="mt-1 text-sm text-[var(--ui-foreground)]">{totalClinicas}</p>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {clinicaNames.length > 0 ? clinicaNames.map((name) => (
                                  <span key={`${plan.id}-${name}`} className="rounded-full bg-[var(--ui-card)] px-3 py-1 text-xs font-semibold text-[var(--ui-foreground)]">
                                    {name}
                                  </span>
                                )) : (
                                  <span className="text-xs text-[var(--ui-muted)]">Sin clínicas activas con este plan</span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <button type="button" onClick={() => handleEditPlan(plan)} className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-card)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-foreground)]">
                                  <FiEdit2 size={12} /> Editar
                                </button>
                                <button type="button" onClick={() => handleDeletePlan(plan)} className="inline-flex items-center gap-1 rounded-full bg-rose-500/14 px-3 py-1.5 text-xs font-semibold text-[var(--ui-danger)]">
                                  <FiTrash2 size={12} /> Eliminar
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ui-foreground)]">{editingPlanId ? 'Editar plan seleccionado' : 'Nuevo plan'}</p>
                          <p className="mt-1 text-xs text-[var(--ui-muted)]">Completa los campos para {editingPlanId ? 'actualizar' : 'crear'} el plan.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlanId(null);
                            setPlanForm(INITIAL_PLAN_FORM);
                            setShowPlanEditor(false);
                          }}
                          className="rounded-full bg-[var(--ui-card)] p-2"
                          aria-label="Cancelar edición"
                        >
                          <FiX size={14} />
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Código del plan</label>
                          <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Ej: BASIC_CLINICA" value={planForm.codigo} onChange={(e) => setPlanForm((p) => ({ ...p, codigo: e.target.value }))} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Nombre del plan</label>
                          <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Ej: Plan Básico" value={planForm.nombre} onChange={(e) => setPlanForm((p) => ({ ...p, nombre: e.target.value }))} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Descripción</label>
                          <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Descripción del plan" value={planForm.descripcion} onChange={(e) => setPlanForm((p) => ({ ...p, descripcion: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Precio mensual</label>
                            <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="0" value={planForm.precio_mensual} onChange={(e) => setPlanForm((p) => ({ ...p, precio_mensual: e.target.value }))} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Precio anual</label>
                            <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="0" value={planForm.precio_anual} onChange={(e) => setPlanForm((p) => ({ ...p, precio_anual: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Máx. usuarios</label>
                            <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Ilimitado si vacío" value={planForm.max_usuarios} onChange={(e) => setPlanForm((p) => ({ ...p, max_usuarios: e.target.value.replace(/[^\d]/g, '') }))} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Días trial</label>
                            <input className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="0" value={planForm.dias_trial} onChange={(e) => setPlanForm((p) => ({ ...p, dias_trial: e.target.value.replace(/[^\d]/g, '') }))} />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)]">Estado</label>
                          <select className="w-full rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={planForm.estado} onChange={(e) => setPlanForm((p) => ({ ...p, estado: e.target.value as 'ACTIVO' | 'INACTIVO' }))}>
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button type="button" onClick={handleSavePlan} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">
                            {editingPlanId ? 'Guardar cambios' : 'Crear plan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlanId(null);
                              setPlanForm(INITIAL_PLAN_FORM);
                              setShowPlanEditor(false);
                            }}
                            className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Surface>
              </section>
            )}

            {/* ====== USUARIOS ====== */}
            {section === 'usuarios' && (
              <Surface eyebrow="Usuarios" title="Gestión global de usuarios" description="Puedes ver y editar todos los usuarios de todas las clínicas, incluyendo activación/desactivación y eliminación.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm" value={selectedUserRole} onChange={(e) => setSelectedUserRole(e.target.value as typeof selectedUserRole)}>
                    <option value="ALL">Todos los roles</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                  <select className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm" value={selectedUserClinicaId} onChange={(e) => setSelectedUserClinicaId(e.target.value as typeof selectedUserClinicaId)}>
                    <option value="ALL">Todas las clínicas</option>
                    {clinicas.map((clinica) => (
                      <option key={clinica.id} value={clinica.id}>{clinica.nombre}</option>
                    ))}
                  </select>
                  <div className="rounded-[14px] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-muted)]">Total filtrado: <strong className="text-[var(--ui-foreground)]">{filteredUsers.length}</strong></div>
                  <div className="rounded-[14px] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-muted)]">Activos: <strong className="text-[var(--ui-foreground)]">{filteredUsers.filter((u) => u.estado === 'ACTIVO').length}</strong></div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--ui-surface-strong)] text-left text-[var(--ui-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Rol</th>
                        <th className="px-4 py-3 font-semibold">Clínica</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3 font-semibold">Último login</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const clinica = clinicas.find((c) => c.id === user.clinica_id);
                        const isEditing = editingUser?.id === user.id;

                        if (isEditing && editingUser) {
                          return (
                            <tr key={user.id} className="border-t border-[var(--ui-border)] bg-[var(--ui-accent-soft)]">
                              <td colSpan={6} className="px-4 py-4">
                                <div className="grid gap-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[var(--ui-foreground)]">Editando usuario: {user.email}</p>
                                    <button type="button" onClick={() => setEditingUser(null)} className="rounded-full bg-[var(--ui-card)] p-2" aria-label="Cancelar"><FiX size={14} /></button>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-4">
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--ui-muted)]">Email</label>
                                      <input className="w-full rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm" value={editingUser.email} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : prev))} />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--ui-muted)]">Rol</label>
                                      <select className="w-full rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm" value={editingUser.rol} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, rol: e.target.value as Usuario['rol'] } : prev))} disabled={editingUser.rol === 'SUPERADMIN'}>
                                        <option value="SUPERADMIN">SUPERADMIN</option>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="DOCTOR">DOCTOR</option>
                                        <option value="STAFF">STAFF</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--ui-muted)]">Clínica</label>
                                      <select className="w-full rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm" value={editingUser.clinica_id} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, clinica_id: e.target.value } : prev))} disabled={editingUser.rol === 'SUPERADMIN'}>
                                        <option value="">Sin clínica</option>
                                        {clinicas.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--ui-muted)]">Estado</label>
                                      <select className="w-full rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm" value={editingUser.estado} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, estado: e.target.value as 'ACTIVO' | 'INACTIVO' } : prev))}>
                                        <option value="ACTIVO">ACTIVO</option>
                                        <option value="INACTIVO">INACTIVO</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--ui-muted)]">Nueva contraseña (opcional)</label>
                                      <input type="password" className="w-full rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-3 py-2 text-sm" value={editingUser.password} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, password: e.target.value } : prev))} placeholder="Dejar vacío para no cambiar" />
                                    </div>
                                    <div className="flex items-end gap-2">
                                      <button type="button" onClick={handleSaveUser} className="flex-1 rounded-[14px] bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white">Guardar cambios</button>
                                      <button type="button" onClick={() => setEditingUser(null)} className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-2 text-sm font-semibold">Cancelar</button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={user.id} className="border-t border-[var(--ui-border)]">
                            <td className="px-4 py-3">
                              <p className="font-semibold">{user.email}</p>
                              <p className="text-xs text-[var(--ui-muted)]">ID: {user.id.slice(0, 8)}</p>
                            </td>
                            <td className="px-4 py-3">{user.rol}</td>
                            <td className="px-4 py-3 text-[var(--ui-muted)]">{clinica?.nombre || 'Sin clínica'}</td>
                            <td className="px-4 py-3">{user.estado}</td>
                            <td className="px-4 py-3 text-[var(--ui-muted)]">{formatDate(user.ultimo_login_at)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => startEditUser(user)} className="rounded-full bg-[var(--ui-surface-strong)] p-2" aria-label="Editar usuario" title="Editar"><FiEdit2 size={14} /></button>
                                <button type="button" onClick={() => setViewingUserSessions(viewingUserSessions === user.id ? null : user.id)} className="rounded-full bg-[var(--ui-surface-strong)] p-2" aria-label="Ver sesiones" title="Ver sesiones"><FiClock size={14} /></button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUsuario(user)}
                                  className={`rounded-full p-2 text-white ${user.estado === 'ACTIVO' ? 'bg-[var(--ui-danger)]' : 'bg-emerald-600'}`}
                                  aria-label={user.estado === 'ACTIVO' ? 'Desactivar usuario' : 'Reactivar usuario'}
                                  title={user.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
                                ><FiUser size={14} /></button>
                                {user.id !== session?.id && (
                                  <button type="button" onClick={() => handleDeleteUser(user)} className="rounded-full bg-[var(--ui-danger)] p-2 text-white" aria-label="Eliminar usuario" title="Eliminar"><FiTrash2 size={14} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Panel de sesiones del usuario seleccionado */}
                {viewingUserSessions && (
                  <div className="mt-4 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ui-foreground)]">Sesiones activas del usuario</p>
                        <p className="text-xs text-[var(--ui-muted)]">{usuarios.find((u) => u.id === viewingUserSessions)?.email}</p>
                      </div>
                      <button type="button" onClick={() => setViewingUserSessions(null)} className="rounded-full bg-[var(--ui-card)] p-2" aria-label="Cerrar"><FiX size={14} /></button>
                    </div>
                    {userSessions.length === 0 ? (
                      <p className="mt-3 text-sm text-[var(--ui-muted)]">Este usuario no tiene sesiones activas.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {userSessions.map((sess) => (
                          <div key={sess.id} className="flex items-center justify-between rounded-[14px] bg-[var(--ui-card)] px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--ui-foreground)]">Sesión ID: {sess.id.slice(0, 8)}...</p>
                              <p className="text-xs text-[var(--ui-muted)]">Creada: {formatDate(sess.created_at)} • Expira: {formatDate(sess.expires_at)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(sess.id)}
                              className="rounded-full bg-[var(--ui-danger)] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Revocar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Surface>
            )}
          </main>
        </div>
      </div>

      <style jsx global>{`
        .superadmin-shell button:not(:disabled) {
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .superadmin-shell button:not(:disabled):hover {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 14px 26px -18px rgba(15, 23, 42, 0.75);
        }

        .superadmin-shell button:focus-visible {
          outline: 2px solid var(--ui-accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

