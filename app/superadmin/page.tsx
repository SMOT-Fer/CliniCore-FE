'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = '/api/backend';
const API_ME = `${API_BASE}/usuarios/me`;
const API_REFRESH = `${API_BASE}/usuarios/refresh`;

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

export default function SuperadminPage() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>('loading');
  const [message, setMessage] = useState('Validando sesión...');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [activeTab, setActiveTab] = useState<SuperadminTab>('Dashboard');

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

  if (state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <p className="text-sm text-slate-300">Validando acceso de SUPERADMIN...</p>
      </main>
    );
  }

  if (state === 'denied') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3 text-sm text-slate-300">{message}</p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Ir a Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h1 className="text-xl font-bold">Superadmin</h1>
          <p className="mt-1 text-xs text-slate-400">{usuario?.email || 'usuario@clinica.com'}</p>

          <nav className="mt-6 flex flex-col gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-11 rounded-lg px-4 text-left text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-950 text-slate-200 hover:border-cyan-500 hover:text-cyan-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-700 text-sm font-semibold transition hover:bg-slate-800"
            >
              Cerrar sesión
            </Link>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-cyan-400">Panel principal</p>
          <h2 className="mt-1 text-3xl font-bold">{activeTab}</h2>
          <p className="mt-3 text-sm text-slate-300">
            Sección {activeTab} en construcción. Aquí irá el contenido funcional de este módulo.
          </p>
        </section>
      </section>
    </main>
  );
}
