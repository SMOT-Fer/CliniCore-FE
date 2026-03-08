'use client';

import { FiActivity, FiCalendar, FiClipboard, FiCreditCard, FiDatabase, FiFileText, FiLayers, FiShield, FiUsers } from 'react-icons/fi';
import type { MouseEvent } from 'react';
import MarketingNavbar from '../components/marketing-navbar';
import MarketingFooter from '../components/marketing-footer';
import '../css/marketing.css';
import '../css/funcionalidades.css';
import '../css/landing.css';

const MODULES = [
  {
    key: 'agenda',
    title: 'Agenda clínica inteligente',
    icon: <FiCalendar />,
    summary: 'Organiza horarios por sede, profesional y especialidad con visibilidad operativa en tiempo real.',
    details: [
      'Programación rápida de citas por profesional',
      'Control de estados: pendiente, confirmado, atendido y reprogramado',
      'Filtros por fecha, sede, especialidad y médico',
      'Seguimiento de inasistencias y reordenamiento de agenda',
      'Notificación operativa para mantener continuidad de atención'
    ]
  },
  {
    key: 'historia',
    title: 'Expediente clínico longitudinal',
    icon: <FiFileText />,
    summary: 'Consolida la evolución médica del paciente con trazabilidad y acceso controlado por roles.',
    details: [
      'Registro de atención y evolución por consulta',
      'Adjuntos clínicos y documentación por paciente',
      'Historial completo centralizado en una ficha única',
      'Consulta rápida para continuidad asistencial',
      'Resumen clínico para decisiones médicas en menos tiempo'
    ]
  },
  {
    key: 'pacientes',
    title: 'Gestión de pacientes',
    icon: <FiDatabase />,
    summary: 'Administra datos clínicos y administrativos desde un solo punto para una atención más ágil.',
    details: [
      'Ficha única con datos de contacto y antecedentes',
      'Búsqueda por múltiples criterios operativos',
      'Soporte para perfiles de menores de edad',
      'Seguimiento de historial de consultas y estado del paciente',
      'Control de información administrativa vinculada a atención'
    ]
  },
  {
    key: 'caja',
    title: 'Cobranza y facturación asistencial',
    icon: <FiCreditCard />,
    summary: 'Conecta los servicios clínicos con el control financiero para una operación sostenible.',
    details: [
      'Registro de cobros por consulta y procedimientos',
      'Gestión de pagos parciales y saldos pendientes',
      'Comprobantes y control de movimientos de caja',
      'Reportes para revisión operativa y financiera',
      'Seguimiento de deudas y cumplimiento de pago'
    ]
  },
  {
    key: 'paquetes',
    title: 'Paquetes de consultas',
    icon: <FiClipboard />,
    summary: 'Administra paquetes promocionales y controla consumo de sesiones por paciente.',
    details: [
      'Paquetes personalizados por sesiones y especialidad',
      'Configuración para pacientes individuales o corporativos',
      'Control de sesiones consumidas, disponibles y vencidas',
      'Vigencia configurable por días o reglas internas',
      'Descuento automático de sesión al agendar desde paquete'
    ]
  },
  {
    key: 'liquidaciones',
    title: 'Comisiones y liquidaciones médicas',
    icon: <FiCreditCard />,
    summary: 'Calcula y controla comisiones médicas según reglas operativas por período.',
    details: [
      'Cálculo automático por porcentaje de comisión',
      'Liquidaciones por período semanal, quincenal o mensual',
      'Detalle completo por sesión y profesional',
      'Control de pagos de liquidaciones y estado',
      'Historial de liquidaciones para trazabilidad'
    ]
  },
  {
    key: 'seguridad',
    title: 'Gobierno de accesos y auditoría',
    icon: <FiShield />,
    summary: 'Protege información sensible y registra acciones críticas para control interno permanente.',
    details: [
      'Permisos por rol, perfil y responsabilidad',
      'Bitácora de accesos y cambios sensibles',
      'Trazabilidad de eventos por usuario y módulo',
      'Base para cumplimiento de políticas internas',
      'Auditoría operativa para control y supervisión'
    ]
  },
  {
    key: 'saas',
    title: 'Operación multi-sede escalable',
    icon: <FiLayers />,
    summary: 'Prepara tu operación para crecer por sedes, equipos y nuevas unidades sin perder consistencia.',
    details: [
      'Gestión central con separación por clínica',
      'Escalabilidad por módulos según crecimiento',
      'Estructura lista para expansión multi-sede',
      'Gobierno operativo con administración centralizada',
      'Implementación por etapas sin romper procesos activos'
    ]
  },
  {
    key: 'farmacia',
    title: 'Farmacia clínica y dispensación',
    icon: <FiActivity />,
    summary: 'Controla inventario farmacéutico, recetas y dispensación con trazabilidad por paciente.',
    details: [
      'Gestión de stock por lote, vencimiento y ubicación',
      'Dispensación vinculada a receta y atención médica',
      'Alertas por bajo stock y vencimientos próximos',
      'Control de movimientos de ingreso y salida',
      'Reporte de consumo por servicio o profesional'
    ]
  },
  {
    key: 'internacion',
    title: 'Hospitalización e infraestructura de camas',
    icon: <FiUsers />,
    summary: 'Gestiona admisiones, ocupación de camas y seguimiento clínico de pacientes hospitalizados.',
    details: [
      'Asignación de cama por área y disponibilidad',
      'Registro de ingreso, evolución y alta de internación',
      'Control de traslados internos entre unidades',
      'Estado en tiempo real de ocupación y rotación',
      'Trazabilidad de eventos durante la estancia'
    ]
  },
  {
    key: 'residencia',
    title: 'Residencias geriátricas y cuidado continuo',
    icon: <FiUsers />,
    summary: 'Centraliza cuidado continuo, medicación y controles periódicos en residencias geriátricas.',
    details: [
      'Ficha integral del residente y plan de cuidados',
      'Programación de medicación y controles diarios',
      'Registro de incidentes y alertas de seguimiento',
      'Historial de evolución multidisciplinaria',
      'Comunicación operativa con responsables autorizados'
    ]
  },
  {
    key: 'administracion',
    title: 'Analítica operativa y gestión ejecutiva',
    icon: <FiLayers />,
    summary: 'Supervisa indicadores clave, productividad y desempeño para decisiones estratégicas.',
    details: [
      'Tableros de gestión clínica y financiera',
      'Indicadores por sede, especialidad y profesional',
      'Seguimiento de productividad operativa',
      'Reportes exportables para dirección y control',
      'Monitoreo de tendencias para mejora continua'
    ]
  }
];

export default function FuncionalidadesPage() {
  const handleChipClick = (event: MouseEvent<HTMLAnchorElement>, key: string) => {
    event.preventDefault();

    const target = document.getElementById(key);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${key}`);
  };

  return (
    <main className="marketing-shell funcionalidades-page">
      <MarketingNavbar />

      <section className="funcionalidades-main">
        <section className="funcionalidades-hero" aria-label="Introducción">
          <h1>Funcionalidades</h1>
          <p>
            Un entorno clínico unificado para coordinar atención, finanzas y control operativo con una implementación modular y progresiva.
          </p>
          <nav className="funcionalidades-top-menu" aria-label="Accesos rápidos a funcionalidades">
            {MODULES.map((module) => (
              <a
                key={module.key}
                href={`#${module.key}`}
                className="funcionalidades-chip"
                onClick={(event) => handleChipClick(event, module.key)}
              >
                <span aria-hidden="true">{module.icon}</span>
                <span>{module.title}</span>
              </a>
            ))}
          </nav>
        </section>

        <section className="funcionalidades-section" aria-label="Módulos del sistema">
          <div className="funcionalidades-detail-list">
            {MODULES.map((module, index) => (
              <article id={module.key} key={module.key} className={`funcionalidades-row ${index % 2 !== 0 ? 'is-reverse' : ''}`}>
                <div className="funcionalidades-col funcionalidades-col-main">
                  <span className="funcionalidades-icon" aria-hidden="true">{module.icon}</span>
                  <h3>{module.title}</h3>
                  <p>{module.summary}</p>
                  <h4>Detalle funcional</h4>
                  <ul>
                    {module.details.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>

                <aside className="funcionalidades-visual" aria-hidden="true">
                  <span>{module.icon}</span>
                </aside>
              </article>
            ))}
          </div>
        </section>
      </section>

      <MarketingFooter />
    </main>
  );
}
