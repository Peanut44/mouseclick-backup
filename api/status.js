export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'online',
    server: 'mouseclick-vercel-v10',
    mode: 'worker-playlist-host-with-rewrite-fix'
  });
}
