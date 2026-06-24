export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ status: "online", server: "mouseclick-vercel-v9", mode: "worker-playlist-host" });
}
