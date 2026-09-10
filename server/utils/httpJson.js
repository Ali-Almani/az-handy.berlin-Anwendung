/**
 * JSON ohne Content-Length (chunked) – vermeidet ERR_CONTENT_LENGTH_MISMATCH
 * wenn ein Reverse-Proxy die Antwort komprimiert oder puffert.
 */
export function sendJsonResponse(res, payload, statusCode = 200) {
  const body = JSON.stringify(payload);
  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.removeHeader('Content-Length');
  res.end(body);
}
