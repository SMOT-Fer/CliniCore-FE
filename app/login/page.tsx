'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  // Validar sesión activa al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(API_ME, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.rol === 'SUPERADMIN') {
            router.push('/superadmin');
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
              if (data.data?.rol === 'SUPERADMIN') {
                router.push('/superadmin');
                return;
              }
            }
          }
        }
      } catch (error) {
        // Silencioso si hay error
      }
    };

    checkSession();
  }, [router]);

  // Asegurar token CSRF
  const ensureCsrfToken = async () => {
    try {
      await fetch(API_CSRF, { credentials: 'include' });
    } catch (error) {
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
          password: password.trim()
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

      // Transición
      setIsExiting(true);
      setTimeout(() => {
        if (data.data?.rol === 'SUPERADMIN') {
          router.push('/superadmin');
        } else {
          setMessage('Tu rol aun no tiene interfaz asignada.');
          setMessageType('error');
          setIsExiting(false);
        }
      }, 420);
    } catch (error) {
      setMessage('Error de conexión. Intenta nuevamente.');
      setMessageType('error');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`page-transition ${isExiting ? 'visible' : ''}`} aria-hidden="true" />
      <main className={`login-page ${isExiting ? 'is-exiting' : 'page-enter'}`}>
        <section className="login-card">
          <div className="brand">
            <h1>🏥 SaaS Clínico</h1>
            <p>Acceso seguro para gestión de pacientes y citas</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Correo corporativo</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@clinica.com"
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
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
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
        </section>
      </main>
    </>
  );
}
