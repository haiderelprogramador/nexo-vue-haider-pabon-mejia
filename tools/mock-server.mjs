// Alternativa sin Postman CLI: ejecuta el mismo handler de la simulación con
// Node, en el puerto 4010. El handler es CommonJS y este paquete es ESM, así
// que lo cargamos con un `require` creado a mano en lugar de importarlo.
//
//   npm run mock
//   (otra terminal)  API_PROXY_TARGET=http://127.0.0.1:4010/user-service npm run dev
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const handler = fileURLToPath(new URL('../postman/mocks/user-service/default.js', import.meta.url));
process.env.PORT ||= '4010';

new Function('require', readFileSync(handler, 'utf8'))(createRequire(handler));
