// Mouseclick Direct Vercel Proxy Test
// Routes supported by vercel.json:
// /direct/peanut.m3u8
// /direct/peanut/segment0001.ts
// /api/debug?name=peanut

const channels = {
  peanut: "210631",
  moon: "210731",
  duriantv: "211768",
  southstartv: "211869",
  mochi: "210267",
  kolet: "211507",
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
  "Accept": "*/*",
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

function getPathParts(req) {
  const fullUrl = new URL(req.url, getOrigin(req));
  let path = fullUrl.pathname;
  path = path.replace(/^\/api\/direct\/?/, "/direct/");
  path = path.replace(/^\/direct\/?/, "");
  return path.split("/").filter(Boolean);
}

async function fetchPlaylist(base) {
  const candidates = ["mono.ts.m3u8", "mono.m3u8", "playlist.m3u8", "index.m3u8", "master.m3u8"];
  const attempts = [];

  for (const file of candidates) {
    const target = base + file;
    try {
      const r = await fetch(target, { headers: upstreamHeaders });
      attempts.push({ url: target, status: r.status });
      if (r.ok) return { response: r, attempts };
    } catch (e) {
      attempts.push({ url: target, error: String(e?.message || e) });
    }
  }
  return { response: null, attempts };
}

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const debugName = req.query?.name;
  const parts = getPathParts(req);

  let name = debugName || "";
  let segment = "";

  if (!name && parts.length > 0) {
    const first = parts[0];
    if (first.endsWith(".m3u8")) name = first.replace(/\.m3u8$/i, "");
    else {
      name = first;
      segment = parts.slice(1).join("/");
    }
  }

  const id = channels[name];
  if (!id) return res.status(404).send(`channel not found: ${name || "blank"}`);

  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;

  // debug endpoint behavior
  if (req.url.includes("/api/debug")) {
    const result = await fetchPlaylist(base);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(result.response ? 200 : 502).send(JSON.stringify({ name, id, base, attempts: result.attempts }, null, 2));
  }

  // playlist request
  if (!segment) {
    const result = await fetchPlaylist(base);
    if (!result.response) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(502).send(JSON.stringify({ error: "upstream playlist error", attempts: result.attempts }, null, 2));
    }

    let text = await result.response.text();
    const origin = getOrigin(req);

    // rewrite any relative .ts segment to Vercel path-style absolute URL
    text = text.replace(/^(?!#)(.*\.ts(?:\?[^\r\n]*)?)$/gim, (line) => {
      const clean = line.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      return `${origin}/direct/${encodeURIComponent(name)}/${clean.split("/").map(encodeURIComponent).join("/")}`;
    });

    res.setHeader("Content-Type", "application/x-mpegURL; charset=utf-8");
    return res.status(200).send(text);
  }

  // segment request
  const headers = { ...upstreamHeaders };
  if (req.headers.range) headers.Range = req.headers.range;

  const upstream = await fetch(base + segment, { headers });
  if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).send("upstream segment error");

  res.setHeader("Content-Type", "video/mp2t");
  if (upstream.headers.get("content-length")) res.setHeader("Content-Length", upstream.headers.get("content-length"));
  if (upstream.headers.get("content-range")) res.setHeader("Content-Range", upstream.headers.get("content-range"));
  if (upstream.headers.get("accept-ranges")) res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges"));
  return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
}
