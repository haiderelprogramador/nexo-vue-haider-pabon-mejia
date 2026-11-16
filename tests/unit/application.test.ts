import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../../src/adapters/http/HttpClient';
import { UserHttpAdapter } from '../../src/adapters/http/UserHttpAdapter';
import { BrowserSessionStore, SESSION_KEY } from '../../src/adapters/storage/BrowserSessionStore';
import { UserApplicationService } from '../../src/application/services/UserApplicationService';
import type { UserRole, UserStatus } from '../../src/domain/constants/user';
import { DomainError } from '../../src/domain/exceptions/errors';
import type { Session } from '../../src/domain/model/Session';
import { User } from '../../src/domain/model/User';
import type { UserGateway } from '../../src/domain/ports/out/UserGateway';

/** Un Storage en memoria: no toca el localStorage real ni necesita navegador. */
function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, value); },
  };
}

const session = (token: string): Session => ({
  token,
  expiresAt: Date.now() + 60_000,
  userId: 'u-1',
  role: 'ADMIN',
});

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });

const headersOf = (init: RequestInit | undefined) => init?.headers as Record<string, string>;

describe('servicio de aplicación y dominio', () => {
  it('normaliza al crear y rechaza una contraseña corta antes de llamar al puerto', async () => {
    const create = vi.fn(async (user: User) => user);
    // Doble parcial: este caso solo necesita `create`.
    const gateway = { create } as unknown as UserGateway;
    const service = new UserApplicationService(gateway, new BrowserSessionStore(memory()));

    const command = { id: ' u-9 ', name: '  Lucía Torres ', email: ' LUCIA@Example.com ', role: 'MEMBER' as const };

    await expect(service.create({ ...command, password: 'corta' })).rejects.toBeInstanceOf(DomainError);
    expect(create).not.toHaveBeenCalled();

    const created = await service.create({ ...command, password: 'password123' });
    expect(create).toHaveBeenCalledOnce();
    expect(created).toMatchObject({
      id: 'u-9',
      name: 'Lucía Torres',
      email: 'lucia@example.com',
      role: 'MEMBER',
      status: 'PENDING',
    });
  });

  it('rechaza un rol o un estado inválidos aunque se fuerce TypeScript', () => {
    expect(() => new User('u-1', 'Ana Ruiz', 'ana@example.com', 'ROOT' as unknown as UserRole, 'ACTIVE'))
      .toThrow(DomainError);
    expect(() => new User('u-1', 'Ana Ruiz', 'ana@example.com', 'ADMIN', 'DELETED' as unknown as UserStatus))
      .toThrow(DomainError);
  });
});

describe('almacenamiento de sesión', () => {
  it('devuelve null y quita la clave si lo guardado no es JSON', () => {
    const storage = memory();
    storage.setItem(SESSION_KEY, 'esto-no-es-json');
    const store = new BrowserSessionStore(storage);

    expect(store.get()).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('cliente HTTP', () => {
  it('envía el Bearer y, ante un 401, limpia la sesión y avisa una vez', async () => {
    const store = new BrowserSessionStore(memory());
    store.save(session('token-a'));
    const onUnauthorized = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, { message: 'no' }));
    const http = new HttpClient('/api/', store, onUnauthorized);

    await expect(http.request('/users')).rejects.toMatchObject({ status: 401 });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/users');
    expect(headersOf(init).Authorization).toBe('Bearer token-a');
    expect(store.get()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });

  it('ante un 403 muestra error de permisos y conserva el token', async () => {
    const store = new BrowserSessionStore(memory());
    store.save(session('token-a'));
    const onUnauthorized = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(403, { message: 'forbidden' }));
    const http = new HttpClient('/api', store, onUnauthorized);

    await expect(http.request('/users')).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('permisos'),
    });
    expect(store.get()?.token).toBe('token-a');
    expect(onUnauthorized).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('un 401 tardío de una sesión vieja no elimina la sesión nueva', async () => {
    const store = new BrowserSessionStore(memory());
    store.save(session('token-a'));
    const onUnauthorized = vi.fn();
    // Mientras la petición con el token A está "en vuelo", entra el token B.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      store.save(session('token-b'));
      return json(401);
    });
    const http = new HttpClient('/api', store, onUnauthorized);

    await expect(http.request('/users')).rejects.toMatchObject({ status: 401 });
    expect(store.get()?.token).toBe('token-b');
    expect(onUnauthorized).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('adaptador HTTP de usuarios', () => {
  it('un login rechazado no envía el Bearer anterior ni dispara sesión vencida', async () => {
    const store = new BrowserSessionStore(memory());
    store.save(session('token-anterior'));
    const onUnauthorized = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, { message: 'bad credentials' }));
    const adapter = new UserHttpAdapter(new HttpClient('/api', store, onUnauthorized));

    await expect(adapter.login('ana@example.com', 'incorrecta')).rejects.toMatchObject({ status: 401 });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/auth/login');
    expect(headersOf(init)).not.toHaveProperty('Authorization');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(store.get()?.token).toBe('token-anterior');
    fetchSpy.mockRestore();
  });

  it('PUT codifica el ID y omite la contraseña ausente; DELETE acepta un 204 vacío', async () => {
    const store = new BrowserSessionStore(memory());
    store.save(session('token-a'));
    const apiUser = { id: 'a/b 1', name: 'Ana Ruiz', email: 'ana@example.com', role: 'MEMBER', status: 'ACTIVE' };
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, apiUser))
      .mockResolvedValueOnce(json(204));
    const adapter = new UserHttpAdapter(new HttpClient('/api', store, vi.fn()));

    const updated = await adapter.update(new User('a/b 1', 'Ana Ruiz', 'ana@example.com', 'MEMBER', 'ACTIVE'));
    expect(updated.id.value).toBe('a/b 1');

    const [putUrl, putInit] = fetchSpy.mock.calls[0]!;
    expect(putUrl).toBe('/api/users/a%2Fb%201');
    expect(putInit?.method).toBe('PUT');
    const sent = JSON.parse(putInit?.body as string) as Record<string, unknown>;
    expect(sent).toMatchObject({ name: 'Ana Ruiz', status: 'ACTIVE' });
    expect(sent).not.toHaveProperty('password');
    expect(sent).not.toHaveProperty('id');

    await expect(adapter.delete('a/b 1')).resolves.toBeUndefined();
    const [deleteUrl, deleteInit] = fetchSpy.mock.calls[1]!;
    expect(deleteUrl).toBe('/api/users/a%2Fb%201');
    expect(deleteInit?.method).toBe('DELETE');
    expect(deleteInit?.body).toBeUndefined();
    fetchSpy.mockRestore();
  });
});
