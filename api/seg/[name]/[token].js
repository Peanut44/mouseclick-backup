import { channels, common, cleanName, b64urlDecode, upstreamHeaders } from "../../_shared.js";

export default async function handler(req, res) {
  common(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const name = cleanName(req.query.name);
  const ch = channels[name];
  const token = req.query.token;
  if (!ch || !token) return res.status(404).send("segment not found");

  let target;
  try {
    target = b64urlDecode(token);
  } catch (e) {
    return res.status(400).send("bad segment token");
  }

  const headers = { ...upstreamHeaders };
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target, { headers });
    if (!upstream.ok) return res.status(upstream.status).send(`upstream segment error ${upstream.status}`);

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp2t");
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h.replace(/(^|-)([a-z])/g, m => m.toUpperCase()), v);
    }
    return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    return res.status(500).send("segment proxy error");
  }
}
