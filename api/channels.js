export const channels = {
  "peanut": "210631",
  "moon": "210731",
  "duriantv": "211768",
  "southstartv": "211869",
  // Add more here:
  // "master.live": "10410",
  // "kolet": "211507",
};

export const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; Android TV) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
  "Accept": "*/*",
  "Connection": "keep-alive",
};

export function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function getPublicBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

export function tokenOk(req) {
  const secret = process.env.MC_SECRET_TOKEN;
  if (!secret) return true;
  return req.query.token === secret;
}

export function tokenSuffix(req) {
  const secret = process.env.MC_SECRET_TOKEN;
  if (!secret) return "";
  return `?token=${encodeURIComponent(secret)}`;
}
