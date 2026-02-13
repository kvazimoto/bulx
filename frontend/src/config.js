export const API_ORIGIN = "http://127.0.0.1:8000";
export const API_BASE = `${API_ORIGIN}/api`;

export function absUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
}
