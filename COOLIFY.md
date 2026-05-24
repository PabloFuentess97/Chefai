# ChefAI — Deploy en Coolify

Guía paso a paso para migrar ChefAI desde el setup `docker-compose` + nginx
+ certbot a Coolify. Coolify se encarga de Traefik (proxy + SSL), backups
de BD, restart automático, logs y monitoring.

---

## Por qué migrar a Coolify

| | Setup actual | Coolify |
|---|---|---|
| Proxy | nginx manual | Traefik automático |
| SSL | Certbot manual | Let's Encrypt automático |
| Variables env | Editar `.env.production` por SSH | UI web |
| Deploy | `git pull && build --no-cache` | Push a GitHub o botón "Redeploy" |
| Backups BD | Manual con cron | Programados con un click |
| Logs | `docker logs` por SSH | UI web en tiempo real |
| Métricas | Nada | CPU/RAM/red por servicio |
| Rollback | Manual | Botón "Rollback" |

---

## Pre-requisitos

1. **VPS con Coolify ya instalado**. Si vienes del VPS Hetzner viejo
   puedes instalar Coolify ahí mismo (en otra carpeta) o levantar uno
   nuevo. Instalación oficial:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. **Dominio apuntando al VPS** (`chefai.fit` y `www.chefai.fit` → IP del
   nuevo VPS). Si vas a usar el mismo VPS, primero apaga el stack viejo
   para liberar los puertos 80/443:
   ```bash
   cd ~/Chefai
   docker compose --env-file $(pwd)/.env.production \
     -f docker/docker-compose.yml down
   ```

3. **Cuenta de GitHub conectada a Coolify** (Settings → Sources → GitHub
   App). Esto permite auto-deploy en cada push a `main`.

4. **Backup de la BD actual** (no opcional):
   ```bash
   ssh root@chefai-viejo
   docker compose --env-file $(pwd)/.env.production \
     -f docker/docker-compose.yml exec postgres \
     pg_dump -U chefai chefai > ~/chefai-backup-$(date +%Y%m%d).sql
   scp root@chefai-viejo:~/chefai-backup-*.sql ~/Desktop/
   ```

---

## Opción A — Recurso Application + Resources separados (RECOMENDADO)

Coolify aprovecha sus features nativas: Postgres y Redis como recursos
managed (con backups, métricas), y la app Next.js como Application que
auto-builda en cada push.

### A.1) Crear el Project

1. Coolify UI → **+ New** → **Project** → nombre `chefai`
2. Dentro del proyecto, **+ New** → **Environment** → `production`

### A.2) Crear Postgres

1. **+ New Resource** → **Database** → **PostgreSQL 16**
2. Nombre: `chefai-postgres`
3. Username: `chefai`, Database: `chefai`, Password: pulsa el icono de
   "generate" para una contraseña fuerte
4. **Save & Deploy**
5. Una vez running, copia el **Postgres URL (internal)** — algo como
   `postgres://chefai:xxx@chefai-postgres-xxx:5432/chefai`

### A.3) Crear Redis

1. **+ New Resource** → **Database** → **Redis 7**
2. Nombre: `chefai-redis`. Password generada.
3. **Save & Deploy**
4. Copia el **Redis URL (internal)** — `redis://default:xxx@chefai-redis-xxx:6379`

### A.4) Crear la Application

1. **+ New Resource** → **Application** → **Public Repository** (o
   **GitHub App** si la conectaste)
2. Repository: `PabloFuentess97/Chefai`, Branch: `main`
3. **Build Pack**: Dockerfile
4. **Dockerfile Location**: `docker/Dockerfile`
5. **Target Build Stage** (importante): `runner`
6. **Port exposed**: `3000`
7. **Domain**: `chefai.fit` (Coolify configura DNS challenge para
   Let's Encrypt automáticamente si el dominio apunta al VPS)
8. **Pre-deploy command** (Coolify lo corre antes de arrancar la app):
   ```sh
   node ./node_modules/prisma/build/index.js db push && \
   node ./node_modules/prisma/build/index.js db seed
   ```
9. **Healthcheck Path**: `/api/health`
10. **Persistent Storage** → **+ Add Persistent Storage**:
    - Mount Path: `/app/public/uploads`
    - Name: `chefai-uploads`

### A.5) Variables de entorno

En la pestaña **Environment Variables** de la Application, añade TODAS
las del `.env.coolify.example`. Para `DATABASE_URL` y `REDIS_URL` usa
las internal URLs que copiaste antes.

⚠️ **JWT_SECRET**: genera uno nuevo con `openssl rand -hex 32` (NO reuses
el del VPS viejo — invalidará las sesiones existentes que de todos modos
ya están atadas al cookie name viejo).

### A.6) Restaurar el backup de la BD

Antes del primer deploy, restaura el dump:

```bash
# Sube el dump al server donde corre Coolify
scp ~/Desktop/chefai-backup-*.sql root@coolify-server:~/

# Conéctate al contenedor de Postgres por Coolify UI -> Terminal
# o vía docker exec:
docker ps | grep postgres
docker exec -i <container-id> psql -U chefai -d chefai < /path/dentro/contenedor.sql
```

Alternativa más simple: hacer el primer deploy SIN restore, dejar que el
seed cree los planes base, y luego importar manualmente solo las tablas
de usuarios + recetas con un script SQL filtrado.

### A.7) Deploy

1. Pulsa **Deploy** en la Application
2. Coolify hace `git clone` → `docker build` (multi-stage, ~3-5 min la
   primera vez) → ejecuta el pre-deploy command (prisma db push + seed)
   → arranca el contenedor → registra el dominio en Traefik
3. En 30s tienes `https://chefai.fit` funcionando con SSL válido

### A.8) Webhooks de Stripe / PayPal / Resend

Las URLs no cambian (siguen siendo `https://chefai.fit/api/webhooks/*`).
**NO necesitas reconfigurar nada en los dashboards de Stripe/PayPal/Resend**
siempre que el dominio sea el mismo.

---

## Opción B — Docker Compose mode

Si prefieres mantener la arquitectura tal cual con compose:

1. Coolify UI → **+ New Resource** → **Docker Compose**
2. **Source**: Public Repo o GitHub App
3. **Compose Location**: `docker-compose.coolify.yml`
4. Configura variables en **Environment Variables** (igual que Opción A)
5. Coolify orquesta los 4 servicios (postgres, redis, migrate, web) y
   añade las labels Traefik del `web` automáticamente

La opción B es más rápida de levantar pero pierdes backups managed de
Postgres + métricas separadas por servicio.

---

## Después del deploy

### Validar el deploy

```bash
# Headers de seguridad llegando OK (vía Traefik + headers de Next.js)
curl -sI https://chefai.fit | grep -iE "strict-transport|content-security|x-xss|x-frame|referrer|permissions"

# Healthcheck verde
curl https://chefai.fit/api/health
```

Deberías ver 6 headers + un JSON `{"ok":true}` en el health.

### Auto-deploy en cada push

En la Application → **General** → activa **Auto Deploy on Push**.

Desde ahora `git push origin main` triggerea un build automático en
Coolify. Verás el progreso en la UI. Si falla, Coolify mantiene la
versión anterior corriendo (zero-downtime).

### Backups de la BD

En el recurso Postgres → **Backups** → **+ Add Backup Schedule**:
- Frequency: Daily at 03:00
- Retention: 14 days
- Destination: S3 / local

Los snapshots se pueden restaurar con un click.

### Logs

Application → **Logs** → en tiempo real, filtrable por nivel y
con búsqueda. Ya no necesitas `docker logs` por SSH.

### Variables de entorno: cambios

Cuando cambies una env var (ej. un API key), pulsa **Restart** en la
Application. Coolify hace recreate sin necesidad de rebuild — el nuevo
contenedor lee las nuevas variables al instante.

---

## Diferencias técnicas vs el setup viejo

| Antes (nginx + compose) | Ahora (Coolify) |
|---|---|
| `docker/nginx.conf` con headers de seguridad | Headers en `next.config.ts` (función `headers()`) |
| `certbot` corre cada 12h | Traefik renueva certificados automáticamente |
| `docker-compose -f docker/docker-compose.yml` | UI de Coolify |
| Volumen `./uploads` en el host | Persistent Storage named volume |
| Logs en `docker logs` | UI de Coolify + descarga |
| Backups manuales con cron | Coolify Backups con S3 opcional |
| `git pull && docker compose build --no-cache` | Push a GitHub → build automático |

---

## Limpieza del VPS viejo (cuando hayas confirmado que Coolify va bien)

⚠️ **Solo cuando lleves al menos 1 semana sin problemas en Coolify y
tengas backups recientes** del nuevo Postgres.

```bash
ssh root@chefai-viejo
cd ~/Chefai
docker compose --env-file $(pwd)/.env.production \
  -f docker/docker-compose.yml down -v   # -v borra volúmenes
docker system prune -af
```

Si el VPS viejo SE usa solo para ChefAI, puedes apagarlo en el panel de
Hetzner para ahorrar coste.

---

## Troubleshooting

**"Build failed: Cannot find module ..."** — comprueba que el
`Target Build Stage` es `runner` (no `builder`). El runner es la imagen
final stripped.

**"Database connection refused"** — verifica que `DATABASE_URL` apunta
al hostname interno del Postgres (lo ves en el recurso Postgres →
"Connection Strings" → "Internal"). El internal hostname incluye el
sufijo random que Coolify pone.

**"SSL certificate pending"** — el dominio aún no propagó o no apunta
al VPS. Comprueba con `dig chefai.fit +short` que devuelve la IP del
VPS Coolify. Tras corregir DNS, Coolify reintenta el challenge cada
~5 min.

**Imágenes generadas se pierden tras redeploy** — confirma que tienes
el Persistent Storage configurado en `/app/public/uploads`. Sin ese
mount, cada redeploy crea un volumen nuevo y los PNGs se quedan
huérfanos.

**"prisma db push fails"** — el pre-deploy command no puede llegar a
Postgres. Verifica que el Postgres está running (estado verde en
Coolify) y que la `DATABASE_URL` es la internal, no la public.

---

## Resumen ejecutivo

| Paso | Tiempo |
|---|---|
| Instalar Coolify en el VPS | 10 min |
| Crear Postgres + Redis | 5 min |
| Crear Application + env vars | 15 min |
| Restaurar backup de BD | 5-30 min según tamaño |
| Primer build + deploy | ~5 min |
| Configurar dominio + SSL | automático |
| **Total** | **~45 min** |

Tras eso, cada deploy futuro es `git push origin main` y esperar
2-3 min al rebuild. Sin SSH. Sin comandos largos. Sin
`build --no-cache web && up -d`.
