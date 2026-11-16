import { HttpClient } from '../adapters/http/HttpClient';
import { UserHttpAdapter } from '../adapters/http/UserHttpAdapter';
import { BrowserSessionStore } from '../adapters/storage/BrowserSessionStore';
import type { UseCases } from '../application/ports/in/use-cases';
import { UserApplicationService } from '../application/services/UserApplicationService';

// Único lugar que conoce las clases concretas. Una sola instancia del almacén
// se comparte entre el cliente HTTP (lee el token) y el servicio (lo guarda).
const store = new BrowserSessionStore(localStorage);
const http = new HttpClient(
  import.meta.env.VITE_API_BASE_URL || '/api',
  store,
  () => window.dispatchEvent(new Event('session-expired')),
);

export const useCases: UseCases = new UserApplicationService(new UserHttpAdapter(http), store);
