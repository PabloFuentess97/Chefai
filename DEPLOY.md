# Deploy ChefAI en VPS Hetzner

Playbook end-to-end para subir ChefAI a un VPS Hetzner Cloud (CX22 o superior) con Docker + Nginx + Let's Encrypt.

---

## Prerrequisitos

- Cuenta en Hetzner Cloud
- Dominio propio (ej. `chefai.app`) con acceso a DNS
- Cuentas activas en: OpenAI, Stripe, PayPal Business, Resend (opcional)
- Repositorio Git con el código de ChefAI

---

## 1. Crear el VPS

1. Hetzner Cloud → New Server
2. Image: **Ubuntu 24.04**
3. Type: **CX22** (4 € / mes) o superior
4. Location: cualquiera de la UE
5. SSH key: añade tu pública
6. Firewall (opcional pero recomendado): allow 22/tcp, 80/tcp, 443/tcp

Anota la IP pública del servidor.

---

## 2. DNS

En tu proveedor DNS (p. ej. Cloudflare, Namecheap):

| Tipo | Nombre | Valor |
|------|--------|-------|
| A    | `@`    | IP del VPS |
| A    | `www`  | IP del VPS |

(Si usas Cloudflare, **desactiva el proxy naranja** durante el primer arranque, lo activarás después).

---

## 3. Preparar el VPS

```bash
ssh root@<IP>

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Útiles
apt-get update && apt-get install -y git ufw

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 4. Clonar y configurar

```bash
mkdir -p /opt && cd /opt
git clone <tu-repo-git> chefai
cd chefai

cp .env.example .env.production
nano .env.production
```

Rellena `.env.production` con valores **reales de producción**:

```ini
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://chefai.app
APP_URL=https://chefai.app
BRAND_NAME=ChefAI
SUPPORT_EMAIL=hola@chefai.app

DATABASE_URL=postgresql://chefai:STRONG_PASSWORD@postgres:5432/chefai?schema=public
POSTGRES_USER=chefai
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=chefai

JWT_SECRET=<genera con: openssl rand -base64 48>
SESSION_TTL_DAYS=30

ADMIN_EMAIL=admin@chefai.app
ADMIN_PASSWORD=<una contraseña fuerte>

OPENAI_API_KEY=sk-...
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # se obtiene tras crear el endpoint en Stripe

PAYPAL_ENV=live
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="ChefAI <hola@chefai.app>"

UPLOADS_DIR=./public/uploads
```

> **Genera el JWT_SECRET con:** `openssl rand -base64 48` (no reutilices el de dev).

---

## 5. Bootstrap del certificado HTTPS

`docker/init-letsencrypt.sh` reemplaza `DOMAIN` en `nginx.conf` y obtiene el primer certificado.

```bash
DOMAIN=chefai.app EMAIL=tu@email.com bash docker/init-letsencrypt.sh
```

Si todo va bien verás `Done. Visit https://chefai.app`.

---

## 6. Levantar la app

```bash
docker compose -f docker/docker-compose.yml --env-file .env.production build
docker compose -f docker/docker-compose.yml --env-file .env.production up -d postgres
docker compose -f docker/docker-compose.yml --env-file .env.production run --rm migrate
docker compose -f docker/docker-compose.yml --env-file .env.production up -d web nginx certbot
```

Comprueba:

```bash
curl -fs https://chefai.app/api/health
# {"ok":true,"db":true,"ts":"..."}
```

---

## 7. Webhooks

### Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://chefai.app/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copia el `signing secret` y ponlo en `STRIPE_WEBHOOK_SECRET`
5. Reinicia: `docker compose ... up -d web`

### PayPal

1. PayPal Developer → My Apps → tu app → Webhooks → Add Webhook
2. URL: `https://chefai.app/api/webhooks/paypal`
3. Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
4. Copia el `Webhook ID` a `PAYPAL_WEBHOOK_ID`
5. Reinicia el web

---

## 8. Configurar planes

1. Login con `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. Cambia la contraseña en `/settings`
3. En `/admin/plans`, edita cada plan y pega:
   - **Stripe Price ID** (formato `price_...` — créalos en Stripe Dashboard primero)
   - **PayPal Plan ID** (opcional, si usas PayPal Subscriptions)
4. Guarda.

---

## 9. Backups automáticos

```bash
chmod +x /opt/chefai/scripts/backup-db.sh
crontab -e
```

Añade:

```
0 3 * * * /opt/chefai/scripts/backup-db.sh
```

Probar restore una vez:

```bash
gunzip -c /opt/backups/chefai-XXXX.sql.gz | \
  docker compose -f /opt/chefai/docker/docker-compose.yml \
    exec -T postgres psql -U chefai -d chefai
```

---

## 10. Monitorización mínima

Configura [UptimeRobot](https://uptimerobot.com) (gratis):

- HTTP(S) monitor → `https://chefai.app/api/health`
- Interval 5 min
- Alertas a tu email

---

## 11. Re-deploy de futuras versiones

```bash
cd /opt/chefai
bash scripts/deploy.sh
```

Esto: pulls, rebuild, migrate, restart. Sin downtime perceptible si no hay schema change destructivo.

---

## 12. Checklist pre-launch

- [ ] `JWT_SECRET` único en prod (≠ dev)
- [ ] Admin password cambiada
- [ ] Stripe live + webhook funcionando
- [ ] PayPal live + webhook funcionando
- [ ] HTTPS verde en `https://<dominio>`
- [ ] `/api/health` responde 200 con `db: true`
- [ ] Backups DB programados y probados
- [ ] Términos y Privacidad accesibles
- [ ] Logo/branding correctos en navbar y emails
- [ ] Lighthouse mobile ≥ 90 en landing
- [ ] Test E2E manual: registro → generar receta → upgrade Stripe → desbloquear imagen IA

---

## Troubleshooting

**Pull de imagen falla con TLS error**
Probablemente Docker Desktop está usando un proxy interno. En Hetzner (Ubuntu) no aplica.

**Prisma migrate deploy falla**
Verifica que `DATABASE_URL` apunte a `postgres` (nombre del servicio Docker), no a `localhost`.

**Webhooks devuelven 400**
Stripe: el `STRIPE_WEBHOOK_SECRET` debe ser el del endpoint específico, no la clave global. PayPal: el `PAYPAL_WEBHOOK_ID` debe ser el ID exacto del webhook (no del app).

**Imágenes IA no aparecen**
Confirma que `plan.imagesEnabled` está en `true` en `/admin/plans` para el plan del usuario, y que `OPENAI_API_KEY` tiene crédito.
