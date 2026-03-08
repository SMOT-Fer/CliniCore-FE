'use client';

import Link from 'next/link';
import { FiCalendar, FiClipboard, FiCreditCard, FiDatabase, FiFileText, FiShield } from 'react-icons/fi';
import MarketingNavbar from './components/marketing-navbar';
import MarketingFooter from './components/marketing-footer';
import './css/marketing.css';
import './css/landing.css';

const SOFTWARE_FEATURES = [
  {
    key: 'agenda',
    title: 'Agenda de citas',
    icon: <FiCalendar />,
    bullets: ['Programa citas rápidamente', 'Visualiza tu calendario médico', 'Filtra por profesional o fecha', 'Estados claros de cada cita']
  },
  {
    key: 'historial',
    title: 'Historial clínico',
    icon: <FiFileText />,
    bullets: ['Registra cada atención', 'Adjunta documentos médicos', 'Historial completo del paciente', 'Información organizada']
  },
  {
    key: 'pacientes',
    title: 'Gestión de pacientes',
    icon: <FiDatabase />,
    bullets: ['Ficha completa de datos', 'Soporte para menores de edad', 'Historial de consultas', 'Búsqueda rápida']
  },
  {
    key: 'facturacion',
    title: 'Pagos y facturación',
    icon: <FiCreditCard />,
    bullets: ['Registra pagos de consultas', 'Pagos parciales', 'Comprobantes en PDF', 'Seguimiento de deudas']
  },
  {
    key: 'paquetes',
    title: 'Paquetes de consultas',
    icon: <FiClipboard />,
    bullets: ['Paquetes con descuento', 'Individuales o empresariales', 'Control de sesiones', 'Vigencia configurable']
  },
  {
    key: 'seguridad',
    title: 'Seguridad y auditoría',
    icon: <FiShield />,
    bullets: ['Accesos por rol', 'Eventos críticos auditados', 'Trazabilidad por usuario', 'Cumplimiento operativo']
  }
];

const SOFTWARE_ADVANTAGES = [
  {
    key: 'simplicidad',
    title: 'Más simple de operar',
    icon: <FiClipboard />,
    bullets: ['Interfaz clara para el equipo', 'Flujo intuitivo por módulos', 'Curva de adopción más rápida']
  },
  {
    key: 'control',
    title: 'Mayor control operativo',
    icon: <FiDatabase />,
    bullets: ['Operación centralizada', 'Menos uso de herramientas dispersas', 'Decisiones con datos unificados']
  },
  {
    key: 'seguridad-activa',
    title: 'Datos siempre protegidos',
    icon: <FiShield />,
    bullets: ['Permisos por rol', 'Sesiones seguras', 'Auditoría en módulos críticos']
  },
  {
    key: 'rapidez',
    title: 'Implementación rápida',
    icon: <FiCalendar />,
    bullets: ['Configuración progresiva', 'Sin frenar atención diaria', 'Despliegue por etapas']
  },
  {
    key: 'nube',
    title: 'Acceso desde cualquier lugar',
    icon: <FiFileText />,
    bullets: ['Acceso web seguro', 'Disponible por sede o remoto', 'Continuidad operativa en la nube']
  },
  {
    key: 'escalable',
    title: 'Escalable para crecer',
    icon: <FiCreditCard />,
    bullets: ['Crecimiento por módulos', 'Soporte para más usuarios', 'Preparado para múltiples sedes']
  },
  {
    key: 'soporte',
    title: 'Soporte y mejora continua',
    icon: <FiClipboard />,
    bullets: ['Acompañamiento en implementación', 'Ajustes según operación', 'Evolución constante del sistema']
  },
  {
    key: 'auditoria',
    title: 'Cumplimiento y trazabilidad',
    icon: <FiShield />,
    bullets: ['Registro de cambios y accesos', 'Historial verificable por usuario', 'Soporte para control interno']
  }
];

export default function HomeClient() {
  return (
    <main className="landing-page marketing-shell">
      <MarketingNavbar />
      <section className="landing-main">
        <section className="landing-hero-static" id="home" aria-label="Inicio">
          <div className="landing-hero-static-overlay">
            <p className="landing-kicker">SaaS clínico para operación inteligente</p>
            <h1>CliniCore, plataforma clínica integral para crecer con orden</h1>
            <p>
              Digitaliza la operación asistencial y administrativa con módulos conectados,
              seguridad por roles y trazabilidad completa por clínica.
            </p>
            <Link href="/funcionalidades" className="landing-primary-link">Ver Funcionalidades</Link>
          </div>
        </section>

        <section className="landing-feature-stack" aria-label="Características del software">
          <div className="landing-section-head">
            <h2>¿Qué puedes hacer con CliniCore?</h2>
            <p>Todo lo que necesitas para gestionar tu clínica en un solo sistema.</p>
          </div>

          <div className="landing-feature-grid">
            {SOFTWARE_FEATURES.map((item) => (
              <article key={item.key} className="landing-feature-block">
                <div className="landing-feature-content">
                  <span className="landing-feature-icon" aria-hidden="true">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <ul className="landing-benefits" aria-label={`Puntos clave de ${item.title}`}>
                    {item.bullets.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-stack-strip" aria-label="Ventajas del software">
          <div className="landing-section-head">
            <h2>Ventajas de CliniCore</h2>
            <p>Beneficios clave frente a sistemas tradicionales o soluciones fragmentadas.</p>
          </div>

          <div className="landing-advantages-grid">
            {SOFTWARE_ADVANTAGES.map((advantage) => (
              <article key={advantage.key} className="landing-advantage-card">
                <span className="landing-feature-icon" aria-hidden="true">{advantage.icon}</span>
                <h3>{advantage.title}</h3>
                <ul className="landing-benefits" aria-label={`Ventajas de ${advantage.title}`}>
                  {advantage.bullets.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <MarketingFooter />
      </section>
    </main>
  );
}
