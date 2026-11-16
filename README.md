# Nexo · Panel de usuarios

Frontend en Vue 3 + TypeScript + Vite con arquitectura hexagonal (dominio, aplicación, adaptadores, entrypoint GUI y bootstrap). Reconstruido siguiendo las guías 01–14 del tutorial.

## Requisitos

- Node.js 22.12 o superior (el tutorial usa Node 26 LTS) y npm.
- Para las pruebas de navegador: `npx playwright install chromium`.
- Opcional: Postman CLI 1.70+ (`npm install -g postman-cli`) para la simulación.

## Arrancar

```bash
npm ci          # instala las versiones del package-lock.json
npm run dev     # abre http://localhost:5173
```

### Con la API simulada (sin backend Java)

Terminal 1:

```bash
npm run mock
# o, con Postman CLI:
# postman simulation run postman/simulations/users/users.sim.yaml --port 4010 --no-history
```

Terminal 2 (PowerShell):

```powershell
$env:API_PROXY_TARGET = 'http://127.0.0.1:4010/user-service'
npm run dev
```

Terminal 2 (Bash):

```bash
API_PROXY_TARGET=http://127.0.0.1:4010/user-service npm run dev
```

Cuentas de la simulación: `admin@example.com` / `password123` (ADMIN) y `reviewer@example.com` / `password123` (REVIEWER). No son cuentas del backend real.

### Con un backend real

Copia `.env.example` a `.env` y ajusta `API_PROXY_TARGET` al origen del backend (sin `/api` al final). Reinicia Vite después de cambiarlo.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con proxy `/api` |
| `npm test` | 8 pruebas unitarias (Vitest) |
| `npm run build` | Revisión de tipos (`vue-tsc`) y salida de producción en `dist/` |
| `npm run preview` | Vista previa de la compilación |
| `npm run test:e2e` | 4 escenarios de navegador (Playwright) contra la simulación |
| `npm run mock` | Simulación de la API con Node, sin Postman CLI |

`npm run test:e2e` arranca la simulación con Postman CLI. Sin Postman CLI:

```powershell
$env:NEXO_MOCK = 'node'; npm run test:e2e
```

Antes de las pruebas de navegador deja libres los puertos 5173 y 4010.

## Estructura

```
src/domain        reglas: constantes, errores, objetos de valor, modelos y puertos de salida
src/application   casos de uso: DTO, mapper, puertos de entrada y servicio
src/adapters      HTTP (fetch), mapeo API ↔ dominio y sesión en localStorage
src/bootstrap     composición de objetos concretos
src/entrypoint    GUI en Vue: contexto, router, App, vistas y estilos
tests/            unitarias y de navegador
postman/          mock y simulación local de la API
practicas/        ejercicios resueltos de las guías
```
