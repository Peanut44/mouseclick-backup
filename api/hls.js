// Mouseclick Vercel v10 - Worker playlist host, no direct BozzTV fetch

const channels = {
  peanut: 'https://3rstv.elektriko4444.workers.dev/peanut.m3u8',
  mochi: 'https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8',
  moon: 'https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8',
  kolet: 'https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8',
  southstartv: 'https://southstartv.tonia3305.workers.dev/master.live.m3u8',
  duriantv: 'https://duriantv.tonia3305.workers.dev/master.live.m3u8'
};

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, Referer, Origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function detectName(req) {
  let name = req.query.name || req.query.channel;
  if (Array.isArray(name)) name = name[0];

  // supports rewritten /peanut.m3u8 -> /api/hls?name=peanut
  if (name && name.endsWith('.m3u8')) name = name.replace(/\.m3u8$/i, '');

  // fallback if Vercel passes path info
  if (!name && req.url) {
    const raw = req.url.split('?')[0];
    const last = raw.split('/').filter(Boolean).pop() || '';
    if (last.endsWith('.m3u8')) name = last.replace(/\.m3u8$/i, '');
  }
  return String(name || '').toLowerCase().trim();
}

export default async function handler(req, res) {
  setHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  const name = detectName(req);
  const workerUrl = channels[name];

  if (!workerUrl) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('channel not found: ' + name);
  }

  try {
    const upstream = await fetch(workerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('worker playlist error ' + upstream.status);
    }

    let text = await upstream.text();

    // Make segment URLs absolute to the worker origin, so Android/ExoPlayer has a stable segment base.
    const workerOrigin = new URL(workerUrl).origin;
    text = text.replace(/^(?!#)([^\r\n]+\.ts(?:\?[^\r\n]*)?)$/gmi, (line) => {
      const seg = line.trim();
      if (/^https?:\/\//i.test(seg)) return seg;
      if (seg.startsWith('/')) return workerOrigin + seg;
      return workerUrl.replace(/\/[^/]*$/, '/') + seg;
    });

    res.setHeader('Content-Type', 'application/x-mpegURL; charset=utf-8');
    return res.status(200).send(text);
  } catch (err) {
    return res.status(500).send('proxy error');
  }
}
