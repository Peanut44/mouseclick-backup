export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    status: "online",
    server: "vercel-worker-fallback-no-redirect",
    version: "v7",
    channels: ["peanut", "mochi", "moon", "kolet", "southstartv", "duriantv"]
  });
}
