export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "online",
    server: "vercel-worker-fallback",
    mode: "playlist-host-only",
    note: "Streams are served by Cloudflare Workers to avoid Vercel upstream 502."
  });
}
