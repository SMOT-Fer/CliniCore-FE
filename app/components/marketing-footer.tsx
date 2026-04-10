import Link from 'next/link';
import { FaGithub, FaInstagram, FaLinkedin, FaWhatsapp } from 'react-icons/fa';

// Logo CC component
const LogoCC = () => (
  <span 
    style={{
      width: 16,
      height: 16,
      borderRadius: 4,
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: 7,
      letterSpacing: '-0.02em'
    }}
  >
    CC
  </span>
);

export default function MarketingFooter() {
  return (
    <footer className="landing-footer" aria-label="Pie de página">
      <div className="landing-footer-brand">
        <span className="landing-footer-logo">
          <LogoCC />
        </span>
        <strong>CliniCore</strong>
      </div>

      <div className="landing-footer-columns">
        <div><h4>Inicio</h4><Link href="/">Resumen</Link><Link href="/login">Iniciar sesión</Link></div>
        <div><h4>Producto</h4><Link href="/funcionalidades">Funcionalidades</Link><Link href="/planes">Planes</Link></div>
        <div><h4>Clinica</h4><Link href="/contacto">Contacto</Link><Link href="/contacto">Empieza gratis</Link></div>
        <div><h4>Acceso</h4><Link href="/login">Iniciar sesión</Link><Link href="/funcionalidades">Ver funcionalidades</Link></div>
      </div>

      <div className="landing-footer-bottom">
        <p>© {new Date().getFullYear()} CliniCore</p>
        <div className="landing-socials">
          <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><FaGithub /></a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FaLinkedin /></a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a>
          <a href="https://wa.me/51937719338" target="_blank" rel="noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>
        </div>
      </div>
    </footer>
  );
}