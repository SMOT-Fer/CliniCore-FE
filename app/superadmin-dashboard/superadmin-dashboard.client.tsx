'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCreditCard, FiHome, FiLogOut, FiUsers } from 'react-icons/fi';

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
  persona_id?: string;
};

type Plan = {
  id: string;
  codigo: string;
  nombre: string;
  dias_trial?: number | null;
};

type TipoNegocio = {
  id: string;
  codigo?: string;
  nombre: string;
};

type SuscripcionVigente = {
  clinica_id: string;
  suscripcion_estado: 'TRIAL' | 'ACTIVA' | 'PAST_DUE' | 'SUSPENDIDA' | 'CANCELADA' | 'EXPIRADA';
  plan_codigo?: string;
  plan_nombre?: string;
  periodo_actual_fin?: string;
  trial_ends_at?: string;
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

  const [selectedClinicaId, setSelectedClinicaId] = useState<string>('');

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

  const loadAllData = useCallback(async () => {
    const [sessionRes, clinicasRes, usuariosRes, planesRes, tiposRes, vigentesRes] = await Promise.all([
      fetch('/api/backend/usuarios/me', { credentials: 'include' }),
      fetch('/api/backend/empresas', { credentials: 'include' }),
      fetch('/api/backend/usuarios', { credentials: 'include' }),
      fetch('/api/backend/platform/planes', { credentials: 'include' }),
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
  }, [selectedClinica]);

  const notify = useCallback((text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
    } catch (error) {
      notify('No se pudo refrescar el panel', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAllData, notify]);

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
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo crear la clinica');

      notify('Clinica creada con trial inicial de 14 dias', 'success');
      setCreateClinica({ nombre: '', ruc: '', direccion: '', telefono: '', tipo_negocio_id: '' });
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al crear clinica', 'error');
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
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo actualizar la clinica');

      notify('Clinica actualizada', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al actualizar clinica', 'error');
    }
  }, [selectedClinicaId, editClinica, notify, refreshData]);

  const handleCreateAdmin = useCallback(async () => {
    if (!selectedClinicaId) return;

    if (!adminForm.email.trim() || !adminForm.dni.trim() || !adminForm.password.trim()) {
      notify('Email, DNI y contrasena son obligatorios', 'error');
      return;
    }

    try {
      const personaRes = await fetch(`/api/backend/personas/dni/${encodeURIComponent(adminForm.dni.trim())}`, {
        credentials: 'include'
      });
      const personaPayload = await personaRes.json().catch(() => null);
      if (!personaRes.ok || !personaPayload?.data?.id) throw new Error(personaPayload?.error || 'No se encontro persona por DNI');

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
  }, [selectedClinicaId, adminForm, notify, refreshData]);

  const handleAssignPlan = useCallback(async () => {
    if (!assignPlanForm.clinica_id || !assignPlanForm.plan_id) {
      notify('Selecciona clinica y plan', 'error');
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
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'No se pudo asignar suscripcion');

      notify('Suscripcion asignada correctamente', 'success');
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Error al asignar suscripcion', 'error');
    }
  }, [assignPlanForm, notify, refreshData]);

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
    if (!sub) return { label: 'Sin suscripcion', cls: 'bg-rose-900/50 text-rose-200' };
    if (sub.suscripcion_estado === 'TRIAL') return { label: 'TRIAL 14 dias', cls: 'bg-sky-900/50 text-sky-200' };
    if (sub.suscripcion_estado === 'ACTIVA') return { label: 'ACTIVA', cls: 'bg-emerald-900/50 text-emerald-200' };
    return { label: sub.suscripcion_estado, cls: 'bg-amber-900/50 text-amber-200' };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        Cargando panel SuperAdmin...
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">CliniCore</p>
          <h1 className="mt-2 text-2xl font-bold">SuperAdmin</h1>
          <p className="mt-1 text-sm text-slate-400">{session.email}</p>

          <nav className="mt-8 space-y-2">
            <button
              type="button"
              onClick={() => setSection('clinicas')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                section === 'clinicas' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FiHome size={16} />
              Clinicas
            </button>
            <button
              type="button"
              onClick={() => setSection('suscripciones')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                section === 'suscripciones' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FiCreditCard size={16} />
              Suscripciones
            </button>
            <button
              type="button"
              onClick={() => setSection('usuarios')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                section === 'usuarios' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FiUsers size={16} />
              Usuarios
            </button>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {section === 'clinicas' && 'Gestion de clinicas'}
                  {section === 'suscripciones' && 'Gestion de suscripciones'}
                  {section === 'usuarios' && 'Usuarios de clinicas'}
                </h2>
                <p className="text-sm text-slate-400">Gestion total desde panel SuperAdmin</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 disabled:opacity-60"
                >
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-500"
                >
                  <FiLogOut size={16} />
                  Cerrar sesion
                </button>
              </div>
            </div>
          </header>

          <main className="px-6 py-6">
            {message && (
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                  messageType === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                }`}
              >
                {message}
              </div>
            )}

            <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Clinicas</h3>
                <div className="mt-3 space-y-2 max-h-[70vh] overflow-auto pr-1">
                  {clinicas.map((clinica) => {
                    const sub = suscripciones.find((s) => s.clinica_id === clinica.id) || null;
                    const badge = getSubBadge(sub);
                    return (
                      <button
                        key={clinica.id}
                        type="button"
                        onClick={() => {
                          setSelectedClinicaId(clinica.id);
                          setAssignPlanForm((prev) => ({ ...prev, clinica_id: clinica.id }));
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-left ${
                          selectedClinicaId === clinica.id
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800 hover:bg-slate-700/80'
                        }`}
                      >
                        <p className="font-semibold">{clinica.nombre}</p>
                        <p className="text-xs text-slate-400">{clinica.tipo_negocio_nombre || clinica.tipo_negocio_codigo || 'Sin tipo'}</p>
                        <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</p>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                {section === 'clinicas' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                        <h4 className="font-semibold">Crear clinica</h4>
                        <div className="mt-3 grid gap-2">
                          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre" value={createClinica.nombre} onChange={(e) => setCreateClinica((p) => ({ ...p, nombre: e.target.value }))} />
                          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="RUC (opcional)" value={createClinica.ruc} onChange={(e) => setCreateClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Direccion" value={createClinica.direccion} onChange={(e) => setCreateClinica((p) => ({ ...p, direccion: e.target.value }))} />
                          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Telefono" value={createClinica.telefono} onChange={(e) => setCreateClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                          <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={createClinica.tipo_negocio_id} onChange={(e) => setCreateClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                            <option value="">Selecciona tipo de negocio</option>
                            {tipos.map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                          </select>
                          <button type="button" onClick={handleCreateClinica} className="mt-1 rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Crear clinica</button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                        <h4 className="font-semibold">Editar clinica seleccionada</h4>
                        {!selectedClinica && <p className="mt-2 text-sm text-slate-400">Selecciona una clinica desde la izquierda.</p>}
                        {selectedClinica && (
                          <div className="mt-3 grid gap-2">
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre" value={editClinica.nombre} onChange={(e) => setEditClinica((p) => ({ ...p, nombre: e.target.value }))} />
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="RUC" value={editClinica.ruc} onChange={(e) => setEditClinica((p) => ({ ...p, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Direccion" value={editClinica.direccion} onChange={(e) => setEditClinica((p) => ({ ...p, direccion: e.target.value }))} />
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Telefono" value={editClinica.telefono} onChange={(e) => setEditClinica((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 20) }))} />
                            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={editClinica.tipo_negocio_id} onChange={(e) => setEditClinica((p) => ({ ...p, tipo_negocio_id: e.target.value }))}>
                              <option value="">Selecciona tipo de negocio</option>
                              {tipos.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                              ))}
                            </select>
                            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={editClinica.estado} onChange={(e) => setEditClinica((p) => ({ ...p, estado: e.target.value as 'ACTIVA' | 'INACTIVA' }))}>
                              <option value="ACTIVA">ACTIVA</option>
                              <option value="INACTIVA">INACTIVA</option>
                            </select>
                            <button type="button" onClick={handleUpdateClinica} className="mt-1 rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">Guardar cambios</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <h4 className="font-semibold">Administradores de la clinica</h4>
                      {!selectedClinica && <p className="mt-2 text-sm text-slate-400">Selecciona una clinica para ver y crear admins.</p>}
                      {selectedClinica && (
                        <>
                          <div className="mt-2 space-y-2">
                            {adminsPorClinica.length === 0 && <p className="text-sm text-slate-400">No hay admins registrados.</p>}
                            {adminsPorClinica.map((admin) => (
                              <div key={admin.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                                <div>
                                  <p>{admin.email}</p>
                                  <p className="text-xs text-slate-400">{admin.persona_id || 'Sin persona'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUsuario(admin)}
                                  className={`rounded px-2 py-1 text-xs font-semibold ${admin.estado === 'ACTIVO' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                >
                                  {admin.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 grid gap-2 border-t border-slate-700 pt-4">
                            <p className="text-sm font-semibold text-cyan-300">Crear nuevo ADMIN</p>
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Email" value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} />
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="DNI" value={adminForm.dni} onChange={(e) => setAdminForm((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />
                            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Contrasena" type="password" value={adminForm.password} onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))} />
                            <button type="button" onClick={handleCreateAdmin} className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Crear ADMIN</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {section === 'suscripciones' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <h4 className="font-semibold">Asignar o modificar suscripcion</h4>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assignPlanForm.clinica_id} onChange={(e) => setAssignPlanForm((p) => ({ ...p, clinica_id: e.target.value }))}>
                          <option value="">Selecciona clinica</option>
                          {clinicas.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assignPlanForm.plan_id} onChange={(e) => setAssignPlanForm((p) => ({ ...p, plan_id: e.target.value }))}>
                          <option value="">Selecciona plan</option>
                          {planes.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                          ))}
                        </select>
                        <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={assignPlanForm.estado} onChange={(e) => setAssignPlanForm((p) => ({ ...p, estado: e.target.value as typeof p.estado }))}>
                          <option value="TRIAL">TRIAL</option>
                          <option value="ACTIVA">ACTIVA</option>
                          <option value="PAST_DUE">PAST_DUE</option>
                          <option value="SUSPENDIDA">SUSPENDIDA</option>
                          <option value="CANCELADA">CANCELADA</option>
                          <option value="EXPIRADA">EXPIRADA</option>
                        </select>
                        <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Duracion en dias" value={assignPlanForm.duracion_dias} onChange={(e) => setAssignPlanForm((p) => ({ ...p, duracion_dias: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
                      </div>
                      <button type="button" onClick={handleAssignPlan} className="mt-3 rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Guardar suscripcion</button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-800 text-left">
                          <tr>
                            <th className="px-3 py-2">Clinica</th>
                            <th className="px-3 py-2">Plan</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Vence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clinicas.map((c) => {
                            const sub = suscripciones.find((s) => s.clinica_id === c.id) || null;
                            return (
                              <tr key={c.id} className="border-t border-slate-800">
                                <td className="px-3 py-2">{c.nombre}</td>
                                <td className="px-3 py-2">{sub?.plan_nombre || sub?.plan_codigo || 'Sin plan'}</td>
                                <td className="px-3 py-2">{sub?.suscripcion_estado || 'SIN_SUSCRIPCION'}</td>
                                <td className="px-3 py-2">{formatDate(sub?.periodo_actual_fin)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'usuarios' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-sm text-slate-300">
                        Visualizacion global de usuarios por clinica, con accion para activar y desactivar.
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-800 text-left">
                          <tr>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Rol</th>
                            <th className="px-3 py-2">Clinica</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Accion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map((u) => {
                            const clinica = clinicas.find((c) => c.id === u.clinica_id);
                            return (
                              <tr key={u.id} className="border-t border-slate-800">
                                <td className="px-3 py-2">{u.email}</td>
                                <td className="px-3 py-2">{u.rol}</td>
                                <td className="px-3 py-2">{clinica?.nombre || 'Sin clinica'}</td>
                                <td className="px-3 py-2">{u.estado}</td>
                                <td className="px-3 py-2">
                                  {u.rol !== 'SUPERADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUsuario(u)}
                                      className={`rounded px-2 py-1 text-xs font-semibold ${u.estado === 'ACTIVO' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                    >
                                      {u.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
