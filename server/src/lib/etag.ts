import { createHash } from "node:crypto";
import type { Request, Response } from "express";

export function hashEtag(value: string) {
  return `"${createHash("sha1").update(value).digest("base64url")}"`;
}

export function sendJsonWithEtag(req: Request, res: Response, body: unknown) {
  const etag = hashEtag(JSON.stringify(body));
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return true;
  }
  res.json(body);
  return false;
}

export function sendJsonIfMatch(req: Request, res: Response, etag: string, body: unknown) {
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return true;
  }
  res.json(body);
  return false;
}
