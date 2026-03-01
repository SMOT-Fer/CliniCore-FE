'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useThemeMode, type ThemeMode } from './hooks/use-theme-mode';
import './css/home.css';

const SYSTEM_CARDS = [
  {
    title: 'Seguridad y accesos',
    description: 'Control de roles, permisos y sesiones para proteger cada módulo del sistema.',
    icon: '🛡️'
  },
  {
    title: 'Personalización por empresa',
    description: 'Adaptación de pantallas, procesos y reglas de negocio según cada operación.',
    icon: '⚙️'
  },
  {
    title: 'Automatización de procesos',
    description: 'Flujos automáticos para tareas repetitivas, aprobaciones y seguimiento operativo.',
    icon: '🤖'
  },
  {
    title: 'Usuarios y roles',
    description: 'Gestión completa de cuentas, perfiles y niveles de acceso para cada equipo.',
    icon: '👥'
  },
  {
    title: 'Reportes y analítica',
    description: 'Paneles e indicadores en tiempo real para decisiones rápidas y precisas.',
    icon: '📈'
  },
  {
    title: 'Integraciones API',
    description: 'Conexión con servicios externos y herramientas existentes para centralizar datos.',
    icon: '🔗'
  }
];

const API_EMPRESAS_ACTIVAS = '/api/backend/empresas/public/activas';

export default function HomeClient() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeMode();
  const [isExiting, setIsExiting] = useState(false);
  const [partnerCompanies, setPartnerCompanies] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      try {
        const response = await fetch(API_EMPRESAS_ACTIVAS, { credentials: 'include' });
        if (!response.ok) return;

        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const companyNames = items
          .map((item: { nombre?: string }) => String(item?.nombre || '').trim())
          .filter((name: string) => name.length > 0)
          .slice(0, 5);

        if (isMounted) {
          setPartnerCompanies(companyNames);
        }
      } catch {
      }
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoLogin = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      router.push('/login');
    }, 420);
  };

  const getInitials = (name: string) => {
    const words = name
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  return (
    <>
      <div className={`home-transition ${isExiting ? 'visible' : ''}`} aria-hidden="true" />

      <main className="home-page">
        <section className="home-overlay" />

        <header className="home-topbar">
          <div className="home-brand">
            <div className="home-brand-icon">
              <Image src="/logo.png" alt="Logo StarMOT" width={24} height={24} />
            </div>
            <span>StarMOT</span>
          </div>

          <label className="home-theme-switch" aria-label="Seleccionar tema">
            <span>Tema</span>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
        </header>

        <section className="home-hero">
          <article className="home-hero-left">
            <h1>
              Desarrolla tu
              <br />
              <span>sistema personalizado</span>
            </h1>
            <p>
              Creamos una solución a tu medida con personalización completa, automatización de procesos,
              seguridad por roles, paneles de control e integraciones para escalar tu operación con orden y
              eficiencia.
            </p>

            <button type="button" className="home-login-btn" onClick={handleGoLogin}>
              Iniciar sesión
            </button>

            <div className="home-companies" aria-label="Empresas que trabajan con StarMOT">
              {partnerCompanies.length > 0 ? (
                partnerCompanies.map((company) => (
                  <span key={company} className="home-company-bubble" data-name={company} aria-label={company}>
                    {getInitials(company)}
                  </span>
                ))
              ) : (
                <span className="home-company-bubble home-company-bubble-empty" aria-label="Sin empresas activas">
                  --
                </span>
              )}
            </div>
          </article>

          <aside className="home-hero-right" aria-label="Capacidades del sistema">
            {SYSTEM_CARDS.map((item) => (
              <article key={item.title} className="home-feature-card">
                <span className="home-feature-icon" aria-hidden="true">{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </aside>
        </section>
      </main>
    </>
  );
}
