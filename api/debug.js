import { CHANNELS, fetchPlaylistDirect, fetchPlaylistWorker } from './direct.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const name = String(req.query.name || '').replace(/\.m3u8$/, '').toLowerCase();
  const channel = CHANNELS[name];
  if (!channel) return res.status(404).json({ error: 'channel not found', available: Object.keys(CHANNELS) });
  const direct = await fetchPlaylistDirect(channel);
  const worker = await fetchPlaylistWorker(channel);
  return res.status(200).json({
    status: 'debug',
    channel: name,
    direct: { ok: direct.ok, attempts: direct.attempts },
    worker: { ok: worker.ok, attempts: worker.attempts }
  });
}
