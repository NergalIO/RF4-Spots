import { Http, ApiError } from "./api/http";
import { authApi } from "./api/auth";
import { adminApi } from "./api/admin";
import { catalogApi, postsApi } from "./api/posts";
import { guidesApi } from "./api/guides";
import type { GuideRow } from "./types";

export { ApiError };
export { CATCH_LABEL, fmtCoord, fmtDateTime, fmtWhen } from "./shared/format";

export class Api {
  private http: Http;
  private auth: ReturnType<typeof authApi>;
  private catalog: ReturnType<typeof catalogApi>;
  private postsClient: ReturnType<typeof postsApi>;
  private admin: ReturnType<typeof adminApi>;
  private guidesClient: ReturnType<typeof guidesApi>;

  constructor(baseUrl: string, token: string) {
    this.http = new Http(baseUrl, token);
    this.auth = authApi(this.http);
    this.catalog = catalogApi(this.http);
    this.postsClient = postsApi(this.http);
    this.admin = adminApi(this.http);
    this.guidesClient = guidesApi(this.http);
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

  authConfig() {
    return this.auth.authConfig();
  }
  clientDownloads() {
    return this.auth.clientDownloads();
  }
  login(nickname: string, password: string) {
    return this.auth.login(nickname, password);
  }
  register(nickname: string, password: string, invite?: string) {
    return this.auth.register(nickname, password, invite);
  }
  changePassword(current: string, next: string) {
    return this.auth.changePassword(current, next);
  }
  me() {
    return this.auth.me();
  }
  fish() {
    return this.catalog.fish();
  }
  waterbodies() {
    return this.catalog.waterbodies();
  }
  sync() {
    return this.catalog.sync();
  }
  posts(params: Record<string, string>) {
    return this.postsClient.posts(params);
  }
  markers(waterbodyId: string) {
    return this.postsClient.markers(waterbodyId);
  }
  post(id: string) {
    return this.postsClient.post(id);
  }
  createPost(fd: FormData) {
    return this.postsClient.createPost(fd);
  }
  updatePost(id: string, fd: FormData) {
    return this.postsClient.updatePost(id, fd);
  }
  deletePost(id: string) {
    return this.postsClient.deletePost(id);
  }
  setFavorite(id: string, on: boolean) {
    return this.postsClient.setFavorite(id, on);
  }
  addComment(postId: string, fd: FormData) {
    return this.postsClient.addComment(postId, fd);
  }
  deleteComment(id: string) {
    return this.postsClient.deleteComment(id);
  }
  report(body: { postId?: string; commentId?: string; reason: string }) {
    return this.postsClient.report(body);
  }
  adminUsers() {
    return this.admin.adminUsers();
  }
  adminPatchUser(id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
    return this.admin.adminPatchUser(id, body);
  }
  adminDeleteUser(id: string) {
    return this.admin.adminDeleteUser(id);
  }
  adminStats() {
    return this.admin.adminStats();
  }
  adminInvites() {
    return this.admin.adminInvites();
  }
  adminCreateInvite(expiresAt?: string) {
    return this.admin.adminCreateInvite(expiresAt);
  }
  adminReports(status = "open") {
    return this.admin.adminReports(status);
  }
  adminPatchReport(id: string, body: { status: "open" | "resolved" | "dismissed"; hide?: boolean }) {
    return this.admin.adminPatchReport(id, body);
  }
  guides() {
    return this.guidesClient.guides();
  }
  guide(key: string) {
    return this.guidesClient.guide(key);
  }
  saveGuide(key: string, rows: GuideRow[]) {
    return this.guidesClient.saveGuide(key, rows);
  }
  addGuideRow(key: string, row: GuideRow) {
    return this.guidesClient.addGuideRow(key, row);
  }
  updateGuideRow(key: string, index: number, row: GuideRow) {
    return this.guidesClient.updateGuideRow(key, index, row);
  }
  deleteGuideRow(key: string, index: number) {
    return this.guidesClient.deleteGuideRow(key, index);
  }
}
