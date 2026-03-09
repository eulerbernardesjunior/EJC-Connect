import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const SPREADSHEET_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

function makeBadRequestError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function isInsideUploadDir(candidatePath) {
  const absolute = path.resolve(candidatePath);
  const base = `${path.resolve(env.uploadDir)}${path.sep}`;
  return absolute.startsWith(base);
}

function absoluteFromUploadUrl(uploadUrl) {
  const cleaned = String(uploadUrl || "")
    .trim()
    .replace(/\\/g, "/");
  if (!cleaned) return null;

  const marker = "/uploads/";
  const markerIndex = cleaned.toLowerCase().indexOf(marker);
  const relative = markerIndex >= 0 ? cleaned.slice(markerIndex + marker.length) : cleaned.replace(/^\/+/, "");
  if (!relative) return null;

  const absolute = path.resolve(env.uploadDir, relative);
  if (!isInsideUploadDir(absolute)) return null;
  return absolute;
}

export function imageUploadFilter(_req, file, callback) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const isImageMime = mime.startsWith("image/");
  if (isImageMime || IMAGE_EXTENSIONS.has(ext)) {
    return callback(null, true);
  }
  return callback(makeBadRequestError("Arquivo de imagem invalido. Use PNG, JPG, JPEG, WEBP ou GIF."));
}

export function spreadsheetUploadFilter(_req, file, callback) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    return callback(null, true);
  }
  return callback(makeBadRequestError("Arquivo invalido. Use .xlsx, .xls ou .csv."));
}

export function fontUploadFilter(_req, file, callback) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const isFontMime =
    mime === "" ||
    mime.includes("font") ||
    mime === "application/x-font-ttf" ||
    mime === "application/x-font-opentype" ||
    mime === "application/vnd.ms-fontobject" ||
    mime === "application/octet-stream";
  if (FONT_EXTENSIONS.has(ext) && isFontMime) {
    return callback(null, true);
  }
  return callback(makeBadRequestError("Arquivo de fonte invalido. Use .ttf, .otf, .woff ou .woff2."));
}

export async function deleteUploadedFile(filePath) {
  if (!filePath) return;
  if (!isInsideUploadDir(filePath)) return;
  await fs.unlink(filePath).catch(() => {});
}

export async function deleteUploadedByUrl(uploadUrl) {
  const absolute = absoluteFromUploadUrl(uploadUrl);
  if (!absolute) return;
  await fs.unlink(absolute).catch(() => {});
}
