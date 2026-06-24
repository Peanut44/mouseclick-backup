import { channels, upstreamHeaders, setCommonHeaders, tokenOk } from "../../channels.js";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!tokenOk(req)) return res.status(403).send("forbidden");

  const { name, segment } = req.query;
  if (!name || !channels[name] || !segment) return res.status(404).send("segment not found");

  const id = channels[name];
  const segName = Array.isArray(segment) ? segment.join("/") : segment;
  const safeSeg = decodeURIComponent(segName).replace(/^\/+/, "");
  const url = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/${safeSeg}`;

  const headers = { ...upstreamHeaders };
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(url, { headers });
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).send("upstream segment error");
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/MP2T");
    res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    const len = upstream.headers.get("content-length");
    const range = upstream.headers.get("content-range");
    if (len) res.setHeader("Content-Length", len);
    if (range) res.setHeader("Content-Range", range);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.end(buffer);
  } catch (e) {
    return res.status(500).send("segment proxy error");
  }
}
