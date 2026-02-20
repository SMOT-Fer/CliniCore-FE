# Estudio Frontend - Next.js

Frontend moderna para SaaS Clínico con Next.js 16+, TypeScript y Tailwind CSS.

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Desarrollo (puerto 3000 por defecto)
npm run dev

# Build para producción
npm run build
npm run start

# Linting
npm run lint
```

## 📁 Estructura

```
app/
  login/              # Página de login
    page.tsx
  css/                # Estilos (provisional, migrar a Tailwind)
    login.css
.env.local            # Variables de entorno locales
next.config.ts        # Configuración Next.js
```

## 🔌 Conexión con Backend

La aplicación se conecta al backend Node.js por medio de un proxy interno en Next.js (`/api/backend/*`).

Esto evita bloqueos de CORS en desarrollo local cuando el backend está en otro dominio (Render).

El proxy usa `BACKEND_API_URL` y, si no existe, usa `NEXT_PUBLIC_API_URL`.

### Variables de entorno `.env.local`:

```
# API backend
BACKEND_API_URL=https://saas-be-t4rh.onrender.com
NEXT_PUBLIC_API_URL=https://saas-be-t4rh.onrender.com
```

## 🔐 Autenticación

- **Login:** `/login` - Formulario de acceso con email + password
- **Sesión:** Cookies httpOnly con JWT (Bearer token)
- **CSRF:** Protección con token CSRF en header `x-csrf-token`
- **Refresh:** Renovación automática de token antes de expirar
- **Redirect:** Usuarios autenticados se redirigen a `/superadmin`

## 📝 Estado de componentes

| Componente | Estado | Notas |
|-----------|--------|-------|
| Login | ✅ Migrado | React hooks + API integration |
| Superadmin | ⏳ Pendiente | Requiere migración HTML/JS |
| Dashboard | ⏳ Pendiente | Nuevo componente |

## 🛠️ Stack Tecnológico

- **Next.js 16+** - Framework React fullstack
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React 19** - Latest React features

## 🚨 Troubleshooting

### "Error de CORS"
- Verificar que el backend está corriendo en `https://saas-be-t4rh.onrender.com`
- Confirmar que `CORS_STRICT=false` en `.env` backend

### "401 Unauthorized"
- El token expiró
- Llamar a `/api/usuarios/refresh` automáticamente (está implementado)

### "CSRF token mismatch"
- El header `x-csrf-token` no coincide con la cookie
- Asegurar que se obtiene token antes de cada request POST/PUT/DELETE

## 📚 Documentación relacionada

- [Backend README](../estudio/README.md)
- [API Docs](https://saas-be-t4rh.onrender.com/api-docs)
- [Deployment Guide](../estudio/DEPLOY_PROD.md)
