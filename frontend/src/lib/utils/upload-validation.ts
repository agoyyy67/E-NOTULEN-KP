/**
 * upload-validation.ts — Client & server side file validation constraints
 * Source: PRD Bagian VI.5 & VIII.2 — Batasan Upload Foto & Logo
 */

export const FILE_CONSTRAINTS = {
  attachment: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeMB: 10,
    maxCount: 20,
    allowedTypes: ["image/jpeg", "image/png"],
    allowedExtensions: [".jpg", ".jpeg", ".png"],
  },
  logo: {
    maxSizeBytes: 2 * 1024 * 1024,  // 2 MB
    maxSizeMB: 2,
    allowedTypes: ["image/jpeg", "image/png"],
    allowedExtensions: [".jpg", ".jpeg", ".png"],
  },
} as const;

export function validateAttachmentFile(
  file: File,
): { valid: true } | { valid: false; error: string } {
  if (!FILE_CONSTRAINTS.attachment.allowedTypes.includes(file.type as "image/jpeg" | "image/png")) {
    return { valid: false, error: "Format file harus JPG atau PNG." };
  }
  if (file.size > FILE_CONSTRAINTS.attachment.maxSizeBytes) {
    return { valid: false, error: `Ukuran file maksimal ${FILE_CONSTRAINTS.attachment.maxSizeMB}MB.` };
  }
  return { valid: true };
}

export function validateLogoFile(
  file: File,
): { valid: true } | { valid: false; error: string } {
  if (!FILE_CONSTRAINTS.logo.allowedTypes.includes(file.type as "image/jpeg" | "image/png")) {
    return { valid: false, error: "Format logo harus PNG atau JPG." };
  }
  if (file.size > FILE_CONSTRAINTS.logo.maxSizeBytes) {
    return { valid: false, error: `Ukuran logo maksimal ${FILE_CONSTRAINTS.logo.maxSizeMB}MB.` };
  }
  return { valid: true };
}
