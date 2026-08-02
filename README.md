# AP Down Monitor

Panel interno tipo **NOC telco** (en español) para monitorear Access Points Wi-Fi: cuáles están caídos, cuándo se los vio por última vez y cuántos hay afectados por sitio.

Estética corporativa, sobria y densa en información — pensado como herramienta interna de operaciones, no como app de consumo.

## URLs

| Qué | URL |
|---|---|
| Publicada | `https://ap-monitor.lovable.app` |
| URL estable de producción (webhooks) | `https://project--217b91b4-5875-4cb9-b8de-a8812de100a7.lovable.app` |
| URL estable de preview | `https://project--217b91b4-5875-4cb9-b8de-a8812de100a7-dev.lovable.app` |

## Arquitectura: dos motores de datos

### Motor A — Local (`localStorage`, sin backend)

- Los datos viven solo en el navegador de quien los carga. No hay tiempo real ni API.
- Sirve para pruebas rápidas, demos y carga manual de CSV.
- Páginas: `/` (Estado de APs), `/sitios` (Resumen por sitio), `/carga` (Carga de datos).
- Código: `src/lib/ap-store.ts`.

### Motor B — Cloud (Lovable Cloud / Supabase, tiempo real)

- Los datos viven en la tabla `public.devices` y se actualizan en vivo (Supabase Realtime).
- Se alimentan por webhook HTTP desde un sistema externo (script de ping, NMS, Zabbix, etc.).
- Páginas: `/dashboard`, `/devices/$id`, `/config`.
- Código: `src/lib/devices.ts`.

```text
  Script/NMS externo
        │  POST JSON + header x-webhook-secret
        ▼
  /api/public/devices/upsert   (valida secreto + Zod)
        │  upsert onConflict: ip   (service_role, bypassa RLS)
        ▼
  tabla public.devices  ──Realtime──►  /dashboard  y  /devices/$id
```

## Páginas de la app

| Ruta | Nombre | Motor | Qué hace |
|---|---|---|---|
| `/` | Estado de APs | Local | Tabla de APs, caídos arriba, tarjetas resumen |
| `/sitios` | Resumen por sitio | Local | Agrupa por sitio, disponibilidad |
| `/carga` | Carga de datos | Local | Subida de CSV, alta manual, datos demo |
| `/dashboard` | Dashboard | Cloud | Tabla en tiempo real, orden por criticidad |
| `/devices/$id` | Detalle de dispositivo | Cloud | Ficha del equipo + "Acknowledge" |
| `/config` | Configuración | Cloud | Umbrales de estado + doc del webhook |
| `/api/public/devices/upsert` | Webhook | Cloud | Endpoint POST autenticado por header |

## Modelo de datos

### CSV del motor local (`/carga`)

```csv
AP name,site,status,last seen,uptime,notes
AP-CABA-01,CABA - Microcentro,up,2026-07-21T14:15:00-03:00,99.8%,OK
AP-BSAS-04,Buenos Aires - Tigre Norte,down,2026-07-21T09:02:00-03:00,0%,No responde ping
AP-CBA-02,Córdoba - Nueva Córdoba,unknown,,,Sin telemetría
```

`status` acepta `up`, `down`, `unknown`. `last seen` en ISO 8601. Ejemplo con 50 APs de las 23 provincias + CABA: `aps_argentina_dummy.csv`.

### Tabla `public.devices` (motor cloud)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `ip` | text NOT NULL | clave única de upsert |
| `site` | text NOT NULL | sitio / localidad |
| `status` | text NOT NULL | `up`\|`down`\|`degraded`\|`unknown` |
| `last_seen` | timestamptz | último contacto |
| `latency_ms` | integer | latencia de ping |
| `notes` | text | observaciones / acknowledge |
| `created_at` / `updated_at` | timestamptz | default `now()` |

### Umbrales (en `localStorage`, editables en `/config`)

- `degradedLatencyMs`: default 200 ms → `latency_ms > 200` ⇒ **DEGRADADO**.
- `unknownAfterMinutes`: default 10 min → `last_seen` más viejo ⇒ **SIN DATOS**.

## Webhook / API

```
POST https://project--<PROJECT_ID>.lovable.app/api/public/devices/upsert
Content-Type: application/json
x-webhook-secret: <DEVICE_WEBHOOK_SECRET>
```

Body: un objeto o array (máx. 500):

```json
{
  "ip": "10.10.2.15",
  "site": "Tigre Norte",
  "status": "down",
  "last_seen": "2026-07-21T14:15:00-03:00",
  "latency_ms": null,
  "notes": "No responde ping"
}
```

Ejemplo curl:

```bash
curl -X POST 'https://project--<PROJECT_ID>.lovable.app/api/public/devices/upsert' \
  -H 'content-type: application/json' \
  -H 'x-webhook-secret: <DEVICE_WEBHOOK_SECRET>' \
  -d '[
    {"ip":"10.10.2.15","site":"Tigre Norte","status":"down","latency_ms":null,"notes":"No responde ping"},
    {"ip":"10.10.2.16","site":"Tigre Norte","status":"up","latency_ms":42}
  ]'
```

Respuestas: `200 ok`, `400 invalid_json/validation_failed`, `401 unauthorized`, `500 server_misconfigured/db_error`.

## Claves y secretos

- `DEVICE_WEBHOOK_SECRET`: único secreto de la app, autentica el webhook (header `x-webhook-secret`). Se gestiona en Cloud → Secrets, nunca en el código.
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`: gestionadas por el backend.
- `VITE_SUPABASE_*`: públicas, van en `.env` (autogenerado) y son publicables, pero igual se recomienda tener `.env`/`.env.*` en `.gitignore`.

## Autenticación

- La app **no tiene login** actualmente; cualquiera con el link ve las pantallas.
- El webhook sí está autenticado con `x-webhook-secret`.
- RLS de `devices`: `anon`/`PUBLIC` sin acceso; solo `authenticated` y `service_role`.
- Consecuencia: sin login, `/dashboard` y `/devices/$id` aparecen vacíos (comportamiento esperado, no un bug).
- Pendiente: agregar login con email+contraseña y/o Google (ver documentación completa para el detalle).

## Modo de uso

**Uso rápido sin backend:** cargar CSV o datos demo en `/carga`, ver `/` y `/sitios`.

**Uso operativo con tiempo real:**
1. Obtener `DEVICE_WEBHOOK_SECRET` desde Cloud → Secrets.
2. Configurar el sistema externo para hacer POST al endpoint cada N minutos.
3. Ver `/dashboard` (se actualiza solo).
4. Ajustar umbrales en `/config`.
5. Usar "Acknowledge" en el detalle de cada equipo.

## Stack técnico

- TanStack Start v1 (React 19, SSR) + Vite 7 + TypeScript
- Tailwind CSS v4
- Lovable Cloud (Supabase): Postgres + RLS + Realtime
- Zod para validación del webhook
- sonner para toasts
- Rutas por archivo en `src/routes/` (no React Router)

### Archivos clave

```
src/lib/ap-store.ts                     store local + CSV + demo
src/lib/devices.ts                      hooks realtime + deriveStatus
src/lib/format.ts                       tiempo relativo y fechas
src/components/StatusBadge.tsx          badge motor local
src/components/DeviceStatusBadge.tsx    badge motor cloud
src/routes/__root.tsx                   layout + navegación
src/routes/index.tsx | sitios | carga   motor local
src/routes/dashboard.tsx | devices.$id  motor cloud
src/routes/config.tsx                   umbrales + doc del webhook
src/routes/api/public/devices/upsert.ts endpoint de ingesta
```

## Documentación adicional

Para el detalle completo (arquitectura, prompt de reconstrucción, checklist de migración, FAQ) ver `AP_Down_Monitor_Documentacion_Completa.md` en este repo.

## Preguntas frecuentes

**¿Cuál es la API key para Postman?** `DEVICE_WEBHOOK_SECRET`, en el header `x-webhook-secret`.

**Me devuelve `{"error":"unauthorized"}`.** Falta o está mal ese header.

**El dashboard está vacío.** No hay login y RLS bloquea a `anon`.

**¿Es peligroso subirlo a GitHub?** Las claves `VITE_*` son publicables. El secreto del webhook y la service role key nunca están en el código.
