// Mouseclick Vercel Worker-style fallback v9
// Routes supported via vercel.json:
//   /peanut.m3u8
//   /peanut/segment0001.ts
// Also direct:
//   /api/hls?path=peanut.m3u8

const channels = {
  "peanut": "https://3rstv.elektriko4444.workers.dev/peanut.m3u8",
  "mochi": "https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8",
  "moon": "https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8",
  "kolet": "https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8",
  "southstartv": "https://southstartv.tonia3305.workers.dev/master.live.m3u8",
  "duriantv": "https://duriantv.tonia3305.workers.dev/master.live.m3u8"
};

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store");
}

function absoluteUrl(baseUrl, line) {
  if (/^https?:\/\//i.test(line)) return line;
  const base = new URL(baseUrl);
  if (line.startsWith("/")) return `${base.origin}${line}`;
  const dir = base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1);
  return `${base.origin}${dir}${line}`;
}

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  // vercel.json passes /peanut.m3u8 or /peanut/seg.ts as ?path=...
  let path = req.query.path || req.query.name || "";
  if (Array.isArray(path)) path = path.join("/");
  path = String(path).replace(/^\//, "");

  // Playlist: peanut.m3u8
  if (path.endsWith(".m3u8")) {
    const name = path.replace(/\.m3u8$/i, "");
    const workerPlaylist = channels[name];
    if (!workerPlaylist) return res.status(404).send("channel not found");

    const upstream = await fetch(workerPlaylist, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!upstream.ok) return res.status(upstream.status).send("worker playlist error");

    let text = await upstream.text();

    // Make every .ts segment absolute to the Worker URL, so Android app does not need Vercel segment proxy.
    text = text.replace(/^(?!#)(.+\.ts(?:\?[^\r\n]*)?)$/gim, (match) => {
      return absoluteUrl(workerPlaylist, match.trim());
    });

    res.setHeader("Content-Type", "application/x-mpegURL");
    return res.status(200).send(text);
  }

  return res.status(404).send("not found");
}
