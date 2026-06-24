// Mouseclick TV - Vercel backup proxy with channel mapping + TS segment proxy + secret token
// Upload path: api/channel.js
// Vercel Environment Variable recommended:
// MC_SECRET_TOKEN = your_private_token_here

const channels = {
  // Current working mappings
  "peanut": "210631",
  "moon": "210731",
  "mochi": "210267",
  "kolet": "211507",
  "duriantv": "211768",
  "southstartv": "211869",

  // Ready to enable later if confirmed working
  // "mochi": "210267",
  // "kolet": "211507",
  // "master.live": "10410",
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome Safari/537.36",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function isAuthorized(req) {
  const requiredToken = process.env.MC_SECRET_TOKEN;

  // If no Vercel env token is set, allow requests so testing will not break.
  // For production, set MC_SECRET_TOKEN in Vercel Project Settings > Environment Variables.
  if (!requiredToken) return true;

  const tokenFromQuery = getQueryValue(req.query.token || req.query.key || req.query.t);
  const tokenFromHeader = req.headers["x-mouseclick-token"];

  return tokenFromQuery === requiredToken || tokenFromHeader === requiredToken;
}

function rewritePlaylist(text, name, token) {
  return text.replace(/^(?!#)([^\r\n]+\.ts(?:\?[^\r\n]*)?)/gm, (line) => {
    const segment = encodeURIComponent(line.trim());
    let url = `/api/channel?name=${encodeURIComponent(name)}&seg=${segment}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    return url;
  });
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).send("method not allowed");
  }

  if (!isAuthorized(req)) {
    return res.status(403).send("forbidden");
  }

  const name = getQueryValue(req.query.name);
  const seg = getQueryValue(req.query.seg);
  const token = getQueryValue(req.query.token || req.query.key || req.query.t);

  if (!name || !channels[name]) {
    return res.status(404).send("channel not found");
  }

  const id = channels[name];
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;

  try {
    if (!seg) {
      const upstream = await fetch(base + "mono.ts.m3u8", {
        headers: upstreamHeaders,
      });

      if (!upstream.ok) {
        return res.status(upstream.status).send("upstream playlist error");
      }

      const playlistText = await upstream.text();
      const rewritten = rewritePlaylist(playlistText, name, token);

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      return res.status(200).send(rewritten);
    }

    const upstream = await fetch(base + decodeURIComponent(seg), {
      headers: upstreamHeaders,
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("upstream segment error");
    }

    const contentType = upstream.headers.get("content-type") || "video/mp2t";
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    return res.status(500).send("proxy error");
  }
}
