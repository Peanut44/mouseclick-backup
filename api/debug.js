import { channels, common, cleanName, fetchFirstPlaylist } from "./_shared.js";

export default async function handler(req, res) {
  common(res);
  const name = cleanName(req.query.name);
  const ch = channels[name];
  if (!ch) return res.status(404).json({ ok: false, error: "channel not found", name });
  const result = await fetchFirstPlaylist(ch);
  res.status(200).json({ ok: !!result.response, name, selected: result.url, tried: result.tried });
}
