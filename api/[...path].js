// Mouseclick TV - Vercel Worker-style HLS bridge
// This mimics the working Cloudflare Worker URL style:
//   /peanut.m3u8
//   /peanut/segment0001.ts

const channels = {
  "peanut": "https://3rstv.elektriko4444.workers.dev/peanut.m3u8",
  "mochi": "https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8",
  "moon": "https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8",
  "kolet": "https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8",
  "southstartv": "https://southstartv.tonia3305.workers.dev/master.live.m3u8",
  "duriantv": "https://duriantv.tonia3305.workers.dev/master.live.m3u8",
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function channelFromWorkerUrl(workerUrl) {
  const u = new URL(workerUrl);
  const clean = u.pathname.replace(/^\//, "").replace(/\.m3u8$/i, "");
  return clean;
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    // Vercel catch-all path from /api/[...path].js
    // With rewrites below, /peanut.m3u8 becomes /api/peanut.m3u8
    const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const rawPath = parts.join("/");

    if (!rawPath || rawPath === "status") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).send(JSON.stringify({ status: "online", mode: "worker-style-vercel", channels: Object.keys(channels) }, null, 2));
    }

    const isSegment = rawPath.includes(".ts");
    let name;
    let segmentPath;

    if (isSegment) {
      // /peanut/segment0001.ts
      const segParts = rawPath.split("/");
      name = segParts.shift();
      segmentPath = segParts.join("/");
    } else {
      // /peanut.m3u8
      name = rawPath.replace(/\.m3u8$/i, "");
    }

    const workerPlaylist = channels[name];
    if (!workerPlaylist) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(404).send("channel not found: " + name);
    }

    const workerUrl = new URL(workerPlaylist);
    const workerOrigin = workerUrl.origin;
    const workerChannelPath = channelFromWorkerUrl(workerPlaylist);

    if (!isSegment) {
      // Fetch playlist from the working Cloudflare Worker, then rewrite segment URLs
      const upstream = await fetch(workerPlaylist, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
        },
      });

      if (!upstream.ok) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(upstream.status).send("worker playlist error " + upstream.status);
      }

      let text = await upstream.text();
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const myOrigin = `${proto}://${host}`;

      text = text
        // absolute worker segment urls -> vercel worker-style segment path
        .replace(new RegExp(`${workerOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${workerChannelPath}/([^\n\r]+\\.ts)`, "g"), `${myOrigin}/${name}/$1`)
        // relative segment urls -> vercel worker-style segment path
        .replace(/^(?!#)([^\n\r]+\.ts(?:\?[^\n\r]*)?)$/gm, (line) => {
          const clean = line.trim().replace(/^\/+/, "");
          return `${myOrigin}/${name}/${clean}`;
        });

      res.setHeader("Content-Type", "application/x-mpegURL; charset=utf-8");
      return res.status(200).send(text);
    }

    // Segment: fetch from the existing working Worker, not BozzTV direct
    const target = `${workerOrigin}/${workerChannelPath}/${segmentPath}`;
    const headers = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(target, { headers });

    if (!upstream.ok || !upstream.body) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(upstream.status || 502).send("worker segment error " + (upstream.status || 502));
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp2t");
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    const ab = await upstream.arrayBuffer();
    return res.status(upstream.status).send(Buffer.from(ab));
  } catch (e) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(500).send("proxy error");
  }
}
