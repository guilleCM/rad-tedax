# Intervención Radiológica (PWA)

PWA para gestionar intervenciones radiológicas: autenticación, CRUD, mapa MapLibre con Zona I / Zona II, y shell instalable.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Auth.js (Credentials, JWT en cookie httpOnly)
- MongoDB (driver oficial)
- MapLibre + Esri (calles y satélite)
- Turf.js (`@turf/circle`) para el cálculo de zonas
- Web App Manifest (instalable, sin service worker)

## Requisitos

- Node.js 20+
- MongoDB Atlas o MongoDB local

## Arranque local

1. Copia variables de entorno:

```bash
cp .env.example .env.local
```

2. Edita `.env.local`:
   - `MONGODB_URI` — cadena de conexión
   - `AUTH_SECRET` — genera con `openssl rand -base64 32`

3. Instala y crea el usuario seed:

```bash
npm install
npm run seed
```

Usuario por defecto: `manager@example.com` / `changeme123`

4. Desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run seed` | Crea/actualiza usuario gestor e índices |
| `npm test` | Tests unitarios (`calculateZones`) |
| `npm run icons` | Regenera iconos PWA |

## Mapa

El mapa ofrece dos capas en la propia interfaz: **Mapa** (calles, Esri World Street Map) y **Satélite** (imagen Esri). No requiere variables de entorno.

## Estructura relevante

- `app/` — rutas UI + Route Handlers
- `domain/zones/` — cálculo puro de zonas (testeable)
- `lib/` — auth, db, validaciones, repositorios, servicios
- `components/map/` — MapLibre (client-only)

## Deploy (Vercel + Atlas)

1. Crea un cluster en MongoDB Atlas y permite acceso desde Vercel (o `0.0.0.0/0` en MVP).
2. Importa el repo en Vercel (o `npx vercel`).
3. Configura variables de entorno en el proyecto Vercel:
   - `MONGODB_URI`
   - `MONGODB_DB` (opcional)
   - `AUTH_SECRET`
4. El build usa `next build` (sin service worker).
5. Tras el primer deploy, ejecuta el seed contra Atlas:

```bash
# con MONGODB_URI de producción en .env.local
npm run seed
```

Si aparecen errores intermitentes `ReplicaSetNoPrimary` o
`MongoServerSelectionError`, comprueba:

- **Atlas Network Access**: Vercel usa IPs de salida dinámicas salvo que el
  proyecto tenga salida estática. En un MVP puede permitirse `0.0.0.0/0`,
  manteniendo credenciales robustas y un usuario de base de datos con permisos
  mínimos.
- **Región**: configura la función de Vercel en una región próxima a la del
  clúster de Atlas para reducir la latencia del handshake.
- **Estado y límites del clúster**: revisa que Atlas no esté pausado y que no
  haya alcanzado sus límites de conexiones.
- **Diagnóstico**: consulta `GET /api/test-db` después de un periodo de
  inactividad; responde `200` si el ping funciona y `503` si Atlas no está
  disponible.

## Notas MVP

- Sin registro público: usuarios vía `npm run seed`
- Fórmula de zonas: placeholder concéntrico (`v1-placeholder`)
- PWA instalable vía manifest; requiere conexión (sin offline ni service worker)
- Errores de red visibles en UI vía `apiFetch` (`lib/api-client.ts`)
- En Windows, usa siempre la misma capitalización de ruta del proyecto al desarrollar/compilar
