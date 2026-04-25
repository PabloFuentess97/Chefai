# ChefAI

> SaaS de generación de recetas con IA. Indica los ingredientes que tienes y la
> app te genera 3+ recetas con imagen, valores nutricionales y pasos claros,
> respetando alergias y comensales.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Postgres 16 · Prisma · OpenAI · Stripe · PayPal · Hetzner + Docker + Nginx + Certbot.

## Características

- Generación con IA: 3+ recetas adaptadas a ingredientes, alergias y comensales
- Imagen por receta (planes Pro/Chef)
- Cálculo nutricional por ingrediente y por ración
- Ajuste interactivo de comensales (re-escalado de cantidades)
- Historial, favoritas y export PDF
- Auth propia (bcrypt + JWT en cookie httpOnly)
- Pagos Stripe (Checkout + Customer Portal) y PayPal (Orders v2)
- Panel admin: planes, usuarios, branding 100% editable
- Branding dinámico (nombre, color, logo, soporte) sin redeploy
- Rate-limit DB-backed
- 100% mobile-first, responsive, accesible

## Quick start (desarrollo local)

```bash
git clone <repo> chefai && cd chefai
cp .env.example .env.local
# editar JWT_SECRET (genera con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
# editar OPENAI_API_KEY (mínimo)

pnpm install

# Postgres en Docker (necesita Docker Desktop arriba)
docker compose -f docker/docker-compose.dev.yml up -d

# Esquema + datos iniciales
pnpm db:migrate
pnpm db:seed

# Arrancar
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). El admin se crea con `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env.local`.

## Comandos

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Servidor dev en :3000 |
| `pnpm build` | Build producción |
| `pnpm start` | Run build |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:deploy` | Prisma migrate deploy (CI/prod) |
| `pnpm db:seed` | Seed planes + admin + settings |
| `pnpm db:studio` | Prisma Studio |

## Estructura

Ver [`CLAUDE.md`](./CLAUDE.md) para los principios y la organización completa.

## Despliegue

Ver [`DEPLOY.md`](./DEPLOY.md) para el playbook completo en VPS Hetzner.

## Licencia

Privada por defecto.
