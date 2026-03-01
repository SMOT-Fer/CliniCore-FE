'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useThemeMode, type ThemeMode } from '../hooks/use-theme-mode';
import '../css/login.css';

const API_BASE = '/api/backend';
const API_LOGIN = `${API_BASE}/usuarios/login`;
const API_ME = `${API_BASE}/usuarios/me`;
const API_REFRESH = `${API_BASE}/usuarios/refresh`;
const API_CSRF = `${API_BASE}/usuarios/csrf`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { themeMode, setThemeMode } = useThemeMode();

  const handleGoHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isExiting) return;
    setIsExiting(true);

    window.setTimeout(() => {
      router.push('/');
    }, 420);
  };

  // Validar sesión activa al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(API_ME, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const redirectPath = data.data?.redirect_path;
          if (redirectPath) {
            router.push(redirectPath);
            return;
          }
          setMessage('Tu rol aun no tiene interfaz asignada.');
          setMessageType('error');
          return;
        }

        if (response.status === 401) {
          const refreshResponse = await fetch(API_REFRESH, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshResponse.ok) {
            const meResponse = await fetch(API_ME, { credentials: 'include' });
            if (meResponse.ok) {
              const data = await meResponse.json();
              const redirectPath = data.data?.redirect_path;
              if (redirectPath) {
                router.push(redirectPath);
                return;
              }
            }
          }
        }
      } catch {
        // Silencioso si hay error
      }
    };

    checkSession();
  }, [router]);

  // Asegurar token CSRF
  const ensureCsrfToken = async () => {
    try {
      await fetch(API_CSRF, { credentials: 'include' });
    } catch {
      // Silencioso
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Asegurar CSRF token
      await ensureCsrfToken();

      const response = await fetch(API_LOGIN, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toUpperCase(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Error al iniciar sesión');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      setMessage('Iniciando sesión...');
      setMessageType('success');

      // Guardar session ID en localStorage para identificar la sesión actual
      if (data.data?.sessionId) {
        localStorage.setItem('sessionId', data.data.sessionId);
      }

      // Transición
      setIsExiting(true);
      setTimeout(() => {
        if (data.data?.redirect_path) {
          router.push(data.data.redirect_path);
        } else {
          setMessage('Tu rol aun no tiene interfaz asignada.');
          setMessageType('error');
          setIsExiting(false);
        }
      }, 480);
    } catch {
      setMessage('Error de conexión. Intenta nuevamente.');
      setMessageType('error');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`page-transition ${isExiting ? 'visible' : ''}`} aria-hidden="true" />
      <main className={`login-page ${isExiting ? 'is-exiting' : 'page-enter'}`}>
        <Link href="/" className="login-return-btn" aria-label="Volver al inicio" onClick={handleGoHome}>
          ← Volver al inicio
        </Link>

        <label className="login-theme-switch" aria-label="Seleccionar tema">
          <span>Tema</span>
          <select
            value={themeMode}
            onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
          >
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>

        <section className="login-shell">
          <aside className="login-hero" aria-hidden="true">
            <div className="login-hero-content">
              <h1>Impulsa tu operación digital</h1>
              <p>
                StarMOT unifica desarrollo, control y administración en una sola plataforma para equipos que construyen software con visión y precisión.
              </p>
            </div>
          </aside>

          <article className="login-card">
            <div className="brand">
              <div className="login-brand-logo">
                <Image src="/logo.png" alt="Logo StarMOT" width={92} height={92} />
              </div>
              <p className="brand-kicker">StarMOT</p>
              <h2>Iniciar sesión</h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-group">
                <label htmlFor="email">Correo</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@empresa.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="login-row">
                <label className="remember-me" htmlFor="remember-session">
                  <input id="remember-session" type="checkbox" />
                  <span>Recordarme</span>
                </label>
                <span className="row-help">Acceso seguro</span>
              </div>

              <button type="submit" className="btn-login" disabled={isLoading}>
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>

              {message && (
                <p className={`login-message ${messageType}`} role="alert">
                  {message}
                </p>
              )}
            </form>
          </article>
        </section>
      </main>
    </>
  );
}
