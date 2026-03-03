'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import './css/home.css';

const CAPABILITIES = [
  {
    icon: '✚',
    title: 'Historia clínica digital',
    description: 'Registro estructurado de atenciones, diagnósticos y evolución para continuidad asistencial segura.'
  },
  {
    icon: '⌁',
    title: 'Agenda y citas inteligentes',
    description: 'Programación por especialidad, profesional y sede con control de disponibilidad y confirmaciones.'
  },
  {
    icon: '⤢',
    title: 'Gestión de pacientes',
    description: 'Ficha clínica y administrativa consolidada para seguimiento continuo y atención integral.'
  },
  {
    icon: '◫',
    title: 'Facturación y caja',
    description: 'Control de cobros, servicios, comprobantes y reportes financieros en tiempo real por institución.'
  },
  {
    icon: '⟲',
    title: 'Seguridad y auditoría',
    description: 'Accesos por roles y trazabilidad de eventos para cumplimiento operativo y control interno.'
  },
  {
    icon: '⬢',
    title: 'SaaS multi-tenant',
    description: 'Administración centralizada de múltiples clínicas con planes, suscripciones y escalabilidad progresiva.'
  }
];

const WHY_STARMOT = [
  {
    number: '01',
    title: 'Control clínico centralizado',
    description: 'Una sola plataforma para coordinar sedes, usuarios, pacientes y procesos operativos con orden.'
  },
  {
    number: '02',
    title: 'Productividad asistencial',
    description: 'Flujos clínicos y administrativos digitalizados para reducir tiempos y mejorar continuidad de atención.'
  },
  {
    number: '03',
    title: 'Escalabilidad SaaS',
    description: 'Crece por etapas con planes flexibles y una arquitectura preparada para múltiples instituciones.'
  },
  {
    number: '04',
    title: 'Auditoría completa',
    description: 'Cada evento relevante queda trazado para control interno, cumplimiento y mejora continua.'
  },
  {
    number: '05',
    title: 'Facturación integrada',
    description: 'Conecta operación clínica y financiera en una misma vista para decisiones más rápidas.'
  },
  {
    number: '06',
    title: 'Implementación guiada',
    description: 'Acompañamiento funcional y técnico para adoptar la plataforma con menor fricción.'
  },
  {
    number: '07',
    title: 'Analítica para decisión',
    description: 'Indicadores de operación y rendimiento para tomar decisiones clínicas y de negocio con datos reales.'
  },
  {
    number: '08',
    title: 'Experiencia unificada',
    description: 'Pacientes, personal asistencial y administración trabajan con el mismo flujo, sin duplicar información.'
  },
  {
    number: '09',
    title: 'Continuidad operativa',
    description: 'Infraestructura preparada para operación estable y evolución constante del sistema sin interrupciones críticas.'
  }
];

const PRICING = [
  {
    name: 'Trial Clínica',
    price: 'S/ 0',
    period: '14 días',
    detail: 'Inicio validado sin costo para conocer el flujo completo.',
    features: ['Agenda médica básica', 'Historia clínica inicial', 'Soporte de activación inicial'],
    limits: {
      maxUsuarios: '5',
      maxPacientes: '500',
      maxStorageGb: '10 GB',
      incluyeFacturacion: false,
      incluyeHistoriaAvanzada: false,
      incluyeIntegraciones: false,
      incluyeApi: false,
      diasTrial: 14
    }
  },
  {
    name: 'Clínica Basic',
    price: 'S/ 149',
    period: 'mensual',
    detail: 'Ideal para equipos en crecimiento con operación consolidada.',
    features: ['Módulo de caja y reportes base', 'Control de roles y permisos', 'Trazabilidad de operaciones'],
    limits: {
      maxUsuarios: '15',
      maxPacientes: '5,000',
      maxStorageGb: '100 GB',
      incluyeFacturacion: true,
      incluyeHistoriaAvanzada: false,
      incluyeIntegraciones: false,
      incluyeApi: false,
      diasTrial: 0
    }
  },
  {
    name: 'Clínica Pro',
    price: 'S/ 399',
    period: 'mensual',
    detail: 'Pensado para operación multi-sede y control avanzado.',
    features: ['Automatización y analítica avanzada', 'Gestión multi-sede centralizada', 'Dashboards de productividad clínica'],
    limits: {
      maxUsuarios: '60',
      maxPacientes: '30,000',
      maxStorageGb: '500 GB',
      incluyeFacturacion: true,
      incluyeHistoriaAvanzada: true,
      incluyeIntegraciones: true,
      incluyeApi: false,
      diasTrial: 0
    }
  },
  {
    name: 'Clínica Enterprise',
    price: 'S/ 999',
    period: 'mensual',
    detail: 'Escala completa con acompañamiento estratégico dedicado.',
    features: ['Integraciones y personalización avanzada', 'SLA y monitoreo especializado', 'Acompañamiento técnico estratégico'],
    limits: {
      maxUsuarios: 'Ilimitado',
      maxPacientes: 'Ilimitado',
      maxStorageGb: 'Ilimitado',
      incluyeFacturacion: true,
      incluyeHistoriaAvanzada: true,
      incluyeIntegraciones: true,
      incluyeApi: true,
      diasTrial: 0
    }
  }
];

const API_EMPRESAS_ACTIVAS = '/api/backend/empresas/public/activas';

export default function HomeClient() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const [partnerCompanies, setPartnerCompanies] = useState<string[]>([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'capacidades' | 'planes' | 'comunicacion'>('home');

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      try {
        const response = await fetch(API_EMPRESAS_ACTIVAS, { credentials: 'include' });
        if (!response.ok) {
          if (isMounted) setCompaniesLoaded(true);
          return;
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const companyNames = items
          .map((item: { nombre?: string }) => String(item?.nombre || '').trim())
          .filter((name: string) => name.length > 0);

        if (isMounted) {
          setPartnerCompanies(companyNames);
          setCompaniesLoaded(true);
        }
      } catch {
        if (isMounted) setCompaniesLoaded(true);
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

  const goTo = (id: string) => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('home');
      return;
    }

    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getInitials = (name: string) => {
    const words = name
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (words.length === 0) return '--';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const hasCompanies = companiesLoaded && partnerCompanies.length > 0;

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY < 140) {
        setActiveSection('home');
        return;
      }

      const planes = document.getElementById('planes');
      const comunicacion = document.getElementById('comunicacion');
      const capacidades = document.getElementById('capacidades');

      if (comunicacion) {
        const top = comunicacion.getBoundingClientRect().top;
        if (top <= 180) {
          setActiveSection('comunicacion');
          return;
        }
      }

      if (planes) {
        const top = planes.getBoundingClientRect().top;
        if (top <= 180) {
          setActiveSection('planes');
          return;
        }
      }

      if (capacidades) {
        setActiveSection('capacidades');
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className={`home-transition ${isExiting ? 'visible' : ''}`} aria-hidden="true" />

      <main className="home-page">
        <section className="home-hero-stage">
          <section className="home-overlay" />

          <div className="home-brand home-brand-static">
            <div className="home-brand-icon">
              <Image src="/logo.png" alt="Logo StarMOT" width={24} height={24} />
            </div>
            <span>StarMOT</span>
          </div>

          <header className="home-topbar">
            <nav className={`home-nav home-nav-${activeSection}`} aria-label="Navegación principal">
              <button type="button" className={activeSection === 'home' ? 'active' : ''} onClick={() => goTo('home')}>Home</button>
              <button type="button" className={activeSection === 'capacidades' ? 'active' : ''} onClick={() => goTo('capacidades')}>¿Por qué?</button>
              <button type="button" className={activeSection === 'planes' ? 'active' : ''} onClick={() => goTo('planes')}>Costos</button>
              <button type="button" className={activeSection === 'comunicacion' ? 'active' : ''} onClick={() => goTo('comunicacion')}>Comunicación</button>
            </nav>
          </header>

          <section className="home-hero" id="home">
            <article className="home-hero-left">
              <p className="home-kicker">PLATAFORMA CLÍNICA SaaS</p>
              <h1>
                Impulsa tu operación
                <br />
                médica inteligente
              </h1>
              <p className="home-hero-copy">
                Gestiona instituciones, usuarios y procesos clínicos desde una sola plataforma.
              </p>
              <button type="button" className="home-main-btn" onClick={handleGoLogin}>Iniciar sesión</button>

              <div className="home-clinics" aria-label="Clínicas activas en la plataforma">
                <div className={`home-clinics-circles ${hasCompanies ? 'loaded' : ''}`}>
                  {hasCompanies && partnerCompanies.map((name) => (
                    <span key={name} className="home-clinic-circle" data-name={name}>
                      {getInitials(name)}
                    </span>
                  ))}
                </div>
                <p className={`home-clinics-meta ${hasCompanies ? 'loaded' : ''}`}>
                  <strong>{partnerCompanies.length}+</strong>
                  <span>Centros activos</span>
                </p>
              </div>
            </article>

            <aside className="home-hero-right" aria-label="Capacidades principales">
              {CAPABILITIES.map((item) => (
                <article key={item.title} className="home-capability-note">
                  <span className="home-capability-icon" aria-hidden="true">{item.icon}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </aside>
          </section>
        </section>

        <section className="home-content">
          <section className="home-screen-section" id="capacidades" aria-label="Por qué elegir StarMOT">
            <div className="home-screen-inner home-why-layout">
              <h2>¿POR QUE ELEGIR STARMOT?</h2>
              <p className="home-screen-lead">Una solución clínica diseñada para operar con orden, velocidad y crecimiento sostenible.</p>

              <div className="home-why-list">
                {WHY_STARMOT.map((item) => (
                  <article key={item.number} className="home-why-card">
                    <span className="home-why-number">{item.number}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="home-screen-section" id="planes" aria-label="Costos de suscripción">
            <div className="home-screen-inner home-pricing-layout">
              <h2>PLANES Y COSTOS STARMOT</h2>
              <p>Modelo claro de suscripción mensual para cada nivel de madurez operativa.</p>

              <div className="home-pricing-list">
                {PRICING.map((item, index) => (
                  <article key={item.name} className="home-pricing-card">
                    <span className="home-pricing-number">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{item.name}</h3>
                    <p className="home-price">{item.price}<small> / {item.period}</small></p>
                    <p>{item.detail}</p>
                    <ul className="home-pricing-features">
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <dl className="home-pricing-specs" aria-label={`Límites del plan ${item.name}`}>
                      <div><dt>Usuarios</dt><dd>{item.limits.maxUsuarios}</dd></div>
                      <div><dt>Pacientes</dt><dd>{item.limits.maxPacientes}</dd></div>
                      <div><dt>Storage</dt><dd>{item.limits.maxStorageGb}</dd></div>
                      {item.limits.incluyeFacturacion && <div><dt>Facturación</dt><dd>Sí</dd></div>}
                      {item.limits.incluyeHistoriaAvanzada && <div><dt>Historia avanzada</dt><dd>Sí</dd></div>}
                      {item.limits.incluyeIntegraciones && <div><dt>Integraciones</dt><dd>Sí</dd></div>}
                      {item.limits.incluyeApi && <div><dt>API</dt><dd>Sí</dd></div>}
                      {item.limits.diasTrial > 0 && <div><dt>Días trial</dt><dd>{String(item.limits.diasTrial)}</dd></div>}
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="home-screen-section" id="comunicacion" aria-label="Comunicación">
            <div className="home-screen-inner">
              <p className="home-contact-label">COMUNICACIÓN</p>
              <h2>Estamos listos para acompañar tu implementación</h2>
              <p>Comercial: ventas@starmot.pe · Soporte: soporte@starmot.pe · WhatsApp: +51 999 999 999</p>
              <button type="button" className="home-main-btn" onClick={handleGoLogin}>Solicitar demo</button>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
