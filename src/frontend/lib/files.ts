import mime from "mime";

/**
 * Download content as a file
 * @param content - File content (string, Uint8Array, or ArrayBuffer)
 * @param filename - Name for the downloaded file
 * @param mimeType - MIME type of the content (default: "text/plain")
 */
export const downloadFileFromContent = (
  content: string | Uint8Array | ArrayBuffer | Blob,
  filename: string,
  mimeType: string = "text/plain",
): void => {
  const blob = content instanceof Blob ? content : new Blob([content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Create a download link element
 * @param content - File content
 * @param filename - Name for the downloaded file
 * @param mimeType - MIME type (default: "text/plain")
 * @param linkText - Display text for the link
 * @param className - CSS class for styling
 * @returns HTMLAnchorElement configured for download
 */
export const createDownloadLink = (
  content: BlobPart,
  filename: string,
  mimeType: string = "text/plain",
  linkText: string = "Download",
  className: string = "hover-text",
): HTMLAnchorElement => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.textContent = linkText;
  link.className = className;

  link.addEventListener("click", () => {
    // Clean up the URL after download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });

  return link;
};

/**
 * Show native file picker dialog for single file selection
 * @param conf - Configuration object
 * @param conf.accept - HTML input accept format (extensions like ".txt,.pdf" or MIME types like "image/*")
 * @param conf.multiple - Must be false or undefined for single file
 * @returns Promise resolving to selected File or rejecting if cancelled
 * @example
 * const file = await showFileDialog({ accept: ".pdf" });
 */
export function showFileDialog(conf: { accept?: string; multiple?: false }): Promise<File>;

/**
 * Show native file picker dialog for multiple file selection
 * @param conf - Configuration object
 * @param conf.accept - HTML input accept format (extensions like ".txt,.pdf" or MIME types like "image/*")
 * @param conf.multiple - Must be true for multiple files
 * @returns Promise resolving to array of Files or rejecting if cancelled
 * @example
 * const files = await showFileDialog({ accept: ".jpg,.png", multiple: true });
 */
export function showFileDialog(conf: { accept?: string; multiple: true }): Promise<File[]>;

/**
 * Show native file picker dialog implementation
 */
export function showFileDialog(conf?: { accept?: string; multiple?: boolean }): Promise<File | File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";

    if (conf?.accept) {
      input.accept = conf.accept;
    }

    if (conf?.multiple) {
      input.multiple = true;
    }

    input.addEventListener("change", ({ target }) => {
      const files = (target as HTMLInputElement).files;

      document.body.removeChild(input);

      if (!files || files.length === 0) {
        return reject(new Error("No file selected"));
      }

      if (conf?.multiple) {
        resolve(Array.from(files));
      } else {
        resolve(files[0] as File);
      }
    });

    input.addEventListener("cancel", () => {
      document.body.removeChild(input);
      reject(new Error("File dialog cancelled"));
    });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Convert MIME types to file extensions for HTML input accept attribute
 * @param mimeTypes - Comma-separated MIME types (e.g., "image/*,application/pdf")
 * @returns HTML accept string with extensions and MIME types
 * @example
 * mimeTypesToAccept("image/*,application/pdf") // "image/*,.pdf"
 * mimeTypesToAccept("image/jpeg,image/png") // ".jpg,.jpeg,.png,image/jpeg,image/png"
 */
export const mimeTypesToAccept = (mimeTypes: string): string => {
  if (!mimeTypes) return "";

  const results = mimeTypes
    .split(",")
    .map((t) => t.trim())
    .flatMap((t) => {
      if (t.endsWith("/*")) return t;

      const ext = mime.getExtension(t);
      return ext ? [`.${ext}`, t] : t;
    });

  return [...new Set(results)].join(",");
};

/**
 * Check if a file or MIME type matches accepted types
 * @param fileOrType - File object or MIME type string to check
 * @param accept - Comma-separated accepted types (e.g., "image/*", ".pdf", "image/jpeg,image/png")
 * @returns True if the file/type is accepted, false otherwise
 * @example
 * checkMimeType(file, "image/*") // true for any image
 * checkMimeType(file, ".pdf") // true for PDF files
 * checkMimeType("application/pdf", "application/pdf") // true
 * checkMimeType(file, ".pdf,image/*") // true for PDFs or any image
 */
export const checkMimeType = (fileOrType: File | string, accept: string): boolean => {
  if (!accept) return true;

  const isFile = typeof fileOrType !== "string";
  const fileName = isFile ? fileOrType.name.toLowerCase() : "";
  const mimeType = (isFile ? fileOrType.type : fileOrType) || mime.getType(fileName) || "";

  return accept
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .some((p) => {
      if (p.startsWith(".")) {
        return fileName.endsWith(p) || mime.getType(p.slice(1)) === mimeType;
      }
      if (p.endsWith("/*")) {
        return mimeType.startsWith(p.slice(0, -1));
      }
      return mimeType === p;
    });
};
