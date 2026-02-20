'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
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

const TABS = ['Dashboard', 'Clinicas', 'Usuarios', 'Perosnas', 'Sesiones'] as const;
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

function getTodayLocalIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [openListCard, setOpenListCard] = useState<'clinicas' | 'usuarios' | null>(null);
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
    if (state !== 'allowed') return;

    const loadDashboardStats = async () => {
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
            .map((item: { nombre?: string }) => item.nombre || 'Sin nombre')
            .slice(0, MAX_TOOLTIP_ITEMS),
          usuariosTotal: usuarios.length,
          usuariosActivos: usuariosActivos.length,
          usuariosActivosNombres: usuariosActivos
            .map((item: { email?: string }) => item.email || 'Sin email')
            .slice(0, MAX_TOOLTIP_ITEMS),
          sesionesActivas: sesiones.length,
          actividadSemanal: actividad,
          seguridad
        });
      } catch {
        // Mantener fallback visual en caso de error
      }
    };

    loadDashboardStats();
  }, [state, selectedEndDate]);

  const clinicasProgress = stats.clinicasTotal > 0
    ? Math.round((stats.clinicasActivas / stats.clinicasTotal) * 100)
    : 0;

  const usuariosProgress = stats.usuariosTotal > 0
    ? Math.round((stats.usuariosActivos / stats.usuariosTotal) * 100)
    : 0;

  const sesionesProgress = stats.usuariosActivos > 0
    ? Math.min(100, Math.round((stats.sesionesActivas / stats.usuariosActivos) * 100))
    : 0;

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
                        {stats.clinicasActivasNombres.length > 0 ? (
                          stats.clinicasActivasNombres.map((nombre) => <li key={nombre}>{nombre}</li>)
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
                        {stats.usuariosActivosNombres.length > 0 ? (
                          stats.usuariosActivosNombres.map((nombre) => <li key={nombre}>{nombre}</li>)
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
                      <div className="bar" style={{ height: `${Math.max(14, item.total * 10)}px` }} />
                      <span className="bar-day-label">{item.etiqueta}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="superadmin-card card-small">
                <h3>Implementos de seguridad</h3>
                {stats.seguridad.length > 0 ? (
                  <ul className="security-list">
                    {stats.seguridad.map((item) => (
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
    </main>
  );
}
