// Mouseclick TV - Vercel backup proxy
// Upload this file as: api/channel.js

const channels = {
  "peanut": "210631",
  // "mochi": "210267",
     "moon": "210731",
	 "duriantv": "211768",
	  "southstartv": "211869",
  // "kolet": "211507",,
};

const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0",
  "Referer": "https://bozztv.com/",
  "Origin": "https://bozztv.com",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Origin");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { name, seg } = req.query;

  if (!name || !channels[name]) {
    return res.status(404).send("not found");
  }

  const id = channels[name];
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${id}/tracks-v1a1/`;

  try {
    // Playlist request:
    // /api/channel?name=peanut
    if (!seg) {
      const upstream = await fetch(base + "mono.ts.m3u8", {
        headers: upstreamHeaders,
      });

      if (!upstream.ok) {
        return res.status(upstream.status).send("upstream playlist error");
      }

      let text = await upstream.text();

      // Rewrite relative .ts segments back through Vercel.
      text = text.replace(/([^\n\r]+\.ts)/g, (segment) => {
        const cleanSeg = encodeURIComponent(segment.trim());
        return `/api/channel?name=${encodeURIComponent(name)}&seg=${cleanSeg}`;
      });

      res.setHeader("Content-Type", "application/x-mpegURL");
      return res.status(200).send(text);
    }

    // Segment request:
    // /api/channel?name=peanut&seg=segment0001.ts
    const upstream = await fetch(base + seg, {
      headers: upstreamHeaders,
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).send("upstream segment error");
    }

    res.setHeader("Content-Type", "video/mp2t");
    return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    return res.status(500).send("proxy error");
  }
}
