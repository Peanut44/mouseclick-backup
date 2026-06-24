import { channels, upstreamHeaders, setCommonHeaders, getPublicBaseUrl, tokenOk, tokenSuffix } from "../channels.js";

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!tokenOk(req)) return res.status(403).send("forbidden");

  const { name } = req.query;
  if (!name || !channels[name]) return res.status(404).send("channel not found");

  const id = channels[name];
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;
  const playlistUrl = base + "mono.ts.m3u8";

  try {
    const upstream = await fetch(playlistUrl, { headers: upstreamHeaders });
    if (!upstream.ok) return res.status(upstream.status).send("upstream playlist error");

    let text = await upstream.text();
    const publicBase = getPublicBaseUrl(req);
    const suffix = tokenSuffix(req);

    // Rewrite every non-comment media line to path-style .ts URLs.
    // Android ExoPlayer tends to be stricter with query-only segment endpoints.
    text = text.split(/\r?\n/).map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;

      // absolute upstream URL or relative filename; keep only final segment name
      const last = t.split("/").pop();
      const safeSeg = encodeURIComponent(last);
      return `${publicBase}/api/seg/${encodeURIComponent(name)}/${safeSeg}${suffix}`;
    }).join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).send("playlist proxy error");
  }
}
