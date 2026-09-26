import http from 'http';
import { app } from '../../app';

let serverInstance: http.Server | null = null;
let cachedBaseUrl: string | null = null;

export async function getTestBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;

  // First probe if local server is already running on port 4000
  const isRunning = await new Promise<boolean>((resolve) => {
    const req = http.get('http://localhost:4000/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });

  if (isRunning) {
    cachedBaseUrl = 'http://localhost:4000';
    return cachedBaseUrl;
  }

  // Otherwise spin up ephemeral test server on random port
  const port = await new Promise<number>((resolve) => {
    serverInstance = app.listen(0, () => {
      const addr = serverInstance!.address() as { port: number };
      resolve(addr.port);
    });
  });

  cachedBaseUrl = `http://localhost:${port}`;
  return cachedBaseUrl;
}

export async function closeTestServer(): Promise<void> {
  if (serverInstance) {
    await new Promise<void>((resolve) => serverInstance!.close(() => resolve()));
    serverInstance = null;
    cachedBaseUrl = null;
  }
}

export async function loginAs(email: string, password = 'Demo@123'): Promise<string> {
  const baseUrl = await getTestBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}
