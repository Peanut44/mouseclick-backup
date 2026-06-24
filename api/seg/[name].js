// Mouseclick TV - Vercel Android/TV HLS segment proxy v5
// Path: api/seg/[name].js
// URL: /api/seg/peanut/segment0001.ts is routed by vercel.json rewrite to this function.

const channels = {
  peanut: "210631",
  moon: "210731",
  duriantv: "211768",
  southstartv: "211869",
  "master.live": "10410",
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store");
}

function cleanName(raw) {
  if (!raw) return "";
  return String(raw).replace(/^\//, "").trim().toLowerCase();
}

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const name = cleanName(req.query.name);
  const seg = req.query.seg;
  const id = channels[name];

  if (!id || !seg) return res.status(404).send("segment not found");

  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;
  const headers = { ...upstreamHeaders };
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(base + decodeURIComponent(seg), { headers });
    if (!upstream.ok) return res.status(upstream.status).send("upstream segment error");

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp2t");
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    return res.status(500).send("segment proxy error");
  }
}
