// Mouseclick TV - Vercel Android/TV HLS playlist proxy v5
// Path: api/hls/[name].js
// URL: https://mouseclick-backup.vercel.app/api/hls/peanut.m3u8

const channels = {
  peanut: "210631",
  moon: "210731",
  duriantv: "211768",
  southstartv: "211869",
  "master.live": "10410",
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0",
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

function cleanName(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/^\//, "")
    .replace(/\.m3u8$/i, "")
    .trim()
    .toLowerCase();
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  const name = cleanName(req.query.name);
  const id = channels[name];

  if (!id) {
    return res.status(404).send(`channel not found: ${name || "empty"}`);
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const origin = `${proto}://${host}`;
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;

  try {
    const upstream = await fetch(base + "mono.ts.m3u8", { headers: upstreamHeaders });
    if (!upstream.ok) return res.status(upstream.status).send("upstream playlist error");

    let text = await upstream.text();

    text = text.replace(/^(?!#)([^\r\n]+\.ts[^\r\n]*)$/gim, (line) => {
      const seg = encodeURIComponent(line.trim());
      return `${origin}/api/seg/${encodeURIComponent(name)}/${seg}`;
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).send("playlist proxy error");
  }
}
