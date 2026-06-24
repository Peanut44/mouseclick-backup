export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'online',
    server: 'mouseclick-vercel-direct-main-v13',
    mode: 'direct-vercel-with-worker-fallback',
    routes: [
      '/playlist.m3u8',
      '/peanut.m3u8',
      '/direct/peanut.m3u8',
      '/api/debug?name=peanut'
    ]
  });
}
