'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useThemeMode, type ThemeMode } from '../hooks/use-theme-mode';
import '../css/superadmin.css';

const API_BASE = '/api/backend';
const API_ME = `${API_BASE}/usuarios/me`;
const API_REFRESH = `${API_BASE}/usuarios/refresh`;
const API_CSRF = `${API_BASE}/usuarios/csrf`;
const API_LOGOUT = `${API_BASE}/usuarios/logout`;
const API_CLINICAS = `${API_BASE}/empresas`;
const API_CLINICAS_ACTIVAS = `${API_BASE}/empresas/public/activas`;
const API_TIPOS_NEGOCIO = `${API_BASE}/tipos-negocio`;
const API_USUARIOS = `${API_BASE}/usuarios`;
const API_PERSONAS = `${API_BASE}/personas`;
const API_SESIONES = `${API_BASE}/admin/sesiones`;
const API_DASHBOARD_SUMMARY = `${API_BASE}/admin/dashboard-summary`;
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

const TABS = ['Dashboard', 'Clinicas', 'TiposNegocio', 'Usuarios', 'Personas', 'Sesiones'] as const;
type SuperadminTab = (typeof TABS)[number];

const TAB_META: Record<SuperadminTab, { icon: string; label: string }> = {
  Dashboard: { icon: '📊', label: 'Dashboard' },
  Clinicas: { icon: '🏢', label: 'Empresas' },
  TiposNegocio: { icon: '🏷️', label: 'Tipos de negocio' },
  Usuarios: { icon: '👤', label: 'Usuarios' },
  Personas: { icon: '🧾', label: 'Personas' },
  Sesiones: { icon: '🔐', label: 'Sesiones' }
};

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
  tipo_negocio_id?: string | null;
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
  tipo_negocio_id: string;
  ruc: string;
  direccion: string;
  telefono: string;
  estado: 'ACTIVA' | 'INACTIVA';
};

type TipoNegocio = {
  id: string;
  codigo: string;
  nombre: string;
};

type TipoNegocioForm = {
  codigo: string;
  nombre: string;
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

type RowDetail = {
  title: string;
  fields: Array<{ label: string; value: string }>;
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
            backgroundColor: currentPage === pageNum ? 'var(--primary-color)' : '#f0f0f0',
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

function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

export default function SuperadminPage() {
  const MODAL_EXIT_DURATION_MS = 180;
  const PAGE_EXIT_DURATION_MS = 500;
  const SESSION_REVOKED_REDIRECT_MS = 1500;
  const SESSION_WATCH_INTERVAL_MS = 120000;
  const router = useRouter();
  const [state, setState] = useState<SessionState>('loading');
  const [message, setMessage] = useState('Validando sesión...');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [activeTab, setActiveTab] = useState<SuperadminTab>('Dashboard');
  const [renderTab, setRenderTab] = useState<SuperadminTab>('Dashboard');
  const [tabTransitionState, setTabTransitionState] = useState<'idle' | 'exiting' | 'entering'>('entering');
  const [sidebarState, setSidebarState] = useState<'expanded' | 'opening' | 'collapsing' | 'collapsed'>('collapsed');
  const sidebarCollapseTimerRef = useRef<number | null>(null);
  const clinicaModalCloseTimerRef = useRef<number | null>(null);
  const tipoNegocioModalCloseTimerRef = useRef<number | null>(null);
  const usuarioModalCloseTimerRef = useRef<number | null>(null);
  const personaModalCloseTimerRef = useRef<number | null>(null);
  const rowDetailCloseTimerRef = useRef<number | null>(null);
  const sessionRevokedRedirectTimerRef = useRef<number | null>(null);
  const loadedTabsRef = useRef({
    Clinicas: false,
    TiposNegocio: false,
    Usuarios: false,
    Personas: false,
    Sesiones: false
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const mobileSidebarRef = useRef<HTMLElement | null>(null);
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const [rowDetail, setRowDetail] = useState<RowDetail | null>(null);
  const [rowDetailClosing, setRowDetailClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isSessionRevokedModalOpen, setIsSessionRevokedModalOpen] = useState(false);
  const [selectedEndDate, setSelectedEndDate] = useState(getTodayLocalIso());
  const [searchQuery, setSearchQuery] = useState('');
  const { themeMode, setThemeMode } = useThemeMode();
  const [openListCard, setOpenListCard] = useState<'clinicas' | 'usuarios' | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicasLoading, setClinicasLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
  const [usuarioModalClosing, setUsuarioModalClosing] = useState(false);
  const [usuarioModalMode, setUsuarioModalMode] = useState<'create' | 'edit'>('create');
  const [usuarioEditingId, setUsuarioEditingId] = useState<string | null>(null);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>({
    clinica_id: '',
    persona_id: '',
    email: '',
    password: '',
    rol: 'ADMIN'
  });
  const [, setUsuarioMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [personasOpciones, setPersonasOpciones] = useState<PersonaOption[]>([]);
  const [personas, setPersonas] = useState<PersonaAdmin[]>([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [personaModalClosing, setPersonaModalClosing] = useState(false);
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
  const [, setPersonaMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [clinicaPaginaActual, setClinicaPaginaActual] = useState(1);
  const [tipoNegocioPaginaActual, setTipoNegocioPaginaActual] = useState(1);
  const [usuarioPaginaActual, setUsuarioPaginaActual] = useState(1);
  const [personaPaginaActual, setPersonaPaginaActual] = useState(1);
  const [sesionPaginaActual, setSesionPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 9;
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [sesionesLoading, setSesionesLoading] = useState(false);
  const [sessionIdActual, setSessionIdActual] = useState<string | null>(null);
  const [clinicasOpciones, setClinicasOpciones] = useState<Clinica[]>([]);
  const [tiposNegocioLoading, setTiposNegocioLoading] = useState(false);
  const [tiposNegocioOpciones, setTiposNegocioOpciones] = useState<TipoNegocio[]>([]);
  const [tipoNegocioModalOpen, setTipoNegocioModalOpen] = useState(false);
  const [tipoNegocioModalClosing, setTipoNegocioModalClosing] = useState(false);
  const [tipoNegocioModalMode, setTipoNegocioModalMode] = useState<'create' | 'edit'>('create');
  const [tipoNegocioEditingId, setTipoNegocioEditingId] = useState<string | null>(null);
  const [tipoNegocioForm, setTipoNegocioForm] = useState<TipoNegocioForm>({ codigo: '', nombre: '' });
  const [globalMessage, setGlobalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [clinicaModalOpen, setClinicaModalOpen] = useState(false);
  const [clinicaModalClosing, setClinicaModalClosing] = useState(false);
  const [clinicaModalMode, setClinicaModalMode] = useState<'create' | 'edit'>('create');
  const [clinicaEditingId, setClinicaEditingId] = useState<string | null>(null);
  const [clinicaForm, setClinicaForm] = useState<ClinicaForm>({
    nombre: '',
    tipo_negocio_id: '',
    ruc: '',
    direccion: '',
    telefono: '',
    estado: 'ACTIVA'
  });
  const [, setClinicaMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
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

  const isRevokedError = (errorText: string) => /revocad/i.test(errorText || '');

  const readErrorMessage = async (response: Response) => {
    try {
      const data = await response.clone().json();
      return typeof data?.error === 'string' ? data.error : '';
    } catch {
      return '';
    }
  };

  const handleSessionRevoked = useCallback(() => {
    if (isSessionRevokedModalOpen) return;

    setIsMobileSidebarOpen(false);
    localStorage.removeItem('sessionId');
    setIsSessionRevokedModalOpen(true);

    if (sessionRevokedRedirectTimerRef.current) {
      window.clearTimeout(sessionRevokedRedirectTimerRef.current);
      sessionRevokedRedirectTimerRef.current = null;
    }

    sessionRevokedRedirectTimerRef.current = window.setTimeout(() => {
      router.replace('/login');
    }, SESSION_REVOKED_REDIRECT_MS);
  }, [isSessionRevokedModalOpen, router]);

  const fetchWithAuthRetry = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const baseInit: RequestInit = {
      credentials: 'include',
      ...(init || {})
    };

    let response = await fetch(input, baseInit);
    if (response.status !== 401) {
      return response;
    }

    const meErrorText = await readErrorMessage(response);
    const refreshResponse = await fetch(API_REFRESH, {
      method: 'POST',
      credentials: 'include'
    });

    if (!refreshResponse.ok) {
      const refreshErrorText = await readErrorMessage(refreshResponse);
      if (isRevokedError(meErrorText) || isRevokedError(refreshErrorText)) {
        handleSessionRevoked();
      }
      return response;
    }

    response = await fetch(input, baseInit);
    if (response.status === 401) {
      const retryErrorText = await readErrorMessage(response);
      if (isRevokedError(retryErrorText)) {
        handleSessionRevoked();
      }
    }

    return response;
  }, [handleSessionRevoked]);

  const openRowDetail = (title: string, fields: Array<{ label: string; value: string | number | null | undefined }>) => {
    if (rowDetailCloseTimerRef.current) {
      window.clearTimeout(rowDetailCloseTimerRef.current);
      rowDetailCloseTimerRef.current = null;
    }
    setRowDetailClosing(false);
    setRowDetail({
      title,
      fields: fields.map((field) => ({
        label: field.label,
        value: field.value === null || field.value === undefined || field.value === '' ? '-' : String(field.value)
      }))
    });
  };

  const closeClinicaModal = useCallback(() => {
    if (!clinicaModalOpen || clinicaModalClosing) return;
    if (clinicaModalCloseTimerRef.current) {
      window.clearTimeout(clinicaModalCloseTimerRef.current);
      clinicaModalCloseTimerRef.current = null;
    }
    setClinicaModalClosing(true);
    clinicaModalCloseTimerRef.current = window.setTimeout(() => {
      setClinicaModalOpen(false);
      setClinicaModalClosing(false);
      clinicaModalCloseTimerRef.current = null;
    }, MODAL_EXIT_DURATION_MS);
  }, [clinicaModalOpen, clinicaModalClosing]);

  const closeTipoNegocioModal = useCallback(() => {
    if (!tipoNegocioModalOpen || tipoNegocioModalClosing) return;
    if (tipoNegocioModalCloseTimerRef.current) {
      window.clearTimeout(tipoNegocioModalCloseTimerRef.current);
      tipoNegocioModalCloseTimerRef.current = null;
    }
    setTipoNegocioModalClosing(true);
    tipoNegocioModalCloseTimerRef.current = window.setTimeout(() => {
      setTipoNegocioModalOpen(false);
      setTipoNegocioModalClosing(false);
      tipoNegocioModalCloseTimerRef.current = null;
    }, MODAL_EXIT_DURATION_MS);
  }, [tipoNegocioModalOpen, tipoNegocioModalClosing]);

  const closeUsuarioModal = useCallback(() => {
    if (!usuarioModalOpen || usuarioModalClosing) return;
    if (usuarioModalCloseTimerRef.current) {
      window.clearTimeout(usuarioModalCloseTimerRef.current);
      usuarioModalCloseTimerRef.current = null;
    }
    setUsuarioModalClosing(true);
    usuarioModalCloseTimerRef.current = window.setTimeout(() => {
      setUsuarioModalOpen(false);
      setUsuarioModalClosing(false);
      usuarioModalCloseTimerRef.current = null;
    }, MODAL_EXIT_DURATION_MS);
  }, [usuarioModalOpen, usuarioModalClosing]);

  const closePersonaModal = useCallback(() => {
    if (!personaModalOpen || personaModalClosing) return;
    if (personaModalCloseTimerRef.current) {
      window.clearTimeout(personaModalCloseTimerRef.current);
      personaModalCloseTimerRef.current = null;
    }
    setPersonaModalClosing(true);
    personaModalCloseTimerRef.current = window.setTimeout(() => {
      setPersonaModalOpen(false);
      setPersonaModalClosing(false);
      personaModalCloseTimerRef.current = null;
    }, MODAL_EXIT_DURATION_MS);
  }, [personaModalOpen, personaModalClosing]);

  const closeRowDetail = useCallback(() => {
    if (!rowDetail || rowDetailClosing) return;
    if (rowDetailCloseTimerRef.current) {
      window.clearTimeout(rowDetailCloseTimerRef.current);
      rowDetailCloseTimerRef.current = null;
    }
    setRowDetailClosing(true);
    rowDetailCloseTimerRef.current = window.setTimeout(() => {
      setRowDetail(null);
      setRowDetailClosing(false);
      rowDetailCloseTimerRef.current = null;
    }, MODAL_EXIT_DURATION_MS);
  }, [rowDetail, rowDetailClosing]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsMobileSidebarOpen(false);
    setIsLoggingOut(true);
    setIsEntering(false);
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
      }, PAGE_EXIT_DURATION_MS);
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
      const response = await fetchWithAuthRetry(`${API_DASHBOARD_SUMMARY}?endDate=${selectedEndDate}`);
      const data = response.ok ? await response.json() : { data: null };
      const summary = data?.data;

      const actividad = Array.isArray(summary?.actividad7dias)
        ? summary.actividad7dias.map((item: { dia?: string; etiqueta?: string; total?: number }) => ({
            dia: item.dia || '',
            etiqueta: item.etiqueta || 'DIA',
            total: item.total || 0
          }))
        : CHART_BARS_FALLBACK.map((total, index) => ({
            dia: `${index}`,
            etiqueta: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][index] || 'DIA',
            total
          }));

      const seguridad = Array.isArray(summary?.seguridad) ? summary.seguridad : [];

      setStats({
        clinicasTotal: Number(summary?.clinicasTotal || 0),
        clinicasActivas: Number(summary?.clinicasActivas || 0),
        clinicasActivasNombres: Array.isArray(summary?.clinicasActivasNombres) ? summary.clinicasActivasNombres : [],
        usuariosTotal: Number(summary?.usuariosTotal || 0),
        usuariosActivos: Number(summary?.usuariosActivos || 0),
        usuariosActivosNombres: Array.isArray(summary?.usuariosActivosNombres) ? summary.usuariosActivosNombres : [],
        sesionesActivas: Number(summary?.sesionesActivas || 0),
        actividadSemanal: actividad,
        seguridad
      });
    } catch {
      // Mantener fallback visual en caso de error
    }
  }, [selectedEndDate, fetchWithAuthRetry]);

  const cargarClinicas = async (silent = false) => {
    if (!silent) {
      setClinicasLoading(true);
    }
    try {
      const response = await fetchWithAuthRetry(API_CLINICAS);
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setClinicas(ordenarClinicas(data.data));
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'No se pudo cargar el listado de empresas.' });
    } finally {
      if (!silent) {
        setClinicasLoading(false);
      }
    }
  };

  const cargarTiposNegocio = async (silent = false) => {
    if (!silent) {
      setTiposNegocioLoading(true);
    }
    try {
      const response = await fetchWithAuthRetry(API_TIPOS_NEGOCIO);
      const data = response.ok ? await response.json() : { data: [] };
      setTiposNegocioOpciones(Array.isArray(data.data) ? data.data : []);
    } catch {
      setClinicaMessage({ type: 'error', text: 'No se pudo cargar la lista de tipos de negocio.' });
    } finally {
      if (!silent) {
        setTiposNegocioLoading(false);
      }
    }
  };

  const cargarUsuarios = async (silent = false) => {
    if (!silent) {
      setUsuariosLoading(true);
    }

    try {
      const response = await fetchWithAuthRetry(API_USUARIOS);
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
        fetchWithAuthRetry(API_PERSONAS),
        fetchWithAuthRetry(API_CLINICAS_ACTIVAS)
      ]);

      const personasData = personasResp.ok ? await personasResp.json() : { data: [] };
      const clinicasData = clinicasResp.ok ? await clinicasResp.json() : { data: [] };

      setPersonasOpciones(Array.isArray(personasData.data) ? personasData.data : []);
      setClinicasOpciones(Array.isArray(clinicasData.data) ? clinicasData.data : []);
    } catch {
      setUsuarioMessage({ type: 'error', text: 'No se pudieron cargar personas y empresas para usuarios.' });
    }
  };

  const abrirModalCrearUsuario = () => {
    setUsuarioModalMode('create');
    setUsuarioEditingId(null);
    setUsuarioForm({ clinica_id: '', persona_id: '', email: '', password: '', rol: 'ADMIN' });
    setUsuarioMessage(null);
    if (usuarioModalCloseTimerRef.current) {
      window.clearTimeout(usuarioModalCloseTimerRef.current);
      usuarioModalCloseTimerRef.current = null;
    }
    setUsuarioModalClosing(false);
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
    if (usuarioModalCloseTimerRef.current) {
      window.clearTimeout(usuarioModalCloseTimerRef.current);
      usuarioModalCloseTimerRef.current = null;
    }
    setUsuarioModalClosing(false);
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

      closeUsuarioModal();
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

  const abrirModalCrearTipoNegocio = () => {
    setTipoNegocioModalMode('create');
    setTipoNegocioEditingId(null);
    setTipoNegocioForm({ codigo: '', nombre: '' });
    if (tipoNegocioModalCloseTimerRef.current) {
      window.clearTimeout(tipoNegocioModalCloseTimerRef.current);
      tipoNegocioModalCloseTimerRef.current = null;
    }
    setTipoNegocioModalClosing(false);
    setTipoNegocioModalOpen(true);
  };

  const abrirModalEditarTipoNegocio = (tipo: TipoNegocio) => {
    setTipoNegocioModalMode('edit');
    setTipoNegocioEditingId(tipo.id);
    setTipoNegocioForm({ codigo: tipo.codigo || '', nombre: tipo.nombre || '' });
    if (tipoNegocioModalCloseTimerRef.current) {
      window.clearTimeout(tipoNegocioModalCloseTimerRef.current);
      tipoNegocioModalCloseTimerRef.current = null;
    }
    setTipoNegocioModalClosing(false);
    setTipoNegocioModalOpen(true);
  };

  const guardarTipoNegocio = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!tipoNegocioFormValidation.formValido) {
      setGlobalMessage({ type: 'error', text: 'Completa código y nombre del tipo de negocio.' });
      return;
    }

    try {
      const csrfHeaders = await getCsrfHeader();
      const isEdit = tipoNegocioModalMode === 'edit' && tipoNegocioEditingId;
      const endpoint = isEdit ? `${API_TIPOS_NEGOCIO}/${tipoNegocioEditingId}` : API_TIPOS_NEGOCIO;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        codigo: tipoNegocioForm.codigo.trim().toUpperCase(),
        nombre: tipoNegocioForm.nombre.trim()
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
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo guardar el tipo de negocio.' });
        return;
      }

      setGlobalMessage({
        type: 'success',
        text: isEdit ? 'Tipo de negocio actualizado.' : 'Tipo de negocio creado.'
      });
      closeTipoNegocioModal();
      await cargarTiposNegocio(true);
    } catch {
      setGlobalMessage({ type: 'error', text: 'Error de conexión al guardar tipo de negocio.' });
    }
  };

  const eliminarTipoNegocio = async (tipo: TipoNegocio) => {
    const confirmed = window.confirm(`¿Eliminar el tipo de negocio "${tipo.nombre}"?`);
    if (!confirmed) return;

    try {
      const csrfHeaders = await getCsrfHeader();
      const response = await fetch(`${API_TIPOS_NEGOCIO}/${tipo.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders
      });

      const data = await response.json();
      if (!response.ok) {
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo eliminar el tipo de negocio.' });
        return;
      }

      setGlobalMessage({ type: 'success', text: 'Tipo de negocio eliminado.' });
      await cargarTiposNegocio(true);
    } catch {
      setGlobalMessage({ type: 'error', text: 'Error de conexión al eliminar tipo de negocio.' });
    }
  };

  const abrirModalCrearClinica = () => {
    setClinicaModalMode('create');
    setClinicaEditingId(null);
    setClinicaForm({ nombre: '', tipo_negocio_id: '', ruc: '', direccion: '', telefono: '', estado: 'ACTIVA' });
    setClinicaMessage(null);
    if (clinicaModalCloseTimerRef.current) {
      window.clearTimeout(clinicaModalCloseTimerRef.current);
      clinicaModalCloseTimerRef.current = null;
    }
    setClinicaModalClosing(false);
    setClinicaModalOpen(true);
  };

  const cargarPersonas = async (silent = false) => {
    if (!silent) {
      setPersonasLoading(true);
    }

    try {
      const response = await fetchWithAuthRetry(API_PERSONAS);
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
      const response = await fetchWithAuthRetry(API_SESIONES);
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
          handleSessionRevoked();
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
    if (personaModalCloseTimerRef.current) {
      window.clearTimeout(personaModalCloseTimerRef.current);
      personaModalCloseTimerRef.current = null;
    }
    setPersonaModalClosing(false);
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
    if (personaModalCloseTimerRef.current) {
      window.clearTimeout(personaModalCloseTimerRef.current);
      personaModalCloseTimerRef.current = null;
    }
    setPersonaModalClosing(false);
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

        closePersonaModal();
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

      closePersonaModal();
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
      tipo_negocio_id: clinica.tipo_negocio_id || '',
      ruc: clinica.ruc || '',
      direccion: clinica.direccion || '',
      telefono: clinica.telefono || '',
      estado: clinica.estado || 'ACTIVA'
    });
    setClinicaMessage(null);
    if (clinicaModalCloseTimerRef.current) {
      window.clearTimeout(clinicaModalCloseTimerRef.current);
      clinicaModalCloseTimerRef.current = null;
    }
    setClinicaModalClosing(false);
    setClinicaModalOpen(true);
  };

  const guardarClinica = async (event: React.FormEvent) => {
    event.preventDefault();
    setClinicaMessage(null);

    if (!clinicaFormValidation.nombreValido) {
      setClinicaMessage({ type: 'error', text: 'El nombre de empresa es obligatorio.' });
      return;
    }

    if (!clinicaFormValidation.tipoNegocioValido) {
      setClinicaMessage({ type: 'error', text: 'Selecciona un tipo de negocio.' });
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
        tipo_negocio_id: clinicaForm.tipo_negocio_id,
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
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo guardar la empresa.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo guardar la empresa.' });
        return;
      }

      const successMsg = isEdit ? 'Empresa actualizada.' : 'Empresa creada.';
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
      closeClinicaModal();
      await cargarClinicas(true);
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al guardar empresa.' });
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
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo desactivar la empresa.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo desactivar la empresa.' });
        return;
      }
      setClinicaMessage({ type: 'success', text: 'Empresa desactivada.' });
      setGlobalMessage({ type: 'success', text: 'Empresa desactivada.' });
      if (data.data) {
        setClinicas((prev) => ordenarClinicas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al desactivar empresa.' });
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
        setClinicaMessage({ type: 'error', text: data.error || 'No se pudo reactivar la empresa.' });
        setGlobalMessage({ type: 'error', text: data.error || 'No se pudo reactivar la empresa.' });
        return;
      }
      setClinicaMessage({ type: 'success', text: 'Empresa reactivada.' });
      setGlobalMessage({ type: 'success', text: 'Empresa reactivada.' });
      if (data.data) {
        setClinicas((prev) => ordenarClinicas(prev.map((item) => (item.id === data.data.id ? data.data : item))));
      }
      if (activeTab === 'Dashboard') {
        await refreshDashboardStats();
      }
    } catch {
      setClinicaMessage({ type: 'error', text: 'Error de conexión al reactivar empresa.' });
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
          const meErrorText = await readErrorMessage(meResponse);
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
          } else {
            const refreshErrorText = await readErrorMessage(refreshResponse);
            if (isRevokedError(meErrorText) || isRevokedError(refreshErrorText)) {
              handleSessionRevoked();
              return;
            }
          }

          if (isRevokedError(meErrorText)) {
            handleSessionRevoked();
            return;
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
  }, [handleSessionRevoked]);

  useEffect(() => {
    if (state !== 'allowed' || isSessionRevokedModalOpen) return;

    let isCancelled = false;

    const watchSession = async () => {
      try {
        const meResponse = await fetch(API_ME, { credentials: 'include' });
        if (meResponse.ok || meResponse.status !== 401) return;

        const meErrorText = await readErrorMessage(meResponse);
        const refreshResponse = await fetch(API_REFRESH, {
          method: 'POST',
          credentials: 'include'
        });

        if (refreshResponse.ok) return;

        const refreshErrorText = await readErrorMessage(refreshResponse);
        if (!isCancelled && (isRevokedError(meErrorText) || isRevokedError(refreshErrorText))) {
          handleSessionRevoked();
        }
      } catch {
      }
    };

    const intervalId = window.setInterval(watchSession, SESSION_WATCH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [state, isSessionRevokedModalOpen, handleSessionRevoked]);

  useEffect(() => {
    // Si no está autenticado/autorizado, redirigir a login
    if (state === 'denied' && !isSessionRevokedModalOpen) {
      localStorage.removeItem('sessionId');
      const timeout = setTimeout(() => {
        router.push('/login');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [state, router, isSessionRevokedModalOpen]);

  useEffect(() => {
    if (state === 'allowed') {
      setIsExiting(false);
      setIsEntering(true);
      return;
    }

    if (state === 'denied') {
      setIsEntering(false);
    }
  }, [state]);

  useEffect(() => {
    if (state !== 'allowed') return;
    document.title = `Superadmin - ${TAB_META[activeTab].label} | StarMOT`;
  }, [state, activeTab]);

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
      if (loadedTabsRef.current.Clinicas) return;
      loadedTabsRef.current.Clinicas = true;
      cargarClinicas();
      cargarTiposNegocio();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'TiposNegocio') {
      if (loadedTabsRef.current.TiposNegocio) return;
      loadedTabsRef.current.TiposNegocio = true;
      cargarTiposNegocio();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Usuarios') {
      if (loadedTabsRef.current.Usuarios) return;
      loadedTabsRef.current.Usuarios = true;
      cargarUsuarios();
      cargarOpcionesUsuarios();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Personas') {
      if (loadedTabsRef.current.Personas) return;
      loadedTabsRef.current.Personas = true;
      cargarPersonas();
    }
  }, [state, activeTab]);

  useEffect(() => {
    if (state === 'allowed' && activeTab === 'Sesiones') {
      if (loadedTabsRef.current.Sesiones) return;
      loadedTabsRef.current.Sesiones = true;
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

  const actividadCurveData = useMemo(() => {
    const chartWidth = 680;
    const chartHeight = 170;
    const baselineY = 182;
    const leftPadding = 12;
    const rightPadding = 12;
    const items = stats.actividadSemanal;

    if (!items.length) {
      return { points: [], linePath: '', areaPath: '', baselineY };
    }

    const step = items.length > 1
      ? (chartWidth - leftPadding - rightPadding) / (items.length - 1)
      : 0;

    const points = items.map((item, index) => {
      const x = leftPadding + index * step;
      const ratio = Math.max(0, Math.min(1, item.total / actividadMaxTotal));
      const y = baselineY - Math.round(ratio * chartHeight);
      return {
        x,
        y,
        etiqueta: item.etiqueta,
        total: item.total
      };
    });

    if (points.length === 1) {
      const singlePointPath = `M ${points[0].x} ${points[0].y}`;
      const singleAreaPath = `M ${points[0].x} ${baselineY} L ${points[0].x} ${points[0].y} L ${points[0].x} ${baselineY} Z`;
      return { points, linePath: singlePointPath, areaPath: singleAreaPath, baselineY };
    }

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const controlX = (previous.x + current.x) / 2;
      const controlY = (previous.y + current.y) / 2;
      linePath += ` Q ${previous.x} ${previous.y} ${controlX} ${controlY}`;
    }

    const lastPoint = points[points.length - 1];
    linePath += ` Q ${lastPoint.x} ${lastPoint.y} ${lastPoint.x} ${lastPoint.y}`;

    let areaPath = `M ${points[0].x} ${baselineY} L ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const controlX = (previous.x + current.x) / 2;
      const controlY = (previous.y + current.y) / 2;
      areaPath += ` Q ${previous.x} ${previous.y} ${controlX} ${controlY}`;
    }
    areaPath += ` Q ${lastPoint.x} ${lastPoint.y} ${lastPoint.x} ${lastPoint.y}`;
    areaPath += ` L ${lastPoint.x} ${baselineY} Z`;

    return { points, linePath, areaPath, baselineY };
  }, [stats.actividadSemanal, actividadMaxTotal]);

  const clinicaFormValidation = useMemo(() => {
    const nombreValido = clinicaForm.nombre.trim().length > 0;
    const tipoNegocioValido = clinicaForm.tipo_negocio_id.trim().length > 0;
    const rucValido = /^\d{11}$/.test(clinicaForm.ruc);
    const direccionValida = clinicaForm.direccion.trim().length > 0;
    const telefonoValido = /^\d+$/.test(clinicaForm.telefono) && clinicaForm.telefono.trim().length > 0;

    return {
      nombreValido,
      tipoNegocioValido,
      rucValido,
      direccionValida,
      telefonoValido,
      formValido: nombreValido && tipoNegocioValido && rucValido && direccionValida && telefonoValido
    };
  }, [clinicaForm]);

  const tipoNegocioFormValidation = useMemo(() => {
    const codigoValido = tipoNegocioForm.codigo.trim().length > 0;
    const nombreValido = tipoNegocioForm.nombre.trim().length > 0;
    return {
      codigoValido,
      nombreValido,
      formValido: codigoValido && nombreValido
    };
  }, [tipoNegocioForm]);

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

  const tipoNegocioNombrePorId = useMemo(() => {
    return tiposNegocioOpciones.reduce<Record<string, string>>((acc, tipo) => {
      acc[tipo.id] = tipo.nombre;
      return acc;
    }, {});
  }, [tiposNegocioOpciones]);

  const searchHasEdgeSpaces = searchQuery.length > 0 && searchQuery !== searchQuery.trim();

  const filteredClinicas = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return clinicas;

    const queryDigits = onlyDigits(searchQuery);
    const dateQuery = parseDateQuery(searchQuery);

    return clinicas.filter((clinica) => {
      const tipoNegocio = tipoNegocioNombrePorId[clinica.tipo_negocio_id || ''] || '-';
      const createdKey = toLocalDateKey(clinica.created_at);
      if (dateQuery) {
        return createdKey === dateQuery;
      }

      const haystack = normalizeText([
        clinica.nombre,
        tipoNegocio,
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
  }, [clinicas, searchQuery, searchHasEdgeSpaces, tipoNegocioNombrePorId]);

  const filteredClinicasActivasNombres = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    const source = stats.clinicasActivasNombres;
    if (!query) return source.slice(0, MAX_TOOLTIP_ITEMS);
    return source.filter((item) => normalizeText(item).includes(query)).slice(0, MAX_TOOLTIP_ITEMS);
  }, [stats.clinicasActivasNombres, searchQuery, searchHasEdgeSpaces]);

  const filteredTiposNegocio = useMemo(() => {
    if (searchHasEdgeSpaces) return [];

    const query = normalizeText(searchQuery);
    if (!query) return tiposNegocioOpciones;

    return tiposNegocioOpciones.filter((tipo) =>
      normalizeText(`${tipo.codigo} ${tipo.nombre}`).includes(query)
    );
  }, [tiposNegocioOpciones, searchQuery, searchHasEdgeSpaces]);

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

  const resetScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (mobileSidebarRef.current) {
      mobileSidebarRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const handleTabChange = useCallback((nextTab: SuperadminTab) => {
    if (nextTab === activeTab || tabTransitionState === 'exiting') return;
    resetScrollToTop();
    setActiveTab(nextTab);
    setTabTransitionState('exiting');
    setIsMobileSidebarOpen(false);
  }, [activeTab, tabTransitionState, resetScrollToTop]);

  useEffect(() => {
    if (tabTransitionState !== 'exiting') return;

    const exitTimer = window.setTimeout(() => {
      setRenderTab(activeTab);
      setTabTransitionState('entering');
    }, 180);

    return () => window.clearTimeout(exitTimer);
  }, [activeTab, tabTransitionState]);

  useEffect(() => {
    if (tabTransitionState !== 'entering') return;

    const enterTimer = window.setTimeout(() => {
      setTabTransitionState('idle');
    }, 260);

    return () => window.clearTimeout(enterTimer);
  }, [tabTransitionState]);

  useEffect(() => {
    resetScrollToTop();
  }, [renderTab, resetScrollToTop]);

  useEffect(() => {
    return () => {
      if (sidebarCollapseTimerRef.current) {
        window.clearTimeout(sidebarCollapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleMobileViewportChange = () => {
      setIsMobileViewport(mobileMediaQuery.matches);
    };

    handleMobileViewportChange();
    mobileMediaQuery.addEventListener('change', handleMobileViewportChange);

    return () => {
      mobileMediaQuery.removeEventListener('change', handleMobileViewportChange);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1025px)');
    const handleViewportChange = () => {
      if (mediaQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      document.body.style.overflow = '';
      return;
    }

    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      return;
    }

    document.body.style.overflow = '';
  }, [isMobileSidebarOpen, isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport) return;

    if (mobileSidebarRef.current) {
      mobileSidebarRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [isMobileSidebarOpen, isMobileViewport]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      if (clinicaModalCloseTimerRef.current) {
        window.clearTimeout(clinicaModalCloseTimerRef.current);
      }
      if (tipoNegocioModalCloseTimerRef.current) {
        window.clearTimeout(tipoNegocioModalCloseTimerRef.current);
      }
      if (usuarioModalCloseTimerRef.current) {
        window.clearTimeout(usuarioModalCloseTimerRef.current);
      }
      if (personaModalCloseTimerRef.current) {
        window.clearTimeout(personaModalCloseTimerRef.current);
      }
      if (rowDetailCloseTimerRef.current) {
        window.clearTimeout(rowDetailCloseTimerRef.current);
      }
      if (sessionRevokedRedirectTimerRef.current) {
        window.clearTimeout(sessionRevokedRedirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasModalOpen = clinicaModalOpen || tipoNegocioModalOpen || usuarioModalOpen || personaModalOpen || Boolean(rowDetail);
    if (!hasModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (rowDetail) {
        closeRowDetail();
        return;
      }
      if (tipoNegocioModalOpen) {
        closeTipoNegocioModal();
        return;
      }
      if (personaModalOpen) {
        closePersonaModal();
        return;
      }
      if (usuarioModalOpen) {
        closeUsuarioModal();
        return;
      }
      if (clinicaModalOpen) {
        closeClinicaModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clinicaModalOpen,
    tipoNegocioModalOpen,
    usuarioModalOpen,
    personaModalOpen,
    rowDetail,
    closeClinicaModal,
    closeTipoNegocioModal,
    closeUsuarioModal,
    closePersonaModal,
    closeRowDetail
  ]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (isMobileViewport) return;

    if (sidebarCollapseTimerRef.current) {
      window.clearTimeout(sidebarCollapseTimerRef.current);
      sidebarCollapseTimerRef.current = null;
    }

    if (sidebarState === 'expanded') return;

    setSidebarState('opening');
    sidebarCollapseTimerRef.current = window.setTimeout(() => {
      setSidebarState('expanded');
      sidebarCollapseTimerRef.current = null;
    }, 220);
  }, [isMobileViewport, sidebarState]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (isMobileViewport) return;

    if (sidebarCollapseTimerRef.current) {
      window.clearTimeout(sidebarCollapseTimerRef.current);
    }

    setSidebarState('collapsing');
    sidebarCollapseTimerRef.current = window.setTimeout(() => {
      setSidebarState('collapsed');
      sidebarCollapseTimerRef.current = null;
    }, 240);
  }, [isMobileViewport]);

  const isSidebarCompact = !isMobileViewport && (sidebarState === 'collapsed' || sidebarState === 'collapsing');

  if (state === 'loading') {
    return null;
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
    <main className={`superadmin-page ${isEntering ? 'is-entered' : ''} ${isLoggingOut && isExiting ? 'is-exiting' : ''}`}>
      <div
        className={`superadmin-transition-layer ${isLoggingOut && isExiting ? 'is-exiting' : ''} ${isEntering ? 'is-entered' : ''}`}
        aria-hidden="true"
      />
      <section className={`superadmin-layout ${isSidebarCompact ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <aside
          ref={mobileSidebarRef}
          className={`superadmin-sidebar ${isSidebarCompact ? 'collapsed' : ''} ${sidebarState === 'collapsing' ? 'is-collapsing' : ''} ${sidebarState === 'opening' ? 'is-opening' : ''}`}
          onMouseEnter={isMobileViewport ? undefined : handleSidebarMouseEnter}
          onMouseLeave={isMobileViewport ? undefined : handleSidebarMouseLeave}
        >
          <div className="superadmin-brand">
            <div className="superadmin-brand-logo">
              <Image src="/logo.png" alt="Logo StarMOT" width={64} height={64} className="superadmin-brand-logo-img" />
            </div>
            <h1 className="superadmin-title">StarMOT</h1>
          </div>

          <p className="superadmin-nav-label">StarMOT</p>
          <nav className="superadmin-nav">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`superadmin-tab ${activeTab === tab ? 'active' : ''}`}
                data-label={TAB_META[tab].label}
              >
                <span className="superadmin-tab-dot" aria-hidden="true">{TAB_META[tab].icon}</span>
                <span className="superadmin-tab-text">{TAB_META[tab].label}</span>
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
              <span className="superadmin-logout-icon" aria-hidden="true">⏻</span>
              <span className="superadmin-link-text">{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </button>

            <div className="superadmin-user-footer">
              <p><strong>Usuario:</strong> {usuario?.email || 'No disponible'}</p>
              <p><strong>Rol:</strong> {usuario?.rol || 'SUPERADMIN'}</p>
              <p><strong>Estado:</strong> {usuario?.estado || 'ACTIVO'}</p>
            </div>
          </div>
        </aside>

        <button
          type="button"
          className="superadmin-mobile-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        <section ref={contentScrollRef} className="superadmin-content">
          <header className="superadmin-topbar">
            <button
              type="button"
              className="superadmin-mobile-menu-btn"
              aria-label={isMobileSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <input
              className="superadmin-search"
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />

            <div className="superadmin-topbar-meta" aria-label="Estado de sesión">
              <span className="badge-open">Activo</span>
              <span className="badge-role">Rol: {usuario?.rol || 'SUPERADMIN'}</span>
              <label className="superadmin-theme-switch" aria-label="Seleccionar tema">
                <select
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                >
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </select>
              </label>
            </div>
          </header>

          <div className="superadmin-heading-wrap">
            <div className={`superadmin-heading-animated ${tabTransitionState === 'exiting' ? 'is-exiting' : ''} ${tabTransitionState === 'entering' ? 'is-entering' : ''}`}>
              <p className="superadmin-kicker">Panel principal</p>
              <h2 className="superadmin-heading">{TAB_META[renderTab].label}</h2>
            </div>
            <div className="superadmin-badges">
              <span className="badge-open">Activo</span>
              <span className="badge-role">{usuario?.rol || 'SUPERADMIN'}</span>
              <label className="superadmin-theme-switch" aria-label="Seleccionar tema">
                <select
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                >
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </select>
              </label>
            </div>
          </div>

          <div className={`superadmin-tab-panel ${tabTransitionState === 'exiting' ? 'is-exiting' : ''} ${tabTransitionState === 'entering' ? 'is-entering' : ''}`}>
          {renderTab === 'Dashboard' ? (
            <section className="superadmin-dashboard">
              <div className="dashboard-grid">
                <article
                  className="metric-ring-card"
                  onMouseEnter={() => setOpenListCard('clinicas')}
                  onMouseLeave={() => setOpenListCard((prev) => (prev === 'clinicas' ? null : prev))}
                >
                  <h3>Empresas activas</h3>
                  <div
                    className="metric-ring"
                    style={{
                      ['--progress' as string]: `${clinicasProgress}%`,
                      ['--ring-color' as string]: 'var(--primary-color-soft)'
                    } as CSSProperties}
                  >
                    <div className="metric-ring-inner">
                      <strong>{stats.clinicasActivas}</strong>
                      <span>{stats.clinicasTotal} totales</span>
                    </div>
                  </div>
                  {openListCard === 'clinicas' && (
                    <div className="metric-popover">
                      <p>Empresas activas (máx. 10)</p>
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
                      ['--ring-color' as string]: 'var(--primary-color)'
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
                  <svg className="activity-curve-chart" viewBox="0 0 680 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="activityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(77, 122, 168, 0.34)" />
                        <stop offset="100%" stopColor="rgba(77, 122, 168, 0.03)" />
                      </linearGradient>
                    </defs>

                    <line x1="0" y1={actividadCurveData.baselineY} x2="680" y2={actividadCurveData.baselineY} className="activity-curve-baseline" />

                    {actividadCurveData.areaPath ? (
                      <path d={actividadCurveData.areaPath} fill="url(#activityAreaGradient)" />
                    ) : null}

                    {actividadCurveData.linePath ? (
                      <path d={actividadCurveData.linePath} className="activity-curve-line" />
                    ) : null}

                    {actividadCurveData.points.map((point) => (
                      <circle key={`${point.etiqueta}-${point.total}`} cx={point.x} cy={point.y} r="4" className="activity-curve-dot" />
                    ))}
                  </svg>

                  <div className="curve-day-labels">
                    {stats.actividadSemanal.map((item) => (
                      <span key={`${item.dia}-${item.etiqueta}`} className="bar-day-label">{item.etiqueta}</span>
                    ))}
                  </div>
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
          ) : renderTab === 'Clinicas' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de empresas</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearClinica}>
                    Nueva empresa
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table clinicas-table--clinicas">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo de negocio</th>
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
                          <td colSpan={8}>Cargando empresas...</td>
                        </tr>
                      ) : filteredClinicas.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No hay resultados para la búsqueda.</td>
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
                                <td>{tipoNegocioNombrePorId[clinica.tipo_negocio_id || ''] || '-'}</td>
                                <td>{clinica.ruc || '-'}</td>
                                <td>{clinica.direccion || '-'}</td>
                                <td>{clinica.telefono || '-'}</td>
                                <td>{desactivada ? 'INACTIVA' : 'ACTIVA'}</td>
                                <td>{new Date(clinica.created_at).toLocaleString('es-PE')}</td>
                                <td>
                                  <div className="clinica-actions">
                                    <button
                                      type="button"
                                      className="detalle"
                                      onClick={() => openRowDetail(`Empresa: ${clinica.nombre}`, [
                                        { label: 'Nombre', value: clinica.nombre },
                                        { label: 'Tipo de negocio', value: tipoNegocioNombrePorId[clinica.tipo_negocio_id || ''] || '-' },
                                        { label: 'RUC', value: clinica.ruc },
                                        { label: 'Dirección', value: clinica.direccion },
                                        { label: 'Teléfono', value: clinica.telefono },
                                        { label: 'Estado', value: desactivada ? 'INACTIVA' : 'ACTIVA' },
                                        { label: 'Creación', value: new Date(clinica.created_at).toLocaleString('es-PE') }
                                      ])}
                                    >
                                      👁 Ver
                                    </button>
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
                <ModalPortal>
                  <div
                    className={`clinica-modal-backdrop ${clinicaModalClosing ? 'is-closing' : ''}`}
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        closeClinicaModal();
                      }
                    }}
                  >
                    <section className={`clinica-modal ${clinicaModalClosing ? 'is-closing' : ''}`}>
                    <h3>{clinicaModalMode === 'create' ? 'Nueva empresa' : 'Editar empresa'}</h3>

                    <form onSubmit={guardarClinica} className="clinica-form">
                      <label>
                        Nombre de empresa
                        <input
                          value={clinicaForm.nombre}
                          onChange={(event) => setClinicaForm((prev) => ({ ...prev, nombre: event.target.value }))}
                          required
                        />
                      </label>

                      <label>
                        Tipo de negocio
                        <select
                          value={clinicaForm.tipo_negocio_id}
                          onChange={(event) => setClinicaForm((prev) => ({ ...prev, tipo_negocio_id: event.target.value }))}
                          required
                        >
                          <option value="">Seleccionar tipo de negocio</option>
                          {tiposNegocioOpciones.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                          ))}
                        </select>
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
                        <button type="button" className="clinica-btn-cancel" onClick={closeClinicaModal}>Cancelar</button>
                        <button type="submit" className="clinica-btn-primary clinica-btn-save" disabled={!clinicaFormValidation.formValido}>Guardar</button>
                      </div>
                    </form>
                    </section>
                  </div>
                </ModalPortal>
              )}
            </section>
          ) : renderTab === 'TiposNegocio' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Tipos de negocio</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearTipoNegocio}>
                    Nuevo tipo
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table clinicas-table--tipos">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiposNegocioLoading ? (
                        <tr>
                          <td colSpan={3}>Cargando tipos de negocio...</td>
                        </tr>
                      ) : filteredTiposNegocio.length === 0 ? (
                        <tr>
                          <td colSpan={3}>No hay resultados para la búsqueda.</td>
                        </tr>
                      ) : (
                        filteredTiposNegocio
                          .slice(
                            (tipoNegocioPaginaActual - 1) * ITEMS_POR_PAGINA,
                            tipoNegocioPaginaActual * ITEMS_POR_PAGINA
                          )
                          .map((tipo) => (
                            <tr key={tipo.id}>
                              <td>{tipo.codigo}</td>
                              <td>{tipo.nombre}</td>
                              <td>
                                <div className="clinica-actions">
                                  <button
                                    type="button"
                                    className="detalle"
                                    onClick={() => openRowDetail(`Tipo de negocio: ${tipo.nombre}`, [
                                      { label: 'Código', value: tipo.codigo },
                                      { label: 'Nombre', value: tipo.nombre }
                                    ])}
                                  >
                                    👁 Ver
                                  </button>
                                  <button type="button" onClick={() => abrirModalEditarTipoNegocio(tipo)}>Editar</button>
                                  <button type="button" className="desactivar" onClick={() => eliminarTipoNegocio(tipo)}>
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredTiposNegocio.length > ITEMS_POR_PAGINA && (
                  <Pagination
                    totalItems={filteredTiposNegocio.length}
                    itemsPerPage={ITEMS_POR_PAGINA}
                    currentPage={tipoNegocioPaginaActual}
                    onPageChange={setTipoNegocioPaginaActual}
                  />
                )}
              </article>

              {tipoNegocioModalOpen && (
                <ModalPortal>
                  <div
                    className={`clinica-modal-backdrop ${tipoNegocioModalClosing ? 'is-closing' : ''}`}
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        closeTipoNegocioModal();
                      }
                    }}
                  >
                    <section className={`clinica-modal ${tipoNegocioModalClosing ? 'is-closing' : ''}`}>
                    <h3>{tipoNegocioModalMode === 'create' ? 'Nuevo tipo de negocio' : 'Editar tipo de negocio'}</h3>

                    <form onSubmit={guardarTipoNegocio} className="clinica-form">
                      <label>
                        Código
                        <input
                          value={tipoNegocioForm.codigo}
                          onChange={(event) => setTipoNegocioForm((prev) => ({ ...prev, codigo: event.target.value.toUpperCase() }))}
                          maxLength={20}
                          required
                        />
                      </label>

                      <label>
                        Nombre
                        <input
                          value={tipoNegocioForm.nombre}
                          onChange={(event) => setTipoNegocioForm((prev) => ({ ...prev, nombre: event.target.value }))}
                          maxLength={100}
                          required
                        />
                      </label>

                      <div className="clinica-modal-actions">
                        <button type="button" className="clinica-btn-cancel" onClick={closeTipoNegocioModal}>Cancelar</button>
                        <button type="submit" className="clinica-btn-primary clinica-btn-save" disabled={!tipoNegocioFormValidation.formValido}>Guardar</button>
                      </div>
                    </form>
                    </section>
                  </div>
                </ModalPortal>
              )}
            </section>
          ) : renderTab === 'Usuarios' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de usuarios</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearUsuario}>
                    Nuevo usuario
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table clinicas-table--usuarios">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Persona</th>
                        <th>Empresa</th>
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
                                    <button
                                      type="button"
                                      className="detalle"
                                      onClick={() => openRowDetail(`Usuario: ${usuarioItem.email}`, [
                                        { label: 'Email', value: usuarioItem.email },
                                        { label: 'Rol', value: usuarioItem.rol },
                                        { label: 'Persona', value: personaNombrePorId[usuarioItem.persona_id] || usuarioItem.persona_id },
                                        { label: 'Empresa', value: clinicaNombrePorId[usuarioItem.clinica_id || ''] || usuarioItem.clinica_id || '-' },
                                        { label: 'Estado', value: desactivado ? 'INACTIVO' : usuarioItem.estado },
                                        { label: 'Creación', value: new Date(usuarioItem.created_at).toLocaleString('es-PE') }
                                      ])}
                                    >
                                      👁 Ver
                                    </button>
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
                <ModalPortal>
                  <div
                    className={`clinica-modal-backdrop ${usuarioModalClosing ? 'is-closing' : ''}`}
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        closeUsuarioModal();
                      }
                    }}
                  >
                    <section className={`clinica-modal ${usuarioModalClosing ? 'is-closing' : ''}`}>
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
                        Empresa
                        <select
                          value={usuarioForm.clinica_id}
                          onChange={(event) => setUsuarioForm((prev) => ({ ...prev, clinica_id: event.target.value }))}
                          required
                        >
                          <option value="">Seleccionar empresa</option>
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
                        <button type="button" className="clinica-btn-cancel" onClick={closeUsuarioModal}>Cancelar</button>
                        <button type="submit" className="clinica-btn-primary clinica-btn-save" disabled={!usuarioFormValidation.formValido}>Guardar</button>
                      </div>
                    </form>
                    </section>
                  </div>
                </ModalPortal>
              )}
            </section>
          ) : renderTab === 'Personas' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Listado de personas</h3>
                  <button type="button" className="clinica-btn-primary" onClick={abrirModalCrearPersona}>
                    Nueva persona
                  </button>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table clinicas-table--personas">
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
                                    <button
                                      type="button"
                                      className="detalle"
                                      onClick={() => openRowDetail(`Persona: ${personaItem.nombres}`, [
                                        { label: 'DNI', value: personaItem.dni },
                                        { label: 'Nombres', value: personaItem.nombres },
                                        { label: 'Apellido paterno', value: personaItem.apellido_paterno },
                                        { label: 'Apellido materno', value: personaItem.apellido_materno },
                                        { label: 'Sexo', value: personaItem.sexo },
                                        { label: 'Fecha nacimiento', value: new Date(personaItem.fecha_nacimiento).toLocaleDateString('es-PE') },
                                        { label: 'Creación', value: new Date(personaItem.created_at).toLocaleString('es-PE') },
                                        { label: 'Estado', value: desactivada ? 'INACTIVA' : 'ACTIVA' }
                                      ])}
                                    >
                                      👁 Ver
                                    </button>
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
                <ModalPortal>
                  <div
                    className={`clinica-modal-backdrop ${personaModalClosing ? 'is-closing' : ''}`}
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        closePersonaModal();
                      }
                    }}
                  >
                    <section className={`clinica-modal ${personaModalClosing ? 'is-closing' : ''}`}>
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
                        <p className="persona-dni-hint">Se consultará el DNI en BD y API externa para completar datos automáticamente.</p>
                      ) : null}

                      <div className="clinica-modal-actions">
                        <button type="button" className="clinica-btn-cancel" onClick={closePersonaModal}>Cancelar</button>
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
                </ModalPortal>
              )}
            </section>
          ) : renderTab === 'Sesiones' ? (
            <section className="superadmin-grid clinicas-grid">
              <article className="superadmin-card clinicas-card">
                <div className="clinicas-header">
                  <h3>Sesiones activas</h3>
                </div>

                <div className="clinicas-table-wrap">
                  <table className="clinicas-table clinicas-table--sesiones">
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
                          .map((sesionItem) => {
                            const esSesionActual = sessionIdActual === sesionItem.id;

                            return (
                              <tr key={sesionItem.id}>
                                <td>
                                  {sesionItem.email || 'N/A'}
                                  {esSesionActual ? <span className="session-current-badge">Sesión actual</span> : null}
                                </td>
                                <td>{sesionItem.rol || 'N/A'}</td>
                                <td>{new Date(sesionItem.created_at).toLocaleString('es-PE')}</td>
                                <td>{new Date(sesionItem.expires_at).toLocaleString('es-PE')}</td>
                                <td>
                                  <div className="clinica-actions">
                                    <button
                                      type="button"
                                      className="detalle"
                                      onClick={() => openRowDetail(`Sesión: ${sesionItem.email || 'N/A'}`, [
                                        { label: 'Email', value: sesionItem.email || 'N/A' },
                                        { label: 'Rol', value: sesionItem.rol || 'N/A' },
                                        { label: 'Creación', value: new Date(sesionItem.created_at).toLocaleString('es-PE') },
                                        { label: 'Expira', value: new Date(sesionItem.expires_at).toLocaleString('es-PE') },
                                        { label: 'Estado', value: esSesionActual ? 'Sesión actual' : 'Activa' }
                                      ])}
                                    >
                                      👁 Ver
                                    </button>
                                    <button
                                      type="button"
                                      className={esSesionActual ? 'actual' : 'desactivar'}
                                      onClick={() => {
                                        if (esSesionActual) return;
                                        revocarSesion(sesionItem.id);
                                      }}
                                      disabled={esSesionActual}
                                    >
                                      {esSesionActual ? 'Sesión actual' : 'Revocar'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
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
                <h3>{TAB_META[activeTab].label}</h3>
                <p>Sección en construcción. Aquí colocaremos listado, filtros y acciones.</p>
              </article>
            </section>
          )}
          </div>
        </section>
      </section>

      {isSessionRevokedModalOpen && (
        <ModalPortal>
          <div
            className="clinica-modal-backdrop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-revoked-title"
          >
            <section className="clinica-modal clinica-modal-detail superadmin-revoked-modal">
              <h3 id="session-revoked-title">Tu sesión fue revocada</h3>
              <p className="superadmin-revoked-copy">Por seguridad, te redirigiremos al login.</p>
            </section>
          </div>
        </ModalPortal>
      )}

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

      {rowDetail && (
        <ModalPortal>
          <div
            className={`clinica-modal-backdrop ${rowDetailClosing ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeRowDetail();
              }
            }}
          >
            <section className={`clinica-modal clinica-modal-detail ${rowDetailClosing ? 'is-closing' : ''}`}>
              <h3>{rowDetail.title}</h3>

              <dl className="detail-grid">
                {rowDetail.fields.map((field) => (
                  <div key={`${field.label}-${field.value}`} className="detail-grid-item">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="clinica-modal-actions">
                <button type="button" className="clinica-btn-primary clinica-btn-save" onClick={closeRowDetail}>
                  Cerrar
                </button>
              </div>
            </section>
          </div>
        </ModalPortal>
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
