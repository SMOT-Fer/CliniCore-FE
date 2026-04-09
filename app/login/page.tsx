'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiMail, FiLock, FiCreditCard, FiX, FiCheck, FiCalendar, FiUsers, FiShield, FiTrendingUp } from 'react-icons/fi';
import '../css/login.css';

const API_BASE = '/api/backend';
const API_LOGIN = `${API_BASE}/usuarios/login`;
const API_ME = `${API_BASE}/usuarios/me`;
const API_REFRESH = `${API_BASE}/usuarios/refresh`;
const API_CSRF = `${API_BASE}/usuarios/csrf`;
const API_REGISTRO = `${API_BASE}/auth/registro`;
const API_SOLICITAR_RECUPERACION = `${API_BASE}/auth/solicitar-recuperacion`;
const API_VERIFICAR_CODIGO = `${API_BASE}/auth/verificar-codigo`;
const API_RESTABLECER_PASSWORD = `${API_BASE}/auth/restablecer-password`;

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function resolveAllowedRedirectPath(path?: string | null) {
  if (!path || typeof path !== 'string') return null;
  if (path === '/superadmin' || path.startsWith('/superadmin/')) return '/';
  return path;
}

// Slides del carrusel
const carouselSlides = [
  {
    icon: <FiCalendar size={48} />,
    title: 'Gestión de citas',
    description: 'Agenda inteligente con recordatorios automáticos y confirmación por WhatsApp.'
  },
  {
    icon: <FiUsers size={48} />,
    title: 'Historias clínicas',
    description: 'Expedientes digitales completos, seguros y accesibles desde cualquier dispositivo.'
  },
  {
    icon: <FiShield size={48} />,
    title: 'Seguridad avanzada',
    description: 'Roles, permisos y auditoría completa para proteger los datos de tus pacientes.'
  },
  {
    icon: <FiTrendingUp size={48} />,
    title: 'Reportes y métricas',
    description: 'Dashboard con indicadores clave para tomar mejores decisiones.'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistroMode = searchParams.get('registro') === 'true';

  const [mode, setMode] = useState<'login' | 'registro'>(isRegistroMode ? 'registro' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dni, setDni] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const hasCheckedSessionRef = useRef(false);

  // Modal recuperación
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'password'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryMessageType, setRecoveryMessageType] = useState<'error' | 'success'>('error');
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

  // Carrusel
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-avance del carrusel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Sincronizar modo con URL
  useEffect(() => {
    setMode(isRegistroMode ? 'registro' : 'login');
  }, [isRegistroMode]);

  const handleGoHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      router.push('/');
    }, 420);
  };

  const switchMode = (newMode: 'login' | 'registro') => {
    setMessage('');
    setMode(newMode);
    const url = newMode === 'registro' ? '/login?registro=true' : '/login';
    router.replace(url, { scroll: false });
  };

  const resolveSessionRedirect = async () => {
    const meResponse = await fetch(API_ME, { credentials: 'include' });
    if (meResponse.ok) {
      const meData = await parseJsonSafe(meResponse);
      return resolveAllowedRedirectPath(meData?.data?.redirect_path);
    }

    if (meResponse.status !== 401) {
      return null;
    }

    const refreshResponse = await fetch(API_REFRESH, {
      method: 'POST',
      credentials: 'include'
    });

    if (!refreshResponse.ok) {
      return null;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      const retryMeResponse = await fetch(API_ME, { credentials: 'include' });
      if (!retryMeResponse.ok) {
        continue;
      }

      const retryMeData = await parseJsonSafe(retryMeResponse);
      return resolveAllowedRedirectPath(retryMeData?.data?.redirect_path);
    }

    return null;
  };

  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    const checkSession = async () => {
      try {
        const redirectPath = await resolveSessionRedirect();
        if (redirectPath) {
          router.push(redirectPath);
        }
      } catch {
        // Silencioso
      }
    };

    checkSession();
  }, [router]);

  const ensureCsrfToken = async () => {
    try {
      await fetch(API_CSRF, { credentials: 'include' });
    } catch {
      // Silencioso
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      await ensureCsrfToken();

      const loginResponse = await fetch(API_LOGIN, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const loginData = await parseJsonSafe(loginResponse);

      if (!loginResponse.ok) {
        setMessage(loginData?.error || 'Error al iniciar sesión');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      setMessage('Iniciando sesión...');
      setMessageType('success');

      if (loginData?.data?.sessionId) {
        localStorage.setItem('sessionId', loginData.data.sessionId);
      }

      setIsExiting(true);
      setTimeout(() => {
        const redirectPath = resolveAllowedRedirectPath(loginData?.data?.redirect_path);
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          setMessage('Tu rol aún no tiene interfaz asignada.');
          setMessageType('error');
          setIsExiting(false);
          setIsLoading(false);
        }
      }, 480);
    } catch {
      setMessage('Error de conexión. Intenta nuevamente.');
      setMessageType('error');
      setIsLoading(false);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    if (!/^\d{8}$/.test(dni)) {
      setMessage('El DNI debe tener exactamente 8 dígitos');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    try {
      await ensureCsrfToken();

      const registroResponse = await fetch(API_REGISTRO, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: dni.trim(),
          email: email.trim(),
          password
        })
      });

      const registroData = await parseJsonSafe(registroResponse);

      if (!registroResponse.ok) {
        setMessage(registroData?.error || 'Error al registrar');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      setMessage('¡Registro exitoso! Redirigiendo al login...');
      setMessageType('success');

      setTimeout(() => {
        switchMode('login');
        setMessage('Ahora puedes iniciar sesión con tu cuenta');
        setMessageType('success');
        setIsLoading(false);
        setDni('');
        setPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch {
      setMessage('Error de conexión. Intenta nuevamente.');
      setMessageType('error');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  // Funciones de recuperación de contraseña
  const openRecoveryModal = () => {
    setShowRecoveryModal(true);
    setRecoveryStep('email');
    setRecoveryEmail('');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryMessage('');
  };

  const closeRecoveryModal = () => {
    setShowRecoveryModal(false);
  };

  const handleSolicitarCodigo = async () => {
    if (!recoveryEmail.trim()) {
      setRecoveryMessage('Ingresa tu correo electrónico');
      setRecoveryMessageType('error');
      return;
    }

    setIsRecoveryLoading(true);
    setRecoveryMessage('');

    try {
      await ensureCsrfToken();

      const response = await fetch(API_SOLICITAR_RECUPERACION, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() })
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        setRecoveryMessage(data?.error || 'Error al enviar código');
        setRecoveryMessageType('error');
      } else {
        setRecoveryMessage('Si el email está registrado, recibirás un código de 6 dígitos.');
        setRecoveryMessageType('success');
        setRecoveryStep('code');
      }
    } catch {
      setRecoveryMessage('Error de conexión');
      setRecoveryMessageType('error');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleVerificarCodigo = async () => {
    const codigoLimpio = recoveryCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codigoLimpio)) {
      setRecoveryMessage('El código debe tener 6 caracteres alfanuméricos');
      setRecoveryMessageType('error');
      return;
    }

    setIsRecoveryLoading(true);
    setRecoveryMessage('');

    try {
      await ensureCsrfToken();

      const response = await fetch(API_VERIFICAR_CODIGO, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim(), codigo: codigoLimpio })
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        setRecoveryMessage(data?.error || 'Código inválido o expirado');
        setRecoveryMessageType('error');
      } else {
        setRecoveryMessage('Código verificado. Ingresa tu nueva contraseña.');
        setRecoveryMessageType('success');
        setRecoveryStep('password');
      }
    } catch {
      setRecoveryMessage('Error de conexión');
      setRecoveryMessageType('error');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleRestablecerPassword = async () => {
    if (newPassword.length < 8) {
      setRecoveryMessage('La contraseña debe tener al menos 8 caracteres');
      setRecoveryMessageType('error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setRecoveryMessage('Las contraseñas no coinciden');
      setRecoveryMessageType('error');
      return;
    }

    setIsRecoveryLoading(true);
    setRecoveryMessage('');

    try {
      await ensureCsrfToken();

      const response = await fetch(API_RESTABLECER_PASSWORD, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim(),
          codigo: recoveryCode.trim().toUpperCase(),
          nueva_password: newPassword
        })
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        setRecoveryMessage(data?.error || 'Error al restablecer contraseña');
        setRecoveryMessageType('error');
      } else {
        setRecoveryMessage('¡Contraseña actualizada! Ya puedes iniciar sesión.');
        setRecoveryMessageType('success');
        setTimeout(() => {
          closeRecoveryModal();
        }, 2000);
      }
    } catch {
      setRecoveryMessage('Error de conexión');
      setRecoveryMessageType('error');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  return (
    <>
      <div className={`page-transition ${isExiting ? 'visible' : ''}`} aria-hidden="true" />
      
      <main className={`login-page-fullscreen ${isExiting ? 'is-exiting' : 'page-enter'}`}>
        {/* Fondo con imagen */}
        <div className="login-background">
          <Image
            src="/clinica.jpg"
            alt="Clínica"
            fill
            priority
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div className="login-background-overlay" />
        </div>

        {/* Botón volver */}
        <Link href="/" className="login-return-floating" aria-label="Volver al inicio" onClick={handleGoHome}>
          <FiArrowLeft aria-hidden="true" />
          <span>Volver</span>
        </Link>

        {/* Sección izquierda - Carrusel */}
        <section className="login-hero-section">
          <div className="login-hero-content">
            <div className="login-hero-brand">
              <Image src="/logo-clinicore.png" alt="CliniCore" width={48} height={48} />
              <span>CliniCore</span>
            </div>
            
            <h1 className="login-hero-title">
              La plataforma integral para tu clínica
            </h1>
            
            <p className="login-hero-subtitle">
              Gestiona atención, agenda, pacientes y control operativo desde un único lugar seguro y preparado para crecer.
            </p>

            {/* Carrusel */}
            <div className="login-carousel">
              <div className="carousel-slide" key={currentSlide}>
                <div className="carousel-icon">
                  {carouselSlides[currentSlide].icon}
                </div>
                <h3>{carouselSlides[currentSlide].title}</h3>
                <p>{carouselSlides[currentSlide].description}</p>
              </div>
              
              {/* Indicadores */}
              <div className="carousel-indicators">
                {carouselSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Card de login/registro */}
        <section className="login-card-container">
          <article className="login-card-modern">
            {/* Logo y título */}
            <div className="login-card-header">
              <div className="login-logo-wrapper-mobile">
                <Image src="/logo-clinicore.png" alt="CliniCore" width={48} height={48} />
              </div>
              <h1 className="login-title">
                {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
              </h1>
              <p className="login-subtitle">
                {mode === 'login' 
                  ? 'Ingresa tus credenciales para acceder' 
                  : 'Regístrate para comenzar tu prueba gratuita'}
              </p>
            </div>

            {/* Botón Google */}
            <button type="button" className="btn-google" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>

            {/* Separador */}
            <div className="login-divider">
              <span>o continúa con email</span>
            </div>

            {/* Formulario Login */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="login-form-modern" noValidate>
                <div className="form-field">
                  <label htmlFor="email">
                    <FiMail size={16} />
                    <span>Correo electrónico</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="password">
                    <FiLock size={16} />
                    <span>Contraseña</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="login-options">
                  <label className="remember-checkbox">
                    <input type="checkbox" />
                    <span>Recordarme</span>
                  </label>
                  <button type="button" className="link-forgot" onClick={openRecoveryModal}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>
            )}

            {/* Formulario Registro */}
            {mode === 'registro' && (
              <form onSubmit={handleRegistro} className="login-form-modern" noValidate>
                <div className="form-field">
                  <label htmlFor="dni">
                    <FiCreditCard size={16} />
                    <span>DNI</span>
                  </label>
                  <input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    placeholder="12345678"
                    required
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    disabled={isLoading}
                  />
                  <span className="form-hint">Tus datos se completarán automáticamente</span>
                </div>

                <div className="form-field">
                  <label htmlFor="email-registro">
                    <FiMail size={16} />
                    <span>Correo electrónico</span>
                  </label>
                  <input
                    id="email-registro"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="password-registro">
                      <FiLock size={16} />
                      <span>Contraseña</span>
                    </label>
                    <input
                      id="password-registro"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="confirm-password">
                      <FiLock size={16} />
                      <span>Confirmar</span>
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? 'Registrando...' : 'Crear cuenta'}
                </button>
              </form>
            )}

            {/* Mensaje */}
            {message && (
              <p className={`login-message-modern ${messageType}`} role="alert">
                {message}
              </p>
            )}

            {/* Toggle login/registro */}
            <div className="login-switch">
              {mode === 'login' ? (
                <p>
                  ¿No tienes cuenta?{' '}
                  <button type="button" onClick={() => switchMode('registro')}>
                    Regístrate gratis
                  </button>
                </p>
              ) : (
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <button type="button" onClick={() => switchMode('login')}>
                    Inicia sesión
                  </button>
                </p>
              )}
            </div>
          </article>
        </section>
      </main>

      {/* Modal de recuperación de contraseña */}
      {showRecoveryModal && (
        <div className="modal-overlay" onClick={closeRecoveryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeRecoveryModal}>
              <FiX size={20} />
            </button>

            <div className="modal-header">
              <h2>Recuperar contraseña</h2>
              <p>
                {recoveryStep === 'email' && 'Ingresa el correo asociado a tu cuenta'}
                {recoveryStep === 'code' && 'Ingresa el código de 6 dígitos enviado a tu correo'}
                {recoveryStep === 'password' && 'Crea tu nueva contraseña'}
              </p>
            </div>

            {/* Step indicator */}
            <div className="recovery-steps">
              <div className={`step ${recoveryStep === 'email' ? 'active' : ''} ${['code', 'password'].includes(recoveryStep) ? 'completed' : ''}`}>
                {['code', 'password'].includes(recoveryStep) ? <FiCheck size={14} /> : '1'}
              </div>
              <div className="step-line" />
              <div className={`step ${recoveryStep === 'code' ? 'active' : ''} ${recoveryStep === 'password' ? 'completed' : ''}`}>
                {recoveryStep === 'password' ? <FiCheck size={14} /> : '2'}
              </div>
              <div className="step-line" />
              <div className={`step ${recoveryStep === 'password' ? 'active' : ''}`}>
                3
              </div>
            </div>

            <div className="modal-body">
              {/* Step 1: Email */}
              {recoveryStep === 'email' && (
                <div className="form-field">
                  <label htmlFor="recovery-email">
                    <FiMail size={16} />
                    <span>Correo electrónico</span>
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    disabled={isRecoveryLoading}
                  />
                </div>
              )}

              {/* Step 2: Código */}
              {recoveryStep === 'code' && (
                <div className="form-field">
                  <label htmlFor="recovery-code">
                    <FiLock size={16} />
                    <span>Código de verificación</span>
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    placeholder="ABC123"
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    disabled={isRecoveryLoading}
                    className="code-input"
                  />
                  <span className="form-hint">El código expira en 15 minutos</span>
                </div>
              )}

              {/* Step 3: Nueva contraseña */}
              {recoveryStep === 'password' && (
                <>
                  <div className="form-field">
                    <label htmlFor="new-password">
                      <FiLock size={16} />
                      <span>Nueva contraseña</span>
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isRecoveryLoading}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="confirm-new-password">
                      <FiLock size={16} />
                      <span>Confirmar contraseña</span>
                    </label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={isRecoveryLoading}
                    />
                  </div>
                </>
              )}

              {/* Mensaje de recuperación */}
              {recoveryMessage && (
                <p className={`login-message-modern ${recoveryMessageType}`} role="alert">
                  {recoveryMessage}
                </p>
              )}
            </div>

            <div className="modal-footer">
              {recoveryStep === 'email' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSolicitarCodigo}
                  disabled={isRecoveryLoading}
                >
                  {isRecoveryLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              )}

              {recoveryStep === 'code' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleVerificarCodigo}
                  disabled={isRecoveryLoading}
                >
                  {isRecoveryLoading ? 'Verificando...' : 'Verificar código'}
                </button>
              )}

              {recoveryStep === 'password' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRestablecerPassword}
                  disabled={isRecoveryLoading}
                >
                  {isRecoveryLoading ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
