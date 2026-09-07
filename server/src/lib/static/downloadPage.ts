import type express from "express";
import { escapeHtml } from "../updateArtifacts.js";
import { clientDownloads } from "./clientDownloads.js";

export function sendDownloadPage(_req: express.Request, res: express.Response) {
  const { installer, apk } = clientDownloads();
  const links = [
    installer ? `<a class="btn" href="${installer.url}">Windows · ${escapeHtml(installer.name)}</a>` : "",
    apk ? `<a class="btn" href="${apk.url}">Android · ${escapeHtml(apk.name)}</a>` : "",
  ]
    .filter(Boolean)
    .join("");
  const body = links || "<p class=\"muted\">Сборки клиента ещё не выложены.</p>";
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>RF4 Spots</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: "Segoe UI", sans-serif; color: #e7efe8;
      background: radial-gradient(1200px 700px at 10% -10%, #143246, #07131c);
    }
    .card {
      width: min(440px, calc(100% - 32px)); padding: 32px 28px;
      background: linear-gradient(180deg, #132a36, #0d1d27);
      border: 1px solid rgba(212, 180, 106, 0.22); border-radius: 18px;
    }
    .eyebrow { letter-spacing: 0.16em; text-transform: uppercase; color: #c9a35a; font-size: 11px; margin: 0 0 8px; }
    h1 { margin: 0 0 8px; font-size: 28px; font-weight: 600; }
    .lead { margin: 0 0 22px; color: #8aa0a8; line-height: 1.45; }
    .links { display: grid; gap: 10px; }
    .btn {
      display: block; text-align: center; text-decoration: none;
      padding: 12px 14px; border-radius: 10px; font-weight: 700;
      background: linear-gradient(180deg, #dcc58a, #b8903e); color: #1a1408;
    }
    .muted { margin: 0; color: #8aa0a8; }
  </style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">Russian Fishing 4</p>
    <h1>Точки ловли</h1>
    <p class="lead">Скачайте клиент для Windows или Android.</p>
    <div class="links">${body}</div>
  </div>
</body>
</html>`);
}
