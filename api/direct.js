// Mouseclick Vercel Direct Proxy v13
// Direct Vercel -> BozzTV upstream with optional Worker fallback

const CHANNELS = {
  peanut: {
    id: '210631',
    title: 'Peanut',
    workers: ['https://3rstv.elektriko4444.workers.dev/peanut.m3u8']
  },
  mochi: {
    id: '210267',
    title: 'Mochi',
    workers: ['https://3rssinepinoy2.elektriko4444.workers.dev/mochi.m3u8']
  },
  moon: {
    id: '210731',
    title: 'Moon',
    workers: ['https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8']
  },
  kolet: {
    id: '211507',
    title: 'Kolet',
    workers: ['https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8']
  },
  southstartv: {
    id: '211869',
    title: 'Southstar TV',
    workers: ['https://southstartv.tonia3305.workers.dev/master.live.m3u8']
  },
  duriantv: {
    id: '211768',
    title: 'Durian TV',
    workers: ['https://duriantv.tonia3305.workers.dev/master.live.m3u8']
  }
};

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Referer': 'https://bozztv.com/',
  'Origin': 'https://bozztv.com',
  'Accept': '*/*',
  'Connection': 'keep-alive'
};

const PLAYLIST_CANDIDATES = [
  'mono.ts.m3u8',
  'mono.m3u8',
  'playlist.m3u8',
  'index.m3u8',
  'master.m3u8'
];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, Referer, Origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function getHost(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

function parseRoute(req) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  let name = url.searchParams.get('name');
  let seg = url.searchParams.get('seg');

  // Rewritten path can be passed as query by vercel.json
  if (!name && req.query && req.query.name) name = String(req.query.name).replace(/\.m3u8$/, '');
  if (!seg && req.query && req.query.seg) seg = Array.isArray(req.query.seg) ? req.query.seg.join('/') : String(req.query.seg);

  // Direct API usage: /api/direct?name=peanut&seg=xxx.ts
  if (!name && req.query && req.query.channel) name = String(req.query.channel).replace(/\.m3u8$/, '');

  name = (name || '').replace(/^\/+/, '').replace(/\.m3u8$/, '').toLowerCase();
  if (seg) seg = decodeURIComponent(String(seg).replace(/^\/+/, ''));
  return { name, seg };
}

async function fetchPlaylistDirect(channel) {
  const base = `https://live20.bozztv.com/giatvplayout7/giatv-${channel.id}/tracks-v1a1/`;
  const attempts = [];

  for (const file of PLAYLIST_CANDIDATES) {
    const target = base + file;
    try {
      const r = await fetch(target, { headers: UPSTREAM_HEADERS });
      attempts.push({ url: target, status: r.status });
      if (r.ok) {
        return { ok: true, text: await r.text(), base, attempts, source: 'direct' };
      }
    } catch (e) {
      attempts.push({ url: target, error: String(e && e.message ? e.message : e) });
    }
  }
  return { ok: false, attempts, base, source: 'direct' };
}

async function fetchPlaylistWorker(channel) {
  const attempts = [];
  for (const target of channel.workers || []) {
    try {
      const r = await fetch(target, { headers: { 'User-Agent': UPSTREAM_HEADERS['User-Agent'], 'Accept': '*/*' } });
      attempts.push({ url: target, status: r.status });
      if (r.ok) return { ok: true, text: await r.text(), workerUrl: target, attempts, source: 'worker' };
    } catch (e) {
      attempts.push({ url: target, error: String(e && e.message ? e.message : e) });
    }
  }
  return { ok: false, attempts, source: 'worker' };
}

function absolutizePlaylist(text, options) {
  const { host, name, source, directBase, workerUrl } = options;
  const workerBase = workerUrl ? workerUrl.replace(/[^/]+\.m3u8(?:\?.*)?$/, '') : '';

  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    // Already absolute http URL
    if (/^https?:\/\//i.test(trimmed)) {
      // If direct source playlist surprisingly has absolute .ts, proxy it through direct URL encoded as segurl
      if (source === 'direct' && trimmed.includes('.ts')) {
        return `${host}/direct/${name}/${encodeURIComponent(trimmed)}`;
      }
      return trimmed;
    }

    // Segment path from direct upstream
    if (source === 'direct') {
      const clean = trimmed.replace(/^\.\//, '');
      return `${host}/direct/${name}/${encodeURIComponent(clean)}`;
    }

    // Worker fallback playlist: make segments absolute Worker URL, not Vercel, to reduce Vercel bandwidth
    const clean = trimmed.replace(/^\.\//, '');
    if (workerBase) return new URL(clean, workerBase).toString();
    return trimmed;
  }).join('\n');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { name, seg } = parseRoute(req);
  const channel = CHANNELS[name];
  if (!channel) return res.status(404).send('channel not found');

  const host = getHost(req);
  const useWorkerOnly = req.query && String(req.query.worker || '') === '1';
  const disableWorkerFallback = process.env.DISABLE_WORKER_FALLBACK === '1';

  try {
    // Segment request. Path: /direct/peanut/segment0001.ts
    if (seg) {
      let target;
      if (/^https?:\/\//i.test(seg)) {
        target = seg;
      } else {
        const base = `https://live20.bozztv.com/giatvplayout7/giatv-${channel.id}/tracks-v1a1/`;
        target = base + seg;
      }

      const headers = { ...UPSTREAM_HEADERS };
      if (req.headers.range) headers.Range = req.headers.range;

      const upstream = await fetch(target, { headers });
      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 502).send('upstream segment error');
      }

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp2t');
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
      if (upstream.headers.get('content-length')) res.setHeader('Content-Length', upstream.headers.get('content-length'));
      if (upstream.headers.get('content-range')) res.setHeader('Content-Range', upstream.headers.get('content-range'));
      return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
    }

    // Playlist request
    let playlist;
    if (!useWorkerOnly) {
      playlist = await fetchPlaylistDirect(channel);
    }

    if ((!playlist || !playlist.ok) && !disableWorkerFallback) {
      const workerPlaylist = await fetchPlaylistWorker(channel);
      if (workerPlaylist.ok) playlist = workerPlaylist;
      else if (!playlist) playlist = workerPlaylist;
    }

    if (!playlist || !playlist.ok) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(502).send(JSON.stringify({ error: 'all upstreams failed', channel: name, attempts: playlist?.attempts || [] }, null, 2));
    }

    const text = absolutizePlaylist(playlist.text, {
      host,
      name,
      source: playlist.source,
      directBase: playlist.base,
      workerUrl: playlist.workerUrl
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('X-Mouseclick-Source', playlist.source);
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).send('proxy error: ' + String(e && e.message ? e.message : e));
  }
}

export { CHANNELS, fetchPlaylistDirect, fetchPlaylistWorker };
