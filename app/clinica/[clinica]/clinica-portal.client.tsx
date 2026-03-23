'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiHome,
  FiLogOut,
  FiShield,
  FiUsers,
  FiUserPlus
} from 'react-icons/fi';
import ConsoleThemeToggle from '../../components/console-theme-toggle';

type ClinicaContext = {
  id: string;
  nombre: string;
  tipo_negocio_codigo?: string | null;
  tipo_negocio_nombre?: string | null;
};

type Suscripcion = {
  id: string;
  empresa_id: string;
  plan_id: string;
  estado: 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA';
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  usuarios_incluidos?: number;
};

type SessionUser = {
  id: string;
  email: string;
  rol: 'SUPERADMIN' | 'ADMIN' | 'DOCTOR' | 'STAFF';
  estado: 'ACTIVO' | 'INACTIVO';
  clinica_id?: string | null;
  ultimo_login_at?: string | null;
};

type SessionResponse = {
  success?: boolean;
  data?: SessionUser & {
    clinica?: ClinicaContext | null;
    empresa?: ClinicaContext | null;
  };
  error?: string;
};

type Usuario = {
  id: string;
  email: string;
  rol: 'SUPERADMIN' | 'ADMIN' | 'DOCTOR' | 'STAFF';
  estado: 'ACTIVO' | 'INACTIVO';
  clinica_id?: string | null;
  deleted_at?: string | null;
  ultimo_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type UsuariosResponse = {
  success?: boolean;
  data?: Usuario[];
  error?: string;
};

type Persona = {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
};

type PersonaResponse = {
  success?: boolean;
  data?: Persona;
  error?: string;
};

type TabKey = 'resumen' | 'usuarios';

type EditState = {
  id: string;
  email: string;
  rol: 'ADMIN' | 'DOCTOR' | 'STAFF';
  estado: 'ACTIVO' | 'INACTIVO';
  password: string;
};

const ROLE_MATRIX: Record<SessionUser['rol'], string[]> = {
  SUPERADMIN: [
    'Acceso global a todas las clínicas y módulos de plataforma.',
    'Gestión total de usuarios y configuraciones cross-clínica.',
    'Supervisión de auditoría, suscripciones y operación completa.'
  ],
  ADMIN: [
    'Gestiona usuarios solo de su clínica.',
    'Puede crear y editar usuarios DOCTOR y STAFF de su clínica.',
    'Puede activar o desactivar usuarios de su clínica.'
  ],
  DOCTOR: [
    'Acceso operativo a funciones clínicas según permisos backend.',
    'Visualiza su cuenta de usuario en modo lectura.',
    'No puede crear ni editar otros usuarios.'
  ],
  STAFF: [
    'Acceso operativo a funciones administrativas según backend.',
    'Visualiza su cuenta en modo lectura.',
    'No puede crear ni editar otros usuarios.'
  ]
};

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return 'No registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No registrado';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function normalizeRoleForEdit(role: Usuario['rol']): 'ADMIN' | 'DOCTOR' | 'STAFF' {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'DOCTOR') return 'DOCTOR';
  return 'STAFF';
}

function MetricCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-[28px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-5 shadow-[var(--ui-shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--ui-muted)]">{label}</p>
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

function Surface({ title, eyebrow, description, children }: { title: string; eyebrow?: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-6 shadow-[var(--ui-shadow)]">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ui-muted)]">{eyebrow}</p>}
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ui-foreground)]">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">{description}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ClinicaPortalClient() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [session, setSession] = useState<SessionUser | null>(null);
  const [clinica, setClinica] = useState<ClinicaContext | null>(null);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null | undefined>(undefined);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');

  const [dniBusqueda, setDniBusqueda] = useState('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [isPersonaLoading, setIsPersonaLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState<'ADMIN' | 'DOCTOR' | 'STAFF'>('DOCTOR');
  const [isCreating, setIsCreating] = useState(false);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = session?.rol === 'ADMIN' || session?.rol === 'SUPERADMIN';
  const roleNotes = session?.rol ? ROLE_MATRIX[session.rol] : [];

  const roleOptionsForCreate = useMemo(() => {
    if (session?.rol === 'SUPERADMIN') {
      return ['ADMIN', 'DOCTOR', 'STAFF'] as const;
    }
    return ['DOCTOR', 'STAFF'] as const;
  }, [session?.rol]);

  const roleOptionsForEdit = useMemo(() => {
    if (session?.rol === 'SUPERADMIN') {
      return ['ADMIN', 'DOCTOR', 'STAFF'] as const;
    }
    return ['DOCTOR', 'STAFF'] as const;
  }, [session?.rol]);

  const ensureCsrfHeaders = useCallback(async () => {
    await fetch('/api/backend/usuarios/csrf', {
      method: 'GET',
      credentials: 'include'
    });

    const token = getCookie('csrf_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['x-csrf-token'] = token;
    }

    return headers;
  }, []);

  const loadSession = useCallback(async () => {
    const response = await fetch('/api/backend/usuarios/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Tu sesión no es válida. Inicia sesión nuevamente.');
    }

    const payload = (await response.json()) as SessionResponse;

    if (!payload.success || !payload.data) {
      throw new Error(payload.error || 'No se pudo obtener la sesión actual.');
    }

    const clinicaData = payload.data.clinica || payload.data.empresa || null;

    setSession(payload.data);
    setClinica(clinicaData);

    if ((payload.data.rol === 'ADMIN' || payload.data.rol === 'SUPERADMIN') && clinicaData?.id) {
      try {
        const susRes = await fetch(`/api/backend/platform/suscripciones/empresa/${clinicaData.id}`, {
          credentials: 'include'
        });
        if (susRes.ok) {
          const susData = await susRes.json();
          setSuscripcion(susData.data?.vigente || susData.data?.[0] || null);
        }
      } catch (error) {
        console.error('Error al cargar suscripción:', error);
        setSuscripcion(null);
      }
    }

    return payload.data;
  }, []);

  const loadUsuarios = useCallback(async (allowManagement = isAdmin) => {
    if (!allowManagement) {
      setUsuarios([]);
      return;
    }

    setIsUsersLoading(true);
    setUsersMessage('');

    try {
      const response = await fetch('/api/backend/usuarios', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as UsuariosResponse | null;
        throw new Error(payload?.error || 'No se pudieron cargar los usuarios.');
      }

      const payload = (await response.json()) as UsuariosResponse;
      const list = payload.data || [];
      setUsuarios(list);
    } catch (error) {
      setUsersMessage(error instanceof Error ? error.message : 'Error al cargar usuarios.');
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsBootLoading(true);
      setGlobalError('');

      try {
        const currentSession = await loadSession();
        if (!isMounted) return;

        const canManageUsers = currentSession.rol === 'ADMIN' || currentSession.rol === 'SUPERADMIN';
        await loadUsuarios(canManageUsers);
      } catch (error) {
        if (!isMounted) return;
        setGlobalError(error instanceof Error ? error.message : 'No se pudo inicializar el portal.');
      } finally {
        if (isMounted) {
          setIsBootLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [loadSession, loadUsuarios]);

  const handleBuscarPersona = useCallback(async () => {
    if (!dniBusqueda.trim()) {
      setUsersMessage('Ingresa un DNI para vincular la persona.');
      return;
    }

    setIsPersonaLoading(true);
    setUsersMessage('');

    try {
      const response = await fetch(`/api/backend/personas/dni/${encodeURIComponent(dniBusqueda.trim())}`, {
        method: 'GET',
        credentials: 'include'
      });

      const payload = (await response.json()) as PersonaResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'No se encontró persona para el DNI indicado.');
      }

      setPersonaSeleccionada(payload.data);
    } catch (error) {
      setPersonaSeleccionada(null);
      setUsersMessage(error instanceof Error ? error.message : 'Error al buscar persona.');
    } finally {
      setIsPersonaLoading(false);
    }
  }, [dniBusqueda]);

  const refreshUsersIfPossible = useCallback(async () => {
    if (!isAdmin) return;
    await loadUsuarios();
  }, [isAdmin, loadUsuarios]);

  const handleCreateUsuario = useCallback(async () => {
    if (!isAdmin || !session?.clinica_id) {
      setUsersMessage('Tu rol no permite crear usuarios en esta clínica.');
      return;
    }

    if (!personaSeleccionada?.id) {
      setUsersMessage('Debes vincular una persona mediante DNI antes de crear el usuario.');
      return;
    }

    if (!newEmail.trim() || !newPassword) {
      setUsersMessage('Email y contraseña son obligatorios.');
      return;
    }

    setIsCreating(true);
    setUsersMessage('');

    try {
      const headers = await ensureCsrfHeaders();

      const response = await fetch('/api/backend/usuarios', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          clinica_id: session.clinica_id,
          persona_id: personaSeleccionada.id,
          email: newEmail.trim(),
          password: newPassword,
          rol: newRol,
          estado: 'ACTIVO'
        })
      });

      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'No se pudo crear el usuario.');
      }

      setUsersMessage('Usuario creado correctamente.');
      setPersonaSeleccionada(null);
      setDniBusqueda('');
      setNewEmail('');
      setNewPassword('');
      setNewRol(roleOptionsForCreate[0]);
      await refreshUsersIfPossible();
    } catch (error) {
      setUsersMessage(error instanceof Error ? error.message : 'Error al crear usuario.');
    } finally {
      setIsCreating(false);
    }
  }, [
    ensureCsrfHeaders,
    isAdmin,
    newEmail,
    newPassword,
    newRol,
    personaSeleccionada,
    refreshUsersIfPossible,
    roleOptionsForCreate,
    session?.clinica_id
  ]);

  const startEdit = useCallback((usuario: Usuario) => {
    setEditing({
      id: usuario.id,
      email: usuario.email,
      rol: normalizeRoleForEdit(usuario.rol),
      estado: usuario.deleted_at ? 'INACTIVO' : usuario.estado,
      password: ''
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;

    setIsSavingEdit(true);
    setUsersMessage('');

    try {
      const headers = await ensureCsrfHeaders();
      const body: Record<string, string> = {
        email: editing.email.trim(),
        rol: editing.rol,
        estado: editing.estado
      };

      if (editing.password.trim()) {
        body.password = editing.password;
      }

      const response = await fetch(`/api/backend/usuarios/${editing.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(body)
      });

      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'No se pudo actualizar el usuario.');
      }

      setUsersMessage('Usuario actualizado correctamente.');
      setEditing(null);
      await refreshUsersIfPossible();
    } catch (error) {
      setUsersMessage(error instanceof Error ? error.message : 'Error al actualizar usuario.');
    } finally {
      setIsSavingEdit(false);
    }
  }, [editing, ensureCsrfHeaders, refreshUsersIfPossible]);

  const handleToggleActive = useCallback(
    async (usuario: Usuario) => {
      const isActive = !usuario.deleted_at && usuario.estado === 'ACTIVO';
      const endpoint = isActive
        ? `/api/backend/usuarios/${usuario.id}/desactivar`
        : `/api/backend/usuarios/${usuario.id}/reactivar`;

      setUsersMessage('');

      try {
        const headers = await ensureCsrfHeaders();
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({})
        });

        const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'No se pudo actualizar el estado.');
        }

        setUsersMessage(isActive ? 'Usuario desactivado correctamente.' : 'Usuario reactivado correctamente.');
        await refreshUsersIfPossible();
      } catch (error) {
        setUsersMessage(error instanceof Error ? error.message : 'Error al cambiar estado del usuario.');
      }
    },
    [ensureCsrfHeaders, refreshUsersIfPossible]
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const headers = await ensureCsrfHeaders();
      await fetch('/api/backend/usuarios/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({})
      });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }, [ensureCsrfHeaders, router]);

  const visibleUsuarios = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const clinicId = clinica?.id || session?.clinica_id || null;

    return usuarios
      .filter((u) => {
        if (session?.rol === 'SUPERADMIN') return true;
        if (!clinicId) return true;
        return u.clinica_id === clinicId;
      })
      .sort((a, b) => {
        const aActive = !a.deleted_at && a.estado === 'ACTIVO' ? 0 : 1;
        const bActive = !b.deleted_at && b.estado === 'ACTIVO' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [clinica?.id, isAdmin, session?.clinica_id, session?.rol, usuarios]);

  const activeUsers = useMemo(
    () => visibleUsuarios.filter((usuario) => !usuario.deleted_at && usuario.estado === 'ACTIVO').length,
    [visibleUsuarios]
  );

  if (isBootLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-[var(--ui-foreground)]">
        <p className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-5 py-3 text-sm shadow-[var(--ui-shadow)]">Cargando portal de clínica...</p>
      </main>
    );
  }

  if (globalError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 text-[var(--ui-foreground)]">
        <section className="max-w-xl rounded-[32px] border border-[var(--ui-border)] bg-[var(--ui-card)] p-8 text-center shadow-[var(--ui-shadow)]">
          <h1 className="text-2xl font-semibold">No se pudo abrir el portal</h1>
          <p className="mt-3 text-[var(--ui-muted)]">{globalError}</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 font-semibold text-white"
          >
            Volver al login
            <FiArrowRight size={16} />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--ui-foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1640px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-[290px] shrink-0 lg:block">
          <div className="sticky top-4 space-y-5 rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ui-muted)]">Portal clínica</p>
                <h1 className="mt-2 text-3xl font-semibold">{clinica?.nombre || 'CliniCore'}</h1>
                <p className="mt-2 text-sm text-[var(--ui-muted)]">Mismo formato visual del sistema para resumen y usuarios.</p>
              </div>
              <ConsoleThemeToggle compact />
            </div>

            <div className="rounded-[26px] bg-[var(--ui-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Rol actual</p>
              <p className="mt-2 text-xl font-semibold">{session?.rol}</p>
              <p className="mt-1 text-sm text-[var(--ui-muted)]">{session?.email}</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveTab('resumen')}
                className={`w-full rounded-[24px] border px-4 py-4 text-left ${activeTab === 'resumen' ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-white' : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-strong)]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${activeTab === 'resumen' ? 'bg-white/16 text-white' : 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]'}`}>
                    <FiHome size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Resumen</p>
                    <p className={`mt-1 text-xs ${activeTab === 'resumen' ? 'text-white/76' : 'text-[var(--ui-muted)]'}`}>Estado operativo y suscripción.</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('usuarios')}
                className={`w-full rounded-[24px] border px-4 py-4 text-left ${activeTab === 'usuarios' ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-white' : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-strong)]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${activeTab === 'usuarios' ? 'bg-white/16 text-white' : 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]'}`}>
                    <FiUsers size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Usuarios</p>
                    <p className={`mt-1 text-xs ${activeTab === 'usuarios' ? 'text-white/76' : 'text-[var(--ui-muted)]'}`}>Gestión y control del equipo clínico.</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="rounded-[26px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Suscripción</p>
              <p className="mt-2 text-xl font-semibold">{suscripcion?.estado || 'Sin plan activo'}</p>
              <p className="mt-1 text-sm text-[var(--ui-muted)]">{suscripcion?.fecha_vencimiento ? `Vence ${formatDate(suscripcion.fecha_vencimiento)}` : 'Sin fecha de vencimiento disponible'}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="rounded-[36px] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 shadow-[var(--ui-shadow)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ui-muted)]">Workspace clínico</p>
                <h2 className="mt-2 text-3xl font-semibold">{activeTab === 'resumen' ? 'Resumen operativo' : 'Módulo de usuarios'}</h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">
                  La pantalla hereda el mismo patrón de dashboard del superadmin: tarjetas métricas, paneles grandes y una columna lateral persistente.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="lg:hidden">
                  <ConsoleThemeToggle compact />
                </div>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-danger)] px-4 py-2 text-sm font-semibold text-white"
                >
                  <FiLogOut size={16} />
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 xl:grid-cols-4">
            <MetricCard label="Usuarios visibles" value={String(visibleUsuarios.length)} hint="Equipo dentro del alcance actual" icon={<FiUsers size={20} />} />
            <MetricCard label="Activos" value={String(activeUsers)} hint="Cuentas operativas habilitadas" icon={<FiCheckCircle size={20} />} />
            <MetricCard label="Suscripción" value={suscripcion?.estado || 'Sin plan'} hint={suscripcion?.fecha_vencimiento ? `Vence ${formatDate(suscripcion.fecha_vencimiento)}` : 'Sin vigencia activa'} icon={<FiShield size={20} />} />
            <MetricCard label="Último login" value={session?.ultimo_login_at ? formatDate(session.ultimo_login_at).split(',')[0] : 'Sin dato'} hint="Referencia rápida de la sesión actual" icon={<FiClock size={20} />} />
          </section>

          {activeTab === 'resumen' && (
            <section className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
              <div className="space-y-6">
                {!suscripcion && isAdmin && (
                  <Surface eyebrow="Alerta" title="No hay suscripción activa" description="La clínica queda limitada para alta de nuevos usuarios mientras no exista una suscripción vigente.">
                    <div className="rounded-[24px] border border-rose-500/24 bg-rose-500/10 p-4 text-[var(--ui-danger)]">
                      <div className="flex items-start gap-3">
                        <FiAlertCircle className="mt-0.5" size={18} />
                        <p className="text-sm">Contacta a tu SuperAdmin para asignar un plan. El sistema ya considera el trial de 14 días y luego deja la clínica sin suscripción activa.</p>
                      </div>
                    </div>
                  </Surface>
                )}

                <Surface eyebrow="Permisos" title="Acciones disponibles por rol" description="Este bloque reemplaza la vista plana por una lectura más clara, con tarjetas informativas y enfoque de consola.">
                  <div className="grid gap-3 md:grid-cols-2">
                    {roleNotes.map((note) => (
                      <article key={note} className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-foreground)]">
                        {note}
                      </article>
                    ))}
                  </div>
                </Surface>

                <Surface eyebrow="Panel" title="Mi sesión" description="Información central de acceso y contexto operativo de la clínica actual.">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[24px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Email</p>
                      <p className="mt-3 text-sm font-semibold">{session?.email || 'No disponible'}</p>
                    </div>
                    <div className="rounded-[24px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Estado</p>
                      <p className="mt-3 text-sm font-semibold">{session?.estado || 'No disponible'}</p>
                    </div>
                    <div className="rounded-[24px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Último login</p>
                      <p className="mt-3 text-sm font-semibold">{formatDate(session?.ultimo_login_at)}</p>
                    </div>
                    <div className="rounded-[24px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Tipo de negocio</p>
                      <p className="mt-3 text-sm font-semibold">{clinica?.tipo_negocio_nombre || clinica?.tipo_negocio_codigo || 'No definido'}</p>
                    </div>
                  </div>
                </Surface>
              </div>

              <div className="space-y-6">
                <Surface eyebrow="Suscripción" title="Estado actual" description="Tarjeta lateral persistente al estilo del dashboard de referencia para tener a mano el plan y la vigencia.">
                  {suscripcion ? (
                    <div className="rounded-[28px] bg-[linear-gradient(180deg,var(--ui-accent),var(--ui-accent-strong))] p-5 text-white shadow-[0_30px_60px_-38px_rgba(17,73,205,0.95)]">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/70">Plan activo</p>
                      <p className="mt-3 text-2xl font-semibold">{suscripcion.plan_id}</p>
                      <div className="mt-5 space-y-3 rounded-[24px] bg-white/12 p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Estado</span>
                          <span className="font-semibold">{suscripcion.estado}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Vencimiento</span>
                          <span className="font-semibold">{suscripcion.fecha_vencimiento ? formatDate(suscripcion.fecha_vencimiento) : 'No registrado'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Usuarios incluidos</span>
                          <span className="font-semibold">{suscripcion.usuarios_incluidos || 'No definido'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[24px] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]">No existe una suscripción activa asociada a esta clínica.</div>
                  )}
                </Surface>
              </div>
            </section>
          )}

          {activeTab === 'usuarios' && (
            <section className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <div className="space-y-6">
                <Surface eyebrow="Usuarios" title="Gestión del equipo clínico" description="La grilla se reorganiza para parecerse al dashboard de referencia: bloque de acciones arriba y tabla principal debajo.">
                  {!isAdmin && (
                    <div className="rounded-[24px] border border-amber-500/24 bg-amber-500/10 p-4 text-sm text-[var(--ui-warning)]">
                      Tu rol es <strong>{session?.rol}</strong>. Esta vista queda en modo informativo; la gestión de usuarios está habilitada para ADMIN.
                    </div>
                  )}

                  {isAdmin && (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[28px] border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]">
                            <FiUserPlus size={20} />
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold">Crear usuario</h3>
                            <p className="text-sm text-[var(--ui-muted)]">Primero vincula una persona por DNI y luego crea el acceso.</p>
                          </div>
                        </div>

                        {!suscripcion && (
                          <p className="mt-4 rounded-[20px] border border-rose-500/24 bg-rose-500/10 px-4 py-3 text-sm text-[var(--ui-danger)]">
                            No puedes crear usuarios sin una suscripción activa. Contacta a tu SuperAdmin.
                          </p>
                        )}

                        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            value={dniBusqueda}
                            onChange={(e) => setDniBusqueda(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                            placeholder="DNI de persona"
                            disabled={!suscripcion}
                          />
                          <button
                            type="button"
                            onClick={handleBuscarPersona}
                            disabled={isPersonaLoading || !suscripcion}
                            className="rounded-[18px] bg-[var(--ui-surface-strong)] px-4 py-3 text-sm font-semibold text-[var(--ui-foreground)] disabled:opacity-60"
                          >
                            {isPersonaLoading ? 'Buscando...' : 'Buscar por DNI'}
                          </button>
                        </div>

                        {personaSeleccionada && (
                          <p className="mt-4 rounded-[20px] border border-emerald-500/24 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--ui-success)]">
                            Persona vinculada: {personaSeleccionada.nombres} {personaSeleccionada.apellido_paterno} {personaSeleccionada.apellido_materno}
                          </p>
                        )}

                        <div className="mt-4 grid gap-3">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                            placeholder="usuario@clinica.com"
                            disabled={!suscripcion}
                          />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                            placeholder="Contraseña"
                            disabled={!suscripcion}
                          />
                          <select
                            value={newRol}
                            onChange={(e) => setNewRol(e.target.value as 'ADMIN' | 'DOCTOR' | 'STAFF')}
                            className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                            disabled={!suscripcion}
                          >
                            {roleOptionsForCreate.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleCreateUsuario}
                            disabled={isCreating || !suscripcion}
                            className="inline-flex items-center justify-center rounded-[18px] bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {isCreating ? 'Creando usuario...' : 'Crear usuario'}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-[var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-accent),var(--ui-accent-strong))] p-5 text-white shadow-[0_30px_60px_-38px_rgba(17,73,205,0.95)]">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/70">Radar de equipo</p>
                        <h3 className="mt-3 text-2xl font-semibold">{clinica?.nombre || 'Clínica activa'}</h3>
                        <p className="mt-2 text-sm text-white/78">Vista compacta del estado del módulo de usuarios.</p>
                        <div className="mt-5 grid gap-3 rounded-[24px] bg-white/12 p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Usuarios visibles</span>
                            <strong>{visibleUsuarios.length}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Activos</span>
                            <strong>{activeUsers}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/70">Rol</span>
                            <strong>{session?.rol}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Surface>

                {usersMessage && (
                  <p className="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-card)] px-4 py-3 text-sm text-[var(--ui-foreground)] shadow-[var(--ui-shadow)]">{usersMessage}</p>
                )}

                {isAdmin && (
                  <Surface eyebrow="Tabla" title="Usuarios registrados" description="Tabla principal con acciones rápidas, usando la misma estructura de la consola superadmin.">
                    <div className="overflow-hidden rounded-[28px] border border-[var(--ui-border)] bg-[var(--ui-surface)]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[var(--ui-surface-strong)] text-left text-[var(--ui-muted)]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Email</th>
                            <th className="px-4 py-3 font-semibold">Rol</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Último login</th>
                            <th className="px-4 py-3 font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isUsersLoading && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 text-[var(--ui-muted)]">Cargando usuarios...</td>
                            </tr>
                          )}
                          {!isUsersLoading && visibleUsuarios.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 text-[var(--ui-muted)]">No hay usuarios registrados para esta clínica.</td>
                            </tr>
                          )}
                          {!isUsersLoading && visibleUsuarios.map((usuario) => {
                            const isRowActive = !usuario.deleted_at && usuario.estado === 'ACTIVO';
                            return (
                              <tr key={usuario.id} className="border-t border-[var(--ui-border)] text-[var(--ui-foreground)]">
                                <td className="px-4 py-3 font-medium">{usuario.email}</td>
                                <td className="px-4 py-3">{usuario.rol}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isRowActive ? 'bg-emerald-500/14 text-[var(--ui-success)]' : 'bg-rose-500/14 text-[var(--ui-danger)]'}`}>
                                    {isRowActive ? 'ACTIVO' : 'INACTIVO'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[var(--ui-muted)]">{formatDate(usuario.ultimo_login_at)}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(usuario)}
                                      className="rounded-full bg-[var(--ui-surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-foreground)]"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActive(usuario)}
                                      className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${isRowActive ? 'bg-[var(--ui-danger)]' : 'bg-[var(--ui-success)]'}`}
                                    >
                                      {isRowActive ? 'Desactivar' : 'Reactivar'}
                                    </button>
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
                {isAdmin && editing && (
                  <Surface eyebrow="Edición" title="Editar usuario" description="Panel lateral fijo para cambiar correo, rol, contraseña y estado sin abandonar la tabla.">
                    <div className="grid gap-3">
                      <input
                        type="email"
                        value={editing.email}
                        onChange={(e) => setEditing((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                        className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                      />
                      <input
                        type="password"
                        value={editing.password}
                        onChange={(e) => setEditing((prev) => (prev ? { ...prev, password: e.target.value } : prev))}
                        className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                        placeholder="Nueva contraseña opcional"
                      />
                      <select
                        value={editing.rol}
                        onChange={(e) => setEditing((prev) => (prev ? { ...prev, rol: e.target.value as 'ADMIN' | 'DOCTOR' | 'STAFF' } : prev))}
                        className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                      >
                        {roleOptionsForEdit.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <select
                        value={editing.estado}
                        onChange={(e) => setEditing((prev) => (prev ? { ...prev, estado: e.target.value as 'ACTIVO' | 'INACTIVO' } : prev))}
                        className="rounded-[18px] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--ui-accent)]"
                      >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                      </select>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit}
                          className="rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded-full bg-[var(--ui-surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--ui-foreground)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </Surface>
                )}

                <Surface eyebrow="Lectura rápida" title="Contexto del módulo" description="Panel auxiliar para mantener visible el estado de la clínica mientras gestionas usuarios.">
                  <div className="space-y-3">
                    <div className="rounded-[22px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Clínica</p>
                      <p className="mt-3 text-lg font-semibold">{clinica?.nombre || 'No disponible'}</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Suscripción</p>
                      <p className="mt-3 text-lg font-semibold">{suscripcion?.estado || 'Sin plan'}</p>
                      <p className="mt-1 text-sm text-[var(--ui-muted)]">{suscripcion?.fecha_vencimiento ? formatDate(suscripcion.fecha_vencimiento) : 'Sin vencimiento disponible'}</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ui-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-muted)]">Acción principal</p>
                      <p className="mt-3 text-sm text-[var(--ui-foreground)]">Usa este mismo formato para mantener consistencia visual entre módulos administrativos y clínicos.</p>
                    </div>
                  </div>
                </Surface>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
