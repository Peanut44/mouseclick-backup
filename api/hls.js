// Mouseclick Vercel Worker Fallback v7 - NO REDIRECT
// api/hls.js
// Goal: Browser + Android/ExoPlayer compatible.
// Vercel fetches the Worker playlist, rewrites relative segment URLs to ABSOLUTE Worker URLs,
// then returns the final .m3u8 directly. No 301/302 redirect.

const CHANNELS = {
  peanut: "https://3rstv.elektriko4444.workers.dev/peanut.m3u8",
  mochi: "https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8",
  moon: "https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8",
  kolet: "https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8",
  southstartv: "https://southstartv.tonia3305.workers.dev/master.live.m3u8",
  duriantv: "https://duriantv.tonia3305.workers.dev/master.live.m3u8",
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function isAbsoluteUrl(line) {
  return /^https?:\/\//i.test(line);
}

function rewritePlaylist(text, workerPlaylistUrl) {
  const base = new URL(workerPlaylistUrl);
  const baseDir = workerPlaylistUrl.substring(0, workerPlaylistUrl.lastIndexOf("/") + 1);

  return text
    .split(/\r?\n/)
    .map((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return raw;

      // Already absolute: leave as-is.
      if (isAbsoluteUrl(line)) return line;

      // Root-relative path from Worker origin.
      if (line.startsWith("/")) return `${base.origin}${line}`;

      // Relative segment or nested playlist from Worker directory.
      return new URL(line, baseDir).toString();
    })
    .join("\n");
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const name = String(req.query.name || "").trim().toLowerCase();
  const url = CHANNELS[name];

  if (!url) {
    return res.status(404).send(`channel not found: ${name}`);
  }

  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android TV; Mouseclick)",
        "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
        "Cache-Control": "no-cache",
      },
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      return res.status(502).json({
        error: "worker playlist fetch failed",
        channel: name,
        workerUrl: url,
        status: upstream.status,
        body: body.slice(0, 300),
      });
    }

    const text = await upstream.text();
    const rewritten = rewritePlaylist(text, url);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.status(200).send(rewritten);
  } catch (err) {
    return res.status(500).json({ error: "vercel fallback error", message: String(err?.message || err) });
  }
}
