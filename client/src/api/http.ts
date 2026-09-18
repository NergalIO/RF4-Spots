export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type EtagResult<T> = { notModified: true } | { notModified: false; data: T; etag: string | null };

export class Http {
  constructor(
    public baseUrl: string,
    public token: string,
  ) {}

  private headers(init: RequestInit = {}, extra?: HeadersInit) {
    const headers = new Headers(init.headers);
    if (extra) new Headers(extra).forEach((value, key) => headers.set(key, value));
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  }

  async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: this.headers(init) });
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) {
      throw new ApiError(res.status, data.error || `Ошибка ${res.status}`);
    }
    return data;
  }

  async reqEtag<T>(path: string, etag?: string): Promise<EtagResult<T>> {
    const headers: HeadersInit = {};
    if (etag) headers["If-None-Match"] = etag;
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers({}, headers) });
    if (res.status === 304) return { notModified: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) {
      throw new ApiError(res.status, data.error || `Ошибка ${res.status}`);
    }
    return { notModified: false, data, etag: res.headers.get("ETag") };
  }

  fileUrl(path: string) {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }
}
