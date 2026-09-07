import { Http, ApiError } from "./http";
import { authApi } from "./auth";
import { adminApi } from "./admin";
import { catalogApi } from "./catalog";
import { postsApi } from "./posts";
import { commentsApi } from "./comments";
import { reportsApi } from "./reports";
import { guidesApi } from "./guides";

export { ApiError };

export class Api {
  private http: Http;
  readonly auth: ReturnType<typeof authApi>;
  readonly catalog: ReturnType<typeof catalogApi>;
  readonly posts: ReturnType<typeof postsApi>;
  readonly comments: ReturnType<typeof commentsApi>;
  readonly reports: ReturnType<typeof reportsApi>;
  readonly admin: ReturnType<typeof adminApi>;
  readonly guides: ReturnType<typeof guidesApi>;

  constructor(baseUrl: string, token: string) {
    this.http = new Http(baseUrl, token);
    this.auth = authApi(this.http);
    this.catalog = catalogApi(this.http);
    this.posts = postsApi(this.http);
    this.comments = commentsApi(this.http);
    this.reports = reportsApi(this.http);
    this.admin = adminApi(this.http);
    this.guides = guidesApi(this.http);
  }

  get baseUrl() {
    return this.http.baseUrl;
  }

  get token() {
    return this.http.token;
  }

  fileUrl(path: string) {
    return this.http.fileUrl(path);
  }
}
