// Mouseclick Vercel fallback - Worker relay playlist
// api/hls.js

const channels = {
  "peanut": "https://3rstv.elektriko4444.workers.dev/peanut.m3u8",
  "mochi": "https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8",
  "moon": "https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8",
  "kolet": "https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8",
  "southstartv": "https://southstartv.tonia3305.workers.dev/master.live.m3u8",
  "duriantv": "https://duriantv.tonia3305.workers.dev/master.live.m3u8"
};

const SECRET = process.env.MC_SECRET_TOKEN || "";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
}

function getChannelName(req) {
  if (req.query.name) return String(req.query.name).replace(/\.m3u8$/i, "");

  // Supports /api/hls/peanut.m3u8 on Vercel rewrite
  const parts = (req.url || "").split("?")[0].split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last.replace(/\.m3u8$/i, "");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (SECRET) {
    const token = req.query.token || req.headers["x-mc-token"];
    if (token !== SECRET) return res.status(403).send("forbidden");
  }

  const name = getChannelName(req);
  const target = channels[name];

  if (!target) {
    return res.status(404).send("channel not found: " + name);
  }

  // Sa version na ito, Vercel returns a tiny playlist redirecting to Worker URL.
  // Hindi na Vercel ang magfe-fetch ng BozzTV, para iwas 502.
  const body = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480\n${target}\n`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  return res.status(200).send(body);
}
