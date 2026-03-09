import multer from "multer";

const DB_BAD_REQUEST_CODES = new Set(["22P02", "22007", "23502", "23503", "23514"]);

function statusFromError(error) {
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 600) {
    return error.status;
  }
  if (error instanceof multer.MulterError) {
    return 400;
  }
  if (DB_BAD_REQUEST_CODES.has(error?.code)) {
    return 400;
  }
  return 500;
}

function messageFromError(error, status) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return "Arquivo excede o tamanho maximo permitido.";
  }
  if (status >= 500) {
    return "Erro interno do servidor.";
  }
  return error?.message || "Requisicao invalida.";
}

export function errorHandler(error, _req, res, _next) {
  const status = statusFromError(error);
  const message = messageFromError(error, status);
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
}
