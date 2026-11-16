/**
 * Simulación local del servicio de usuarios para las pruebas de Nexo.
 *
 * Lo ejecuta Postman CLI en un contexto Node (CommonJS): por eso usa require
 * aunque el resto del proyecto sea ESM. No es un componente Vue ni el backend
 * real: guarda contraseñas de ejemplo en texto y su "token" no tiene una firma
 * verificada. Sirve para recorrer el cliente, no para publicarse.
 *
 * @endpoint POST /api/auth/login
 * @endpoint GET /api/users
 * @endpoint POST /api/users
 * @endpoint GET /api/users/{id}
 * @endpoint PUT /api/users/{id}
 * @endpoint DELETE /api/users/{id}
 */
const http = require('http');

const PORT = process.env.PORT || 4010;
const ROLES = ['ADMIN', 'MEMBER', 'REVIEWER'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED'];
const USERS_KEY = 'user-service.users';
const FAILURE_KEY = 'user-service.failure';

// 1. Datos iniciales: un ADMIN y una REVIEWER activos.
const seed = () => [
  { id: 'u-admin', name: 'Ana Admin', email: 'admin@example.com', password: 'password123', role: 'ADMIN', status: 'ACTIVE' },
  { id: 'u-reviewer', name: 'Rita Revisora', email: 'reviewer@example.com', password: 'password123', role: 'REVIEWER', status: 'ACTIVE' },
];

// 2. Nunca respondemos la contraseña.
const publicUser = ({ password, ...user }) => user;

// 3. Estado: pm.state si Postman lo ofrece; si no, memoria del proceso.
const memory = (globalThis.__nexoMockState ||= new Map());
const state = typeof pm !== 'undefined' && pm.state
  ? pm.state
  : { get: async (key) => memory.get(key), set: async (key, value) => { memory.set(key, value); } };

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const makeToken = (user) => [
  base64url({ alg: 'none', typ: 'JWT' }),
  base64url({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 3600 }),
  'firma-local',
].join('.');

function readClaims(header) {
  try {
    const [type, token] = String(header || '').split(' ');
    if (type !== 'Bearer' || !token) return null;
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

function readBody(req) {
  // 6. Si Postman ya procesó el cuerpo lo usamos; si no, leemos el flujo de Node.
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string' && req.body) {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve(undefined); }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(undefined); }
    });
    req.on('error', () => resolve(undefined));
  });
}

const server = http.createServer(async (req, res) => {
  // El cuerpo ya está llegando: hay que escucharlo antes del primer await.
  const pendingBody = readBody(req);

  // 5. Respuesta JSON, o 204 sin cuerpo.
  const send = (status, payload) => {
    if (status === 204) {
      res.writeHead(204);
      return res.end();
    }
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(payload));
  };
  const fail = (status, message) => send(status, { status, message });

  try {
    // 4. get/set pueden devolver promesas: sin await, users.find no existiría.
    const users = (await state.get(USERS_KEY)) || seed();
    const failure = (await state.get(FAILURE_KEY)) || 0;
    const save = (list) => state.set(USERS_KEY, list);

    // Admite la ruta con o sin el prefijo del miembro de la simulación.
    const path = new URL(req.url, 'http://mock.local').pathname.replace(/^\/user-service(?=\/)/, '');
    const method = req.method;

    const body = await pendingBody;
    if (body === undefined) return fail(400, 'El cuerpo no es un JSON válido.');

    // 7. Controles del entorno de pruebas. No existen en el servicio real.
    if (path === '/__ready') return send(200, { ready: true });
    if (path === '/__reset' && method === 'POST') {
      await save(seed());
      await state.set(FAILURE_KEY, 0);
      return send(200, { reset: true });
    }
    if (path === '/__failure' && method === 'POST') {
      await state.set(FAILURE_KEY, Number(body.status) || 0);
      return send(200, { failure: Number(body.status) || 0 });
    }

    // 8. Login: correo, contraseña y cuenta ACTIVE.
    if (path === '/api/auth/login' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const user = users.find((item) =>
        item.email === email && item.password === body.password && item.status === 'ACTIVE');
      if (!user) return fail(401, 'Credenciales inválidas o cuenta no activa.');
      return send(200, { accessToken: makeToken(user), tokenType: 'Bearer', expiresIn: 3600 });
    }

    // 9. Creación pública: valida, detecta conflictos y reconoce reintentos.
    if (path === '/api/users' && method === 'POST') {
      const candidate = {
        id: String(body.id || '').trim(),
        name: String(body.name || '').trim(),
        email: String(body.email || '').trim().toLowerCase(),
        password: String(body.password || '').trim(),
        role: body.role || 'MEMBER',
      };
      const valid = candidate.id && candidate.name.length >= 3
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
        && candidate.password.length >= 8 && ROLES.includes(candidate.role);
      if (!valid) return fail(400, 'Datos de usuario inválidos.');

      const sameId = users.find((item) => item.id === candidate.id);
      if (sameId) {
        const repeated = ['name', 'email', 'password', 'role'].every((key) => sameId[key] === candidate[key]);
        return repeated ? send(200, publicUser(sameId)) : fail(409, 'El identificador ya está en uso.');
      }
      if (users.some((item) => item.email === candidate.email)) return fail(409, 'El correo ya está en uso.');

      const created = { ...candidate, status: 'PENDING' };
      await save([...users, created]);
      return send(201, publicUser(created));
    }

    // 10. Rutas protegidas: falla inyectada, Bearer, vencimiento y roles.
    const match = path.match(/^\/api\/users(?:\/([^/]+))?$/);
    if (match) {
      if (failure) return fail(failure, 'Falla inyectada por la prueba.');
      const claims = readClaims(req.headers.authorization);
      if (!claims) return fail(401, 'Token ausente, inválido o vencido.');

      const id = match[1] ? decodeURIComponent(match[1]) : null;
      const canRead = claims.role === 'ADMIN' || claims.role === 'REVIEWER';
      const admin = claims.role === 'ADMIN';

      if (!id && method === 'GET') {
        return canRead ? send(200, users.map(publicUser)) : fail(403, 'Sin permiso.');
      }

      if (id && ['GET', 'PUT', 'DELETE'].includes(method)) {
        if (method === 'GET' ? !canRead : !admin) return fail(403, 'Sin permiso.');
        const current = users.find((item) => item.id === id);
        if (!current) return fail(404, 'Usuario no encontrado.');

        if (method === 'GET') return send(200, publicUser(current));

        // 11. PUT conserva la contraseña si no llega una nueva; DELETE responde 204.
        if (method === 'PUT') {
          const email = String(body.email || '').trim().toLowerCase();
          const valid = String(body.name || '').trim().length >= 3
            && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            && ROLES.includes(body.role) && STATUSES.includes(body.status)
            && (body.password === undefined || String(body.password).trim().length >= 8);
          if (!valid) return fail(400, 'Datos de usuario inválidos.');
          if (users.some((item) => item.id !== id && item.email === email)) {
            return fail(409, 'El correo ya está en uso.');
          }
          const updated = {
            ...current,
            name: String(body.name).trim(),
            email,
            role: body.role,
            status: body.status,
            ...(body.password ? { password: String(body.password).trim() } : {}),
          };
          await save(users.map((item) => (item.id === id ? updated : item)));
          return send(200, publicUser(updated));
        }

        await save(users.filter((item) => item.id !== id));
        return send(204);
      }
    }

    // 12. Lo no modelado responde 501 para no parecer cubierto por accidente.
    return fail(501, `Ruta no modelada en la simulación: ${method} ${path}`);
  } catch (error) {
    return fail(500, `Error del mock: ${error && error.message}`);
  }
});

server.listen(PORT, () => console.log(`Simulación user-service en el puerto ${PORT}`));
