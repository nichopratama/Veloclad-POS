/**
 * Fetcher untuk SWR — GET same-origin (cookie httpOnly Better Auth ikut otomatis).
 * Melempar error dengan status agar UI bisa membedakan 401/403/500.
 */
export class FetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let message = 'Request gagal';
    try {
      const body = await res.json();
      message = body?.error ?? message;
    } catch {
      /* abaikan body non-JSON */
    }
    throw new FetchError(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Helper mutasi (POST/PUT/PATCH/DELETE) dengan body JSON. */
export async function apiMutate<T = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = 'Aksi gagal';
    try {
      const b = await res.json();
      message = b?.error ?? message;
    } catch {
      /* abaikan */
    }
    throw new FetchError(res.status, message);
  }
  return res.json() as Promise<T>;
}

