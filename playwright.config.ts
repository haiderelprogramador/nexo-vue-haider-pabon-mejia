import { defineConfig } from '@playwright/test';

const MOCK = 'http://127.0.0.1:4010/user-service';

// Por defecto la simulación la sirve Postman CLI, como en la guía 12.
// Si no tienes Postman CLI, usa el mismo handler con Node:
//   Bash:        NEXO_MOCK=node npm run test:e2e
//   PowerShell:  $env:NEXO_MOCK = 'node'; npm run test:e2e
const mockCommand = process.env.NEXO_MOCK === 'node'
  ? 'node tools/mock-server.mjs'
  : 'postman simulation run postman/simulations/users/users.sim.yaml --port 4010 --no-history --output ndjson > postman/simulation.log';

export default defineConfig({
  testDir: 'tests/e2e',
  // Un solo trabajador: todos los casos comparten la misma lista del mock.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: mockCommand,
      url: `${MOCK}/__ready`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173/login',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        API_PROXY_TARGET: MOCK,
        VITE_API_BASE_URL: '/api',
      },
    },
  ],
});
