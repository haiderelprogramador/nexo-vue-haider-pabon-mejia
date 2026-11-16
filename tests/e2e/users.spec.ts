import { expect, test, type Page } from '@playwright/test';

const MOCK = 'http://127.0.0.1:4010/user-service';
const SESSION_KEY = 'nexo.session';

const storedSession = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);

test.beforeEach(async ({ request }) => {
  // Cada caso empieza con los datos conocidos de la simulación.
  await request.post(`${MOCK}/__reset`);
});

async function login(page: Page, email = 'admin@example.com', password = 'password123') {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida.' })).toBeVisible();
}

test('sesión persistente y CRUD completo', async ({ page }) => {
  await login(page);

  // La sesión sobrevive a una recarga.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida.' })).toBeVisible();

  // Crear.
  await page.getByRole('link', { name: 'Crear usuario' }).first().click();
  await page.getByLabel('Nombre completo').fill('Lucía Torres');
  await page.getByLabel('Correo electrónico').fill('lucia@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Guardar usuario' }).click();
  await expect(page.getByRole('status')).toContainText('pendiente de activación');
  await page.getByRole('link', { name: 'Volver al directorio' }).last().click();

  // Buscar por correo y editar nombre y estado.
  await page.getByLabel('Buscar usuarios').fill('lucia@example.com');
  await expect(page.getByRole('row', { name: /Lucía Torres/ })).toBeVisible();
  await page.getByRole('link', { name: 'Editar Lucía Torres' }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Lucía Torres');
  await page.getByLabel('Nombre completo').fill('Lucía Gómez');
  await page.getByLabel('Estado').selectOption('ACTIVE');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await page.getByRole('link', { name: 'Volver al directorio' }).last().click();

  // Abrir el modal y cancelar no elimina.
  await page.getByLabel('Buscar usuarios').fill('lucia@example.com');
  const row = page.getByRole('row', { name: /Lucía Gómez/ });
  await expect(row).toContainText('Activo');
  await page.getByRole('button', { name: 'Eliminar Lucía Gómez' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  // Confirmar sí elimina, después del éxito del servidor.
  await page.getByRole('button', { name: 'Eliminar Lucía Gómez' }).click();
  await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Usuario eliminado');
  await expect(row).toHaveCount(0);

  // Cerrar sesión quita la clave local.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await storedSession(page)).toBeNull();
});

test('un 403 conserva la sesión y un 401 la cierra', async ({ page, request }) => {
  await login(page);
  await page.getByRole('link', { name: 'Listar usuarios' }).first().click();
  await expect(page.getByRole('row', { name: /Ana Admin/ })).toBeVisible();

  await request.post(`${MOCK}/__failure`, { data: { status: 403 } });
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('alert')).toContainText('permisos');
  await expect(page).toHaveURL(/\/usuarios$/);
  expect(await storedSession(page)).not.toBeNull();

  await request.post(`${MOCK}/__failure`, { data: { status: 401 } });
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page).toHaveURL(/\/login\?expired=1$/);
  await expect(page.getByRole('alert')).toContainText('Tu sesión venció');
  expect(await storedSession(page)).toBeNull();
});

test('una cuenta registrada queda pendiente y no puede iniciar sesión', async ({ page }) => {
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill('Mario Pérez');
  await page.getByLabel('Correo electrónico').fill('mario@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Guardar usuario' }).click();
  await expect(page.getByRole('status')).toContainText('pendiente de activación');

  await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
  await page.getByLabel('Correo electrónico').fill('mario@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert')).toContainText('cuenta pendiente');
  expect(await storedSession(page)).toBeNull();
});

test('redirección protegida y diseño adaptable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/login\?redirect=\/usuarios$/);

  // Tras el login volvemos al destino que se quería abrir.
  await page.getByLabel('Correo electrónico').fill('admin@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByRole('row', { name: /Ana Admin/ })).toBeVisible();

  // El chequeo automático: la página no se ensancha más que la pantalla.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath('movil-390.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Te damos la bienvenida.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('escritorio-1440.png'), fullPage: true });
});
