# ChefAI

SaaS de generación de recetas con IA (Next.js 16 + Postgres + Prisma + OpenAI + Stripe + PayPal).
Idioma de UI: español. Idioma de código: inglés.
Marca y planes son **editables en runtime** vía DB (`Settings`, `Plan`).

## Commands

- `pnpm dev` — Dev server (Next.js)
- `pnpm build` — Build de producción
- `pnpm start` — Run build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright
- `pnpm db:migrate` — Prisma migrate dev
- `pnpm db:deploy` — Prisma migrate deploy (CI/prod)
- `pnpm db:generate` — Generar Prisma client
- `pnpm db:seed` — Seed (planes + admin + settings)
- `pnpm db:studio` — Prisma Studio
- `docker compose -f docker/docker-compose.dev.yml up -d` — Postgres local

## Tech Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Postgres + Prisma + bcrypt/jose JWT + OpenAI (chat + images) + Stripe + PayPal · Hetzner VPS + Docker Compose + Nginx + Certbot.

## Architecture

### Directory Structure
- `src/app/` — Rutas (groups: marketing / auth / dashboard / admin) + `api/` (webhooks, health, pdf, og)
- `src/components/` — UI por dominio (`ui/`, `landing/`, `dashboard/`, `admin/`, `auth/`, `settings/`, `shared/`)
- `src/actions/` — Server Actions (auth, recipes, billing, admin, settings)
- `src/lib/` — Infra: `db`, `auth`, `password`, `openai`, `prompts`, `stripe`, `paypal`, `pdf`, `branding`, `plans`, `usage`, `rate-limit`, `email`, `logger`, `validators`, `utils`
- `src/middleware.ts` — Protege rutas y aplica RBAC
- `prisma/` — `schema.prisma`, `seed.ts`, `migrations/`
- `docker/` — Dockerfile, compose, nginx.conf, init-letsencrypt.sh

### Data Flow
- UI → **Server Action** → validación Zod → `lib/*` → Prisma → DB
- Webhooks externos → **API Route** → verificación de firma → Prisma
- Server Components leen Prisma directo. Mutaciones SOLO en Server Actions.

### Key Patterns
- **Server Components por defecto.** `"use client"` solo donde haya interactividad.
- **Branding dinámico** vía `lib/branding.ts` (lee `Settings` cacheado por request) — usar en `<title>`, navbar, footer, emails.
- **Planes en DB**: nunca hardcodear precios o límites. Usar `lib/plans.ts:getPlan(slug)`.
- **Validación en frontera**: cada server action y API route valida con Zod antes de tocar DB.
- **Errores de UI** siempre con shape `{ ok: false, error: { code, message, field? } }` y mensajes en español.
- **Rate limit** envolviendo acciones sensibles (`auth/*`, `recipes:generate`).
- **Logging** con `pino`; nunca `console.log` en código de producción.

## Code Organization Rules

1. **Una entidad por archivo.** Componente, action o helper máx 300 líneas; si excede, extraer.
2. **Path alias** `@/` → `src/`. No imports relativos profundos (`../../..`).
3. **Sin barrel exports.** Importar desde la fuente directa.
4. **Nombres**: archivos `kebab-case`, componentes `PascalCase`, funciones `camelCase`, types `PascalCase`.
5. **TypeScript strict**. Prohibido `any`. Prohibido `// @ts-ignore`.
6. **Server Actions** siempre `"use server"` al tope del archivo.
7. **Acceso a DB** únicamente vía `lib/db.ts` (instancia singleton de Prisma).

## Design System

### Colors
- Primary `#16a34a` — DINÁMICO desde `Settings.brandColor` (vía `--brand` en `<html>`)
- Secondary `#f59e0b`
- Background `#ffffff` / `#0a0a0a`
- Surface `#fafaf9` / `#171717`
- Border `#e7e5e4` / `#262626`
- Foreground `#0c0a09` / `#fafaf9`
- Muted `#78716c` / `#a3a3a3`
- Destructive `#dc2626`

### Typography
- Headings/Body: Geist Sans
- Code: Geist Mono

### Style
- Border radius: 8 (default), 12 (cards), 16 (modales), full (avatars)
- Spacing base: 4 px (Tailwind scale)
- Aesthetic: limpio, gastronómico, mucho whitespace, transiciones 200 ms

## Environment Variables

| Variable | Para qué |
|----------|----------|
| `DATABASE_URL` | Postgres |
| `JWT_SECRET` | Firma JWT (≥32 chars) |
| `BRAND_NAME`, `SUPPORT_EMAIL` | Branding fallback |
| `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL` | IA |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | PayPal |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Email |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed admin |
| `UPLOADS_DIR` | Persistencia de imágenes (default `./public/uploads`) |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | URLs absolutas |

## Reglas No Negociables

1. **TypeScript estricto. Cero `any`.**
2. **Toda mutación pasa por Server Action validada con Zod.**
3. **Acceso a DB solo vía `@/lib/db`.** Nunca `new PrismaClient()` fuera.
4. **Branding y planes nunca hardcodeados.** Leer de DB (`Settings`, `Plan`).
5. **Mensajes visibles al usuario en español.** Logs y errores técnicos en inglés.
6. **Sin `.env` en git.** Solo `.env.example` actualizado.
7. **Webhooks verifican firma siempre** antes de procesar.
8. **Rate-limit obligatorio** en `auth/*` y `recipes:generate`.
9. **Mobile-first.** Toda página debe verse impecable en 375 px.
10. **Coste de OpenAI controlado**: respetar `plan.recipesPerMonth` y `plan.imagesEnabled`.
