'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../css/superadmin.css';

const API_BASE = '/api/backend';
const API_ME = `${API_BASE}/usuarios/me`;
const API_REFRESH = `${API_BASE}/usuarios/refresh`;
const API_CSRF = `${API_BASE}/usuarios/csrf`;
const API_LOGOUT = `${API_BASE}/usuarios/logout`;
const API_CLINICAS = `${API_BASE}/clinicas`;
const API_CLINICAS_ACTIVAS = `${API_BASE}/clinicas/public/activas`;
const API_USUARIOS = `${API_BASE}/usuarios`;
const API_PERSONAS = `${API_BASE}/personas`;
const API_SESIONES = `${API_BASE}/admin/sesiones`;
const API_SYSTEM_STATUS = `${API_BASE}/admin/system-status`;
const MAX_TOOLTIP_ITEMS = 10;

type SessionState = 'loading' | 'allowed' | 'denied';

type UsuarioSesion = {
  id?: string;
  email?: string;
  rol?: string;
  estado?: string;
  persona_id?: string;
  clinica_id?: string | null;
};

const TABS = ['Dashboard', 'Clinicas', 'Usuarios', 'Personas', 'Sesiones'] as const;
type SuperadminTab = (typeof TABS)[number];

const CHART_BARS_FALLBACK = [32, 140, 182, 221, 104, 139, 88];

type DashboardStats = {
  clinicasTotal: number;
  clinicasActivas: number;
  clinicasActivasNombres: string[];
  usuariosTotal: number;
  usuariosActivos: number;
  usuariosActivosNombres: string[];
  sesionesActivas: number;
  actividadSemanal: Array<{ dia: string; etiqueta: string; total: number }>;
  seguridad: Array<{ nombre: string; valor: string }>;
};

type Clinica = {
  id: string;
  nombre: string;
  ruc?: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  direccion?: string | null;
  telefono?: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type ClinicaForm = {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  estado: 'ACTIVA' | 'INACTIVA';
};

type UsuarioAdmin = {
  id: string;
  clinica_id?: string | null;
  persona_id: string;
  email: string;
  rol: 'ADMIN' | 'DOCTOR' | 'STAFF' | 'SUPERADMIN';
  estado: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type UsuarioForm = {
  clinica_id: string;
  persona_id: string;
  email: string;
  password: string;
  rol: 'ADMIN' | 'DOCTOR' | 'STAFF';
};

type PersonaOption = {
  id: string;
  dni?: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
};

type PersonaAdmin = {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: 'MASCULINO' | 'FEMENINO';
  fecha_nacimiento: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type PersonaForm = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: 'MASCULINO' | 'FEMENINO';
  fecha_nacimiento: string;
};

type Sesion = {
  id: string;
  usuario_id: string;
  email?: string;
  rol?: string;
  clinica_id?: string | null;
  expires_at: string;
  revoked_at?: string | null;
  created_at: string;
};

function ordenarClinicas(lista: Clinica[]) {
  return [...lista].sort((a, b) => {
    const aDeleted = Boolean(a.deleted_at);
    const bDeleted = Boolean(b.deleted_at);

    if (aDeleted !== bDeleted) {
      return aDeleted ? 1 : -1;
    }

    if (!aDeleted && !bDeleted) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return new Date(b.deleted_at || 0).getTime() - new Date(a.deleted_at || 0).getTime();
  });
}

function ordenarUsuarios(lista: UsuarioAdmin[]) {
  return [...lista].sort((a, b) => {
    const aDeleted = Boolean(a.deleted_at);
    const bDeleted = Boolean(b.deleted_at);

    if (aDeleted !== bDeleted) {
      return aDeleted ? 1 : -1;
    }

    if (!aDeleted && !bDeleted) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return new Date(b.deleted_at || 0).getTime() - new Date(a.deleted_at || 0).getTime();
  });
}

function ordenarPersonas(lista: PersonaAdmin[]) {
  return [...lista].sort((a, b) => {
    const aDeleted = Boolean(a.deleted_at);
    const bDeleted = Boolean(b.deleted_at);

    if (aDeleted !== bDeleted) {
      return aDeleted ? 1 : -1;
    }

    if (!aDeleted && !bDeleted) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return new Date(b.deleted_at || 0).getTime() - new Date(a.deleted_at || 0).getTime();
  });
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase();
}

function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function toLocalDateKey(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateQuery(query: string) {
  const normalized = query.trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const latamMatch = normalized.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
  if (latamMatch) {
    return `${latamMatch[3]}-${latamMatch[2]}-${latamMatch[1]}`;
  }

  return null;
}

function getTodayLocalIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className="pagination-container" style={{ marginTop: '16px', textAlign: 'center' }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            backgroundColor: currentPage === pageNum ? '#3498db' : '#f0f0f0',
            color: currentPage === pageNum ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPage === pageNum ? 'bold' : 'normal'
          }}
        >
          {pageNum}
        </button>
      ))}
    </div>
  );
}

export default function SuperadminPage() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>('loading');
  const [message, setMessage] = useState('Validando sesión...');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [activeTab, setActiveTab] = useState<SuperadminTab>('Dashboard');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [selectedEndDate, setSelectedEndDate] = useState(getTodayLocalIso());
  const [searchQuery, setSearchQuery] = useState('');
  const [openListCard, setOpenListCard] = useState<'clinicas' | 'usuarios' | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicasLoading, setClinicasLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
  const [usuarioModalMode, setUsuarioModalMode] = useState<'create' | 'edit'>('create');
  const [usuarioEditingId, setUsuarioEditingId] = useState<string | null>(null);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>({
    clinica_id: '',
    persona_id: '',
    email: '',
    password: '',
    rol: 'ADMIN'
  });
  const [usuarioMessage, setUsuarioMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [personasOpciones, setPersonasOpciones] = useState<PersonaOption[]>([]);
  const [personas, setPersonas] = useState<PersonaAdmin[]>([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [personaModalMode, setPersonaModalMode] = useState<'create' | 'edit'>('create');
  const [personaCreateMode, setPersonaCreateMode] = useState<'dni' | 'manual'>('dni');
  const [personaEditingId, setPersonaEditingId] = useState<string | null>(null);
  const [personaForm, setPersonaForm] = useState<PersonaForm>({
    dni: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    sexo: 'MASCULINO',
    fecha_nacimiento: ''
  });
  const [personaMessage, setPersonaMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [clinicaPaginaActual, setClinicaPaginaActual] = useState(1);
  const [usuarioPaginaActual, setUsuarioPaginaActual] = useState(1);
  const [personaPaginaActual, setPersonaPaginaActual] = useState(1);
  const [sesionPaginaActual, setSesionPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 9;
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [sesionesLoading, setSesionesLoading] = useState(false);
  const [sessionIdActual, setSessionIdActual] = useState<string | null>(null);
  const [clinicasOpciones, setClinicasOpciones] = useState<Clinica[]>([]);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [clinicaModalOpen, setClinicaModalOpen] = useState(false);
  const [clinicaModalMode, setClinicaModalMode] = useState<'create' | 'edit'>('create');
  const [clinicaEditingId, setClinicaEditingId] = useState<string | null>(null);
  const [clinicaForm, setClinicaForm] = useState<ClinicaForm>({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    estado: 'ACTIVA'
  });
  const [clinicaMessage, setClinicaMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    clinicasTotal: 0,
    clinicasActivas: 0,
    clinicasActivasNombres: [],
    usuariosTotal: 0,
    usuariosActivos: 0,
    usuariosActivosNombres: [],
    sesionesActivas: 0,
    actividadSemanal: CHART_BARS_FALLBACK.map((total, index) => ({
      dia: `${index}`,
      etiqueta: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][index] || 'DIA',
      total
    })),
    seguridad: []
  });

  const getCookieValue = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || '';
    }
    return '';
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setIsExiting(true);
    try {
      await fetch(API_CSRF, { credentials: 'include' });
      const csrfToken = getCookieValue('csrf_token');

      await fetch(API_LOGOUT, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined
      });
    } catch {
      // Redirigir de todas formas para evitar bloqueo en UI
    } finally {
      setTimeout(() => {
        router.replace('/login');
      }, 420);
    }
  };

  const getCsrfHeader = async () => {
    await fetch(API_CSRF, { credentials: 'include' });
    const token = getCookieValue('csrf_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-csrf-token'] = token;
    }
    return headers;
  };

  const refreshDashboardStats = useCallback(async () => {
    try {
      const [clinicasResp, clinicasActivasResp, usuariosResp, sesionesResp, systemResp] = await Promise.all([
        fetch(API_CLINICAS, { credentials: 'include' }),
        fetch(API_CLINICAS_ACTIVAS, { credentials: 'include' }),
        fetch(API_USUARIOS, { credentials: 'include' }),
        fetch(API_SESIONES, { credentials: 'include' }),
        fetch(`${API_SYSTEM_STATUS}?endDate=${selectedEndDate}`, { credentials: 'include' })
      ]);

      const clinicasData = clinicasResp.ok ? await clinicasResp.json() : { data: [] };
      const clinicasActivasData = clinicasActivasResp.ok ? await clinicasActivasResp.json() : { data: [] };
      const usuariosData = usuariosResp.ok ? await usuariosResp.json() : { data: [] };
      const sesionesData = sesionesResp.ok ? await sesionesResp.json() : { data: [] };
      const systemData = systemResp.ok ? await systemResp.json() : { data: { actividad7dias: [] } };

      const clinicas = Array.isArray(clinicasData.data) ? clinicasData.data : [];
      const clinicasActivas = Array.isArray(clinicasActivasData.data) ? clinicasActivasData.data : [];
      const usuarios = Array.isArray(usuariosData.data) ? usuariosData.data : [];
      const sesiones = Array.isArray(sesionesData.data) ? sesionesData.data : [];
      const actividad = Array.isArray(systemData.data?.actividad7dias)
        ? systemData.data.actividad7dias.map((item: { dia?: string; etiqueta?: string; total?: number }) => ({
            dia: item.dia || '',
            etiqueta: item.etiqueta || 'DIA',
            total: item.total || 0
          }))
        : CHART_BARS_FALLBACK.map((total, index) => ({
            dia: `${index}`,
            etiqueta: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][index] || 'DIA',
            total
          }));

      const seguridad = Array.isArray(systemData.data?.seguridad)
        ? systemData.data.seguridad
        : [];

      const usuariosActivos = usuarios.filter((item: { estado?: string }) => item.estado === 'ACTIVO');

      setStats({
        clinicasTotal: clinicas.length,
        clinicasActivas: clinicasActivas.length,
        clinicasActivasNombres: clinicasActivas
          .map((item: { nombre?: string }) => item.nombre || 'Sin nombre'),
        usuariosTotal: usuarios.length,
        usuariosActivos: usuariosActivos.length,
        usuariosActivosNombres: usuariosActivos
          .map((item: { email?: string }) => item.email || 'Sin email'),
        sesionesActivas: sesiones.length,
        actividadSemanal: actividad,
        seguridad
      });
    } catch {
      // Mantener fallback visual en caso de error
    }
  }, [selectedEndDate]);

  const cargarClinicas = async (silent = false) => {
    if (!silent) {
      setClinicasLoading(true);
    }
    try {
      const response = await fetch(API_CLINICAS, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setClinicas(ordenarClinicas(data.data));
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'No se pudo cargar el listado de clínicas.' });
    } finally {
      if (!silent) {
        setClinicasLoading(false);
      }
    }
  };

  const cargarUsuarios = async (silent = false) => {
    if (!silent) {
      setUsuariosLoading(true);
    }

    try {
      const response = await fetch(API_USUARIOS, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setUsuarios(ordenarUsuarios(data.data));
      }
    } catch {
      setUsuarioMessage({ type: 'error', text: 'No se pudo cargar el listado de usuarios.' });
    } finally {
      if (!silent) {
        setUsuariosLoading(false);
      }
    }
  };

  const cargarOpcionesUsuarios = async () => {
    try {
      const [personasResp, clinicasResp] = await Promise.all([
        fetch(API_PERSONAS, { credentials: 'include' }),
        fetch(API_CLINICAS_ACTIVAS, { credentials: 'include' })
      ]);

      const personasData = personasResp.ok ? await personasResp.json() : { data: [] };
      const clinicasData = clinicasResp.ok ? await clinicasResp.json() : { data: [] };

      setPersonasOpciones(Array.isArray(personasData.data) ? personasData.data : []);
      setClinicasOpciones(Array.isArray(clinicasData.data) ? clinicasData.data : []);
    } catch {
      setUsuarioMessage({ type: 'error', text: 'No se pudieron cargar personas y clínicas para usuarios.' });
    }
  };

  const abrirModalCrearUsuario = () => {
    setUsuarioModalMode('create');
    setUsuarioEditingId(null);
    setUsuarioForm({ clinica_id: '', persona_id: '', email: '', password: '', rol: 'ADMIN' });
    setUsuarioMessage(null);
    setUsuarioModalOpen(true);
  };

  const abrirModalEditarUsuario = (usuario: UsuarioAdmin) => {
    setUsuarioModalMode('edit');
    setUsuarioEditingId(usuario.id);
    setUsuarioForm({
      clinica_id: usuario.clinica_id || '',
      persona_id: usuario.persona_id,
      email: usuario.email,
      password: '',
      rol: usuario.rol === 'SUPERADMIN' ? 'ADMIN' : usuario.rol
    });
    setUsuarioMessage(null);
    setUsuarioModalOpen(true);
  };

  const guardarUsuario = async (event: React.FormEvent) => {
    event.preventDefault();
    setUsuarioMessage(null);

    if (!usuarioFormValidation.formValido) {
      setUsuarioMessage({ type: 'error', text: 'Completa correctamente todos los campos obligatorios.' });
      return;
    }

    try {
      const csrfHeaders = await getCsrfHeader();
      const isEdit = usuarioModalMode === 'edit' && usuarioEditingId;
      const endpoint = isEdit ? `${API_USUARIOS}/${usuarioEditingId}` : API_USUARIOS;
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, string> = {
        clinica_id: usuarioForm.clinica_id,
        persona_id: usuarioForm.persona_id,
        email: usuarioForm.email.trim(),
        rol: usuarioForm.rol
      };

      if (!isEdit || usuarioForm.password.trim()) {
        payload.password = usuarioForm.password;
      }

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setUsuarioMessage({ type: 'error', text: data.error || 'No se pudo guardar el usuario.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo guardar el usuario.' });
        return;
      }

      const successMsg = isEdit ? 'Usuario actualizado.' : 'Usuario creado.';
      setUsuarioMessage({ type: 'success', text: successMsg });
      setGlobalMessage({ type: 'success', text: successMsg });
      if (data.data) {
        setUsuarios((prev) => {
          if (isEdit) {
            return ordenarUsuarios(prev.map((item) => (item.id === data.data.id ? data.data : item)));
          }
          return ordenarUsuarios([data.data, ...prev]);
        });
      }

      setUsuarioModalOpen(false);
      await cargarUsuarios(true);

      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setUsuarioMessage({ type: 'error', text: 'Error de conexión al guardar usuario.' });
    }
  };

  const desactivarUsuario = async (id: string) => {
    setUsuarioMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_USUARIOS}/${id}/desactivar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });

      const data = await response.json();
      if (!response.ok) {
        setUsuarioMessage({ type: 'error', text: data.error || 'No se pudo desactivar el usuario.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo desactivar el usuario.' });
        return;
      }

      setUsuarioMessage({ type: 'success', text: 'Usuario desactivado.' });
      setGlobalMessage({ type: 'success', text: 'Usuario desactivado.' });
      if (data.data) {
        setUsuarios((prev) => ordenarUsuarios(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }

      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setUsuarioMessage({ type: 'error', text: 'Error de conexión al desactivar usuario.' });
    }
  };

  const reactivarUsuario = async (id: string) => {
    setUsuarioMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_USUARIOS}/${id}/reactivar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });

      const data = await response.json();
      if (!response.ok) {
        setUsuarioMessage({ type: 'error', text: data.error || 'No se pudo reactivar el usuario.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo reactivar el usuario.' });
        return;
      }

      setUsuarioMessage({ type: 'success', text: 'Usuario reactivado.' });
      setGlobalMessage({ type: 'success', text: 'Usuario reactivado.' });
      if (data.data) {
        setUsuarios((prev) => ordenarUsuarios(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }

      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setUsuarioMessage({ type: 'error', text: 'Error de conexión al reactivar usuario.' });
    }
  };

  const abrirModalCrearClinica = () => {
    setClinicaModalMode('create');
    setClinicaEditingId(null);
    setClinicaForm({ nombre: '', ruc: '', direccion: '', telefono: '', estado: 'ACTIVA' });
    setClinicaMessage(null);
    setClinicaModalOpen(true);
  };

  const cargarPersonas = async (silent = false) => {
    if (!silent) {
      setPersonasLoading(true);
    }

    try {
      const response = await fetch(API_PERSONAS, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setPersonas(ordenarPersonas(data.data));
      }
    } catch {
      setPersonaMessage({ type: 'error', text: 'No se pudo cargar el listado de personas.' });
    } finally {
      if (!silent) {
        setPersonasLoading(false);
      }
    }
  };

  const cargarSesiones = async (silent = false) => {
    if (!silent) {
      setSesionesLoading(true);
    }

    try {
      const response = await fetch(API_SESIONES, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setSesiones(data.data);
      }
    } catch {
      setGlobalMessage({ type: 'error', text: 'No se pudo cargar el listado de sesiones.' });
    } finally {
      if (!silent) {
        setSesionesLoading(false);
      }
    }
  };

  const revocarSesion = async (sesionId: string) => {
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_SESIONES}/${sesionId}/revocar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });

      if (response.ok) {
        // Remover la sesión de la lista localmente
        setSesiones((prev) => prev.filter((sesion) => sesion.id !== sesionId));

        // Si es la sesión actual, redirigir a login
        const sesionIdActualFromStorage = localStorage.getItem('sessionId');
        if (sesionId === sesionIdActualFromStorage) {
          localStorage.removeItem('sessionId');
          setGlobalMessage({ type: 'success', text: 'Sesión revocada. Redirigiendo a login...' });
          setTimeout(() => {
            router.push('/login');
          }, 1000);
        } else {
          setGlobalMessage({ type: 'success', text: 'Sesión revocada correctamente.' });
        }
      } else {
        setGlobalMessage({ type: 'error', text: 'No se pudo revocar la sesión.' });
      }
    } catch {
      setGlobalMessage({ type: 'error', text: 'Error al revocar la sesión.' });
    }
  };

  const abrirModalCrearPersona = () => {
    setPersonaModalMode('create');
    setPersonaCreateMode('dni');
    setPersonaEditingId(null);
    setPersonaForm({
      dni: '',
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      sexo: 'MASCULINO',
      fecha_nacimiento: ''
    });
    setPersonaMessage(null);
    setPersonaModalOpen(true);
  };

  const abrirModalEditarPersona = (persona: PersonaAdmin) => {
    setPersonaModalMode('edit');
    setPersonaCreateMode('manual');
    setPersonaEditingId(persona.id);
    setPersonaForm({
      dni: persona.dni || '',
      nombres: persona.nombres || '',
      apellido_paterno: persona.apellido_paterno || '',
      apellido_materno: persona.apellido_materno || '',
      sexo: persona.sexo || 'MASCULINO',
      fecha_nacimiento: persona.fecha_nacimiento ? String(persona.fecha_nacimiento).slice(0, 10) : ''
    });
    setPersonaMessage(null);
    setPersonaModalOpen(true);
  };

  const guardarPersona = async (event: React.FormEvent) => {
    event.preventDefault();
    setPersonaMessage(null);

    if (personaModalMode === 'create' && personaCreateMode === 'dni') {
      if (!personaFormValidation.dniValido) {
        setPersonaMessage({ type: 'error', text: 'El DNI debe tener exactamente 8 dígitos.' });
        return;
      }

      try {
        const response = await fetch(`${API_PERSONAS}/dni/${personaForm.dni}`, {
          credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
          setPersonaMessage({ type: 'error', text: data.error || 'No se pudo crear/buscar la persona por DNI.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo crear/buscar la persona por DNI.' });
        return;
      }

      const successMsg = data.fuente === 'API' ? 'Persona creada por consulta DNI.' : 'Persona encontrada en BD por DNI.';
      setPersonaMessage({
        type: 'success',
        text: successMsg
      });
      setGlobalMessage({
        type: 'success',
        text: successMsg
      });

      if (data.data) {
        setPersonas((prev) => {
          const existe = prev.some((item) => item.id === data.data.id);
          if (existe) {
            return ordenarPersonas(prev.map((item) => (item.id === data.data.id ? data.data : item)));
          }
          return ordenarPersonas([data.data, ...prev]);
          });
          setPersonasOpciones((prev) => {
            const existe = prev.some((item) => item.id === data.data.id);
            if (existe) {
              return prev.map((item) => (item.id === data.data.id ? data.data : item));
            }
            return [data.data, ...prev];
          });
        }

        setPersonaModalOpen(false);
        await cargarPersonas(true);
        await cargarOpcionesUsuarios();
        return;
      } catch {
        setPersonaMessage({ type: 'error', text: 'Error de conexión al procesar DNI.' });
        return;
      }
    }

    if (!personaFormValidation.formValidoManual) {
      setPersonaMessage({ type: 'error', text: 'Completa correctamente todos los campos requeridos.' });
      return;
    }

    try {
      const csrfHeaders = await getCsrfHeader();
      const isEdit = personaModalMode === 'edit' && personaEditingId;
      const endpoint = isEdit ? `${API_PERSONAS}/${personaEditingId}` : API_PERSONAS;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        dni: personaForm.dni,
        nombres: personaForm.nombres.trim(),
        apellido_paterno: personaForm.apellido_paterno.trim(),
        apellido_materno: personaForm.apellido_materno.trim(),
        sexo: personaForm.sexo,
        fecha_nacimiento: personaForm.fecha_nacimiento
      };

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setPersonaMessage({ type: 'error', text: data.error || 'No se pudo guardar la persona.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo guardar la persona.' });
        return;
      }

      const successMsg = isEdit ? 'Persona actualizada.' : 'Persona creada.';
      setPersonaMessage({ type: 'success', text: successMsg });
      setGlobalMessage({ type: 'success', text: successMsg });

      if (data.data) {
        setPersonas((prev) => {
          if (isEdit) {
            return ordenarPersonas(prev.map((item) => (item.id === data.data.id ? data.data : item)));
          }
          return ordenarPersonas([data.data, ...prev]);
        });

        setPersonasOpciones((prev) => {
          const existe = prev.some((item) => item.id === data.data.id);
          if (existe) {
            return prev.map((item) => (item.id === data.data.id ? data.data : item));
          }
          return [data.data, ...prev];
        });
      }

      setPersonaModalOpen(false);
      await cargarPersonas(true);
      await cargarOpcionesUsuarios();
    } catch {
      setPersonaMessage({ type: 'error', text: 'Error de conexión al guardar persona.' });
    }
  };

  const desactivarPersona = async (id: string) => {
    setPersonaMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_PERSONAS}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders
      });

      const data = await response.json();
      if (!response.ok) {
        setPersonaMessage({ type: 'error', text: data.error || 'No se pudo desactivar la persona.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo desactivar la persona.' });
        return;
      }

      setPersonaMessage({ type: 'success', text: 'Persona desactivada (soft delete).' });
      setGlobalMessage({ type: 'success', text: 'Persona desactivada (soft delete).' });
      if (data.data) {
        setPersonas((prev) => ordenarPersonas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      await cargarPersonas(true);
      await cargarOpcionesUsuarios();
    } catch {
      setPersonaMessage({ type: 'error', text: 'Error de conexión al desactivar persona.' });
    }
  };

  const reactivarPersona = async (id: string) => {
    setPersonaMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_PERSONAS}/${id}/reactivar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });

      const data = await response.json();
      if (!response.ok) {
        setPersonaMessage({ type: 'error', text: data.error || 'No se pudo reactivar la persona.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo reactivar la persona.' });
        return;
      }

      setPersonaMessage({ type: 'success', text: 'Persona reactivada.' });
      setGlobalMessage({ type: 'success', text: 'Persona reactivada.' });
      if (data.data) {
        setPersonas((prev) => ordenarPersonas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      await cargarPersonas(true);
      await cargarOpcionesUsuarios();
    } catch {
      setPersonaMessage({ type: 'error', text: 'Error de conexión al reactivar persona.' });
    }
  };

  const abrirModalEditarClinica = (clinica: Clinica) => {
    setClinicaModalMode('edit');
    setClinicaEditingId(clinica.id);
    setClinicaForm({
      nombre: clinica.nombre || '',
      ruc: clinica.ruc || '',
      direccion: clinica.direccion || '',
      telefono: clinica.telefono || '',
      estado: clinica.estado || 'ACTIVA'
    });
    setClinicaMessage(null);
    setClinicaModalOpen(true);
  };

  const guardarClinica = async (event: React.FormEvent) => {
    event.preventDefault();
    setClinicaMessage(null);

    if (!clinicaFormValidation.nombreValido) {
      setClinicaMessage({ type: 'error', text: 'El nombre es obligatorio.' });
      return;
    }

    if (!clinicaFormValidation.rucValido) {
      setClinicaMessage({ type: 'error', text: 'El RUC debe tener exactamente 11 dígitos.' });
      return;
    }

    if (!clinicaFormValidation.direccionValida) {
      setClinicaMessage({ type: 'error', text: 'La dirección es obligatoria.' });
      return;
    }

    if (!clinicaFormValidation.telefonoValido) {
      setClinicaMessage({ type: 'error', text: 'El teléfono solo debe contener números.' });
      return;
    }

    try {
      const csrfHeaders = await getCsrfHeader();

      const payload = {
        nombre: clinicaForm.nombre.trim(),
        ruc: clinicaForm.ruc,
        direccion: clinicaForm.direccion.trim(),
        telefono: clinicaForm.telefono,
        estado: clinicaModalMode === 'create' ? 'ACTIVA' : clinicaForm.estado
      };

      const isEdit = clinicaModalMode === 'edit' && clinicaEditingId;
      const endpoint = isEdit ? `${API_CLINICAS}/${clinicaEditingId}` : API_CLINICAS;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo guardar la clínica.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo guardar la clínica.' });
        return;
      }

      const successMsg = isEdit ? 'Clínica actualizada.' : 'Clínica creada.';
      setClinicaMessage({ type: 'success', text: successMsg });
      setGlobalMessage({ type: 'success', text: successMsg });
      if (data.data) {
        setClinicas((prev) => {
          if (isEdit) {
            return ordenarClinicas(prev.map((item) => (item.id === data.data.id ? data.data : item)));
          }
          return ordenarClinicas([data.data, ...prev]);
        });
      }
      setClinicaModalOpen(false);
      await cargarClinicas(true);
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al guardar clínica.' });
    }
  };

  const desactivarClinica = async (id: string) => {
    setClinicaMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_CLINICAS}/${id}/desactivar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });
      const data = await response.json();
      if (!response.ok) {
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo desactivar la clínica.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo desactivar la clínica.' });
        return;
      }
      setClinicaMessage({ type: 'success', text: 'Clínica desactivada.' });
      setGlobalMessage({ type: 'success', text: 'Clínica desactivada.' });
      if (data.data) {
        setClinicas((prev) => ordenarClinicas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al desactivar clínica.' });
    }
  };

  const reactivarClinica = async (id: string) => {
    setClinicaMessage(null);
    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_CLINICAS}/${id}/reactivar`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders
      });
      const data = await response.json();
      if (!response.ok) {
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo reactivar la clínica.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo reactivar la clínica.' });
        return;
      }
      setClinicaMessage({ type: 'success', text: 'Clínica reactivada.' });
      setGlobalMessage({ type: 'success', text: 'Clínica reactivada.' });
      if (data.data) {
        setClinicas((prev) => ordenarClinicas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al reactivar clínica.' });
    }
  };

  useEffect(() => {
    const validateRole = async () => {
      try {
        const meResponse = await fetch(API_ME, { credentials: 'include' });

        if (meResponse.ok) {
          const data = await meResponse.json();
          if (data.data?.rol === 'SUPERADMIN') {
            setUsuario(data.data);
            setState('allowed');
            return;
          }

          setState('denied');
          setMessage('Tu usuario no tiene permisos de SUPERADMIN.');
          return;
        }

        if (meResponse.status === 401) {
          const refreshResponse = await fetch(API_REFRESH, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshResponse.ok) {
            const retryMeResponse = await fetch(API_ME, { credentials: 'include' });
            if (retryMeResponse.ok) {
              const retryData = await retryMeResponse.json();
              if (retryData.data?.rol === 'SUPERADMIN') {
                setUsuario(retryData.data);
                setState('allowed');
                return;
              }
            }
          }
        }

        setState('denied');
        setMessage('Tu sesión expiró o no tienes acceso. Inicia sesión nuevamente.');
      } catch {
        setState('denied');
        setMessage('No se pudo validar tu sesión. Intenta nuevamente.');
      }
    };

    validateRole();
  }, [router]);

  useEffect(() => {
    if (state !== 'allowed') return;
    const frame = requestAnimationFrame(() => setIsEntering(true));
    return () => cancelAnimationFrame(frame);
  }, [state]);

  useEffect(() => {
    // Obtener el ID de la sesión actual del localStorage
    const id = localStorage.getItem('sessionId');
    setSessionIdActual(id);
  }, []);

  useEffect(() => {
    if (state !== 'allowed') return;
    if (activeTab !== 'Dashboard') return;
    refreshDashboardStats();
  }, [state, activeTab, refreshDashboardStats]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Clinicas') {
      cargarClinicas();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Usuarios') {
      cargarUsuarios();
      cargarOpcionesUsuarios();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Personas') {
      cargarPersonas();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Sesiones') {
      cargarSesiones();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (!globalMessage) return;
    const timer = setTimeout(() => {
      setGlobalMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [globalMessage]);

  const clinicasProgress = stats.clinicasTotal > 0
    ? Math.round((stats.clinicasActivas / stats.clinicasTotal) * 100)
    : 0;

  const usuariosProgress = stats.usuariosTotal > 0
    ? Math.round((stats.usuariosActivos / stats.usuariosTotal) * 100)
    : 0;

  const sesionesProgress = stats.usuariosActivos > 0
    ? Math.min(100, Math.round((stats.sesionesActivas / stats.usuariosActivos) * 100))
    : 0;

  const actividadMaxTotal = useMemo(() => {
    const max = Math.max(...stats.actividadSemanal.map((item) => item.total || 0), 0);
    return max > 0 ? max : 1;
  }, [stats.actividadSemanal]);

  const clinicaFormValidation = useMemo(() => {
    const nombreValido = clinicaForm.nombre.trim().length > 0;
    const rucValido = /^\d{11}$/.test(clinicaForm.ruc);
    const direccionValida = clinicaForm.direccion.trim().length > 0;
    const telefonoValido = /^\d+$/.test(clinicaForm.telefono) && clinicaForm.telefono.trim().length > 0;

    return {
      nombreValido,
      rucValido,
      direccionValida,
      telefonoValido,
      formValido: nombreValido && rucValido && direccionValida && telefonoValido
    };
  }, [clinicaForm]);

  const usuarioFormValidation = useMemo(() => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuarioForm.email.trim());
    const personaValida = usuarioForm.persona_id.trim().length > 0;
    const clinicaValida = usuarioForm.clinica_id.trim().length > 0;
    const rolValido = ['ADMIN', 'DOCTOR', 'STAFF'].includes(usuarioForm.rol);
    const passwordValido = usuarioModalMode === 'edit'
      ? usuarioForm.password.trim().length === 0 || passwordRegex.test(usuarioForm.password)
      : passwordRegex.test(usuarioForm.password);

    return {
      emailValido,
      personaValida,
      clinicaValida,
      rolValido,
      passwordValido,
      formValido: emailValido && personaValida && clinicaValida && rolValido && passwordValido
    };
  }, [usuarioForm, usuarioModalMode]);

  const personaFormValidation = useMemo(() => {
    const dniValido = /^\d{8}$/.test(personaForm.dni);
    const nombresValidos = personaForm.nombres.trim().length > 0;
    const apellidoPaternoValido = personaForm.apellido_paterno.trim().length > 0;
    const apellidoMaternoValido = personaForm.apellido_materno.trim().length > 0;
    const sexoValido = ['MASCULINO', 'FEMENINO'].includes(personaForm.sexo);
    const fechaNacimientoValida = /^\d{4}-\d{2}-\d{2}$/.test(personaForm.fecha_nacimiento);

    return {
      dniValido,
      nombresValidos,
      apellidoPaternoValido,
      apellidoMaternoValido,
      sexoValido,
      fechaNacimientoValida,
      formValidoManual:
        dniValido &&
        nombresValidos &&
        apellidoPaternoValido &&
        apellidoMaternoValido &&
        sexoValido &&
        fechaNacimientoValida
    };
  }, [personaForm]);

  const personaNombrePorId = useMemo(() => {
    return personasOpciones.reduce<Record<string, string>>((acc, persona) => {
      const nombreCompleto = [persona.nombres, persona.apellido_paterno, persona.apellido_materno]
        .filter(Boolean)
        .join(' ')
        .trim();
      acc[persona.id] = nombreCompleto || persona.dni || persona.id;
      return acc;
    }, {});
  }, [personasOpciones]);

  const clinicaNombrePorId = useMemo(() => {
    return clinicasOpciones.reduce<Record<string, string>>((acc, clinica) => {
      acc[clinica.id] = clinica.nombre;
      return acc;
    }, {});
  }, [clinicasOpciones]);

  const searchHasEdgeSpaces = searchQuery.length > 0 && searchQuery !== searchQuery.trim();

  const filteredClinicas = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return clinicas;

    const queryDigits = onlyDigits(searchQuery);
    const dateQuery = parseDateQuery(searchQuery);

    return clinicas.filter((clinica) => {
      const createdKey = toLocalDateKey(clinica.created_at);
      if (dateQuery) {
        return createdKey === dateQuery;
      }

      const haystack = normalizeText([
        clinica.nombre,
        clinica.ruc || '',
        clinica.direccion || '',
        clinica.telefono || '',
        clinica.deleted_at ? 'inactiva desactivada' : 'activa',
        createdKey,
        new Date(clinica.created_at).toLocaleDateString('es-PE')
      ].join(' '));

      if (haystack.includes(query)) return true;

      if (queryDigits) {
        const clinicaDigits = onlyDigits([
          clinica.ruc || '',
          clinica.telefono || '',
          clinica.created_at
        ].join(' '));
        return clinicaDigits.includes(queryDigits);
      }

      return false;
    });
  }, [clinicas, searchQuery, searchHasEdgeSpaces]);

  const filteredClinicasActivasNombres = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    const source = stats.clinicasActivasNombres;
    if (!query) return source.slice(0, MAX_TOOLTIP_ITEMS);
    return source.filter((item) => normalizeText(item).includes(query)).slice(0, MAX_TOOLTIP_ITEMS);
  }, [stats.clinicasActivasNombres, searchQuery, searchHasEdgeSpaces]);

  const filteredUsuariosActivosNombres = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    const source = stats.usuariosActivosNombres;
    if (!query) return source.slice(0, MAX_TOOLTIP_ITEMS);
    return source.filter((item) => normalizeText(item).includes(query)).slice(0, MAX_TOOLTIP_ITEMS);
  }, [stats.usuariosActivosNombres, searchQuery, searchHasEdgeSpaces]);

  const filteredSeguridad = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return stats.seguridad;
    return stats.seguridad.filter((item) =>
      normalizeText(`${item.nombre} ${item.valor}`).includes(query)
    );
  }, [stats.seguridad, searchQuery, searchHasEdgeSpaces]);

  const filteredUsuarios = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return usuarios;

    const queryDigits = onlyDigits(searchQuery);
    return usuarios.filter((usuarioItem) => {
      const personaNombre = personaNombrePorId[usuarioItem.persona_id] || usuarioItem.persona_id;
      const clinicaNombre = clinicaNombrePorId[usuarioItem.clinica_id || ''] || usuarioItem.clinica_id || '-';
      const haystack = normalizeText([
        usuarioItem.email,
        usuarioItem.rol,
        usuarioItem.estado,
        personaNombre,
        clinicaNombre,
        new Date(usuarioItem.created_at).toLocaleDateString('es-PE')
      ].join(' '));

      if (haystack.includes(query)) return true;

      if (queryDigits) {
        const userDigits = onlyDigits([
          usuarioItem.email,
          usuarioItem.created_at,
          personaNombre
        ].join(' '));
        return userDigits.includes(queryDigits);
      }

      return false;
    });
  }, [usuarios, searchQuery, searchHasEdgeSpaces, personaNombrePorId, clinicaNombrePorId]);

  const filteredPersonas = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return personas;

    const queryDigits = onlyDigits(searchQuery);
    const dateQuery = parseDateQuery(searchQuery);

    return personas.filter((personaItem) => {
      const createdKey = toLocalDateKey(personaItem.created_at);
      const nacimientoKey = toLocalDateKey(personaItem.fecha_nacimiento);

      if (dateQuery) {
        return createdKey === dateQuery || nacimientoKey === dateQuery;
      }

      const haystack = normalizeText([
        personaItem.dni,
        personaItem.nombres,
        personaItem.apellido_paterno,
        personaItem.apellido_materno,
        personaItem.sexo,
        createdKey,
        nacimientoKey,
        new Date(personaItem.created_at).toLocaleDateString('es-PE'),
        new Date(personaItem.fecha_nacimiento).toLocaleDateString('es-PE')
      ].join(' '));

      if (haystack.includes(query)) return true;

      if (queryDigits) {
        const personaDigits = onlyDigits([
          personaItem.dni,
          personaItem.created_at,
          personaItem.fecha_nacimiento
        ].join(' '));
        return personaDigits.includes(queryDigits);
      }

      return false;
    });
  }, [personas, searchQuery, searchHasEdgeSpaces]);

  const filteredSesiones = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return sesiones;

    return sesiones.filter((sesionItem) => {
      const haystack = normalizeText([
        sesionItem.email || '',
        sesionItem.rol || '',
        new Date(sesionItem.created_at).toLocaleString('es-PE'),
        new Date(sesionItem.expires_at).toLocaleString('es-PE')
      ].join(' '));

      return haystack.includes(query);
    });
  }, [sesiones, searchQuery, searchHasEdgeSpaces]);

  if (state === 'loading') {
    return (
      <main className="superadmin-page">
        <section className="superadmin-loading">
          <p className="superadmin-message">Validando acceso de SUPERADMIN...</p>
        </section>
      </main>
    );
  }

  if (state === 'denied') {
    return (
      <main className="superadmin-page">
        <section className="superadmin-denied">
          <h1>Acceso denegado</h1>
          <p className="superadmin-message">{message}</p>
          <div>
            <Link
              href="/login"
              className="superadmin-login-btn"
            >
              Ir a Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`superadmin-page ${isEntering ? 'is-entered' : ''} ${isExiting ? 'is-exiting' : ''}`}>
      <div className={`superadmin-exit-overlay ${isExiting ? 'visible' : ''}`} aria-hidden="true" />
      <section className="superadmin-layout">
        <aside className="superadmin-sidebar">
          <div className="superadmin-brand">
            <div className="superadmin-brand-logo" aria-hidden="true">F</div>
            <h1 className="superadmin-title">SaaS Clínico</h1>
          </div>

          <p className="superadmin-nav-label">Main</p>
          <nav className="superadmin-nav">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`superadmin-tab ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="superadmin-sidebar-footer">
            <button
              type="button"
              className="superadmin-link logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>

            <div className="superadmin-user-footer">
              <p><strong>Usuario:</strong> {usuario?.email || 'No disponible'}</p>
              <p><strong>Rol:</strong> {usuario?.rol || 'SUPERADMIN'}</p>
              <p><strong>Estado:</strong> {usuario?.estado || 'ACTIVO'}</p>
            </div>
          </div>
        </aside>

        <section className="superadmin-content">
          <header className="superadmin-topbar">
            <input
              className="superadmin-search"
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </header>

          <div className="superadmin-heading-wrap">
            <div>
              <p className="superadmin-kicker">Panel principal</p>
              <h2 className="superadmin-heading">{activeTab}</h2>
              <p className="superadmin-description">Control operativo del sistema clínico.</p>
            </div>
            <div className="superadmin-badges">
              <span className="badge-open">Activo</span>
              <span className="badge-role">{usuario?.rol || 'SUPERADMIN'}</span>
            </div>
          </div>

          {activeTab === 'Dashboard' ? (
            <section className="superadmin-dashboard">
              <div className="dashboard-grid">
                <article
                  className="metric-ring-card"
                  onMouseEnter={() => setOpenListCard('clinicas')}
                  onMouseLeave={() => setOpenListCard((prev) => (prev === 'clinicas' ? null : prev))}
                >
                  <h3>Clínicas activas</h3>
                  <div
                    className="metric-ring"
                    style={{
                      ['--progress' as string]: `${clinicasProgress}%`,
                      ['--ring-color' as string]: '#35b5cf'
                    } as CSSProperties}
                  >
                    <div className="metric-ring-inner">
                      <strong>{stats.clinicasActivas}</strong>
                      <span>{stats.clinicasTotal} totales</span>
                    </div>
                  </div>
                  {openListCard === 'clinicas' && (
                    <div className="metric-popover">
                      <p>Clínicas activas (máx. 10)</p>
                      <ul>
                        {filteredClinicasActivasNombres.length > 0 ? (
                          filteredClinicasActivasNombres.map((nombre) => <li key={nombre}>{nombre}</li>)
                        ) : (
                          <li>Sin datos disponibles</li>
                        )}
                      </ul>
                    </div>
                  )}
                </article>

                <article
                  className="metric-ring-card"
                  onMouseEnter={() => setOpenListCard('usuarios')}
                  onMouseLeave={() => setOpenListCard((prev) => (prev === 'usuarios' ? null : prev))}
                >
                  <h3>Usuarios activos</h3>
                  <div
                    className="metric-ring"
                    style={{
                      ['--progress' as string]: `${usuariosProgress}%`,
                      ['--ring-color' as string]: '#3498db'
                    } as CSSProperties}
                  >
                    <div className="metric-ring-inner">
                      <strong>{stats.usuariosActivos}</strong>
                      <span>{stats.usuariosTotal} totales</span>
                    </div>
                  </div>
                  {openListCard === 'usuarios' && (
                    <div className="metric-popover">
                      <p>Usuarios activos (máx. 10)</p>
                      <ul>
                        {filteredUsuariosActivosNombres.length > 0 ? (
                          filteredUsuariosActivosNombres.map((nombre) => <li key={nombre}>{nombre}</li>)
                        ) : (
                          <li>Sin datos disponibles</li>
                        )}
                      </ul>
                    </div>
                  )}
                </article>

                <article className="sessions-card">
                  <h3>Sesiones activas</h3>
                  <p className="sessions-value">{stats.sesionesActivas}</p>
                  <div className="sessions-bar-track">
                    <div className="sessions-bar-fill" style={{ width: `${sesionesProgress}%` }} />
                  </div>
                  <p className="sessions-caption">{sesionesProgress}% sobre usuarios activos</p>
                </article>
              </div>

              <article className="superadmin-chart-card chart-wide">
                <div className="chart-header">
                  <div className="chart-header-left">
                    <h3>Actividad semanal</h3>
                    <input
                      type="date"
                      value={selectedEndDate}
                      onChange={(event) => setSelectedEndDate(event.target.value)}
                      className="chart-date-picker"
                      max={getTodayLocalIso()}
                    />
                  </div>
                  <span>Últimos 7 días hasta la fecha seleccionada</span>
                </div>
                <div className="bars-wrap" aria-hidden="true">
                  {stats.actividadSemanal.map((item) => (
                    <div key={`${item.dia}-${item.etiqueta}`} className="bar-col">
                      <div className="bar-track">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(8, Math.round((item.total / actividadMaxTotal) * 100))}%`
                          }}
                        />
                      </div>
                      <span className="bar-day-label">{item.etiqueta}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="superadmin-card card-small">
                <h3>Implementos de seguridad</h3>
                {filteredSeguridad.length > 0 ? (
                  <ul className="security-list">
                    {filteredSeguridad.map((item) => (
                      <li key={`${item.nombre}-${item.valor}`}>
                        <strong>{item.nombre}:</strong> {item.valor}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sin datos de seguridad disponibles.</p>
                )}
              </article>
            </section>
          ) : activeTab === 'Clinicas' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de clínicas</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearClinica}>
                    Nueva clínica
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>RUC</th>
                        <th>Dirección</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th>Creación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinicasLoading ? (
                        <tr>
                          <td colSpan={7}>Cargando clínicas...</td>
                        </tr>
                      ) : filteredClinicas.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No hay resultados para la búsqueda.</td>
                        </tr>
                      ) : (
                        filteredClinicas
                          .slice(
                            (clinicaPaginaActual - 1) * ITEMS_POR_PAGINA,
                            clinicaPaginaActual * ITEMS_POR_PAGINA
                          )
                          .map((clinica) => {
                            const desactivada = Boolean(clinica.deleted_at);
                            return (
                              <tr key={clinica.id} className={desactivada ? 'clinica-row-disabled' : ''}>
                                <td>{clinica.nombre}</td>
                                <td>{clinica.ruc || '-'}</td>
                                <td>{clinica.direccion || '-'}</td>
                                <td>{clinica.telefono || '-'}</td>
                                <td>{desactivada ? 'INACTIVA' : 'ACTIVA'}</td>
                                <td>{new Date(clinica.created_at).toLocaleString('es-PE')}</td>
                                <td>
                                  <div className="clinica-actions">
                                    <button type="button" onClick={() => abrirModalEditarClinica(clinica)}>Editar</button>
                                    {desactivada ? (
                                      <button type="button" className="reactivar" onClick={() => reactivarClinica(clinica.id)}>
                                        Reactivar
                                      </button>
                                    ) : (
                                      <button type="button" className="desactivar" onClick={() => desactivarClinica(clinica.id)}>
                                        Desactivar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredClinicas.length > ITEMS_POR_PAGINA && (
                  <Pagination
                    totalItems={filteredClinicas.length}
                    itemsPerPage={ITEMS_POR_PAGINA}
                    currentPage={clinicaPaginaActual}
                    onPageChange={setClinicaPaginaActual}
                  />
                )}
              </article>

              {clinicaModalOpen && (
                <div className="clinica-modal-backdrop" role="dialog" aria-modal="true">
                  <section className="clinica-modal">
                    <h3>{clinicaModalMode === 'create' ? 'Nueva clínica' : 'Editar clínica'}</h3>

                    <form onSubmit={guardarClinica} className="clinica-form">
                      <label>
                        Nombre
                        <input
                          value={clinicaForm.nombre}
                          onChange={(event) => setClinicaForm((prev) => ({ ...prev, nombre: event.target.value }))}
                          required
                        />
                      </label>

                      <label>
                        RUC
                        <input
                          value={clinicaForm.ruc}
                          onChange={(event) => {
                            const numericValue = event.target.value.replace(/\D/g, '').slice(0, 11);
                            setClinicaForm((prev) => ({ ...prev, ruc: numericValue }));
                          }}
                          placeholder="11 dígitos"
                          maxLength={11}
                          inputMode="numeric"
                          pattern="\d{11}"
                          required
                        />
                        {clinicaForm.ruc.length > 0 && !clinicaFormValidation.rucValido ? (
                          <span className="clinica-field-error">El RUC debe tener exactamente 11 dígitos.</span>
                        ) : null}
                      </label>

                      <label>
                        Dirección
                        <input
                          value={clinicaForm.direccion}
                          onChange={(event) => setClinicaForm((prev) => ({ ...prev, direccion: event.target.value }))}
                          required
                        />
                      </label>

                      <label>
                        Teléfono
                        <input
                          value={clinicaForm.telefono}
                          onChange={(event) => {
                            const numericValue = event.target.value.replace(/\D/g, '').slice(0, 20);
                            setClinicaForm((prev) => ({ ...prev, telefono: numericValue }));
                          }}
                          inputMode="numeric"
                          pattern="\d+"
                          required
                        />
                      </label>

                      <div className="clinica-modal-actions">
                        <button type="button" className="clinica-btn-cancel" onClick={() => setClinicaModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="clinica-btn-primary clinica-btn-save" disabled={!clinicaFormValidation.formValido}>Guardar</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : activeTab === 'Usuarios' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de usuarios</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearUsuario}>
                    Nuevo usuario
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Persona</th>
                        <th>Clínica</th>
                        <th>Estado</th>
                        <th>Creación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosLoading ? (
                        <tr>
                          <td colSpan={7}>Cargando usuarios...</td>
                        </tr>
                      ) : filteredUsuarios.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No hay resultados para la búsqueda.</td>
                        </tr>
                      ) : (
                        filteredUsuarios
                          .slice(
                            (usuarioPaginaActual - 1) * ITEMS_POR_PAGINA,
                            usuarioPaginaActual * ITEMS_POR_PAGINA
                          )
                          .map((usuarioItem) => {
                            const desactivado = Boolean(usuarioItem.deleted_at);
                            return (
                              <tr key={usuarioItem.id} className={desactivado ? 'clinica-row-disabled' : ''}>
                                <td>{usuarioItem.email}</td>
                                <td>{usuarioItem.rol}</td>
                                <td>{personaNombrePorId[usuarioItem.persona_id] || usuarioItem.persona_id}</td>
                                <td>{clinicaNombrePorId[usuarioItem.clinica_id || ''] || usuarioItem.clinica_id || '-'}</td>
                                <td>{desactivado ? 'INACTIVO' : usuarioItem.estado}</td>
                                <td>{new Date(usuarioItem.created_at).toLocaleString('es-PE')}</td>
                                <td>
                                  <div className="clinica-actions">
                                    <button type="button" onClick={() => abrirModalEditarUsuario(usuarioItem)}>Editar</button>
                                    {desactivado ? (
                                      <button type="button" className="reactivar" onClick={() => reactivarUsuario(usuarioItem.id)}>
                                        Reactivar
                                      </button>
                                    ) : (
                                      <button type="button" className="desactivar" onClick={() => desactivarUsuario(usuarioItem.id)}>
                                        Desactivar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredUsuarios.length > ITEMS_POR_PAGINA && (
                  <Pagination
                    totalItems={filteredUsuarios.length}
                    itemsPerPage={ITEMS_POR_PAGINA}
                    currentPage={usuarioPaginaActual}
                    onPageChange={setUsuarioPaginaActual}
                  />
                )}
              </article>

              {usuarioModalOpen && (
                <div className="clinica-modal-backdrop" role="dialog" aria-modal="true">
                  <section className="clinica-modal">
                    <h3>{usuarioModalMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h3>

                    <form onSubmit={guardarUsuario} className="clinica-form">
                      <label>
                        Persona
                        <select
                          value={usuarioForm.persona_id}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, persona_id: event.target.value }))}
                          required
                        >
                          <option value="">Seleccionar persona</option>
                          {personasOpciones.map((persona) => {
                            const nombreCompleto = [persona.nombres, persona.apellido_paterno, persona.apellido_materno]
                              .filter(Boolean)
                              .join(' ')
                              .trim();
                            return (
                              <option key={persona.id} value={persona.id}>
                                {nombreCompleto || persona.dni || persona.id}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label>
                        Clínica
                        <select
                          value={usuarioForm.clinica_id}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, clinica_id: event.target.value }))}
                          required
                        >
                          <option value="">Seleccionar clínica</option>
                          {clinicasOpciones.map((clinica) => (
                            <option key={clinica.id} value={clinica.id}>{clinica.nombre}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Email
                        <input
                          type="email"
                          value={usuarioForm.email}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, email: event.target.value }))}
                          required
                        />
                      </label>

                      <label>
                        Rol
                        <select
                          value={usuarioForm.rol}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, rol: event.target.value as UsuarioForm['rol'] }))}
                          required
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="DOCTOR">DOCTOR</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      </label>

                      <label>
                        Contraseña {usuarioModalMode === 'edit' ? '(opcional)' : ''}
                        <input
                          type="password"
                          value={usuarioForm.password}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, password: event.target.value }))}
                          required={usuarioModalMode === 'create'}
                          minLength={8}
                        />
                        {usuarioForm.password.length > 0 && !usuarioFormValidation.passwordValido ? (
                          <span className="clinica-field-error">Mínimo 8 caracteres con mayúscula, minúscula y número.</span>
                        ) : null}
                      </label>

                      <div className="clinica-modal-actions">
                        <button type="button" className="clinica-btn-cancel" onClick={() => setUsuarioModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="clinica-btn-primary clinica-btn-save" disabled={!usuarioFormValidation.formValido}>Guardar</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : activeTab === 'Personas' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de personas</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearPersona}>
                    Nueva persona
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table">
                    <thead>
                      <tr>
                        <th>DNI</th>
                        <th>Nombres</th>
                        <th>Apellido paterno</th>
                        <th>Apellido materno</th>
                        <th>Sexo</th>
                        <th>F. nacimiento</th>
                        <th>Creación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personasLoading ? (
                        <tr>
                          <td colSpan={8}>Cargando personas...</td>
                        </tr>
                      ) : filteredPersonas.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No hay resultados para la búsqueda.</td>
                        </tr>
                      ) : (
                        filteredPersonas
                          .slice(
                            (personaPaginaActual - 1) * ITEMS_POR_PAGINA,
                            personaPaginaActual * ITEMS_POR_PAGINA
                          )
                          .map((personaItem) => {
                            const desactivada = Boolean(personaItem.deleted_at);
                            return (
                              <tr key={personaItem.id} className={desactivada ? 'clinica-row-disabled' : ''}>
                                <td>{personaItem.dni}</td>
                                <td>{personaItem.nombres}</td>
                                <td>{personaItem.apellido_paterno}</td>
                                <td>{personaItem.apellido_materno}</td>
                                <td>{personaItem.sexo}</td>
                                <td>{new Date(personaItem.fecha_nacimiento).toLocaleDateString('es-PE')}</td>
                                <td>{new Date(personaItem.created_at).toLocaleString('es-PE')}</td>
                                <td>
                                  <div className="clinica-actions">
                                    <button type="button" onClick={() => abrirModalEditarPersona(personaItem)}>Editar</button>
                                    {desactivada ? (
                                      <button type="button" className="reactivar" onClick={() => reactivarPersona(personaItem.id)}>
                                        Reactivar
                                      </button>
                                    ) : (
                                      <button type="button" className="desactivar" onClick={() => desactivarPersona(personaItem.id)}>
                                        Desactivar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredPersonas.length > ITEMS_POR_PAGINA && (
                  <Pagination
                    totalItems={filteredPersonas.length}
                    itemsPerPage={ITEMS_POR_PAGINA}
                    currentPage={personaPaginaActual}
                    onPageChange={setPersonaPaginaActual}
                  />
                )}
              </article>

              {personaModalOpen && (
                <div className="clinica-modal-backdrop" role="dialog" aria-modal="true">
                  <section className="clinica-modal">
                    <h3>{personaModalMode === 'create' ? 'Nueva persona' : 'Editar persona'}</h3>

                    <form onSubmit={guardarPersona} className="clinica-form">
                      {personaModalMode === 'create' && (
                        <label>
                          Método de registro
                          <select
                            value={personaCreateMode}
                            onChange={(event) => setPersonaCreateMode(event.target.value as 'dni' | 'manual')}
                          >
                            <option value="dni">Por DNI</option>
                            <option value="manual">Manual</option>
                          </select>
                        </label>
                      )}

                      <label>
                        DNI
                        <input
                          value={personaForm.dni}
                          onChange={(event) => {
                            const numericValue = event.target.value.replace(/\D/g, '').slice(0, 8);
                            setPersonaForm((prev) => ({ ...prev, dni: numericValue }));
                          }}
                          placeholder="8 dígitos"
                          maxLength={8}
                          inputMode="numeric"
                          pattern="\d{8}"
                          required
                        />
                        {personaForm.dni.length > 0 && !personaFormValidation.dniValido ? (
                          <span className="clinica-field-error">El DNI debe tener exactamente 8 dígitos.</span>
                        ) : null}
                      </label>

                      {(personaModalMode === 'edit' || personaCreateMode === 'manual') && (
                        <>
                          <label>
                            Nombres
                            <input
                              value={personaForm.nombres}
                              onChange={(event) => setPersonaForm((prev) => ({ ...prev, nombres: event.target.value }))}
                              required
                            />
                          </label>

                          <label>
                            Apellido paterno
                            <input
                              value={personaForm.apellido_paterno}
                              onChange={(event) => setPersonaForm((prev) => ({ ...prev, apellido_paterno: event.target.value }))}
                              required
                            />
                          </label>

                          <label>
                            Apellido materno
                            <input
                              value={personaForm.apellido_materno}
                              onChange={(event) => setPersonaForm((prev) => ({ ...prev, apellido_materno: event.target.value }))}
                              required
                            />
                          </label>

                          <label>
                            Sexo
                            <select
                              value={personaForm.sexo}
                              onChange={(event) => setPersonaForm((prev) => ({ ...prev, sexo: event.target.value as PersonaForm['sexo'] }))}
                              required
                            >
                              <option value="MASCULINO">MASCULINO</option>
                              <option value="FEMENINO">FEMENINO</option>
                            </select>
                          </label>

                          <label>
                            Fecha de nacimiento
                            <input
                              type="date"
                              value={personaForm.fecha_nacimiento}
                              onChange={(event) => setPersonaForm((prev) => ({ ...prev, fecha_nacimiento: event.target.value }))}
                              required
                            />
                          </label>
                        </>
                      )}

                      {personaModalMode === 'create' && personaCreateMode === 'dni' ? (
                        <p className="superadmin-description">Se consultará el DNI en BD y API externa para completar datos automáticamente.</p>
                      ) : null}

                      <div className="clinica-modal-actions">
                        <button type="button" className="clinica-btn-cancel" onClick={() => setPersonaModalOpen(false)}>Cancelar</button>
                        <button
                          type="submit"
                          className="clinica-btn-primary clinica-btn-save"
                          disabled={personaModalMode === 'create' && personaCreateMode === 'dni'
                            ? !personaFormValidation.dniValido
                            : !personaFormValidation.formValidoManual}
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : activeTab === 'Sesiones' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Sesiones activas</h3>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Creación</th>
                        <th>Expira</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesionesLoading ? (
                        <tr>
                          <td colSpan={5}>Cargando sesiones...</td>
                        </tr>
                      ) : filteredSesiones.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No hay resultados para la búsqueda.</td>
                        </tr>
                      ) : (
                        filteredSesiones
                          .slice(
                            (sesionPaginaActual - 1) * ITEMS_POR_PAGINA,
                            sesionPaginaActual * ITEMS_POR_PAGINA
                          )
                          .map((sesionItem) => (
                            <tr key={sesionItem.id}>
                              <td>{sesionItem.email || 'N/A'}</td>
                              <td>{sesionItem.rol || 'N/A'}</td>
                              <td>{new Date(sesionItem.created_at).toLocaleString('es-PE')}</td>
                              <td>{new Date(sesionItem.expires_at).toLocaleString('es-PE')}</td>
                              <td>
                                <div className="clinica-actions">
                                  <button type="button" className="desactivar" onClick={() => revocarSesion(sesionItem.id)}>
                                    Revocar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredSesiones.length > ITEMS_POR_PAGINA && (
                  <Pagination
                    totalItems={filteredSesiones.length}
                    itemsPerPage={ITEMS_POR_PAGINA}
                    currentPage={sesionPaginaActual}
                    onPageChange={setSesionPaginaActual}
                  />
                )}
              </article>
            </section>
          ) : (
            <section className="superadmin-grid">
              <article className="superadmin-card">
                <h3>{activeTab}</h3>
                <p>Sección en construcción. Aquí colocaremos listado, filtros y acciones.</p>
              </article>
            </section>
          )}
        </section>
      </section>

      {globalMessage && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: globalMessage.type === 'success' ? '#d4edda' : '#f8d7da',
          border: `2px solid ${globalMessage.type === 'success' ? '#28a745' : '#dc3545'}`,
          borderRadius: '50px',
          padding: '16px 24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          maxWidth: '300px',
          animation: 'bubbleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0s, bubbleOut 0.4s cubic-bezier(0.36, 0, 0.66, -0.56) 2.6s forwards'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {globalMessage.type === 'success' ? '✓' : '✕'} {globalMessage.text}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bubbleIn {
          from {
            transform: scale(0) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes bubbleOut {
          from {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          to {
            transform: scale(0) translateY(20px);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
