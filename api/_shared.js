export const channels = {
  peanut: { id: "210631" },
  moon: { id: "210731" },
  duriantv: { id: "211768" },
  southstartv: { id: "211869" },
  "master.live": { id: "10410" },
};

export const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
  "Accept": "*/*",
};

export function common(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin, Accept");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function cleanName(raw) {
  if (!raw) return "";
  return String(raw).replace(/^\//, "").replace(/\.m3u8$/i, "").trim().toLowerCase();
}

export function baseFromId(id) {
  return `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;
}

export function b64urlEncode(text) {
  return Buffer.from(text, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64urlDecode(text) {
  let s = String(text).replace(/\.ts$/i, "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

export async function fetchFirstPlaylist(ch) {
  if (ch.url) {
    const r = await fetch(ch.url, { headers: upstreamHeaders });
    return { response: r, url: ch.url, tried: [{ url: ch.url, status: r.status }] };
  }

  const base = baseFromId(ch.id);
  const names = ["mono.ts.m3u8", "mono.m3u8", "playlist.m3u8", "index.m3u8", "master.m3u8"];
  const tried = [];
  for (const file of names) {
    const url = base + file;
    try {
      const r = await fetch(url, { headers: upstreamHeaders });
      tried.push({ url, status: r.status });
      if (r.ok) return { response: r, url, tried };
    } catch (e) {
      tried.push({ url, status: "fetch_failed" });
    }
  }
  return { response: null, url: null, tried };
}

export function rewritePlaylist(text, usedUrl, origin, name) {
  return text.replace(/^(?!#)([^\r\n]+)$/gim, (line) => {
    const item = line.trim();
    if (!item) return line;
    // Proxy only media playlists/segments. Keep anything else as-is.
    if (!/\.(ts|m4s|aac|m3u8)(\?|$)/i.test(item)) return line;
    const abs = new URL(item, usedUrl).toString();
    const token = b64urlEncode(abs);
    // ends with .ts to keep Android/ExoPlayer happy even if actual file has query string
    return `${origin}/api/seg/${encodeURIComponent(name)}/${token}.ts`;
  });
}
