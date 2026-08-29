export function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : "";
}

export function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function screenshotUrl(filename: string) {
  return `/uploads/${filename}`;
}
