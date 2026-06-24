// Mouseclick TV - Vercel backup proxy Android/TV compatible
// Upload as: api/channel.js

const channels = {
  "peanut": "210631",
  "moon": "210731",
  "duriantv": "211768",
  "southstartv": "211869",
  // "mochi": "210267",
  // "kolet": "211507",
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; Android TV) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
  "Accept": "*/*",
};

function applyCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function getPublicHost(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function requireToken(req, res) {
  const secret = process.env.MC_SECRET_TOKEN;
  if (!secret) return true; // token disabled if env var is not set

  const token = req.query.token || req.headers["x-mc-token"];
  if (token === secret) return true;

  res.status(403).send("forbidden");
  return false;
}

export default async function handler(req, res) {
  applyCommonHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).send("method not allowed");

  if (!requireToken(req, res)) return;

  const { name, seg } = req.query;

  if (!name || !channels[name]) {
    return res.status(404).send("channel not found");
  }

  const id = channels[name];
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;

  try {
    // Playlist request: /api/channel?name=peanut
    if (!seg) {
      const upstream = await fetch(base + "mono.ts.m3u8", {
        headers: upstreamHeaders,
      });

      if (!upstream.ok) {
        return res.status(upstream.status).send("upstream playlist error");
      }

      let text = await upstream.text();
      const host = getPublicHost(req);
      const tokenPart = process.env.MC_SECRET_TOKEN ? `&token=${encodeURIComponent(req.query.token || "")}` : "";

      // Rewrite only relative .ts segments to absolute Vercel URLs for stricter Android/ExoPlayer clients.
      text = text.replace(/^(?!#)([^\r\n]+\.ts(?:\?[^\r\n]*)?)$/gm, (line) => {
        const cleanSeg = encodeURIComponent(line.trim());
        return `${host}/api/channel?name=${encodeURIComponent(name)}&seg=${cleanSeg}${tokenPart}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      return res.status(200).send(text);
    }

    // Segment request: /api/channel?name=peanut&seg=segment0001.ts
    const segment = Array.isArray(seg) ? seg[0] : seg;
    const headers = { ...upstreamHeaders };

    // Android/TV players may request byte ranges. Forward Range to upstream.
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const upstream = await fetch(base + segment, { headers });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).send("upstream segment error");
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp2t");
    res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");

    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    // Vercel Node response supports web stream piping through arrayBuffer reliably for .ts chunks.
    // Keep chunks small enough for Vercel serverless by fetching per segment.
    if (req.method === "HEAD") return res.end();

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.end(buffer);
  } catch (err) {
    return res.status(500).send("proxy error");
  }
}
