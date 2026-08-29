export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class Http {
  constructor(
    public baseUrl: string,
    public token: string,
  ) {}

  async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) {
      throw new ApiError(res.status, data.error || `Ошибка ${res.status}`);
    }
    return data;
  }

  fileUrl(path: string) {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }
}
