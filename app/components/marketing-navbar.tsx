'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiCreditCard, FiHome, FiLayers, FiLogIn, FiMail } from 'react-icons/fi';
import { HiOutlineRocketLaunch } from 'react-icons/hi2';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: <FiHome /> },
  { href: '/funcionalidades', label: 'Funcionalidades', icon: <FiLayers /> },
  { href: '/planes', label: 'Planes', icon: <FiCreditCard /> },
  { href: '/contacto', label: 'Contacto', icon: <FiMail /> }
];

// Logo CC component
const LogoCC = () => (
  <span 
    style={{
      width: 18,
      height: 18,
      borderRadius: 4,
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: 8,
      letterSpacing: '-0.02em'
    }}
  >
    CC
  </span>
);

export default function MarketingNavbar() {
  const pathname = usePathname();

  return (
    <header className="marketing-header" aria-label="Barra principal">
      <div className="marketing-header-inner">
        <Link href="/" className="marketing-brand" aria-label="Ir al inicio">
          <span className="marketing-brand-logo">
            <LogoCC />
          </span>
          <strong className="marketing-brand-name">CliniCore</strong>
        </Link>

        <nav className="marketing-nav" aria-label="Navegación">
          {NAV_ITEMS.map((item) => {
            const itemPath = item.href.includes('#') ? item.href.split('#')[0] || '/' : item.href;
            const isActive = pathname === itemPath;
            return (
              <Link key={item.href} href={item.href} className={`marketing-nav-link ${isActive ? 'is-active' : ''}`}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="marketing-header-actions">
          <Link href="/login" className="marketing-login-btn">
            <FiLogIn aria-hidden="true" />
            Iniciar sesión
          </Link>
          <Link href="/contacto" className="marketing-start-btn">
            <HiOutlineRocketLaunch aria-hidden="true" />
            Empieza gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
