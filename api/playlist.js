// Full Mouseclick playlist hosted by Vercel, streams served by Workers
// api/playlist.js

const BASE = process.env.PUBLIC_BASE_URL || "https://mouseclick-backup.vercel.app";
const TOKEN = process.env.MC_SECRET_TOKEN || "";

const channels = [
  ["1", "peanut", "Peanut", "Movies"],
  ["2", "mochi", "Mochi", "Movies"],
  ["3", "moon", "Moon", "Movies"],
  ["4", "kolet", "Kolet", "Cartoons"],
  ["5", "southstartv", "South Star TV", "Local"],
  ["6", "duriantv", "Durian TV", "Local"]
];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  cors(res);

  const tokenParam = TOKEN ? `?token=${encodeURIComponent(TOKEN)}` : "";
  let out = "#EXTM3U\n";

  for (const [no, id, title, group] of channels) {
    out += `#EXTINF:-1 tvg-chno="${no}" channel-number="${no}" tvg-id="${id}" tvg-logo="" group-title="${group}",${title}\n`;
    out += `${BASE}/api/hls?name=${encodeURIComponent(id)}${tokenParam}\n`;
  }

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  return res.status(200).send(out);
}
