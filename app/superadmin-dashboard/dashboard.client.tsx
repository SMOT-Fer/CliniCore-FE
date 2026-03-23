'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiAlertCircle,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiHome,
  FiLayers,
  FiLogOut,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX
} from 'react-icons/fi';
import ConsoleThemeToggle from '../components/console-theme-toggle';

type SectionKey = 'clinicas' | 'suscripciones' | 'usuarios';

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

type SuscripcionVigente = {
  suscripcion_id: string;
  clinica_id: string;
  suscripcion_estado: 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA';
  plan_id: string;
  plan_codigo?: string;
  plan_nombre?: string;
  periodo_actual_fin?: string;
  trial_ends_at?: string;
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

type UserEditState = {
  id: string;
  email: string;
  rol: Usuario['rol'];
  estado: 'ACTIVO' | 'INACTIVO';
  clinica_id: string;
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

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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
  icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[30px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
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
  const [section, setSection] = useState<SectionKey>('clinicas');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tipos, setTipos] = useState<TipoNegocio[]>([]);
  const [suscripciones, setSuscripciones] = useState<SuscripcionVigente[]>([]);
  const [historialClinica, setHistorialClinica] = useState<SuscripcionHistorial[]>([]);

  const [selectedClinicaId, setSelectedClinicaId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState<'ALL' | Usuario['rol']>('ALL');
  const [selectedUserClinicaId, setSelectedUserClinicaId] = useState<'ALL' | string>('ALL');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [createClinica, setCreateClinica] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    tipo_negocio_id: ''
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
    password: ''
  });

  const [assignPlanForm, setAssignPlanForm] = useState({
    clinica_id: '',
    plan_id: '',
    estado: 'TRIAL' as 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA',
    duracion_dias: '14'
  });

  const [planForm, setPlanForm] = useState<PlanFormState>(INITIAL_PLAN_FORM);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserEditState | null>(null);

  const selectedClinica = useMemo(
    () => clinicas.find((c) => c.id === selectedClinicaId) || null,
    [clinicas, selectedClinicaId]
  );

  const selectedSuscripcion = useMemo(
    () => suscripciones.find((s) => s.clinica_id === selectedClinicaId) || null,
    [suscripciones, selectedClinicaId]
  );

  const usuariosPorClinica = useMemo(() => {
    if (!selectedClinicaId) return [];
    return usuarios.filter((u) => u.clinica_id === selectedClinicaId);
  }, [usuarios, selectedClinicaId]);

  const adminsPorClinica = useMemo(
    () => usuariosPorClinica.filter((u) => u.rol === 'ADMIN'),
    [usuariosPorClinica]
  );

  const totalClinicasActivas = useMemo(
    () => clinicas.filter((clinica) => clinica.estado === 'ACTIVA').length,
    [clinicas]
  );

  const totalUsuariosActivos = useMemo(
    () => usuarios.filter((usuario) => usuario.estado === 'ACTIVO').length,
    [usuarios]
  );

  const totalTrials = useMemo(
    () => suscripciones.filter((suscripcion) => suscripcion.suscripcion_estado === 'TRIAL').length,
    [suscripciones]
  );

  const statsByEstado = useMemo(() => {
    const estados: Array<SuscripcionVigente['suscripcion_estado']> = ['TRIAL', 'ACTIVA', 'PAST_DUE', 'SUSPENDIDA', 'CANCELADA', 'EXPIRADA'];
    const base = estados.map((estado) => ({
      estado,
      total: suscripciones.filter((s) => s.suscripcion_estado === estado).length
    }));
    const max = Math.max(1, ...base.map((row) => row.total));

    return base.map((row) => ({
      ...row,
      percent: Math.max(8, Math.round((row.total / max) * 100))
    }));
  }, [suscripciones]);

  const filteredUsers = useMemo(() => {
    return usuarios.filter((usuario) => {
      const passRole = selectedUserRole === 'ALL' || usuario.rol === selectedUserRole;
      const passClinica = selectedUserClinicaId === 'ALL' || usuario.clinica_id === selectedUserClinicaId;
      return passRole && passClinica;
    });
  }, [usuarios, selectedUserClinicaId, selectedUserRole]);

  const notify = useCallback((text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  }, []);

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
    const [sessionRes, clinicasRes, usuariosRes, planesRes, tiposRes, vigentesRes] = await Promise.all([
      fetch('/api/backend/usuarios/me', { credentials: 'include' }),
      fetch('/api/backend/empresas', { credentials: 'include' }),
      fetch('/api/backend/usuarios', { credentials: 'include' }),
      fetch('/api/backend/platform/planes?soloActivos=false', { credentials: 'include' }),
      fetch('/api/backend/tipos-negocio', { credentials: 'include' }),
      fetch('/api/backend/platform/suscripciones/vigentes', { credentials: 'include' })
    ]);

    if (!sessionRes.ok) throw new Error('Sesion invalida');
    const sessionJson = await sessionRes.json();
    if (!sessionJson?.data || sessionJson.data.rol !== 'SUPERADMIN') throw new Error('No autorizado');

    const clinicasJson = clinicasRes.ok ? await clinicasRes.json() : { data: [] };
    const usuariosJson = usuariosRes.ok ? await usuariosRes.json() : { data: [] };
    const planesJson = planesRes.ok ? await planesRes.json() : { data: [] };
    const tiposJson = tiposRes.ok ? await tiposRes.json() : { data: [] };
    const vigentesJson = vigentesRes.ok ? await vigentesRes.json() : { data: [] };

    const clinicasData = Array.isArray(clinicasJson.data) ? clinicasJson.data : [];
    setSession(sessionJson.data);
    setClinicas(clinicasData);
    setUsuarios(Array.isArray(usuariosJson.data) ? usuariosJson.data : []);
    setPlanes(Array.isArray(planesJson.data) ? planesJson.data : []);
    setTipos(Array.isArray(tiposJson.data) ? tiposJson.data : []);
    setSuscripciones(Array.isArray(vigentesJson.data) ? vigentesJson.data : []);

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
        console.error(error);
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
    loadHistorialClinica(selectedClinica.id).catch(() => setHistorialClinica([]));
  }, [loadHistorialClinica, selectedClinica]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
      if (selectedClinicaId) {
        await loadHistorialClinica(selectedClinicaId);
      }
    } catch {
      notify('No se pudo refrescar el panel', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAllData, loadHistorialClinica, notify, selectedClinicaId]);

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
          telefono: createClinica.telefono.trim() || undefined
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo crear la clínica');

      notify('Clínica creada con trial inicial de 14 días', 'success');
      setCreateClinica({ nombre: '', ruc: '', direccion: '', telefono: '', tipo_negocio_id: '' });
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al crear clínica', 'error');
    }
  }, [createClinica, notify, refreshData]);

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
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar la clínica');

      notify('Clínica actualizada', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar clínica', 'error');
    }
  }, [editClinica, notify, refreshData, selectedClinicaId]);

  const handleClinicaLifecycle = useCallback(async (action: 'desactivar' | 'reactivar' | 'eliminar') => {
    if (!selectedClinicaId) return;

    const label = action === 'desactivar' ? 'desactivar' : action === 'reactivar' ? 'reactivar' : 'eliminar';
    if (!window.confirm(`¿Deseas ${label} esta clínica?`)) {
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
      if (!res.ok || !payload?.success) throw new Error(payload?.error || `No se pudo ${label} la clínica`);

      notify(`Clínica ${label}da correctamente`, 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : `Error al ${label} clínica`, 'error');
    }
  }, [notify, refreshData, selectedClinicaId]);

  const handleCreateAdmin = useCallback(async () => {
    if (!selectedClinicaId) return;

    if (!adminForm.email.trim() || !adminForm.dni.trim() || !adminForm.password.trim()) {
      notify('Email, DNI y contraseña son obligatorios', 'error');
      return;
    }

    try {
      const personaRes = await fetch(`/api/backend/personas/dni/${encodeURIComponent(adminForm.dni.trim())}`, {
        credentials: 'include'
      });
      const personaPayload = await personaRes.json().catch(() => null);
      if (!personaRes.ok || !personaPayload?.data?.id) {
        throw new Error(personaPayload?.error || 'No se encontró persona por DNI');
      }

      const headers = await getCsrfHeaders();
      const createRes = await fetch('/api/backend/usuarios', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: selectedClinicaId,
          persona_id: personaPayload.data.id,
          email: adminForm.email.trim(),
          password: adminForm.password,
          rol: 'ADMIN',
          estado: 'ACTIVO'
        })
      });

      const createPayload = await createRes.json().catch(() => null);
      if (!createRes.ok || !createPayload?.success) throw new Error(createPayload?.error || 'No se pudo crear admin');

      notify('Admin creado correctamente', 'success');
      setAdminForm({ email: '', dni: '', password: '' });
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al crear admin', 'error');
    }
  }, [adminForm, notify, refreshData, selectedClinicaId]);

  const handleAssignPlan = useCallback(async () => {
    if (!assignPlanForm.clinica_id || !assignPlanForm.plan_id) {
      notify('Selecciona clínica y plan', 'error');
      return;
    }

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/backend/platform/suscripciones/asignar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: assignPlanForm.clinica_id,
          plan_id: assignPlanForm.plan_id,
          estado: assignPlanForm.estado,
          duracion_dias: Number(assignPlanForm.duracion_dias || '14')
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo asignar suscripción');

      notify('Suscripción asignada correctamente', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al asignar suscripción', 'error');
    }
  }, [assignPlanForm, notify, refreshData]);

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
      notify('Código y nombre de plan son obligatorios', 'error');
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

      notify(editingPlanId ? 'Plan actualizado correctamente' : 'Plan creado correctamente', 'success');
      setPlanForm(INITIAL_PLAN_FORM);
      setEditingPlanId(null);
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al guardar plan', 'error');
    }
  }, [editingPlanId, normalizePlanPayload, notify, planForm, refreshData]);

  const handleEditPlan = useCallback((plan: Plan) => {
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
    if (!window.confirm(`¿Deseas eliminar el plan ${plan.nombre}?`)) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/platform/planes/${plan.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo eliminar plan');

      notify(payload?.message || 'Plan procesado correctamente', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al eliminar plan', 'error');
    }
  }, [notify, refreshData]);

  const startEditUser = useCallback((user: Usuario) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      clinica_id: user.clinica_id || '',
      password: ''
    });
  }, []);

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
        estado: editingUser.estado
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

      notify('Usuario actualizado correctamente', 'success');
      setEditingUser(null);
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar usuario', 'error');
    }
  }, [editingUser, notify, refreshData]);

  const handleDeleteUser = useCallback(async (user: Usuario) => {
    if (!window.confirm(`¿Deseas eliminar el usuario ${user.email}?`)) return;

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/usuarios/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo eliminar usuario');

      notify('Usuario eliminado correctamente', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al eliminar usuario', 'error');
    }
  }, [notify, refreshData]);

  const handleToggleUsuario = useCallback(async (user: Usuario) => {
    const endpoint = user.estado === 'ACTIVO' ? 'desactivar' : 'reactivar';
    try {
      const headers = await getCsrfHeaders();
      const res = await fetch(`/api/backend/usuarios/${user.id}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar usuario');

      notify('Usuario actualizado', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar usuario', 'error');
    }
  }, [notify, refreshData]);

  const getSubBadge = useCallback((sub: SuscripcionVigente | null) => {
    if (!sub) return { label: 'Sin suscripción', cls: 'bg-rose-500/14 text-[var(--ui-danger)]' };
    if (sub.suscripcion_estado === 'TRIAL') return { label: 'TRIAL', cls: 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' };
    if (sub.suscripcion_estado === 'ACTIVA') return { label: 'ACTIVA', cls: 'bg-emerald-500/14 text-[var(--ui-success)]' };
    return { label: sub.suscripcion_estado, cls: 'bg-amber-500/14 text-[var(--ui-warning)]' };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--ui-foreground)]">
        Cargando panel SuperAdmin...
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ui-foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-4 space-y-5 rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
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
              <SectionButton active={section === 'clinicas'} icon={<FiHome size={18} />} label="Clínicas" description="Ficha completa, edición y estado." onClick={() => setSection('clinicas')} />
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
        </aside>

        <div className="min-w-0 flex-1">
          <header className="rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ui-muted)]">Panel ejecutivo</p>
                <h2 className="mt-2 text-3xl font-semibold">
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
                <button
                  type="button"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-semibold text-[var(--ui-foreground)] hover:bg-[var(--ui-surface-strong)] disabled:opacity-60"
                >
                  <FiRefreshCw size={16} />
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-92"
                >
                  <FiLogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-6 py-6">
            {message && (
              <div
                className={`rounded-[24px] border px-4 py-3 text-sm ${
                  messageType === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-[var(--ui-success)]'
                    : 'border-rose-500/30 bg-rose-500/10 text-[var(--ui-danger)]'
                }`}
              >
                {message}
              </div>
            )}

            <section className="grid gap-4 xl:grid-cols-4">
              <MetricCard label="Clínicas" value={String(clinicas.length)} hint={`${totalClinicasActivas} activas`} icon={<FiBriefcase size={20} />} />
              <MetricCard label="Usuarios activos" value={String(totalUsuariosActivos)} hint="Accesos habilitados" icon={<FiUsers size={20} />} />
              <MetricCard label="Trials" value={String(totalTrials)} hint="En periodo de evaluación" icon={<FiClock size={20} />} />
              <MetricCard label="Planes" value={String(planes.length)} hint="Incluye activos e inactivos" icon={<FiLayers size={20} />} />
            </section>

            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.95fr)]">
              <div className="space-y-6">
                <Surface
                  eyebrow="Analytics"
                  title="Estado real de suscripciones"
                  description="Gráfico funcional generado con datos reales de suscripciones vigentes por estado."
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {statsByEstado.map((row) => (
                      <article key={row.estado} className="rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{row.estado}</p>
                          <span className="text-xs text-[var(--ui-muted)]">{row.total}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ui-surface-strong)]">
                          <div className="h-full rounded-full bg-[var(--ui-accent)]" style={{ width: `${row.percent}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]">
                    <span className="inline-flex items-center gap-2 font-semibold text-[var(--ui-foreground)]"><FiBarChart2 size={16} /> Fuente:</span> vista vigente de suscripciones y entidades reales de clínicas.
                  </div>
                </Surface>

                {section === 'clinicas' && (
                  <Surface
                    eyebrow="Clínicas"
                    title="Datos completos de clínica"
                    description="Puedes crear, editar, desactivar, reactivar y eliminar clínica; además de administrar admins asociados."
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <h4 className="text-lg font-semibold">Crear clínica</h4>
                        <div className="mt-4 grid gap-3">
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Nombre" value={createClinica.nombre} onChange={(e) => setCreateClinica((p) => ({ ...p, nombre: e.target.value }))} />
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="RUC" value={createClinica.ruc} onChange={(e) => setCreateClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Dirección" value={createClinica.direccion} onChange={(e) => setCreateClinica((p) => ({ ...p, direccion: e.target.value }))} />
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Teléfono" value={createClinica.telefono} onChange={(e) => setCreateClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={createClinica.tipo_negocio_id} onChange={(e) => setCreateClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                            <option value="">Tipo de negocio</option>
                            {tipos.map((tipo) => (
                              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                          </select>
                          <button type="button" onClick={handleCreateClinica} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">
                            Crear clínica
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <h4 className="text-lg font-semibold">Editar clínica seleccionada</h4>
                        {!selectedClinica && <p className="mt-4 text-sm text-[var(--ui-muted)]">Selecciona una clínica desde la columna derecha.</p>}
                        {selectedClinica && (
                          <div className="mt-4 grid gap-3">
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Nombre" value={editClinica.nombre} onChange={(e) => setEditClinica((p) => ({ ...p, nombre: e.target.value }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="RUC" value={editClinica.ruc} onChange={(e) => setEditClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Dirección" value={editClinica.direccion} onChange={(e) => setEditClinica((p) => ({ ...p, direccion: e.target.value }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Teléfono" value={editClinica.telefono} onChange={(e) => setEditClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                            <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editClinica.tipo_negocio_id} onChange={(e) => setEditClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                              <option value="">Tipo de negocio</option>
                              {tipos.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                              ))}
                            </select>
                            <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={editClinica.estado} onChange={(e) => setEditClinica((p) => ({ ...p, estado: e.target.value as 'ACTIVA' | 'INACTIVA' }))}>
                              <option value="ACTIVA">ACTIVA</option>
                              <option value="INACTIVA">INACTIVA</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={handleUpdateClinica} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Guardar cambios</button>
                              <button type="button" onClick={() => handleClinicaLifecycle(selectedClinica.estado === 'ACTIVA' ? 'desactivar' : 'reactivar')} className="rounded-[16px] bg-[var(--ui-warning)] px-4 py-3 text-sm font-semibold text-white">
                                {selectedClinica.estado === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </div>
                            <button type="button" onClick={() => handleClinicaLifecycle('eliminar')} className="rounded-[16px] bg-[var(--ui-danger)] px-4 py-3 text-sm font-semibold text-white">
                              Eliminar clínica
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                      <h4 className="text-lg font-semibold">Administradores de la clínica</h4>
                      {!selectedClinica && <p className="mt-3 text-sm text-[var(--ui-muted)]">Selecciona una clínica para ver admins.</p>}
                      {selectedClinica && (
                        <div className="mt-3 grid gap-3">
                          {adminsPorClinica.length === 0 && <p className="text-sm text-[var(--ui-muted)]">No hay admins registrados.</p>}
                          {adminsPorClinica.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between rounded-[16px] bg-[var(--ui-card)] px-4 py-3">
                              <div>
                                <p className="font-semibold">{admin.email}</p>
                                <p className="text-xs text-[var(--ui-muted)]">ID persona: {admin.persona_id || 'Sin vínculo'}</p>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => startEditUser(admin)} className="rounded-full bg-[var(--ui-surface-strong)] p-2 text-[var(--ui-foreground)]"><FiEdit2 size={14} /></button>
                                <button type="button" onClick={() => handleToggleUsuario(admin)} className="rounded-full bg-[var(--ui-danger)] p-2 text-white"><FiUser size={14} /></button>
                              </div>
                            </div>
                          ))}

                          <div className="mt-2 grid gap-3 border-t border-[var(--ui-border)] pt-4">
                            <p className="text-sm font-semibold">Crear nuevo ADMIN</p>
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Email" value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="DNI" value={adminForm.dni} onChange={(e) => setAdminForm((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" type="password" placeholder="Contraseña" value={adminForm.password} onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))} />
                            <button type="button" onClick={handleCreateAdmin} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Crear ADMIN</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Surface>
                )}

                {section === 'suscripciones' && (
                  <Surface
                    eyebrow="Billing"
                    title="Suscripciones y CRUD de planes"
                    description="Gestiona suscripciones por clínica y administra los planes (crear, editar, eliminar/inactivar)."
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <h4 className="text-lg font-semibold">Asignar plan a clínica</h4>
                        <div className="mt-4 grid gap-3">
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={assignPlanForm.clinica_id} onChange={(e) => setAssignPlanForm((p) => ({ ...p, clinica_id: e.target.value }))}>
                            <option value="">Selecciona clínica</option>
                            {clinicas.map((clinica) => (
                              <option key={clinica.id} value={clinica.id}>{clinica.nombre}</option>
                            ))}
                          </select>
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={assignPlanForm.plan_id} onChange={(e) => setAssignPlanForm((p) => ({ ...p, plan_id: e.target.value }))}>
                            <option value="">Selecciona plan</option>
                            {planes.filter((plan) => plan.estado === 'ACTIVO').map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.nombre} ({plan.codigo})</option>
                            ))}
                          </select>
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={assignPlanForm.estado} onChange={(e) => setAssignPlanForm((p) => ({ ...p, estado: e.target.value as typeof p.estado }))}>
                            <option value="TRIAL">TRIAL</option>
                            <option value="ACTIVA">ACTIVA</option>
                            <option value="PAST_DUE">PAST_DUE</option>
                            <option value="SUSPENDIDA">SUSPENDIDA</option>
                            <option value="CANCELADA">CANCELADA</option>
                            <option value="EXPIRADA">EXPIRADA</option>
                          </select>
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Duración en días" value={assignPlanForm.duracion_dias} onChange={(e) => setAssignPlanForm((p) => ({ ...p, duracion_dias: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
                          <button type="button" onClick={handleAssignPlan} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">Guardar suscripción</button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-lg font-semibold">{editingPlanId ? 'Editar plan' : 'Crear plan'}</h4>
                          {editingPlanId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlanId(null);
                                setPlanForm(INITIAL_PLAN_FORM);
                              }}
                              className="rounded-full bg-[var(--ui-card)] p-2"
                              aria-label="Cancelar edición"
                            >
                              <FiX size={14} />
                            </button>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3">
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Código" value={planForm.codigo} onChange={(e) => setPlanForm((p) => ({ ...p, codigo: e.target.value }))} />
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Nombre" value={planForm.nombre} onChange={(e) => setPlanForm((p) => ({ ...p, nombre: e.target.value }))} />
                          <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Descripción" value={planForm.descripcion} onChange={(e) => setPlanForm((p) => ({ ...p, descripcion: e.target.value }))} />
                          <div className="grid grid-cols-2 gap-2">
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Precio mensual" value={planForm.precio_mensual} onChange={(e) => setPlanForm((p) => ({ ...p, precio_mensual: e.target.value }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Precio anual" value={planForm.precio_anual} onChange={(e) => setPlanForm((p) => ({ ...p, precio_anual: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Max usuarios" value={planForm.max_usuarios} onChange={(e) => setPlanForm((p) => ({ ...p, max_usuarios: e.target.value.replace(/[^\d]/g, '') }))} />
                            <input className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" placeholder="Días trial" value={planForm.dias_trial} onChange={(e) => setPlanForm((p) => ({ ...p, dias_trial: e.target.value.replace(/[^\d]/g, '') }))} />
                          </div>
                          <select className="rounded-[16px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm" value={planForm.estado} onChange={(e) => setPlanForm((p) => ({ ...p, estado: e.target.value as 'ACTIVO' | 'INACTIVO' }))}>
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                          </select>
                          <button type="button" onClick={handleSavePlan} className="rounded-[16px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">
                            {editingPlanId ? 'Actualizar plan' : 'Crear plan'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="overflow-hidden rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)]">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[var(--ui-surface-strong)] text-left text-[var(--ui-muted)]">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Plan</th>
                              <th className="px-4 py-3 font-semibold">Estado</th>
                              <th className="px-4 py-3 font-semibold">Trial</th>
                              <th className="px-4 py-3 font-semibold">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {planes.map((plan) => (
                              <tr key={plan.id} className="border-t border-[var(--ui-border)]">
                                <td className="px-4 py-3">
                                  <p className="font-semibold">{plan.nombre}</p>
                                  <p className="text-xs text-[var(--ui-muted)]">{plan.codigo}</p>
                                </td>
                                <td className="px-4 py-3">{plan.estado}</td>
                                <td className="px-4 py-3">{plan.dias_trial || 0} días</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => handleEditPlan(plan)} className="rounded-full bg-[var(--ui-surface-strong)] p-2" aria-label="Editar plan"><FiEdit2 size={14} /></button>
                                    <button type="button" onClick={() => handleDeletePlan(plan)} className="rounded-full bg-[var(--ui-danger)] p-2 text-white" aria-label="Eliminar plan"><FiTrash2 size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                        <h4 className="text-lg font-semibold">Historial de suscripciones de la clínica seleccionada</h4>
                        {!selectedClinica && <p className="mt-3 text-sm text-[var(--ui-muted)]">Selecciona una clínica para ver historial.</p>}
                        {selectedClinica && (
                          <div className="mt-3 space-y-3 max-h-[360px] overflow-auto pr-1">
                            {historialClinica.length === 0 && (
                              <p className="rounded-[16px] bg-[var(--ui-card)] px-4 py-3 text-sm text-[var(--ui-muted)]">Sin historial para esta clínica.</p>
                            )}
                            {historialClinica.map((item) => (
                              <article key={item.id} className="rounded-[16px] bg-[var(--ui-card)] px-4 py-3">
                                <p className="font-semibold">{item.plan_nombre || item.plan_codigo || 'Plan desconocido'}</p>
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
                )}

                {section === 'usuarios' && (
                  <Surface
                    eyebrow="Usuarios"
                    title="Gestión global de usuarios"
                    description="Puedes ver y editar todos los usuarios de todas las clínicas, incluyendo activación/desactivación y eliminación."
                  >
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
                                    <button type="button" onClick={() => startEditUser(user)} className="rounded-full bg-[var(--ui-surface-strong)] p-2" aria-label="Editar usuario"><FiEdit2 size={14} /></button>
                                    <button type="button" onClick={() => handleToggleUsuario(user)} className="rounded-full bg-[var(--ui-warning)] p-2 text-white" aria-label="Activar o desactivar"><FiUser size={14} /></button>
                                    {user.id !== session.id && (
                                      <button type="button" onClick={() => handleDeleteUser(user)} className="rounded-full bg-[var(--ui-danger)] p-2 text-white" aria-label="Eliminar usuario"><FiTrash2 size={14} /></button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Surface>
                )}
              </div>

              <div className="space-y-6">
                <Surface
                  eyebrow="Clínicas"
                  title="Selección y detalle"
                  description="Listado vivo de clínicas para pivotear entre sus datos, usuarios y suscripciones."
                  action={<span className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--ui-accent)]"><FiCheckCircle size={14} /> Selección activa</span>}
                >
                  <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                    {clinicas.map((clinica) => {
                      const sub = suscripciones.find((s) => s.clinica_id === clinica.id) || null;
                      const badge = getSubBadge(sub);
                      const isSelected = selectedClinicaId === clinica.id;
                      return (
                        <button
                          key={clinica.id}
                          type="button"
                          onClick={() => {
                            setSelectedClinicaId(clinica.id);
                            setAssignPlanForm((prev) => ({ ...prev, clinica_id: clinica.id }));
                          }}
                          className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                            isSelected
                              ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)]'
                              : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-strong)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-[var(--ui-foreground)]">{clinica.nombre}</p>
                              <p className="mt-1 text-xs text-[var(--ui-muted)]">{clinica.tipo_negocio_nombre || clinica.tipo_negocio_codigo || 'Sin tipo'}</p>
                              <p className="mt-1 text-xs text-[var(--ui-muted)]">RUC: {clinica.ruc || 'No definido'}</p>
                            </div>
                            <FiChevronRight className="mt-0.5 text-[var(--ui-muted)]" />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                            <span className="text-xs text-[var(--ui-muted)]">{clinica.estado}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Surface>

                <Surface
                  eyebrow="Detalle"
                  title="Ficha de clínica seleccionada"
                  description="Información completa para tomar decisiones sin salir del panel."
                >
                  {!selectedClinica && (
                    <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-muted)]">Selecciona una clínica para ver su ficha.</div>
                  )}
                  {selectedClinica && (
                    <div className="space-y-3">
                      <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Nombre</p>
                        <p className="mt-2 font-semibold">{selectedClinica.nombre}</p>
                      </div>
                      <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Dirección</p>
                        <p className="mt-2 text-sm">{selectedClinica.direccion || 'No definida'}</p>
                      </div>
                      <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Teléfono</p>
                        <p className="mt-2 text-sm">{selectedClinica.telefono || 'No definido'}</p>
                      </div>
                      <div className="rounded-[16px] bg-[var(--ui-surface)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Suscripción vigente</p>
                        <p className="mt-2 font-semibold">{selectedSuscripcion?.plan_nombre || selectedSuscripcion?.plan_codigo || 'Sin plan activo'}</p>
                        <p className="mt-1 text-xs text-[var(--ui-muted)]">Vence: {formatDate(selectedSuscripcion?.periodo_actual_fin)}</p>
                      </div>
                      {historialClinica.length === 0 && (
                        <div className="inline-flex items-center gap-2 rounded-[16px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-[var(--ui-warning)]">
                          <FiAlertCircle size={14} /> Sin historial cargado para esta clínica.
                        </div>
                      )}
                    </div>
                  )}
                </Surface>

                {editingUser && (
                  <Surface
                    eyebrow="Usuario"
                    title="Editar usuario"
                    description="Edición real del usuario seleccionado con cambios persistidos en backend."
                    action={
                      <button type="button" onClick={() => setEditingUser(null)} className="rounded-full bg-[var(--ui-surface)] p-2" aria-label="Cerrar">
                        <FiX size={14} />
                      </button>
                    }
                  >
                    <div className="grid gap-3">
                      <input className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm" value={editingUser.email} onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : prev))} />

                      <select
                        className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm"
                        value={editingUser.rol}
                        onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, rol: e.target.value as Usuario['rol'] } : prev))}
                        disabled={editingUser.rol === 'SUPERADMIN'}
                      >
                        <option value="SUPERADMIN">SUPERADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="STAFF">STAFF</option>
                      </select>

                      {editingUser.rol !== 'SUPERADMIN' && (
                        <select
                          className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm"
                          value={editingUser.clinica_id}
                          onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, clinica_id: e.target.value } : prev))}
                        >
                          <option value="">Selecciona clínica</option>
                          {clinicas.map((clinica) => (
                            <option key={clinica.id} value={clinica.id}>{clinica.nombre}</option>
                          ))}
                        </select>
                      )}

                      <select
                        className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm"
                        value={editingUser.estado}
                        onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, estado: e.target.value as 'ACTIVO' | 'INACTIVO' } : prev))}
                      >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                      </select>

                      <input
                        type="password"
                        className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm"
                        value={editingUser.password}
                        onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, password: e.target.value } : prev))}
                        placeholder="Nueva contraseña (opcional)"
                      />

                      <button type="button" onClick={handleSaveUser} className="rounded-[14px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white">
                        Guardar usuario
                      </button>
                    </div>
                  </Surface>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
