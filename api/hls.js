import { channels, common, cleanName, fetchFirstPlaylist, rewritePlaylist } from "./_shared.js";

export default async function handler(req, res) {
  common(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const name = cleanName(req.query.name);
  const ch = channels[name];
  if (!ch) return res.status(404).send(`channel not found: ${name || "empty"}`);

  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const result = await fetchFirstPlaylist(ch);
  if (!result.response) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(502).send("upstream playlist error\n" + JSON.stringify(result.tried, null, 2));
  }

  const text = await result.response.text();
  const out = rewritePlaylist(text, result.url, origin, name);
  res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
  return res.status(200).send(out);
}
