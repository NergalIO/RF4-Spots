export const MAX_SHOTS = 8;

const pasteStack: Array<(e: ClipboardEvent) => boolean> = [];

export function dispatchPaste(e: ClipboardEvent) {
  for (let i = pasteStack.length - 1; i >= 0; i--) {
    if (pasteStack[i](e)) return;
  }
}

export function namedImage(file: File): File {
  const type = file.type || "image/png";
  const ext = (type.split("/")[1] || "png").replace("jpeg", "jpg");
  if (file.name && /\.(png|jpe?g|webp|gif)$/i.test(file.name)) return file;
  return new File([file], `screenshot-${Date.now()}.${ext}`, { type, lastModified: Date.now() });
}

export function imagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  const seen = new Set<File>();
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file && !seen.has(file)) {
        seen.add(file);
        out.push(namedImage(file));
      }
    }
  }
  if (out.length) return out;
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) out.push(namedImage(file));
  }
  return out;
}

export function pushPasteHandler(handler: (e: ClipboardEvent) => boolean) {
  pasteStack.push(handler);
  if (pasteStack.length === 1) window.addEventListener("paste", dispatchPaste, true);
}

export function popPasteHandler(handler: (e: ClipboardEvent) => boolean) {
  const i = pasteStack.lastIndexOf(handler);
  if (i >= 0) pasteStack.splice(i, 1);
  if (pasteStack.length === 0) window.removeEventListener("paste", dispatchPaste, true);
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}
