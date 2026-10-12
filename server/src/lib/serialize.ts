import { presignGet } from "./s3.js";

export function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : "";
}

export function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function signedShotUrl(objectKey: string) {
  return presignGet(objectKey);
}

export async function mapShotUrls(shots: { id: string; objectKey: string; sortOrder?: number }[]) {
  const sorted = shots.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return Promise.all(sorted.map(async (s) => ({ id: s.id, url: await signedShotUrl(s.objectKey) })));
}
