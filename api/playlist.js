const CHANNELS = [
  ['peanut', 'Peanut'],
  ['mochi', 'Mochi'],
  ['moon', 'Moon'],
  ['kolet', 'Kolet'],
  ['southstartv', 'Southstar TV'],
  ['duriantv', 'Durian TV']
];

export default function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = `${proto}://${req.headers.host}`;
  const lines = ['#EXTM3U'];
  CHANNELS.forEach(([id, title], index) => {
    const ch = index + 1;
    lines.push(`#EXTINF:-1 tvg-chno="${ch}" channel-number="${ch}" tvg-id="${id}" tvg-name="${title}" tvg-logo="" group-title="Mouseclick Vercel Direct",${title}`);
    lines.push(`${host}/${id}.m3u8`);
  });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
  res.status(200).send(lines.join('\n'));
}
